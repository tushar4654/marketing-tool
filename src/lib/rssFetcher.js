import RSSParser from 'rss-parser';

const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; ContentEngine/1.0)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
});

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Known RSS feed URL patterns for popular sites.
 * If we can't auto-discover, try common paths.
 */
const KNOWN_FEEDS = {
  'github.blog': 'https://github.blog/feed/',
  'stackoverflow.blog': 'https://stackoverflow.blog/feed/',
  'blog.pragmaticengineer.com': 'https://blog.pragmaticengineer.com/rss/',
  'changelog.com': 'https://changelog.com/feed',
  'thenewstack.io': 'https://thenewstack.io/feed/',
  'leaddev.com': 'https://leaddev.com/rss.xml',
  'console.dev': 'https://console.dev/feed.xml',
  'www.seangoedecke.com': 'https://www.seangoedecke.com/rss/',
  'www.theunwindai.com': 'https://www.theunwindai.com/rss/',
  'refactoring.fm': 'https://refactoring.fm/feed',
};

const COMMON_FEED_PATHS = [
  '/feed', '/feed/', '/rss', '/rss/', '/rss.xml', '/feed.xml',
  '/atom.xml', '/index.xml', '/feeds/posts/default', '/blog/feed',
  '/blog/rss', '/blog/feed.xml',
];

/**
 * Auto-discover RSS feed URL from a website.
 * 1. Check known feeds
 * 2. Try to find <link rel="alternate" type="application/rss+xml"> in HTML
 * 3. Try common feed paths
 */
async function discoverFeedUrl(siteUrl) {
  try {
    const url = new URL(siteUrl);
    const host = url.hostname;

    // 1. Check known feeds
    if (KNOWN_FEEDS[host]) {
      console.log(`[RSS] Using known feed for ${host}: ${KNOWN_FEEDS[host]}`);
      return KNOWN_FEEDS[host];
    }

    // 2. Try to fetch the page and look for RSS link tags
    try {
      const resp = await fetch(siteUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentEngine/1.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        const html = await resp.text();
        // Look for <link rel="alternate" type="application/rss+xml" href="...">
        const rssMatch = html.match(/<link[^>]*type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["']/i)
          || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*type=["']application\/rss\+xml["']/i);
        const atomMatch = html.match(/<link[^>]*type=["']application\/atom\+xml["'][^>]*href=["']([^"']+)["']/i)
          || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*type=["']application\/atom\+xml["']/i);

        const feedHref = rssMatch?.[1] || atomMatch?.[1];
        if (feedHref) {
          const feedUrl = feedHref.startsWith('http') ? feedHref : new URL(feedHref, siteUrl).toString();
          console.log(`[RSS] Discovered feed via HTML: ${feedUrl}`);
          return feedUrl;
        }
      }
    } catch (e) { /* ignore fetch errors */ }

    // 3. Try common feed paths
    const base = url.origin;
    for (const path of COMMON_FEED_PATHS) {
      try {
        const tryUrl = base + path;
        const resp = await fetch(tryUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentEngine/1.0)' },
          signal: AbortSignal.timeout(5000),
        });
        if (resp.ok) {
          const ct = resp.headers.get('content-type') || '';
          if (ct.includes('xml') || ct.includes('rss') || ct.includes('atom')) {
            console.log(`[RSS] Found feed at common path: ${tryUrl}`);
            return tryUrl;
          }
        }
      } catch { continue; }
    }

    // Nothing found — return original URL as fallback
    console.log(`[RSS] No feed discovered for ${siteUrl}, using URL as-is`);
    return siteUrl;
  } catch {
    return siteUrl;
  }
}

export async function fetchRSSFeed(feedUrl, limit = 20) {
  console.log(`[RSS] Fetching feed: ${feedUrl} …`);

  // Auto-discover if URL doesn't look like a feed
  let actualUrl = feedUrl;
  const isLikelyFeed = /\/(feed|rss|atom|index\.xml|feed\.xml|rss\.xml)/.test(feedUrl)
    || feedUrl.endsWith('.xml') || feedUrl.endsWith('.rss');

  if (!isLikelyFeed) {
    actualUrl = await discoverFeedUrl(feedUrl);
  }

  let feed;
  try {
    feed = await parser.parseURL(actualUrl);
  } catch (err) {
    // If discovery URL failed, try original
    if (actualUrl !== feedUrl) {
      try {
        feed = await parser.parseURL(feedUrl);
      } catch (e2) {
        throw new Error(`RSS parse failed for ${feedUrl} (also tried ${actualUrl}): ${e2.message}`);
      }
    } else {
      throw new Error(`RSS parse error for ${feedUrl}: ${err.message}`);
    }
  }

  const feedTitle = feed.title || 'Unknown Blog';
  const items = (feed.items || []).slice(0, limit);

  const posts = items
    .map(item => {
      const rawContent =
        item['content:encoded'] || item.content || item.contentSnippet ||
        item.summary || item.description || '';
      const content = stripHtml(rawContent);
      const postUrl = item.link || item.guid || '';
      let postedAt = null;
      if (item.isoDate) {
        postedAt = item.isoDate;
      } else if (item.pubDate) {
        const d = new Date(item.pubDate);
        postedAt = isNaN(d.getTime()) ? null : d.toISOString();
      }
      return {
        content: content.slice(0, 5000),
        postUrl,
        postedAt,
        authorName: item.creator || item.author || item['dc:creator'] || feedTitle,
        authorUrl: feed.link || feedUrl,
        title: item.title || '',
      };
    })
    .filter(p => p.content && p.postUrl);

  console.log(`[RSS] ✓ ${posts.length} blog posts from "${feedTitle}" (via ${actualUrl})`);
  return { posts, feedTitle };
}
