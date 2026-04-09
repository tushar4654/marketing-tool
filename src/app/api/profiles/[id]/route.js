import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req, { params }) {
  const { id } = await params;
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: {
      posts: { orderBy: { postedAt: 'desc' } },
      _count: { select: { posts: true } },
    },
  });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ profile });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  await prisma.profile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const dynamic = 'force-dynamic';
