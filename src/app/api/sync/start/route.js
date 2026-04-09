import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/sync/start
 * Creates a SyncJob and starts the background worker.
 * Body (optional): { staleHours: 24, forceAll: false }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const staleHours = body.staleHours || 24;
    const forceAll = body.forceAll || false;

    // Check if there's already a running job
    const running = await prisma.syncJob.findFirst({
      where: { status: 'running' },
    });
    if (running) {
      return NextResponse.json({
        error: 'A sync is already running',
        jobId: running.id,
        processed: running.processed,
        total: running.total,
      }, { status: 409 });
    }

    // Find profiles that need syncing (smart sync)
    const cutoff = new Date(Date.now() - staleHours * 60 * 60 * 1000);
    let profiles;

    if (forceAll) {
      profiles = await prisma.profile.findMany({ select: { id: true, url: true } });
    } else {
      profiles = await prisma.profile.findMany({
        where: {
          OR: [
            { lastSyncedAt: null },
            { lastSyncedAt: { lt: cutoff } },
          ],
        },
        select: { id: true, url: true },
      });
    }

    if (profiles.length === 0) {
      return NextResponse.json({
        message: 'All profiles are up to date',
        total: 0,
      });
    }

    // Create the sync job
    const job = await prisma.syncJob.create({
      data: {
        status: 'pending',
        total: profiles.length,
        log: JSON.stringify([{ ts: new Date().toISOString(), msg: `Job created for ${profiles.length} profiles (smart sync, stale>${staleHours}h)` }]),
      },
    });

    // Start the worker in the background (fire and forget)
    const workerUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sync/worker`;
    fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(err => console.error('[sync/start] Worker trigger failed:', err.message));

    console.log(`[sync/start] Created job ${job.id} for ${profiles.length} profiles`);

    return NextResponse.json({
      jobId: job.id,
      total: profiles.length,
      message: `Sync started for ${profiles.length} profiles`,
    });
  } catch (e) {
    console.error('[sync/start error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
