import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { posts: true } } },
    });
    return NextResponse.json({ profiles });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { url, name, title } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    const profile = await prisma.profile.create({ data: { url, name, title } });
    return NextResponse.json({ profile }, { status: 201 });
  } catch (e) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Profile already tracked' }, { status: 409 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
