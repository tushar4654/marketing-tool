export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { generateSuggestions } from '@/lib/contentSuggestionEngine';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { personaId } = body;

    if (!personaId) {
      return NextResponse.json({ error: 'personaId is required' }, { status: 400 });
    }

    const result = await generateSuggestions(personaId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
