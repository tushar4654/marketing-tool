import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/pipeline — Returns qualified leads, deduplicated by LinkedIn URL
 * Query params:
 *   ?minScore=75   — minimum ICP score
 *   ?intent=high   — filter by intent level
 *   ?search=query  — search by name or title
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const minScore = parseInt(searchParams.get('minScore') || '0', 10);
  const intent = searchParams.get('intent');
  const search = searchParams.get('search')?.toLowerCase();

  try {
    const where = {
      icpScore: { not: null, gte: minScore },
    };
    if (intent) where.intentLevel = intent;

    const commenters = await prisma.commenter.findMany({
      where,
      include: {
        post: {
          select: {
            content: true,
            postUrl: true,
            postedAt: true,
            author: { select: { name: true, title: true } },
          },
        },
      },
      orderBy: { icpScore: 'desc' },
    });

    // Deduplicate by LinkedIn URL — keep the highest score
    const seen = new Map();
    for (const c of commenters) {
      const key = c.linkedinUrl.toLowerCase().replace(/\/$/, '');
      const existing = seen.get(key);
      if (!existing || (c.icpScore ?? 0) > (existing.icpScore ?? 0)) {
        seen.set(key, c);
      }
    }

    let results = Array.from(seen.values());

    // Apply search filter
    if (search) {
      results = results.filter(c =>
        (c.name || '').toLowerCase().includes(search) ||
        (c.title || '').toLowerCase().includes(search) ||
        (c.reasoning || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ leads: results, total: results.length });
  } catch (e) {
    console.error('[pipeline]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
