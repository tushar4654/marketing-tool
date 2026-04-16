export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());
    const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1);

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    // Get used suggestions in this month range
    const usedSuggestions = await prisma.contentSuggestion.findMany({
      where: {
        status: 'used',
        createdAt: { gte: start, lte: end },
      },
      include: {
        persona: { select: { name: true, role: true } },
        contentPost: { select: { platform: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get pending suggestions count
    const pendingCount = await prisma.contentSuggestion.count({ where: { status: 'pending' } });

    // Build day-by-day map
    const days = {};
    usedSuggestions.forEach(s => {
      const day = s.createdAt.toISOString().split('T')[0];
      if (!days[day]) days[day] = [];
      days[day].push({
        id: s.id,
        suggestion: s.suggestion?.slice(0, 100) + (s.suggestion?.length > 100 ? '…' : ''),
        persona: s.persona?.name,
        role: s.persona?.role,
        platform: s.contentPost?.platform,
      });
    });

    return NextResponse.json({ year, month, days, pendingCount, totalUsed: usedSuggestions.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
