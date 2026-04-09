import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/sync/status/:id
 * Returns the current status of a sync job for polling.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const job = await prisma.syncJob.findUnique({ where: { id } });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    let log = [];
    try { log = JSON.parse(job.log || '[]'); } catch {}

    return NextResponse.json({
      id:          job.id,
      status:      job.status,
      total:       job.total,
      processed:   job.processed,
      succeeded:   job.succeeded,
      failed:      job.failed,
      posts:       job.posts,
      commenters:  job.commenters,
      error:       job.error,
      startedAt:   job.startedAt,
      completedAt: job.completedAt,
      createdAt:   job.createdAt,
      log:         log.slice(-20), // Last 20 log entries
      progress:    job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0,
      elapsed:     job.startedAt ? Date.now() - new Date(job.startedAt).getTime() : 0,
    });
  } catch (e) {
    console.error('[sync/status error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
