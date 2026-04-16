export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { prisma } from '@/lib/prisma';
import { fetchRSSFeed } from '@/lib/rssFetcher';
import { storeContentMemory } from '@/lib/mem0';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const sources = await prisma.contentSource.findMany({
      where: { platform: 'blog' },
    });

    if (sources.length === 0) {
      return NextResponse.json({ message: 'No blog/RSS sources configured', synced: 0 });
    }

    let totalPosts = 0;
    const results = [];

    for (const source of sources) {
      const feedUrl = source.rssFeedUrl || source.url;
      try {
        const { posts } = await fetchRSSFeed(feedUrl);
        const storedPosts = [];

        for (const post of posts) {
          try {
            await prisma.contentPost.upsert({
              where: { postUrl: post.postUrl },
              update: { content: post.content, postedAt: post.postedAt ? new Date(post.postedAt) : null },
              create: {
                sourceId: source.id,
                platform: 'blog',
                authorName: post.authorName,
                authorUrl: post.authorUrl,
                content: post.title ? `${post.title}\n\n${post.content}` : post.content,
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
          await storeContentMemory(source.id, source.name, 'blog', storedPosts);
        }

        results.push({ source: source.name, posts: storedPosts.length });
      } catch (err) {
        results.push({ source: source.name, error: err.message });
      }
    }

    return NextResponse.json({ synced: totalPosts, results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
