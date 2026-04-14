const TWITTER_ACTOR_ID = 'scraper_one~x-profile-posts-scraper';
const API_BASE = 'https://api.apify.com/v2';

function extractProfileUrl(url) {
  const cleaned = url.replace(/\/$/, '');
  const match = cleaned.match(/(?:twitter\.com|x\.com)\/(@?[\w]+)/i);
  if (match) return `https://x.com/${match[1].replace('@', '')}`;
  return cleaned;
}

function extractUsername(url) {
  const match = url.match(/(?:twitter\.com|x\.com)\/(@?[\w]+)/i);
  return match ? match[1].replace('@', '') : url;
}

/**
 * Scrape tweets for MULTIPLE profiles in a single Apify run (cost-optimized).
 * Uses scraper_one/x-profile-posts-scraper which accepts multiple profileUrls.
 */
export async function scrapeTwitterBatch(sources, forceFullHistory = false) {
  const token = process.env.APIFY_API_KEY;
  if (!token) throw new Error('APIFY_API_KEY is not set');

  const results = new Map();
  if (sources.length === 0) return results;

  for (const s of sources) {
    results.set(s.url, { posts: [] });
  }

  const BATCH_SIZE = 5;
  for (let i = 0; i < sources.length; i += BATCH_SIZE) {
    const batch = sources.slice(i, i + BATCH_SIZE);
    const isNew = batch.some(s => !s.lastScrapedAt) || forceFullHistory;
    const maxPosts = isNew ? 50 : 5;

    const profileUrls = batch.map(s => extractProfileUrl(s.url));
    console.log(`[Apify/Twitter] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} profiles (${maxPosts} posts each)…`);

    try {
      const syncUrl =
        `${API_BASE}/acts/${TWITTER_ACTOR_ID}/run-sync-get-dataset-items` +
        `?token=${token}&timeout=300&memory=512`;

      const resp = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileUrls, maxPosts }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error(`[Apify/Twitter] Batch error ${resp.status}:`, text.slice(0, 200));
        continue;
      }

      const items = await resp.json();
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        const text = item.postText || '';
        if (!text) continue;
        const postUrl = item.postUrl || '';
        if (!postUrl) continue;

        const itemProfileUrl = (item.profileUrl || '').replace(/\/$/, '');
        const source = batch.find(s => {
          const norm = extractProfileUrl(s.url);
          return norm.toLowerCase() === itemProfileUrl.toLowerCase();
        });
        if (!source) continue;

        let postedAt = null;
        if (item.timestamp) {
          const d = new Date(item.timestamp);
          postedAt = isNaN(d.getTime()) ? null : d.toISOString();
        }

        results.get(source.url).posts.push({
          content: text,
          postUrl,
          postedAt,
          authorName: item.author?.name || extractUsername(source.url),
          authorUrl: item.profileUrl || `https://x.com/${extractUsername(source.url)}`,
        });
      }

      for (const s of batch) {
        const count = results.get(s.url)?.posts?.length || 0;
        console.log(`[Apify/Twitter] ✓ ${count} tweets for @${extractUsername(s.url)}`);
      }
    } catch (err) {
      console.error(`[Apify/Twitter] Batch failed:`, err.message);
    }
  }

  return results;
}

export async function scrapeTwitterProfile(profileUrl, fullHistory = false) {
  const results = await scrapeTwitterBatch(
    [{ url: profileUrl, lastScrapedAt: fullHistory ? null : new Date() }],
    fullHistory
  );
  return results.get(profileUrl) || { posts: [] };
}
