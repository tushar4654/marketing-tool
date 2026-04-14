import { MemoryClient } from 'mem0ai';

let client = null;

/**
 * Get the Mem0 client instance (singleton).
 * Returns null if MEM0_API_KEY is not configured.
 */
export function getMem0Client() {
  if (client) return client;

  const apiKey = process.env.MEM0_API_KEY;
  if (!apiKey) {
    console.warn('[Mem0] MEM0_API_KEY not set — memory features disabled');
    return null;
  }

  client = new MemoryClient({ apiKey });
  return client;
}

/**
 * Store content memory after scraping a source.
 * Uses source ID as user_id so each source has its own memory space.
 * 
 * @param {string} sourceId - ContentSource ID
 * @param {string} sourceName - Human-readable source name
 * @param {string} platform - linkedin | twitter | blog
 * @param {Array} posts - Array of { content, authorName, postedAt }
 */
export async function storeContentMemory(sourceId, sourceName, platform, posts) {
  const mem0 = getMem0Client();
  if (!mem0 || posts.length === 0) return;

  console.log(`[Mem0] Storing ${posts.length} posts for "${sourceName}" (${platform})…`);

  try {
    // Build a conversation-style message from all posts
    const messages = posts.map(post => ({
      role: 'user',
      content: `[${platform.toUpperCase()} post by ${post.authorName || sourceName}${post.postedAt ? ` on ${new Date(post.postedAt).toLocaleDateString()}` : ''}]: ${post.content.slice(0, 1500)}`,
    }));

    await mem0.add(messages, {
      user_id: `source_${sourceId}`,
      metadata: {
        source_name: sourceName,
        platform,
        post_count: posts.length,
      },
    });

    console.log(`[Mem0] ✓ Stored memories for "${sourceName}"`);
  } catch (err) {
    console.error(`[Mem0] Failed to store memories for "${sourceName}":`, err.message);
  }
}

/**
 * Retrieve relevant memories for generating suggestions.
 * Searches across all source memories for content relevant to the persona's context.
 * 
 * @param {string} personaContext - The persona's role + context markdown
 * @param {Array} sourceIds - Array of source IDs to search across
 * @returns {string} Formatted memory context string for the LLM prompt
 */
export async function retrieveContentMemories(personaContext, sourceIds) {
  const mem0 = getMem0Client();
  if (!mem0) return '';

  console.log(`[Mem0] Searching memories across ${sourceIds.length} sources…`);

  try {
    const allMemories = [];

    // Search across each source's memory space
    for (const sourceId of sourceIds) {
      try {
        const results = await mem0.search(personaContext, {
          user_id: `source_${sourceId}`,
          limit: 10,
        });

        if (results?.results?.length > 0) {
          allMemories.push(...results.results);
        }
      } catch (err) {
        // Skip individual source errors
      }
    }

    if (allMemories.length === 0) {
      console.log('[Mem0] No relevant memories found');
      return '';
    }

    // Sort by relevance score and take top 20
    const topMemories = allMemories
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 20);

    const memoryContext = topMemories
      .map(m => `- ${m.memory}`)
      .join('\n');

    console.log(`[Mem0] ✓ Retrieved ${topMemories.length} relevant memories`);
    return memoryContext;
  } catch (err) {
    console.error('[Mem0] Search failed:', err.message);
    return '';
  }
}

/**
 * Get all memories for a specific source (for debugging/display).
 */
export async function getSourceMemories(sourceId) {
  const mem0 = getMem0Client();
  if (!mem0) return [];

  try {
    const result = await mem0.getAll({ user_id: `source_${sourceId}` });
    return result?.results || result || [];
  } catch (err) {
    console.error('[Mem0] getAll failed:', err.message);
    return [];
  }
}
