import { NextResponse } from 'next/server';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

    const { suggestion, format } = await request.json();
    if (!suggestion) return NextResponse.json({ error: 'suggestion required' }, { status: 400 });

    const formatInstructions = {
      tweet: 'Convert to a single punchy tweet (max 280 chars). Make it quotable and shareable. Include 1-2 relevant hashtags.',
      thread: 'Convert to a Twitter/X thread of 4-6 tweets. First tweet is the hook. Each tweet should stand alone but flow together. Number them 1/, 2/, etc.',
      carousel: 'Convert to a LinkedIn carousel outline with 6-8 slides. Format: Slide 1 (Cover): title. Slide 2-7: one key point per slide with a bold headline and 1-2 sentences. Last slide: CTA.',
      newsletter: 'Convert to a short newsletter intro paragraph (3-4 sentences) that teases the full topic with a compelling subject line.',
      short_video: 'Convert to a short-form video script (30-60 seconds). Include: Hook (first 3 sec), Problem, Solution, CTA. Format as VISUAL: [what to show] | SCRIPT: [what to say].',
    };

    const instruction = formatInstructions[format] || formatInstructions.tweet;

    const resp = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.7,
        system: `You are a multi-platform content repurposing expert. ${instruction} Respond ONLY with valid JSON: {"content":"the repurposed content","format":"${format}","charCount":280}`,
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
