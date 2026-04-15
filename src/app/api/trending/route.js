import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const CACHE_DIR = join(process.cwd(), '.cache');
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCacheFile(personaId) { return join(CACHE_DIR, `trending_${personaId || 'default'}.json`); }

function getCachedData(personaId) {
  try {
    const f = getCacheFile(personaId);
    if (!existsSync(f)) return null;
    const raw = JSON.parse(readFileSync(f, 'utf-8'));
    if (Date.now() - raw._cachedAt > CACHE_TTL_MS) return null;
    return raw;
  } catch { return null; }
}

function setCachedData(personaId, data) {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(getCacheFile(personaId), JSON.stringify({ ...data, _cachedAt: Date.now() }));
  } catch (e) { console.error('[Trending] Cache write failed:', e.message); }
}

function sanitize(str) {
  return str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '').replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\s+/g, ' ').trim();
}

function compressPostsForAnalysis(posts) {
  const bySource = {};
  for (const p of posts) {
    const name = sanitize(p.source?.name || 'Unknown');
    if (!bySource[name]) bySource[name] = { platform: p.platform, posts: [] };
    bySource[name].posts.push(sanitize(p.content.slice(0, 120)));
  }
  return Object.entries(bySource).map(([name, { platform, posts: pp }]) => {
    const plat = platform === 'twitter' ? 'X' : platform === 'linkedin' ? 'LI' : 'Blog';
    return `[${plat}] ${name} (${[...new Set(pp)].length}): ${[...new Set(pp)].join(' | ')}`;
  }).join('\n');
}

/**
 * Match posts to topics by keyword matching (ZERO extra Claude cost).
 * Returns top 5 posts per topic from the database.
 */
function matchPostsToTopics(topics, allPosts) {
  return topics.map(topic => {
    const keywords = [
      topic.topic.toLowerCase(),
      ...(topic.angles || []).map(a => a.toLowerCase()),
      ...(topic.description || '').toLowerCase().split(/\s+/).filter(w => w.length > 4),
    ];
    
    const scored = allPosts.map(post => {
      const text = (post.content || '').toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score += kw.length > 8 ? 3 : 1;
      }
      if (topic.accounts?.some(a => (post.source?.name || '').toLowerCase().includes(a.toLowerCase()))) score += 5;
      return { post, score };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);

    return {
      ...topic,
      matchedPosts: scored.map(({ post, score }) => ({
        id: post.id,
        content: post.content.slice(0, 300),
        authorName: post.authorName || post.source?.name || 'Unknown',
        platform: post.platform,
        postUrl: post.postUrl,
        postedAt: post.postedAt,
        sourceName: post.source?.name,
        relevance: score,
      })),
    };
  });
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    const personaId = url.searchParams.get('personaId') || null;

    if (!forceRefresh) {
      const cached = getCachedData(personaId);
      if (cached) {
        console.log(`[Trending] Serving from cache (persona: ${personaId || 'default'})`);
        return NextResponse.json({ ...cached, _cached: true });
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

    let persona = null;
    let personaContext = '';
    if (personaId) {
      persona = await prisma.persona.findUnique({ where: { id: personaId } });
      if (persona?.contextMarkdown) {
        personaContext = `\n## POST WRITER PERSONA\nYou are writing posts for ${persona.name} (${persona.role.toUpperCase()}).\n${persona.contextMarkdown}\nIMPORTANT: Every draft must match this persona's voice and positioning.`;
      } else if (persona) {
        personaContext = `\n## POST WRITER PERSONA\nYou are writing posts for ${persona.name} (${persona.role.toUpperCase()}).`;
      }
    }

    const posts = await prisma.contentPost.findMany({
      orderBy: { scrapedAt: 'desc' },
      take: 300,
      include: { source: { select: { name: true, platform: true } } },
    });

    if (posts.length === 0) return NextResponse.json({ topics: [], stats: {} });

    const compressed = compressPostsForAnalysis(posts);
    const sourceCount = new Set(posts.map(p => p.source?.name)).size;
    console.log(`[Trending] ${posts.length} posts, persona: ${persona?.name || 'generic'}`);

    const resp = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        temperature: 0.5,
        system: `Extract trending topics from social posts AND generate 2 READY-TO-POST LinkedIn drafts per topic.${personaContext}

## FRAMEWORKS FOR DRAFTS (use one per draft)
- Contrarian Take: "Everyone says [X]. Here's why that's wrong." + specific example
- Story → Lesson: "Last [time], [thing happened]." → 3 bullet lessons → question
- Before/After: "6 months ago: [old]. Today: [new]." → what changed
- Framework List: "My [N]-step framework for [result]:" → numbered steps
- Data Lead: "[Surprising stat]." → context → actionable takeaway

## POST RULES
- Hook = first 2 lines, under 20 words, scroll-stopping
- 150-200 words total, short paragraphs with line breaks
- First person ("I"), include ONE specific example/number
- End with a QUESTION or CTA
- NO corporate jargon. Sound human.

Return ONLY valid JSON array:
[{"topic":"short name","description":"one line","count":N,"accounts":["name1"],"heat":1-10,"emoji":"🤖","angles":["angle1","angle2"],"platforms":["twitter"],
"suggestions":[
  {"hook":"2-line scroll-stopping hook","draft":"Complete 150-200 word LinkedIn post.\\n\\nWith proper line breaks.\\n\\nEnds with question.","bucket":"Tactical","framework":"Contrarian Take"},
  {"hook":"Different hook style","draft":"Different framework, different voice.\\n\\nSpecific examples.\\n\\nQuestion at end?","bucket":"Topical","framework":"Story → Lesson"}
]}]
Rules: 6-8 topics. Sort by heat desc. Each topic gets exactly 2 suggestions with DIFFERENT frameworks. ${persona?.contextMarkdown ? 'Use content buckets from the brief.' : 'Buckets: Humble Brag, Build in Public, Tactical, Topical.'}`,
        messages: [{ role: 'user', content: `${sourceCount} accounts, ${posts.length} posts:\n${compressed}` }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Claude error ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = await resp.json();
    const text = data?.content?.[0]?.text || '[]';
    const rawTopics = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    
    // Match actual posts to each topic (keyword matching — ZERO extra Claude cost)
    const topics = matchPostsToTopics(rawTopics, posts);

    const usage = data?.usage || {};
    console.log(`[Trending] Claude tokens — input: ${usage.input_tokens || '?'}, output: ${usage.output_tokens || '?'}`);

    const platformCounts = {};
    for (const p of posts) platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;

    const result = {
      topics,
      persona: persona ? { id: persona.id, name: persona.name, role: persona.role } : null,
      stats: { totalPosts: posts.length, platforms: platformCounts, analyzedAt: new Date().toISOString(), tokensUsed: { input: usage.input_tokens, output: usage.output_tokens } },
    };

    setCachedData(personaId, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[Trending]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
