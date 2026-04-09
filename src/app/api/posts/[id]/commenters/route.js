import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/posts/:id/commenters
 * Returns all commenters for a given post
 */
export async function GET(req, { params }) {
  const { id } = await params;
  try {
    const commenters = await prisma.commenter.findMany({
      where: { postId: id },
      orderBy: { scrapedAt: 'desc' },
    });
    return NextResponse.json({ commenters });
  } catch (e) {
    console.error('[commenters]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
