import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const personaId = searchParams.get('personaId');
    const status = searchParams.get('status') || 'pending';

    const where = {};
    if (personaId) where.personaId = personaId;
    if (status !== 'all') where.status = status;

    const suggestions = await prisma.contentSuggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        persona: { select: { name: true, role: true, linkedinProfileUrl: true } },
        contentPost: { select: { content: true, postUrl: true, platform: true, authorName: true, postedAt: true, source: { select: { name: true } } } },
      },
      take: 50,
    });

    return NextResponse.json(suggestions);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status, dismissReason } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const data = { status };
    if (status === 'dismissed' && dismissReason) {
      data.dismissReason = dismissReason;
    }

    const suggestion = await prisma.contentSuggestion.update({
      where: { id },
      data,
    });

    return NextResponse.json(suggestion);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
