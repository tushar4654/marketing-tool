'use client';
import { useState, useEffect } from 'react';

const PLATFORM_ICONS = { linkedin: '💼', twitter: '𝕏', blog: '📝' };
const PLATFORM_LABELS = { linkedin: 'LinkedIn', twitter: 'Twitter/X', blog: 'Blogs' };

export default function ContentFeedPage() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [platform, setPlatform] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content-feed?platform=${platform}&page=${page}&limit=20`);
      const data = await res.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch { setPosts([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [platform, page]);

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = now - date;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="label-mono">Content Intelligence</div>
          <h1>Content Feed</h1>
          <p>Unified feed of all scraped content from LinkedIn, Twitter, and blogs.</p>
        </div>
        <div className="live-badge"><span className="live-dot" /> {total} posts tracked</div>
      </div>

      <div className="page-body">
        {/* Platform Filters */}
        <div className="segmented-control" style={{ marginBottom: 24 }}>
          {['all', 'linkedin', 'twitter', 'blog'].map(p => (
            <button
              key={p}
              className={platform === p ? 'active' : ''}
              onClick={() => { setPlatform(p); setPage(1); }}
            >
              {p === 'all' ? '🌐 All' : `${PLATFORM_ICONS[p]} ${PLATFORM_LABELS[p]}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📰</span>
            <h3>No content yet</h3>
            <p>Add content sources and sync them to populate your feed.</p>
          </div>
        ) : (
          <>
            {posts.map(post => {
              const isExpanded = expanded === post.id;
              const content = post.content || '';
              const preview = content.length > 280 ? content.slice(0, 280) + '…' : content;

              return (
                <div className="post-card" key={post.id} onClick={() => setExpanded(isExpanded ? null : post.id)} style={{ cursor: 'pointer' }}>
                  <div className="post-meta">
                    <div className={`avatar ${post.platform === 'twitter' ? 'avatar-purple' : post.platform === 'blog' ? 'avatar-orange' : ''}`}>
                      {PLATFORM_ICONS[post.platform] || '📄'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="post-author-name">{post.authorName || 'Unknown'}</div>
                      <div className="post-author-role">
                        <span className="ci-platform-chip" data-platform={post.platform}>
                          {PLATFORM_ICONS[post.platform]} {PLATFORM_LABELS[post.platform]}
                        </span>
                        {post.source?.name && <span style={{ marginLeft: 8, color: 'var(--text-tertiary)' }}>via {post.source.name}</span>}
                      </div>
                    </div>
                    <span className="post-timestamp">{formatDate(post.postedAt || post.scrapedAt)}</span>
                  </div>

                  <div className="post-content" style={{ whiteSpace: 'pre-wrap' }}>
                    {isExpanded ? content : preview}
                  </div>

                  <div className="post-footer">
                    <div className="post-stats">
                      <span className="post-stat" style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                        {isExpanded ? '▲ Click to collapse' : content.length > 280 ? '▼ Click to expand' : ''}
                      </span>
                    </div>
                    {post.postUrl && (
                      <a className="post-link" href={post.postUrl} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>
                        View original →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32 }}>
                <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Page {page} of {totalPages}
                </span>
                <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
