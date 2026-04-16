export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const fullHistory = body.fullHistory === true;
    const base = new URL(request.url).origin;
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullHistory }),
    };

    const [linkedinRes, twitterRes, rssRes] = await Promise.allSettled([
      fetch(`${base}/api/content-sources/sync-linkedin`, opts).then(r => r.json()),
      fetch(`${base}/api/content-sources/sync-twitter`, opts).then(r => r.json()),
      fetch(`${base}/api/content-sources/sync-rss`, { method: 'POST' }).then(r => r.json()),
    ]);

    return NextResponse.json({
      linkedin: linkedinRes.status === 'fulfilled' ? linkedinRes.value : { error: linkedinRes.reason?.message },
      twitter: twitterRes.status === 'fulfilled' ? twitterRes.value : { error: twitterRes.reason?.message },
      rss: rssRes.status === 'fulfilled' ? rssRes.value : { error: rssRes.reason?.message },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
