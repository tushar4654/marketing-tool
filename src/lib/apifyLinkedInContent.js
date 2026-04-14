const ACTOR_ID = 'harvestapi~linkedin-profile-posts';
const API_BASE = 'https://api.apify.com/v2';

function parseDate(val) {
  if (!val) return null;
  if (typeof val === 'object' && val.date) return new Date(val.date).toISOString();
  if (typeof val === 'object' && val.timestamp) return new Date(val.timestamp).toISOString();
  if (typeof val === 'number') return new Date(val).toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Scrape LinkedIn posts from a profile.
 * @param {string} profileUrl
 * @param {boolean} fullHistory - true = fetch up to 100 posts, false = latest only
 */
export async function scrapeLinkedInContent(profileUrl, fullHistory = false) {
  const token = process.env.APIFY_API_KEY;
  if (!token) throw new Error('APIFY_API_KEY is not set');

  const limit = fullHistory ? 100 : 5;
  console.log(`[Apify/LinkedIn] ${fullHistory ? 'Full history' : 'Latest'} for ${profileUrl} (limit ${limit})…`);

  const syncUrl =
    `${API_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items` +
    `?token=${token}&timeout=${fullHistory ? 300 : 120}&memory=512&maxItems=${limit}`;

  const resp = await fetch(syncUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileUrls: [profileUrl], resultsLimit: limit }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Apify LinkedIn API error ${resp.status}: ${text.slice(0, 200)}`);
  }

  const items = await resp.json();
  if (!Array.isArray(items) || items.length === 0) return { posts: [] };

  const posts = items
    .filter(i => !i.repostedBy && (i.content || i.text))
    .map(item => {
      const author = item.author || {};
      return {
        content: item.content || item.text || '',
        postUrl: item.linkedinUrl || item.url || '',
        postedAt: parseDate(item.postedAt),
        authorName: author.name || author.fullName || null,
        authorUrl: profileUrl,
      };
    })
    .filter(p => p.content && p.postUrl);

  if (!fullHistory && posts.length > 0) {
    // Latest only mode — return just the first (most recent) post
    console.log(`[Apify/LinkedIn] ✓ Latest post by ${posts[0].authorName}`);
    return { posts: [posts[0]] };
  }

  console.log(`[Apify/LinkedIn] ✓ ${posts.length} posts fetched (full history)`);
  return { posts };
}
