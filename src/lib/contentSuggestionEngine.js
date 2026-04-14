import { prisma } from './prisma';
import { retrieveContentMemories } from './mem0';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const BATCH_SIZE = 8;

/**
 * Detect if persona context includes a structured content brief (buckets, positioning, etc.)
 */
function hasStructuredBrief(contextMarkdown) {
  if (!contextMarkdown) return false;
  const keywords = ['Content Bucket', 'Positioning', 'Audience', 'Copywriting Principles', 'Fit score', 'Hook'];
  return keywords.filter(k => contextMarkdown.includes(k)).length >= 3;
}

/**
 * Build system prompt — adapts based on whether persona has a structured brief or not.
 */
function buildSystemPrompt(persona, allSources, memoryContext) {
  const sourceSummary = allSources.map(s => {
    const platformLabel = s.platform === 'linkedin' ? 'LinkedIn' : s.platform === 'twitter' ? 'Twitter/X' : 'Blog';
    return `- ${s.name} (${platformLabel}): ${s.url}`;
  }).join('\n');

  const isStructured = hasStructuredBrief(persona.contextMarkdown);

  if (isStructured) {
    // ─── STRUCTURED BRIEF MODE ──────────────────────────────
    // The persona's contextMarkdown IS the full strategy brief.
    // We pass it verbatim and ask Claude to follow it precisely.
    return `You are ${persona.name}'s content strategist. You have a detailed Content Strategy Brief that defines positioning, audience, content buckets, copywriting principles, and reference examples.

## CONTENT STRATEGY BRIEF (follow this precisely)
${persona.contextMarkdown}

## Tracked Accounts (Content Sources)
${sourceSummary || '[No sources configured]'}

## Historical Content Intelligence (from Memory)
${memoryContext || '[No historical memories available yet]'}

## Your Task
Analyze the provided content pieces and generate posting suggestions following the brief EXACTLY. For each suggestion, you MUST include:

1. **fit_score** (1-10): How well this matches the persona's positioning + audience (per the brief)
2. **buckets**: Array of which content buckets this maps to (e.g., ["Humble Brag", "Topical"])
3. **suggestion**: The full suggested post text (2-4 paragraphs, LinkedIn-optimized)
4. **hook_idea**: The opening hook — two lines max, following the copywriting principles in the brief
5. **angle**: The specific reframe or POV (not a recap of the source)
6. **why_it_works**: Which copywriting principles it hits and which audience segment it targets
7. **risks**: Honest assessment of why it might flop or miss

FILTER AGGRESSIVELY: If a content piece scores below 4 on fit, SKIP IT. Only suggest posts that genuinely match the positioning.

## Response Format
Respond ONLY with a valid JSON array. No markdown, no code fences:
[
  {
    "source_index": 0,
    "fit_score": 8,
    "buckets": ["Tactical", "Build in Public"],
    "suggestion": "Full post text...",
    "hook_idea": "Hook line 1\\nHook line 2",
    "angle": "The unique take...",
    "why_it_works": "Hits specificity principle, targets primary audience...",
    "risks": "Could feel too product-y if not framed right"
  }
]`;
  }

  // ─── GENERIC MODE (original behavior) ──────────────────────
  return `You are an expert social media strategist and content advisor. Your job is to analyze trending content from industry thought leaders and suggest original posts for a specific persona to publish on their LinkedIn.

## Persona Profile
- **Name:** ${persona.name}
- **Role:** ${persona.role.toUpperCase()}
- **LinkedIn Profile:** ${persona.linkedinProfileUrl || '[Not configured]'}

## Persona Context & Company Information
${persona.contextMarkdown || '[No context provided]'}

## Tracked Accounts (Content Sources)
${sourceSummary || '[No sources configured yet]'}

## Historical Content Intelligence (from Memory)
${memoryContext || '[No historical memories available yet — sync sources to build memory]'}

## Your Task
Analyze the provided content pieces and generate posting suggestions for this persona. Each suggestion should:
1. **Be original** — Don't copy the source content. Offer a unique perspective.
2. **Match the persona's voice** — CEO talks vision/culture, CTO about tech, CRO about revenue/pipeline.
3. **Be engagement-optimized** — Include hooks, take a stance, use storytelling.
4. **Reference the trend** — Ride the wave but bring a new angle.
5. **Leverage historical patterns** — Use memory context for themes that consistently perform.

## Response Format
Respond ONLY with a valid JSON array:
[
  {
    "source_index": 0,
    "suggestion": "The full suggested post text (2-4 paragraphs, LinkedIn-optimized)",
    "angle": "One sentence explaining the unique angle",
    "hook_idea": "The opening hook line"
  }
]`;
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
  console.log(`[Suggestions] Generating for "${persona.name}" (${persona.role}) via Claude | ${newPosts.length} posts | Brief: ${isStructured ? 'structured' : 'generic'} | Mem0: ${memoryContext ? 'yes' : 'no'}…`);

  const systemPrompt = buildSystemPrompt(persona, allSources, memoryContext);
  let totalGenerated = 0;
  let totalSkipped = 0;

  for (let i = 0; i < newPosts.length; i += BATCH_SIZE) {
    const batch = newPosts.slice(i, i + BATCH_SIZE);

    // Sanitize content for JSON safety
    const sanitize = (s) => s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '').replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

    const userPrompt = `Generate content suggestions based on these ${batch.length} pieces of content:\n\n${batch.map((p, idx) => {
      const platformLabel = p.platform === 'blog' ? '📝 Blog' : p.platform === 'twitter' ? '🐦 Twitter' : '💼 LinkedIn';
      return `[${idx}] ${platformLabel} | Source: "${p.source?.name || 'Unknown'}" | Author: ${p.authorName || 'Unknown'}\nContent: "${sanitize(p.content.slice(0, 800))}${p.content.length > 800 ? '…' : ''}"`;
    }).join('\n\n')}\n\nGenerate suggestions only for content that fits. Return a JSON array.`;

    try {
      const results = await callClaude(systemPrompt, userPrompt);
      if (!Array.isArray(results)) continue;

      for (const result of results) {
        const idx = result.source_index ?? 0;
        const post = batch[idx] || batch[0];
        if (!post || !result.suggestion) continue;

        // For structured briefs: skip low-fit suggestions
        if (isStructured && result.fit_score && result.fit_score < 4) {
          totalSkipped++;
          continue;
        }

        // Build rich angle with structured metadata
        let richAngle = result.angle || '';
        if (isStructured) {
          const parts = [];
          if (result.fit_score) parts.push(`Fit: ${result.fit_score}/10`);
          if (result.buckets?.length) parts.push(`Buckets: ${result.buckets.join(' + ')}`);
          if (result.why_it_works) parts.push(`Why: ${result.why_it_works}`);
          if (result.risks) parts.push(`Risks: ${result.risks}`);
          if (parts.length > 0) richAngle = `${richAngle}\n\n${parts.join('\n')}`;
        }

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
