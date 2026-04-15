import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    const sources = await prisma.contentSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { posts: true } } },
    });

    // CSV export
    if (format === 'csv') {
      const header = 'Name,Platform,URL,RSS Feed URL,Posts Scraped,Last Synced';
      const rows = sources.map(s =>
        [
          `"${(s.name || '').replace(/"/g, '""')}"`,
          s.platform,
          `"${s.url}"`,
          `"${s.rssFeedUrl || ''}"`,
          s._count?.posts || 0,
          s.lastScrapedAt ? new Date(s.lastScrapedAt).toISOString() : 'Never',
        ].join(',')
      );
      const csv = [header, ...rows].join('\n');
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="content-sources-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json(sources);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const source = await prisma.contentSource.create({
      data: {
        name: body.name,
        platform: body.platform,
        url: body.url,
        rssFeedUrl: body.rssFeedUrl || null,
      },
    });
    return NextResponse.json(source, { status: 201 });
  } catch (err) {
    if (err.code === 'P2002') return NextResponse.json({ error: 'Source URL already exists' }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
