import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req, { params }) {
  const { id } = await params;
  await prisma.interest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';
