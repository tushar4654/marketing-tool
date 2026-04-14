import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sources = await prisma.contentSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { posts: true } } },
    });
    return NextResponse.json(sources);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, platform, url, rssFeedUrl } = body;

    if (!name || !platform || !url) {
      return NextResponse.json({ error: 'name, platform, and url are required' }, { status: 400 });
    }

    if (!['linkedin', 'twitter', 'blog'].includes(platform)) {
      return NextResponse.json({ error: 'platform must be linkedin, twitter, or blog' }, { status: 400 });
    }

    const source = await prisma.contentSource.create({
      data: { name, platform, url, rssFeedUrl: platform === 'blog' ? rssFeedUrl : null },
    });

    return NextResponse.json(source, { status: 201 });
  } catch (err) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'A source with this URL already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
