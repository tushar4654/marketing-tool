import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runQualificationPipeline } from '@/lib/llmEvaluator';

/**
 * POST /api/qualify — Trigger LLM qualification for unscored commenters
 * Body: { requalify?: boolean }
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await runQualificationPipeline({
      requalify: body.requalify === true,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[qualify]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/qualify — Returns pipeline stats
 */
export async function GET() {
  try {
    const [total, evaluated, high, medium, low] = await Promise.all([
      prisma.commenter.count(),
      prisma.commenter.count({ where: { icpScore: { not: null } } }),
      prisma.commenter.count({ where: { intentLevel: 'high' } }),
      prisma.commenter.count({ where: { intentLevel: 'medium' } }),
      prisma.commenter.count({ where: { intentLevel: 'low' } }),
    ]);

    // Get average ICP score
    const avgResult = await prisma.commenter.aggregate({
      _avg: { icpScore: true },
      where: { icpScore: { not: null } },
    });

    return NextResponse.json({
      total,
      evaluated,
      pending: total - evaluated,
      high,
      medium,
      low,
      avgScore: Math.round(avgResult._avg.icpScore ?? 0),
    });
  } catch (e) {
    console.error('[qualify stats]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
