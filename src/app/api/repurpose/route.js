export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

    const { suggestion, format } = await request.json();
    if (!suggestion) return NextResponse.json({ error: 'suggestion required' }, { status: 400 });

    const formatInstructions = {
      tweet: `Convert to a single viral tweet (max 280 chars).
Rules: Must be quotable. Use strong opinion or surprising insight. No generic takes.
Good: "Most 'AI strategies' are just Ctrl+F on your processes. Real AI strategy starts with: what decision would you make differently with perfect information?"
Bad: "AI is transforming businesses! Check out our latest AI strategy. #AI #Tech"`,

      thread: `Convert to a Twitter/X thread of 5-7 tweets that teaches something specific.
Rules:
- Tweet 1: Hook that creates curiosity gap ("I spent 6 months studying X. Here are 7 patterns nobody talks about:")
- Middle tweets: One insight per tweet with a specific example
- Last tweet: Summary + CTA to follow/retweet
- Each tweet must stand alone as valuable
- Number them 1/, 2/, etc.`,

      carousel: `Convert to a LinkedIn carousel outline with 8-10 slides.
Rules:
- Slide 1 (Cover): Bold contrarian title + subtitle. NOT generic — a specific claim.
- Slides 2-8: One insight per slide. Bold headline (5 words max) + 2-3 sentences of explanation + a visual metaphor suggestion
- Slide 9: Summary of all points in one visual
- Slide 10: CTA slide — follow for more, comment your thoughts, share if valuable
Format each slide as: **Slide N: [headline]** then the content.`,

      newsletter: `Convert to a newsletter section (300-400 words).
Rules:
- Subject line: Must create curiosity ("The uncomfortable truth about X")
- Opening line: Personal anecdote or surprising stat
- Body: 3 key insights with bullet points
- Close: One actionable takeaway + "Hit reply and tell me..."
- Tone: Like writing to a smart friend, not an audience`,

      short_video: `Convert to a short-form video script (45-60 seconds).
Rules:
- HOOK (0-3s): Pattern interrupt. Start mid-thought or with a bold claim.
- PROBLEM (3-15s): Relatable pain point with specific example
- SOLUTION (15-40s): 3 concrete steps or insights
- CTA (40-60s): "Follow for more" or "Comment if you've seen this"
Format as:
[0-3s] VISUAL: [what to show] | SCRIPT: "[exact words to say]"
[3-15s] VISUAL: ... | SCRIPT: "..."
etc.`,
    };

    const instruction = formatInstructions[format] || formatInstructions.tweet;

    const resp = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.7,
        system: `You are a top-tier content repurposing expert who has helped creators grow to 100K+ followers. Your repurposed content is NOT a summary — it's a complete, polished piece optimized for the target platform.

${instruction}

Respond ONLY with valid JSON: {"content":"the repurposed content","format":"${format}","charCount":N}`,
        messages: [{ role: 'user', content: `Repurpose this LinkedIn post to ${format} format:\n\n"${suggestion.slice(0, 1500)}"` }],
      }),
    });

    if (!resp.ok) throw new Error(`Claude error ${resp.status}`);
    const data = await resp.json();
    const text = data?.content?.[0]?.text || '{}';
    const result = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
