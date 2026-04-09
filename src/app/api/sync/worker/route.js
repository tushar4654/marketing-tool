import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { scrapeProfilesBatch, scrapeCommentersBatch } from '@/lib/apifyBatch';

const PROFILE_BATCH_SIZE = 15;  // profiles per Apify actor run
const COMMENT_BATCH_SIZE = 10;  // posts per commenter scrape run
const DELAY_BETWEEN_BATCHES = 2000; // 2s between batches

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function appendLog(jobId, msg) {
  const job = await prisma.syncJob.findUnique({ where: { id: jobId }, select: { log: true } });
  let log = [];
  try { log = JSON.parse(job?.log || '[]'); } catch {}
  log.push({ ts: new Date().toISOString(), msg });
  // Keep last 100 entries
  if (log.length > 100) log = log.slice(-100);
  await prisma.syncJob.update({
    where: { id: jobId },
    data: { log: JSON.stringify(log) },
  });
  console.log(`[worker:${jobId.slice(-6)}] ${msg}`);
}

async function updateJob(jobId, data) {
  await prisma.syncJob.update({ where: { id: jobId }, data });
}

/**
 * POST /api/sync/worker
 * Long-running endpoint that processes a sync job in batches.
 * Called internally by /api/sync/start.
 */
export const maxDuration = 300; // 5 min max for serverless (adjust for self-hosted)

