/**
 * Batched Apify scraper — sends multiple profiles/posts per actor run.
 * ~10x cheaper and ~6x faster than one-at-a-time.
 */

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
 * Scrape multiple LinkedIn profiles in a single Apify actor run.
 * @param {string[]} profileUrls - Array of LinkedIn profile URLs (max ~20)
 * @returns {Promise<Map<string, {profile: object, posts: object[]}>>}
 *          Map keyed by profileUrl
 */
export async function scrapeProfilesBatch(profileUrls) {
  const token = process.env.APIFY_API_KEY;
  if (!token) throw new Error('APIFY_API_KEY is not set');

  console.log(`[Apify:Batch] Scraping ${profileUrls.length} profiles in one run …`);

  const syncUrl =
    `${API_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items` +
    `?token=${token}&timeout=300&memory=1024&maxItems=${profileUrls.length * 10}`;

  const resp = await fetch(syncUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ profileUrls, resultsLimit: 10 }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Apify batch error ${resp.status}: ${text.slice(0, 300)}`);
  }

  const items = await resp.json();
  console.log(`[Apify:Batch] Got ${Array.isArray(items) ? items.length : 0} total items`);

  if (!Array.isArray(items) || items.length === 0) {
    return new Map(profileUrls.map(u => [u, { profile: {}, posts: [] }]));
  }

  // Group items by profile URL
  const results = new Map();
  for (const url of profileUrls) {
    const username = url.split('/in/')[1]?.replace(/\/$/, '').toLowerCase() || '';

    // Find items belonging to this profile
    const profileItems = items.filter(i => {
      const authorId = (i.author?.publicIdentifier || i.author?.username || '').toLowerCase();
      const profileUrl = (i.author?.url || i.profileUrl || '').toLowerCase();
      return authorId.includes(username) || username.includes(authorId) ||
             profileUrl.includes(username);
    });

    if (profileItems.length === 0) {
      results.set(url, { profile: {}, posts: [] });
      continue;
    }

    // Get best original post (skip reposts)
    const ownPost = profileItems.find(i => !i.repostedBy) || profileItems[0];
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
      results.set(url, { profile, posts: [] });
    } else {
      console.log(`[Apify:Batch] ✓ ${authorObj.name}: 👍 ${likes} 💬 ${comments}`);
      results.set(url, { profile, posts: [post] });
    }
  }

  // Fill in any URLs that weren't matched
  for (const url of profileUrls) {
    if (!results.has(url)) results.set(url, { profile: {}, posts: [] });
  }

  return results;
}

/**
 * Scrape commenters for multiple posts in a single Apify actor run.
 * @param {string[]} postUrls - Array of LinkedIn post URLs (max ~20)
 * @returns {Promise<Map<string, object[]>>} Map of postUrl → commenters array
 */
export async function scrapeCommentersBatch(postUrls) {
  const token = process.env.APIFY_API_KEY;
  if (!token) throw new Error('APIFY_API_KEY is not set');

  console.log(`[Apify:Batch] Scraping commenters for ${postUrls.length} posts …`);

  const syncUrl =
    `${API_BASE}/acts/${COMMENTS_ACTOR_ID}/run-sync-get-dataset-items` +
    `?token=${token}&timeout=600&memory=1024`;

  const resp = await fetch(syncUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ posts: postUrls }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Apify comments batch error ${resp.status}: ${text.slice(0, 300)}`);
  }

  const items = await resp.json();
  console.log(`[Apify:Batch] Got ${Array.isArray(items) ? items.length : 0} total commenters`);

  // Group by post URL — each item has a postUrl or we match by position
  const results = new Map(postUrls.map(u => [u, []]));

  if (Array.isArray(items)) {
    for (const c of items) {
      if (!c.actor?.linkedinUrl) continue;
      const postUrl = c.postUrl || c.inputUrl || '';
      const a = c.actor || {};
      const commenter = {
        name:        a.name || null,
        linkedinUrl: a.linkedinUrl || '',
        title:       a.position || null,
        avatarUrl:   a.pictureUrl || a.picture?.url || null,
      };
      if (!commenter.linkedinUrl) continue;

      // Try to match to a known post URL
      const matched = postUrls.find(u => postUrl.includes(u) || u.includes(postUrl));
      if (matched) {
        results.get(matched).push(commenter);
      } else {
        // If we can't match, add to first post (best effort)
        const first = postUrls[0];
        if (first) results.get(first).push(commenter);
      }
    }
  }

  return results;
}
