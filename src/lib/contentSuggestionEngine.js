import { prisma } from './prisma';
import { retrieveContentMemories } from './mem0';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const BATCH_SIZE = 8;

/**
 * LinkedIn Content Frameworks that consistently drive engagement.
 * These are injected into the Claude prompt to produce better output.
 */
const CONTENT_FRAMEWORKS = `
## HIGH-PERFORMING LINKEDIN POST FRAMEWORKS

Use these proven frameworks. EVERY suggestion must follow one:

### 1. Contrarian Take
"Everyone says [common belief]. Here's why that's wrong."
→ State the conventional wisdom, then demolish it with a specific example
→ End with: "The real lesson? [insight]"

### 2. Story → Lesson  
"Last [time period], [specific thing happened]."  
→ Tell a 3-sentence story with a turning point  
→ Extract 2-3 specific bullet-point lessons  
→ End with a question to the audience

### 3. Before/After Transformation
"6 months ago: [old state]. Today: [new state]."
→ Show the journey with specific metrics or examples
→ List the 3 things that changed

### 4. "Most people think X, but top performers do Y"
→ Split screen contrast between common and elite approaches
→ Each point should be specific, not generic

### 5. Framework / How-To List
"My [X]-step framework for [result]:"
→ Numbered steps (3-5 max)
→ Each step has a bold label + one-line explanation
→ End with "Which step are you stuck on?"

### 6. Data-Driven Insight
"[Surprising stat or data point]."
→ Add context: what this means for the reader
→ Give one actionable takeaway

## POST FORMATTING RULES (LinkedIn-specific)
- First 2 lines = HOOK. Must stop the scroll. Under 20 words.
- Use short paragraphs (1-2 sentences each)
- Add line breaks between paragraphs (LinkedIn rewards whitespace)
- 150-250 words total (optimal LinkedIn length)
- End with a QUESTION or CALL TO ACTION (drives comments)
- NO hashtags in the middle of posts (put 3-5 at the very end if needed)
- Use "I" and "we" — first person always
- Include ONE specific example, number, or name (specificity = credibility)
- Avoid corporate jargon: "leverage", "synergy", "paradigm", "ecosystem"
`;

/**
 * Detect if persona context includes a structured content brief
 */
function hasStructuredBrief(contextMarkdown) {
  if (!contextMarkdown) return false;
  const keywords = ['Content Bucket', 'Positioning', 'Audience', 'Copywriting Principles', 'Fit score', 'Hook'];
  return keywords.filter(k => contextMarkdown.includes(k)).length >= 3;
}

/**
 * Build system prompt — now with content frameworks for much better output quality
 */
function buildSystemPrompt(persona, allSources, memoryContext) {
  const sourceSummary = allSources.map(s => {
    const platformLabel = s.platform === 'linkedin' ? 'LinkedIn' : s.platform === 'twitter' ? 'Twitter/X' : 'Blog';
    return `- ${s.name} (${platformLabel}): ${s.url}`;
  }).join('\n');

  const isStructured = hasStructuredBrief(persona.contextMarkdown);

  if (isStructured) {
    return `You are ${persona.name}'s content ghostwriter. You write LinkedIn posts that sound like a real person, not a marketing team.

## CONTENT STRATEGY BRIEF (follow precisely)
${persona.contextMarkdown}

${CONTENT_FRAMEWORKS}

## Tracked Accounts (Content Sources)
${sourceSummary || '[No sources configured]'}

## Historical Content Intelligence
${memoryContext || '[No history yet]'}

## Your Task
Analyze each content piece and generate READY-TO-POST LinkedIn drafts. Not angles. Not suggestions. Actual posts that ${persona.name} can copy-paste and publish.

Rules:
- SKIP any source content scoring below 4 on fit
- Each post must follow ONE of the frameworks above
- Write in ${persona.name}'s voice — authoritative but human
- Include the framework name used in the "framework" field
- Every post must have a scroll-stopping hook (first 2 lines)
- Every post must end with a question or CTA

## Response Format
Return ONLY valid JSON array:
[{
  "source_index": 0,
  "fit_score": 8,
  "buckets": ["Tactical"],
  "framework": "Contrarian Take",
  "suggestion": "The complete, ready-to-post LinkedIn post text.\n\nWith proper line breaks.\n\nAnd formatting.",
  "hook_idea": "The first 2 lines of the post",
  "angle": "One-line description of the unique take",
  "why_it_works": "Which copywriting principles it hits",
  "risks": "Why it might not land"
}]`;
  }

  // ─── GENERIC MODE ──────────────────────────────
  return `You are ${persona.name}'s LinkedIn ghostwriter. You write posts that sound like a real human sharing hard-won insights — not a content marketer filling a calendar.

## Persona
- **Name:** ${persona.name}
- **Role:** ${persona.role.toUpperCase()}
- **LinkedIn:** ${persona.linkedinProfileUrl || '[Not set]'}
- **Context:** ${persona.contextMarkdown || '[No context — write as a seasoned tech executive]'}

${CONTENT_FRAMEWORKS}

## Content Sources
${sourceSummary || '[None]'}

## Memory
${memoryContext || '[No history]'}

## Your Task
Turn each source post into a READY-TO-POST LinkedIn draft for ${persona.name}. Not a summary. Not an "angle". A complete post they can copy and publish.

For each post:
1. Pick the best framework from the list above
2. Write the FULL post (150-250 words, LinkedIn-formatted)
3. Make the hook scroll-stopping (first 2 lines)
4. Include at least one specific example, number, or story
5. End with a question or CTA
6. Write in first person — "I", not "we"

CRITICAL: The post should feel like ${persona.name} wrote it after seeing the source content and being inspired — NOT like a rephrased version of the source.

## Response Format
Return ONLY valid JSON array:
[{
  "source_index": 0,
  "framework": "Story → Lesson",
  "suggestion": "Complete ready-to-post text with\\n\\nproper LinkedIn formatting\\n\\nand line breaks.",
  "hook_idea": "First 2 lines that stop the scroll",
  "angle": "One line: what makes this take unique"
}]`;
}

