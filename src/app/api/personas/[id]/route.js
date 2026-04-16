export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const persona = await prisma.persona.findUnique({
      where: { id },
      include: { _count: { select: { suggestions: true } } },
    });
    if (!persona) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(persona);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, role, linkedinProfileUrl, contextMarkdown } = body;

    const persona = await prisma.persona.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(role && { role }),
        linkedinProfileUrl: linkedinProfileUrl ?? undefined,
        ...(contextMarkdown !== undefined && { contextMarkdown }),
      },
    });

    return NextResponse.json(persona);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.persona.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
