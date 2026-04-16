export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { prisma } from '@/lib/prisma';
import { scrapeTwitterBatch } from '@/lib/apifyTwitter';
import { storeContentMemory } from '@/lib/mem0';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const fullHistory = body.fullHistory === true;

    const sources = await prisma.contentSource.findMany({
      where: { platform: 'twitter' },
    });

    if (sources.length === 0) {
      return NextResponse.json({ message: 'No Twitter sources configured', synced: 0 });
    }

    // Single batched call instead of 32 individual calls
    const batchResults = await scrapeTwitterBatch(sources, fullHistory);

    let totalPosts = 0;
    const results = [];

    for (const source of sources) {
      const { posts } = batchResults.get(source.url) || { posts: [] };
      const storedPosts = [];

      for (const post of posts) {
        try {
          await prisma.contentPost.upsert({
            where: { postUrl: post.postUrl },
            update: { content: post.content, postedAt: post.postedAt ? new Date(post.postedAt) : null },
            create: {
              sourceId: source.id,
              platform: 'twitter',
              authorName: post.authorName,
              authorUrl: post.authorUrl,
              content: post.content,
              postUrl: post.postUrl,
              postedAt: post.postedAt ? new Date(post.postedAt) : null,
            },
          });
          storedPosts.push(post);
          totalPosts++;
        } catch (e) { /* duplicate */ }
      }

      await prisma.contentSource.update({
        where: { id: source.id },
        data: { lastScrapedAt: new Date() },
      });

      // Store memories in Mem0
      if (storedPosts.length > 0) {
        await storeContentMemory(source.id, source.name, 'twitter', storedPosts);
      }

      results.push({ source: source.name, posts: storedPosts.length });
    }

    return NextResponse.json({ synced: totalPosts, results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
