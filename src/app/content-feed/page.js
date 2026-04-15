'use client';
import { useState, useEffect } from 'react';

const PLATFORM_ICONS = { linkedin: '💼', twitter: '𝕏', blog: '📝' };
const PLATFORM_LABELS = { linkedin: 'LinkedIn', twitter: 'Twitter/X', blog: 'Blogs' };

function getPresetDates(preset) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: d.toISOString().split('T')[0], to: today }; }
  if (preset === 'month') { const d = new Date(now); d.setMonth(d.getMonth() - 1); return { from: d.toISOString().split('T')[0], to: today }; }
  return { from: '', to: '' };
}

export default function AllFeedPage() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [platform, setPlatform] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activePreset, setActivePreset] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ platform, page, limit: 20 });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/content-feed?${params}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch { setPosts([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [platform, page, dateFrom, dateTo]);

  const applyPreset = (preset) => {
    setActivePreset(preset);
    const { from, to } = getPresetDates(preset);
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
  };

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
          <h1>All Feed</h1>
          <p>Unified feed of all scraped content from LinkedIn, Twitter, and blogs.</p>
        </div>
        <div className="live-badge"><span className="live-dot" /> {total} posts tracked</div>
      </div>

      <div className="page-body">
        {/* Filters Row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Platform */}
          <div className="segmented-control">
            {['all', 'linkedin', 'twitter', 'blog'].map(p => (
              <button key={p} className={platform === p ? 'active' : ''} onClick={() => { setPlatform(p); setPage(1); }}>
                {p === 'all' ? '🌐 All' : `${PLATFORM_ICONS[p]} ${PLATFORM_LABELS[p]}`}
              </button>
            ))}
          </div>

          {/* Date Presets */}
          <div className="segmented-control">
            {[
              { key: 'all', label: '📅 All Time' },
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
            ].map(p => (
              <button key={p.key} className={activePreset === p.key ? 'active' : ''} onClick={() => applyPreset(p.key)}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" className="form-input" style={{ padding: '6px 10px', fontSize: 12, width: 140 }} value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setActivePreset('custom'); setPage(1); }} />
            <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>to</span>
            <input type="date" className="form-input" style={{ padding: '6px 10px', fontSize: 12, width: 140 }} value={dateTo}
              onChange={e => { setDateTo(e.target.value); setActivePreset('custom'); setPage(1); }} />
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📰</span>
            <h3>No content found</h3>
            <p>{dateFrom || dateTo ? 'Try adjusting your date range.' : 'Add content sources and sync them to populate your feed.'}</p>
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
