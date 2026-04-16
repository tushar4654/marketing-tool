/**
 * In-memory trending cache — works on Vercel (no filesystem needed).
 * Falls back gracefully: cache miss just triggers a fresh Claude call.
 */
const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function getCachedData(personaId) {
  const key = `trending_${personaId || 'default'}`;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry._cachedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

export function setCachedData(personaId, data) {
  const key = `trending_${personaId || 'default'}`;
  cache.set(key, { ...data, _cachedAt: Date.now() });
  // Keep cache small — max 20 entries
  if (cache.size > 20) {
    const oldest = [...cache.entries()].sort((a, b) => a[1]._cachedAt - b[1]._cachedAt)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

export function getAnyCachedTopics() {
  for (const entry of cache.values()) {
    if (entry.topics && Date.now() - entry._cachedAt < CACHE_TTL_MS) {
      return entry.topics;
    }
  }
  return [];
}
