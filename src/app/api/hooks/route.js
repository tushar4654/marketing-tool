import { NextResponse } from 'next/server';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

    const { suggestion, angle } = await request.json();
    if (!suggestion) return NextResponse.json({ error: 'suggestion is required' }, { status: 400 });

    const resp = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.9,
        system: `You are a LinkedIn hook specialist. You study top-performing posts and know what stops the scroll.

Generate 5 opening hooks for the given post. Each must be a COMPLETELY different approach.

## Hook Styles (use EXACTLY these 5):

1. **Controversial Take** — Challenge conventional wisdom. "Everyone is wrong about [X]." or "Unpopular opinion: [bold claim]."
2. **Curiosity Gap** — Tease a specific insight without revealing it. "I discovered something about [topic] that changes everything." Include a number or specific detail.
3. **Story Open** — Drop into a specific moment. "Last Tuesday at 4pm, I got a Slack message that made me rethink my entire approach to [X]." Use time, place, emotion.
4. **Data Shock** — Lead with a surprising stat or number. "87% of [X] fail because of one thing nobody talks about." The number should feel specific (not round).
5. **Pattern Interrupt** — Break expectations. "Stop reading leadership books." or "Delete your content calendar." Short, punchy, unexpected.

## Rules
- Max 20 words per hook (LinkedIn shows ~2 lines before "see more")
- Must create an irresistible urge to click "see more"
- Include specific details (numbers, names, dates) when possible
- No generic clickbait — each hook must relate directly to the post's content
- Write in first person

Respond ONLY with valid JSON array:
[{"style":"Controversial Take","hook":"The actual hook text here."}]`,
        messages: [{ role: 'user', content: `Generate 5 hook variations for this LinkedIn post:\n\n"${suggestion.slice(0, 1000)}"\n\nAngle: ${angle || 'N/A'}` }],
      }),
    });

    if (!resp.ok) throw new Error(`Claude error ${resp.status}`);
    const data = await resp.json();
    const text = data?.content?.[0]?.text || '[]';
    const hooks = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    return NextResponse.json({ hooks });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
