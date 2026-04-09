// Mock Apify scraper — replace with real Apify Actor call later
const MOCK_POSTS = {
  default: [
    {
      content: "🚀 Excited to share that we just closed our Series B! This is a huge milestone for the team. The GTM motion we built from scratch — community-led, product-led, and sales-assisted — really proved itself out. More details coming soon.",
      postUrl: "https://linkedin.com/posts/mock-1",
      postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      likes: 847,
      comments: 132,
    },
    {
      content: "Hot take: Most startups focus too much on ICP definition and not enough on ICP activation. Finding the right people is step 1. Getting them to care is the hard part.\n\nHere's the 3-step activation framework we use:\n1. Value-first outreach (no pitches)\n2. Warm intro through community\n3. Champion identification before AE involvement",
      postUrl: "https://linkedin.com/posts/mock-2",
      postedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      likes: 1203,
      comments: 89,
    },
    {
      content: "We ran an experiment: removed all sales CTAs from our nurture sequence for 30 days. Replaced them with pure educational content.\n\nResult: 40% increase in demo request rate.\n\nDistribution + education > distribution + selling.",
      postUrl: "https://linkedin.com/posts/mock-3",
      postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 2419,
      comments: 201,
    },
    {
      content: "What nobody tells you about PLG: it requires MORE sales investment, not less. You need:\n- Better onboarding\n- Usage-based triggers\n- Expansion motion\n- Champion programs\n\nFree tier ≠ no sales. It just shifts where you sell.",
      postUrl: "https://linkedin.com/posts/mock-4",
      postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 3102,
      comments: 278,
    },
  ],
};

/**
 * Simulate scraping a LinkedIn profile and returning posts.
 * @param {string} profileUrl
 * @returns {Promise<{profile: object, posts: object[]}>}
 */
export async function scrapeLinkedInProfile(profileUrl) {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));

  const username = profileUrl.split('/in/')[1]?.replace(/\/$/, '') || 'unknown';
  const names = ['Alex Rivera', 'Priya Nair', 'Jordan Wei', 'Sam Okonkwo', 'Taylor Brooks'];
  const titles = [
    'VP of Sales @ Acme Corp',
    'Head of GTM @ StartupXYZ',
    'Co-Founder & CEO',
    'Director of Revenue',
    'Chief Revenue Officer',
  ];
  const idx = Math.abs(username.charCodeAt(0) ?? 0) % names.length;

  const profile = {
    name: names[idx],
    title: titles[idx],
    avatarUrl: null,
  };

  // Generate slightly randomized posts per profile
  const posts = MOCK_POSTS.default.map((p, i) => ({
    ...p,
    postUrl: `https://linkedin.com/posts/${username}-${i + 1}-${Date.now()}`,
    likes: p.likes + Math.floor(Math.random() * 50),
    comments: p.comments + Math.floor(Math.random() * 20),
  }));

  return { profile, posts };
}

const MOCK_COMMENTERS = [
  { name: 'Guillermo Rauch',    linkedinUrl: 'https://www.linkedin.com/in/rauchg/',                     title: 'CEO @ Vercel',                     avatarUrl: null },
  { name: 'Paul Copplestone',   linkedinUrl: 'https://www.linkedin.com/in/paul-copplestone-78a82145/',   title: 'CEO @ Supabase',                   avatarUrl: null },
  { name: 'Han Wang',           linkedinUrl: 'https://www.linkedin.com/in/hanwwang/',                    title: 'Co-Founder @ Convex',              avatarUrl: null },
  { name: 'Zeno Rocha',         linkedinUrl: 'https://www.linkedin.com/in/zenorocha/',                   title: 'CEO @ Resend',                     avatarUrl: null },
  { name: 'Spencer Kimball',    linkedinUrl: 'https://www.linkedin.com/in/spencerwkimball/',              title: 'CEO @ CockroachDB',                avatarUrl: null },
  { name: 'Nicolas Dessaigne',  linkedinUrl: 'https://www.linkedin.com/in/nicolasdessaigne/',             title: 'Co-Founder @ Algolia',             avatarUrl: null },
  { name: 'Kyle Poyar',         linkedinUrl: 'https://www.linkedin.com/in/kylepoyar/',                    title: 'Growth @ OpenView Partners',       avatarUrl: null },
  { name: 'Elena Verna',        linkedinUrl: 'https://www.linkedin.com/in/elenaverna/',                   title: 'Growth Advisor',                   avatarUrl: null },
];

/**
 * Simulate scraping commenters for a LinkedIn post.
 * @param {string} postUrl
 * @returns {Promise<object[]>}
 */
export async function scrapePostCommenters(postUrl) {
  await new Promise(r => setTimeout(r, 200 + Math.random() * 300));

  // Deterministically pick 3–6 commenters based on postUrl hash
  const seed = postUrl.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const count = 3 + (seed % 4); // 3–6
  const shuffled = [...MOCK_COMMENTERS].sort(() => Math.sin(seed) - 0.5);
  return shuffled.slice(0, count);
}
