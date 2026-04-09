import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const interests = await prisma.interest.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ interests });
}

export async function POST(req) {
  const { keyword, description } = await req.json();
  if (!keyword?.trim()) return NextResponse.json({ error: 'keyword required' }, { status: 400 });
  try {
    const interest = await prisma.interest.create({
      data: { keyword: keyword.trim().toLowerCase(), description: description?.trim() || null },
    });
    return NextResponse.json({ interest }, { status: 201 });
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Keyword already exists' }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
