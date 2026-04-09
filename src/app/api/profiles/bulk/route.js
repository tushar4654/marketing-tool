import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/profiles/bulk
 * Body: { urls: string[] }
 * Bulk-imports LinkedIn profile URLs, deduplicating against existing profiles.
 */
export async function POST(request) {
  try {
    const { urls } = await request.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls array is required' }, { status: 400 });
    }

    // Normalize URLs
    const normalized = urls
      .map(u => u.trim())
      .filter(u => u.includes('linkedin.com/in/'));

    // Get existing URLs
    const existing = await prisma.profile.findMany({ select: { url: true } });
    const existingSet = new Set(existing.map(p => p.url.replace(/\/$/, '').toLowerCase()));

    // Filter out duplicates
    const newUrls = normalized.filter(u => {
      const norm = u.replace(/\/$/, '').toLowerCase();
      return !existingSet.has(norm);
    });

    // Insert individually without transactions or createMany to ensure Turso/Vercel compatibility safely
    for (const url of newUrls) {
      try {
        await prisma.profile.create({ data: { url } });
      } catch (e) {
        // softly ignore duplicates
      }
    }

    const total = await prisma.profile.count();
    console.log('[bulk] Imported ' + newUrls.length + ' new profiles. Total: ' + total);

    return NextResponse.json({
      inserted: newUrls.length,
      skipped:  normalized.length - newUrls.length,
      invalid:  urls.length - normalized.length,
      total,
    });
  } catch (e) {
    console.error('[bulk import error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