async function callClaude(systemPrompt, userPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');

  const resp = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Claude API error ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Empty response from Claude');

  const usage = data?.usage || {};
  console.log(`[Suggestions] Claude tokens — input: ${usage.input_tokens || '?'}, output: ${usage.output_tokens || '?'}`);

  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

export async function generateSuggestions(personaId) {
  const persona = await prisma.persona.findUnique({ where: { id: personaId } });
  if (!persona) throw new Error(`Persona ${personaId} not found`);

  const allSources = await prisma.contentSource.findMany({ orderBy: { createdAt: 'desc' } });

  // Retrieve memories from Mem0
  const personaSearchContext = `${persona.role} ${persona.name} ${persona.contextMarkdown || ''}`.slice(0, 500);
  const sourceIds = allSources.map(s => s.id);
  const memoryContext = await retrieveContentMemories(personaSearchContext, sourceIds);

  // Find posts not yet used for suggestions
  const existingSuggestions = await prisma.contentSuggestion.findMany({
    where: { personaId },
    select: { contentPostId: true },
  });
  const usedPostIds = new Set(existingSuggestions.map(s => s.contentPostId));

  const recentPosts = await prisma.contentPost.findMany({
    orderBy: { scrapedAt: 'desc' },
    take: 50,
    include: { source: { select: { name: true, platform: true } } },
  });

  const newPosts = recentPosts.filter(p => !usedPostIds.has(p.id));
  if (newPosts.length === 0) {
    return { generated: 0, personaName: persona.name, message: 'No new content to generate suggestions from. Sync sources first.' };
  }

  const isStructured = hasStructuredBrief(persona.contextMarkdown);
  console.log(`[Suggestions] Generating for "${persona.name}" (${persona.role}) | ${newPosts.length} posts | Brief: ${isStructured ? 'structured' : 'generic'} | Mem0: ${memoryContext ? 'yes' : 'no'}`);

  const systemPrompt = buildSystemPrompt(persona, allSources, memoryContext);
  let totalGenerated = 0;
  let totalSkipped = 0;

  for (let i = 0; i < newPosts.length; i += BATCH_SIZE) {
    const batch = newPosts.slice(i, i + BATCH_SIZE);

    const sanitize = (s) => s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '').replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

    const userPrompt = `Write LinkedIn posts inspired by these ${batch.length} pieces of content:\n\n${batch.map((p, idx) => {
      const platformLabel = p.platform === 'blog' ? '📝 Blog' : p.platform === 'twitter' ? '🐦 Twitter' : '💼 LinkedIn';
      return `[${idx}] ${platformLabel} | Source: "${p.source?.name || 'Unknown'}" | Author: ${p.authorName || 'Unknown'}\nContent: "${sanitize(p.content.slice(0, 800))}${p.content.length > 800 ? '…' : ''}"`;
    }).join('\n\n')}\n\nWrite COMPLETE ready-to-post drafts. Use the frameworks provided. Return JSON array.`;

    try {
      const results = await callClaude(systemPrompt, userPrompt);
      if (!Array.isArray(results)) continue;

      for (const result of results) {
        const idx = result.source_index ?? 0;
        const post = batch[idx] || batch[0];
        if (!post || !result.suggestion) continue;

        if (isStructured && result.fit_score && result.fit_score < 4) {
          totalSkipped++;
          continue;
        }

        // Build rich angle with framework and metadata
        let richAngle = result.angle || '';
        const parts = [];
        if (result.framework) parts.push(`Framework: ${result.framework}`);
        if (isStructured) {
          if (result.fit_score) parts.push(`Fit: ${result.fit_score}/10`);
          if (result.buckets?.length) parts.push(`Buckets: ${result.buckets.join(' + ')}`);
          if (result.why_it_works) parts.push(`Why: ${result.why_it_works}`);
          if (result.risks) parts.push(`Risks: ${result.risks}`);
        }
        if (parts.length > 0) richAngle = `${richAngle}\n\n${parts.join('\n')}`;

        try {
          await prisma.contentSuggestion.create({
            data: {
              personaId: persona.id,
              contentPostId: post.id,
              suggestion: result.suggestion,
              angle: richAngle.trim() || null,
              hookIdea: result.hook_idea || null,
              status: 'pending',
            },
          });
          totalGenerated++;
        } catch (dbErr) {
          console.warn(`[Suggestions] DB create failed:`, dbErr.message);
        }
      }
      console.log(`[Suggestions] ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1} done`);
    } catch (batchErr) {
      console.error(`[Suggestions] Batch failed:`, batchErr.message);
    }

    if (i + BATCH_SIZE < newPosts.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const skipMsg = totalSkipped > 0 ? ` (${totalSkipped} skipped — low fit score)` : '';
  return {
    generated: totalGenerated,
    personaName: persona.name,
    total: newPosts.length,
    message: `Generated ${totalGenerated} suggestions for ${persona.name} (${persona.role.toUpperCase()}).${skipMsg}`,
  };
}
