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
        system: `You are a viral LinkedIn hook writer. Given a post, generate 5 different opening hook variations. Each should be a completely different style. Respond ONLY with valid JSON array:
[{"style":"Controversial Take","hook":"Hot take: Most AI strategies are just rebranded automation."},{"style":"Story","hook":"Last week, a client told me something that changed how I see AI forever."}]
Styles to use: Controversial Take, Personal Story, Data/Stat Lead, Question Hook, Pattern Interrupt. Make each hook punchy, scroll-stopping, and under 20 words.`,
        messages: [{ role: 'user', content: `Generate 5 hook variations for this post:\n\n"${suggestion.slice(0, 1000)}"\n\nAngle: ${angle || 'N/A'}` }],
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
