// Uses native fetch — no module bundling issues
const ACTOR_ID = 'harvestapi~linkedin-profile-posts';
const COMMENTS_ACTOR_ID = 'harvestapi~linkedin-post-comments';
const API_BASE = 'https://api.apify.com/v2';

function parsePostedAt(val) {
  if (!val) return null;
  if (typeof val === 'object' && val.date) return new Date(val.date).toISOString();
  if (typeof val === 'object' && val.timestamp) return new Date(val.timestamp).toISOString();
  if (typeof val === 'number') return new Date(val).toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseCounts(item) {
  const eng = item?.engagement || {};
  return {
    likes:    typeof eng.likes    === 'number' ? eng.likes    : 0,
    comments: typeof eng.comments === 'number' ? eng.comments : 0,
  };
}

/**
 * Scrape the latest original LinkedIn post for a profile via Apify REST API.
 * Skips reposts. Returns { profile, posts } with at most 1 post.
 */
export async function scrapeLinkedInProfile(profileUrl) {
  const token = process.env.APIFY_API_KEY;
  if (!token) throw new Error('APIFY_API_KEY is not set');

  console.log(`[Apify] Fetching for ${profileUrl} …`);

  const syncUrl =
    `${API_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items` +
    `?token=${token}&timeout=120&memory=512&maxItems=10`;

  const resp = await fetch(syncUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ profileUrls: [profileUrl], resultsLimit: 10 }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Apify API error ${resp.status}: ${text.slice(0, 200)}`);
  }

  const items = await resp.json();
  console.log(`[Apify] Got ${Array.isArray(items) ? items.length : 0} items for ${profileUrl}`);

  if (!Array.isArray(items) || items.length === 0) {
    return { profile: {}, posts: [] };
  }

  // Find the latest ORIGINAL post by this profile's author (skip reposts)
  const username = profileUrl.split('/in/')[1]?.replace(/\/$/, '').toLowerCase() || '';
  const ownPost  = items.find(i => {
    if (i.repostedBy) return false;
    const authorId = (i.author?.publicIdentifier || i.author?.username || '').toLowerCase();
    return !authorId || authorId.includes(username) || username.includes(authorId);
  }) || items.find(i => !i.repostedBy) || items[0];

  const authorObj = ownPost?.author || {};
  const rawAvatar = authorObj.profilePicture || authorObj.avatar || null;
  const avatarUrl = rawAvatar && typeof rawAvatar === 'object' ? rawAvatar.url || null : rawAvatar;

  const profile = {
    name:      authorObj.name || authorObj.fullName || null,
    title:     authorObj.headline || authorObj.title || null,
    avatarUrl,
  };

  const { likes, comments } = parseCounts(ownPost);
  const post = {
    content:  ownPost?.content || '',
    postUrl:  ownPost?.linkedinUrl || ownPost?.url || '',
    postedAt: parsePostedAt(ownPost?.postedAt),
    likes,
    comments,
  };

  if (!post.content || !post.postUrl) {
    console.warn(`[Apify] No valid post found for ${profileUrl}`);
    return { profile, posts: [] };
  }

  console.log(`[Apify] ✓ ${authorObj.name}: 👍 ${likes} 💬 ${comments} | ${post.postedAt?.slice(0, 10)}`);
  return { profile, posts: [post] };
}

/**
 * Scrape commenters for a LinkedIn post via Apify REST API.
 * Uses harvestapi~linkedin-post-comments actor.
 *
 * Input: { posts: [postUrl] }
 * Output shape per item:
 *   { actor: { name, linkedinUrl, position, pictureUrl, picture: { url } }, commentary, ... }
 *
 * Returns array of { name, linkedinUrl, title, avatarUrl }
 */
export async function scrapePostCommenters(postUrl) {
  const token = process.env.APIFY_API_KEY;
  if (!token) throw new Error('APIFY_API_KEY is not set');

  console.log(`[Apify] Fetching commenters for ${postUrl} …`);

  // No maxItems cap — let the actor return ALL comments
  // Timeout 600s (10 min) to handle posts with many comments
  const syncUrl =
    `${API_BASE}/acts/${COMMENTS_ACTOR_ID}/run-sync-get-dataset-items` +
    `?token=${token}&timeout=600&memory=1024`;

  const resp = await fetch(syncUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ posts: [postUrl] }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Apify comments API error ${resp.status}: ${text.slice(0, 200)}`);
  }

  const items = await resp.json();
  console.log(`[Apify] Got ${Array.isArray(items) ? items.length : 0} commenters for ${postUrl}`);

  if (!Array.isArray(items) || items.length === 0) return [];

  return items
    .filter(c => c.actor?.linkedinUrl)
    .map(c => {
      const a = c.actor || {};
      const avatarUrl = a.pictureUrl || a.picture?.url || null;
      return {
        name:        a.name || null,
        linkedinUrl: a.linkedinUrl || '',
        title:       a.position || null,
        avatarUrl,
      };
    })
    .filter(c => c.linkedinUrl);
}
