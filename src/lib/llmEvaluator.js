import { prisma } from './prisma';

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const BATCH_SIZE = 15;

/**
 * Load or create the company context from the database.
 */
export async function getCompanyContext() {
  let ctx = await prisma.companyContext.findUnique({ where: { id: 'default' } });
  if (!ctx) {
    ctx = await prisma.companyContext.create({
      data: {
        id: 'default',
        companyName: '',
        valueProp: '',
        targetRoles: '[]',
        targetCompanySize: '',
        antiIcpSignals: '[]',
        customPrompt: '',
      },
    });
  }
  return ctx;
}

/**
 * Build the system prompt from company context.
 */
function buildSystemPrompt(ctx) {
  const roles = JSON.parse(ctx.targetRoles || '[]');
  const antiSignals = JSON.parse(ctx.antiIcpSignals || '[]');

  return `You are an expert B2B sales qualification AI. Your job is to evaluate LinkedIn commenters against a company's Ideal Customer Profile (ICP).

## Company Context
- **Company:** ${ctx.companyName || '[Not configured]'}
- **Value Proposition:** ${ctx.valueProp || '[Not configured]'}
- **Target Roles:** ${roles.length > 0 ? roles.join(', ') : '[Not configured]'}
- **Target Company Size:** ${ctx.targetCompanySize || '[Not configured]'}

## Anti-ICP Signals (score LOW)
${antiSignals.length > 0 ? antiSignals.map(s => `- ${s}`).join('\n') : '- Recruiters\n- Students\n- Freelancers selling services'}

${ctx.customPrompt ? `## Additional Context\n${ctx.customPrompt}` : ''}

## Your Task
For each commenter, analyze their LinkedIn title/role and evaluate:

1. **icp_match_score** (0-100): How well their title matches the ICP target roles and company size signals.
   - 80-100: Strong match (exact role match at right company type)
   - 50-79: Partial match (related role or company)
   - 0-49: Weak/no match (anti-ICP signals, irrelevant role)

2. **intent_level**: "high", "medium", or "low"
   - High: Their title suggests decision-making power for a relevant product
   - Medium: Related role but may not be the buyer
   - Low: Unlikely buyer or anti-ICP match

3. **reasoning**: One concise sentence explaining why they are/aren't a good lead.

4. **suggested_dm**: A short, personalized outreach message (2-3 sentences max) that references the post topic they engaged with. Make it conversational, not salesy. If ICP score < 40, set this to an empty string.

## Response Format
Respond ONLY with a valid JSON array. No markdown, no code fences, no explanations outside the JSON.
Each element must match this schema:
[
  {
    "index": 0,
    "icp_match_score": 85,
    "intent_level": "high",
    "reasoning": "VP of Sales at a mid-size B2B SaaS — exact ICP match.",
    "suggested_dm": "Hey {name}, saw your take on {topic}. We help teams like yours with {value_prop}. Worth a quick chat?"
  }
]`;
}

/**
 * Call Gemini API with the given prompt.
 */
async function callGemini(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set. Add it to your .env file.');

  const resp = await fetch(`${GEMINI_API}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');

  // Parse JSON — handle potential markdown code fences
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Evaluate a batch of commenters against the company ICP.
 * @param {Array} commenters - Array of { id, name, title, linkedinUrl, postContent, postAuthorName }
 * @returns {Array} Evaluation results
 */
export async function evaluateBatch(commenters, companyContext) {
  const systemPrompt = buildSystemPrompt(companyContext);

  const userPrompt = `Evaluate these ${commenters.length} LinkedIn commenters:

${commenters.map((c, i) => `[${i}] Name: "${c.name || 'Unknown'}" | Title: "${c.title || 'Unknown'}" | Post topic: "${(c.postContent || '').slice(0, 200)}…" by ${c.postAuthorName || 'Unknown'}`).join('\n')}

Return a JSON array with ${commenters.length} evaluations, one per commenter, maintaining the index order.`;

  try {
    const results = await callGemini(systemPrompt, userPrompt);
    if (!Array.isArray(results)) {
      console.warn('[LLM] Response is not an array, wrapping:', typeof results);
      return [results];
    }
    return results;
  } catch (err) {
    console.error('[LLM] Evaluation failed:', err.message);
    throw err;
  }
}

/**
 * Run the full qualification pipeline:
 * 1. Load company context
 * 2. Find all unscored commenters
 * 3. Batch-evaluate via LLM
 * 4. Save results to DB
 * 
 * @param {Object} options
 * @param {boolean} options.requalify - If true, re-evaluate all commenters (not just unscored)
 * @returns {Object} stats
 */
export async function runQualificationPipeline({ requalify = false } = {}) {
  const ctx = await getCompanyContext();

  if (!ctx.companyName && !ctx.valueProp) {
    throw new Error('Company context not configured. Go to Settings to set up your ICP.');
  }

  // Find commenters to evaluate
  const where = requalify ? {} : { icpScore: null };
  const commenters = await prisma.commenter.findMany({
    where,
    include: {
      post: {
        select: {
          content: true,
          author: { select: { name: true } },
        },
      },
    },
    take: 200, // Cap per run to manage costs
  });

  if (commenters.length === 0) {
    return { evaluated: 0, highIntent: 0, message: 'All commenters already qualified.' };
  }

  console.log(`[Qualify] Evaluating ${commenters.length} commenters in batches of ${BATCH_SIZE}…`);

  let totalEvaluated = 0;
  let highIntent = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < commenters.length; i += BATCH_SIZE) {
    const batch = commenters.slice(i, i + BATCH_SIZE).map(c => ({
      id: c.id,
      name: c.name,
      title: c.title,
      linkedinUrl: c.linkedinUrl,
      postContent: c.post?.content,
      postAuthorName: c.post?.author?.name,
    }));

    try {
      const results = await evaluateBatch(batch, ctx);

      // Save results to DB
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const idx = result.index ?? j;
        const commenter = batch[idx] || batch[j];
        if (!commenter) continue;

        try {
          await prisma.commenter.update({
            where: { id: commenter.id },
            data: {
              icpScore: Math.min(100, Math.max(0, result.icp_match_score ?? 0)),
              intentLevel: result.intent_level || 'low',
              reasoning: result.reasoning || '',
              suggestedDm: result.suggested_dm || '',
              evaluatedAt: new Date(),
            },
          });
          totalEvaluated++;
          if (result.intent_level === 'high') highIntent++;
        } catch (dbErr) {
          console.warn(`[Qualify] DB update failed for ${commenter.id}:`, dbErr.message);
          errors++;
        }
      }

      console.log(`[Qualify] ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1} — ${results.length} evaluated`);
    } catch (batchErr) {
      console.error(`[Qualify] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, batchErr.message);
      errors++;
    }

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < commenters.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return {
    evaluated: totalEvaluated,
    highIntent,
    errors,
    total: commenters.length,
    message: `Qualified ${totalEvaluated} of ${commenters.length} commenters. ${highIntent} high-intent leads found.`,
  };
}
