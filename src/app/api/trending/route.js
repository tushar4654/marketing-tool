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

    // Load persona if selected
    let persona = null;
    let personaContext = '';
    if (personaId) {
      persona = await prisma.persona.findUnique({ where: { id: personaId } });
      if (persona?.contextMarkdown) {
        // Extract key sections from the content brief for the system prompt
        personaContext = `
## POST WRITER PERSONA
You are writing posts for ${persona.name} (${persona.role.toUpperCase()}).
Use their content strategy brief to shape every suggestion:

${persona.contextMarkdown}

IMPORTANT: Every draft must match this persona's voice, positioning, audience, and content buckets as defined above.`;
      } else if (persona) {
        personaContext = `\n## POST WRITER PERSONA\nYou are writing posts for ${persona.name} (${persona.role.toUpperCase()}). Write in their voice.`;
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
        system: `Extract trending topics from social media posts AND generate 2 LinkedIn post drafts per topic.${personaContext}

Return ONLY a valid JSON array:
[{"topic":"short name","description":"one line","count":N,"accounts":["name1"],"heat":1-10,"emoji":"🤖","angles":["angle1","angle2"],"platforms":["twitter"],
"suggestions":[
  {"hook":"Punchy 1-2 line hook in persona voice","draft":"Short 2-paragraph post (60-80 words). Opinionated, specific, ends with question.","bucket":"Tactical"},
  {"hook":"Another hook","draft":"Another short draft (60-80 words)","bucket":"Topical"}
]}]
Rules: 6-8 topics. Sort by heat desc. Each topic gets exactly 2 suggestions. Keep drafts SHORT (60-80 words). ${persona?.contextMarkdown ? 'Use content buckets from the brief.' : 'Buckets: Humble Brag, Build in Public, Tactical, Topical.'}`,
        messages: [{ role: 'user', content: `${sourceCount} accounts, ${posts.length} posts:\n${compressed}` }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Claude error ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = await resp.json();
    const text = data?.content?.[0]?.text || '[]';
    const topics = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

    const usage = data?.usage || {};
    console.log(`[Trending] Claude tokens — input: ${usage.input_tokens || '?'}, output: ${usage.output_tokens || '?'}`);

    const platformCounts = {};
    const sourceCounts = {};
    for (const p of posts) {
      platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
      sourceCounts[p.source?.name || '?'] = (sourceCounts[p.source?.name || '?'] || 0) + 1;
    }
    const topSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

    const result = {
      topics,
      persona: persona ? { id: persona.id, name: persona.name, role: persona.role } : null,
      stats: { totalPosts: posts.length, platforms: platformCounts, topSources, analyzedAt: new Date().toISOString(), tokensUsed: { input: usage.input_tokens, output: usage.output_tokens } },
    };

    setCachedData(personaId, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[Trending]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
