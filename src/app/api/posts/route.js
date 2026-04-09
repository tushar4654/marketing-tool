import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/posts
 * Query params:
 *   ?profileId=xxx     - filter by one profile
 *   ?relevant=true     - only posts matching saved interests
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const profileId   = searchParams.get('profileId');
  const relevantOnly = searchParams.get('relevant') === 'true';

  const where = {};
  if (profileId) where.authorId = profileId;

  const [posts, interests] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, title: true, url: true, avatarUrl: true } },
        _count:  { select: { commenters: true } },
      },
      orderBy: { postedAt: 'desc' },
    }),
    relevantOnly ? prisma.interest.findMany() : Promise.resolve([]),
  ]);

  // Attach relevance data to every post regardless of filter
  const allInterests = relevantOnly ? interests : await prisma.interest.findMany();

  const enriched = posts.map(p => {
    const lower = (p.content || '').toLowerCase();
    const matches = allInterests
      .filter(i => lower.includes(i.keyword.toLowerCase()))
      .map(i => i.keyword);
    return { ...p, matchedKeywords: matches, relevant: matches.length > 0 };
  });

  // To satisfy 'only see the latest one per profile' logic, we deduplicate by authorId
  // Since posts are already ordered by postedAt desc, we only keep the first one we find per author.
  const seenAuthors = new Set();
  const latestPostsOnly = enriched.filter(p => {
    const normName = (p.author?.name || p.authorId).toLowerCase();
    if (seenAuthors.has(normName)) return false;
    seenAuthors.add(normName);
    return true;
  });

  const result = relevantOnly ? latestPostsOnly.filter(p => p.relevant) : latestPostsOnly;

  return NextResponse.json({ posts: result });
}

export const dynamic = 'force-dynamic';