export async function POST(request) {
  let jobId;
  try {
    const body = await request.json();
    jobId = body.jobId;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
    if (!job || job.status === 'completed') {
      return NextResponse.json({ error: 'Invalid or completed job' }, { status: 400 });
    }

    // Mark as running
    await updateJob(jobId, { status: 'running', startedAt: new Date() });
    await appendLog(jobId, '🚀 Worker started');

    // Get stale profiles (not synced in 24h, or never synced)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const profiles = await prisma.profile.findMany({
      where: {
        OR: [
          { lastSyncedAt: null },
          { lastSyncedAt: { lt: cutoff } },
        ],
      },
      select: { id: true, url: true, name: true },
    });

    await updateJob(jobId, { total: profiles.length });
    await appendLog(jobId, `📋 Found ${profiles.length} profiles to sync`);

    let totalProcessed = 0, totalSucceeded = 0, totalFailed = 0;
    let totalPosts = 0, totalCommenters = 0;
    const allNewPostUrls = []; // Collect for batch commenter scraping

    // ═══════════════════════════════════════════
    // PHASE 1: Batch scrape profile posts
    // ═══════════════════════════════════════════
    const profileBatches = [];
    for (let i = 0; i < profiles.length; i += PROFILE_BATCH_SIZE) {
      profileBatches.push(profiles.slice(i, i + PROFILE_BATCH_SIZE));
    }

    await appendLog(jobId, `📦 Processing ${profileBatches.length} batches of ${PROFILE_BATCH_SIZE} profiles`);

    for (let bIdx = 0; bIdx < profileBatches.length; bIdx++) {
      const batch = profileBatches[bIdx];
      const batchUrls = batch.map(p => p.url);

      try {
        await appendLog(jobId, `⚡ Batch ${bIdx + 1}/${profileBatches.length}: ${batch.length} profiles`);

        const results = await scrapeProfilesBatch(batchUrls);

        // Process each profile result
        for (const profile of batch) {
          try {
            const result = results.get(profile.url);
            if (!result) {
              totalFailed++;
              totalProcessed++;
              continue;
            }

            // Update profile metadata
            if (result.profile?.name) {
              await prisma.profile.update({
                where: { id: profile.id },
                data: {
                  name:         result.profile.name,
                  title:        result.profile.title || undefined,
                  avatarUrl:    result.profile.avatarUrl || undefined,
                  lastSyncedAt: new Date(),
                },
              });
            } else {
              await prisma.profile.update({
                where: { id: profile.id },
                data: { lastSyncedAt: new Date() },
              });
            }

            // Save posts
            for (const post of result.posts) {
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
                totalPosts++;
                if (post.comments > 0) {
                  allNewPostUrls.push({ id: savedPost.id, url: post.postUrl });
                }
              } catch (e) {
                console.warn(`[worker] Post upsert error:`, e.message);
              }
            }

            totalSucceeded++;
          } catch (e) {
            console.warn(`[worker] Profile error ${profile.url}:`, e.message);
            totalFailed++;
          }
          totalProcessed++;
        }

        // Update job progress
        await updateJob(jobId, {
          processed: totalProcessed,
          succeeded: totalSucceeded,
          failed:    totalFailed,
          posts:     totalPosts,
        });

        await appendLog(jobId, `✓ Batch ${bIdx + 1} done: ${totalSucceeded} ok, ${totalFailed} failed, ${totalPosts} posts`);

      } catch (batchErr) {
        await appendLog(jobId, `✗ Batch ${bIdx + 1} FAILED: ${batchErr.message}`);
        totalFailed += batch.length;
        totalProcessed += batch.length;
        await updateJob(jobId, {
          processed: totalProcessed,
          succeeded: totalSucceeded,
          failed:    totalFailed,
        });
      }

      // Rate limit delay between batches
      if (bIdx < profileBatches.length - 1) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    // ═══════════════════════════════════════════
    // PHASE 2: Batch scrape commenters for posts
    // ═══════════════════════════════════════════
    // Also get posts from older syncs that still need commenters
    const postsNeedingCommenters = await prisma.post.findMany({
      where: {
        comments: { gt: 0 },
        commenters: { none: {} },
      },
      select: { id: true, postUrl: true },
    });

    const allPostsToScrape = [
      ...allNewPostUrls,
      ...postsNeedingCommenters.map(p => ({ id: p.id, url: p.postUrl })),
    ];

    // Deduplicate
    const seen = new Set();
    const uniquePosts = allPostsToScrape.filter(p => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });

    if (uniquePosts.length > 0) {
      await appendLog(jobId, `👥 Phase 2: Scraping commenters for ${uniquePosts.length} posts`);

      const commentBatches = [];
      for (let i = 0; i < uniquePosts.length; i += COMMENT_BATCH_SIZE) {
        commentBatches.push(uniquePosts.slice(i, i + COMMENT_BATCH_SIZE));
      }

      for (let cIdx = 0; cIdx < commentBatches.length; cIdx++) {
        const batch = commentBatches[cIdx];
        try {
          const urls = batch.map(p => p.url);
          const results = await scrapeCommentersBatch(urls);

          for (const post of batch) {
            const commenters = results.get(post.url) || [];
            for (const c of commenters) {
              if (!c.linkedinUrl) continue;
              try {
                await prisma.commenter.upsert({
                  where: { postId_linkedinUrl: { postId: post.id, linkedinUrl: c.linkedinUrl } },
                  update: { name: c.name, title: c.title, avatarUrl: c.avatarUrl },
                  create: {
                    postId:      post.id,
                    name:        c.name,
                    linkedinUrl: c.linkedinUrl,
                    title:       c.title,
                    avatarUrl:   c.avatarUrl,
                  },
                });
                totalCommenters++;
              } catch (e) {
                // Ignore duplicate errors
              }
            }
          }

          await updateJob(jobId, { commenters: totalCommenters });
          await appendLog(jobId, `✓ Commenter batch ${cIdx + 1}/${commentBatches.length}: ${totalCommenters} total commenters`);

        } catch (e) {
          await appendLog(jobId, `✗ Commenter batch ${cIdx + 1} failed: ${e.message}`);
        }

        if (cIdx < commentBatches.length - 1) await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    // ═══════════════════════════════════════════
    // DONE
    // ═══════════════════════════════════════════
    await updateJob(jobId, {
      status:      'completed',
      processed:   totalProcessed,
      succeeded:   totalSucceeded,
      failed:      totalFailed,
      posts:       totalPosts,
      commenters:  totalCommenters,
      completedAt: new Date(),
    });
    await appendLog(jobId, `🏁 Sync complete: ${totalSucceeded} profiles, ${totalPosts} posts, ${totalCommenters} commenters`);

    return NextResponse.json({ status: 'completed', jobId });

  } catch (e) {
    console.error('[worker fatal]', e);
    if (jobId) {
      await updateJob(jobId, { status: 'failed', error: e.message, completedAt: new Date() }).catch(() => {});
      await appendLog(jobId, `💀 Fatal error: ${e.message}`).catch(() => {});
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
