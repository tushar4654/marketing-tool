import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where = platform !== 'all' ? { platform } : {};

    const [posts, total] = await Promise.all([
      prisma.contentPost.findMany({
        where,
        orderBy: { scrapedAt: 'desc' },
        skip,
        take: limit,
        include: { source: { select: { name: true, platform: true } } },
      }),
      prisma.contentPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
