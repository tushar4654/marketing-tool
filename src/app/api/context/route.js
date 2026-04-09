import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/context — Returns the current company context
 */
export async function GET() {
  try {
    let ctx = await prisma.companyContext.findUnique({ where: { id: 'default' } });
    if (!ctx) {
      ctx = await prisma.companyContext.create({
        data: { id: 'default' },
      });
    }
    // Parse JSON arrays for frontend
    return NextResponse.json({
      ...ctx,
      targetRoles: JSON.parse(ctx.targetRoles || '[]'),
      antiIcpSignals: JSON.parse(ctx.antiIcpSignals || '[]'),
    });
  } catch (e) {
    console.error('[context]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * PUT /api/context — Update company context
 */
export async function PUT(req) {
  try {
    const body = await req.json();
    const data = {
      companyName: body.companyName ?? '',
      valueProp: body.valueProp ?? '',
      targetRoles: JSON.stringify(body.targetRoles ?? []),
      targetCompanySize: body.targetCompanySize ?? '',
      antiIcpSignals: JSON.stringify(body.antiIcpSignals ?? []),
      customPrompt: body.customPrompt ?? '',
    };

    const ctx = await prisma.companyContext.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });

    return NextResponse.json({
      ...ctx,
      targetRoles: JSON.parse(ctx.targetRoles || '[]'),
      antiIcpSignals: JSON.parse(ctx.antiIcpSignals || '[]'),
    });
  } catch (e) {
    console.error('[context]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
