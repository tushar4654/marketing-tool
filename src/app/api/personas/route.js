export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const personas = await prisma.persona.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { suggestions: true } } },
    });
    return NextResponse.json(personas);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, role, linkedinProfileUrl, contextMarkdown } = body;

    if (!name || !role) {
      return NextResponse.json({ error: 'name and role are required' }, { status: 400 });
    }

    const persona = await prisma.persona.create({
      data: {
        name,
        role,
        linkedinProfileUrl: linkedinProfileUrl || null,
        contextMarkdown: contextMarkdown || '',
      },
    });

    return NextResponse.json(persona, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
