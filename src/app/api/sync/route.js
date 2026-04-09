import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scrapeLinkedInProfile, scrapePostCommenters } from '@/lib/apify';

async function saveCommenters(postId, postUrl) {
  try {
    const commenters = await scrapePostCommenters(postUrl);
    let saved = 0;
    for (const commenter of commenters) {
      if (!commenter.linkedinUrl) continue;
      try {
        await prisma.commenter.upsert({
          where: { postId_linkedinUrl: { postId, linkedinUrl: commenter.linkedinUrl } },
          update: {
            name:      commenter.name,
            title:     commenter.title,
            avatarUrl: commenter.avatarUrl,
          },
          create: {
            postId,
            name:        commenter.name,
            linkedinUrl: commenter.linkedinUrl,
            title:       commenter.title,
            avatarUrl:   commenter.avatarUrl,
          },
        });
        saved++;
      } catch (ce) {
        console.warn(`[sync] Commenter upsert error:`, ce.message);
      }
    }
    console.log(`[sync] ✓ ${saved} commenters saved for post ${postUrl}`);
    return saved;
  } catch (err) {
    console.warn(`[sync] Commenter scrape failed for ${postUrl}:`, err.message);
    return 0;
  }
}

export async function POST() {
  try {
    const profiles = await prisma.profile.findMany();
    if (profiles.length === 0) {
      return NextResponse.json({ message: 'No profiles to sync', synced: 0, posts: 0 });
    }

    let totalPosts = 0;
    let totalCommenters = 0;
    const results = [];

    // Phase 1: Scrape latest posts + their commenters
    for (const profile of profiles) {
      let retries = 2;
      let success = false;

      while (retries > 0 && !success) {
        try {
          const { profile: scraped, posts } = await scrapeLinkedInProfile(profile.url);

          if (scraped.name) {
            await prisma.profile.update({
              where: { id: profile.id },
              data: {
                name:      scraped.name,
                title:     scraped.title     || profile.title,
                avatarUrl: scraped.avatarUrl || profile.avatarUrl,
              },
            });
          }

          let savedPosts = 0;
          for (const post of posts) {
            try {
              const savedPost = await prisma.post.upsert({
                where: { postUrl: post.postUrl },
                update: {
                  likes:    post.likes,
                  comments: post.comments,
                  postedAt: post.postedAt ? new Date(post.postedAt) : undefined,
                },
                create: {
                  content:  post.content,
                  postUrl:  post.postUrl,
                  authorId: profile.id,
                  postedAt: post.postedAt ? new Date(post.postedAt) : null,
                  likes:    post.likes,
                  comments: post.comments,
                },
              });
              savedPosts++;

              // Scrape commenters for this post
              const saved = await saveCommenters(savedPost.id, post.postUrl);
              totalCommenters += saved;

            } catch (upsertErr) {
              console.error(`[sync] Upsert error:`, upsertErr.message);
            }
          }

          totalPosts += savedPosts;
          results.push({ profile: profile.name || profile.url, posts: savedPosts, status: 'ok' });
          success = true;

        } catch (profileErr) {
          retries--;
          if (retries === 0) {
            console.error(`[sync] Failed for ${profile.url}:`, profileErr.message);
            results.push({ profile: profile.name || profile.url, posts: 0, status: 'error', error: profileErr.message });
          } else {
            console.warn(`[sync] Retrying ${profile.url} …`);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }
    }

    // Phase 2: Backfill commenters for ALL posts that have comments but no commenters yet
    const postsNeedingCommenters = await prisma.post.findMany({
      where: {
        comments: { gt: 0 },
        commenters: { none: {} },
      },
      select: { id: true, postUrl: true, comments: true },
    });

    if (postsNeedingCommenters.length > 0) {
      console.log(`[sync] Phase 2: Backfilling commenters for ${postsNeedingCommenters.length} older posts …`);
      for (const post of postsNeedingCommenters) {
        const saved = await saveCommenters(post.id, post.postUrl);
        totalCommenters += saved;
      }
    }

    return NextResponse.json({
      message:    'Sync complete 🟢 (live data)',
      synced:     profiles.length,
      posts:      totalPosts,
      commenters: totalCommenters,
      backfilled: postsNeedingCommenters?.length || 0,
      results,
      source:     'apify',
    });

  } catch (e) {
    console.error('[sync error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
