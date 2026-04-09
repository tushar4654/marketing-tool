'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const AVATAR_CLASSES = ['', 'avatar-green', 'avatar-purple', 'avatar-orange', 'avatar-pink'];
function getAvatarClass(name) {
  if (!name) return '';
  const s = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_CLASSES[s % AVATAR_CLASSES.length];
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function timeAgo(d) {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
function highlight(text, kws) {
  if (!kws?.length || !text) return text;
  const pat = new RegExp(`(${kws.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(pat).map((p, i) => pat.test(p) ? <mark key={i}>{p}</mark> : p);
}

function CommentersList({ postId, commentCount }) {
  const [open, setOpen] = useState(false);
  const [commenters, setCommenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const load = async () => {
    if (fetched) { setOpen(o => !o); return; }
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/commenters`);
      const { commenters: c } = await res.json();
      setCommenters(c || []);
      setFetched(true);
    } catch {
      setCommenters([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="commenters-section">
      <button className="commenters-toggle" onClick={load} aria-expanded={open}>
        <span className="commenters-icon">👥</span>
        <span>{commentCount > 0 ? `${commentCount} Commenters` : 'Show Commenters'}</span>
        <span className="commenters-chevron" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      {open && (
        <div className="commenters-list">
          {loading ? (
            <div style={{ padding: '12px 0', textAlign: 'center' }}>
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block' }} />
            </div>
          ) : commenters.length === 0 ? (
            <div style={{ padding: '10px 0', color: 'var(--text-tertiary)', fontSize: 12 }}>
              No commenters scraped yet — sync to fetch
            </div>
          ) : (
            commenters.map((c, i) => (
              <a key={i} href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="commenter-chip">
                <div className={`commenter-avatar ${getAvatarClass(c.name)}`}>{initials(c.name)}</div>
                <div className="commenter-info">
                  <div className="commenter-name">{c.name || 'Unknown'}</div>
                  {c.title && <div className="commenter-title">{c.title}</div>}
                </div>
                <span className="commenter-cta">→</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, showKw }) {
  const [exp, setExp] = useState(false);
  const kws = showKw ? (post.matchedKeywords || []) : [];
  const long = post.content.length > 320;
  const text = exp || !long ? post.content : post.content.slice(0, 320) + '…';

  return (
    <article className={`post-card${post.relevant ? ' relevant' : ''}`}>
      <div className="post-meta">
        <div className={`avatar ${getAvatarClass(post.author?.name)}`}>{initials(post.author?.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a href={`/profiles/${post.author?.id}`} className="post-author-name">{post.author?.name || 'Unknown'}</a>
          <div className="post-author-role">{post.author?.title || post.author?.url}</div>
        </div>
        <span className="post-timestamp">{timeAgo(post.postedAt || post.scrapedAt)} ago</span>
      </div>
      {showKw && kws.length > 0 && (
        <div className="keyword-chips">
          {kws.map(kw => <span key={kw} className="keyword-chip">◈ {kw}</span>)}
        </div>
      )}
      <p className="post-content">{highlight(text, kws)}</p>
      {long && (
        <button onClick={() => setExp(!exp)} style={{ 
          background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, 
          fontWeight: 600, cursor: 'pointer', padding: '0 0 12px', fontFamily: 'inherit'
        }}>
          {exp ? 'Show less' : 'Read more'}
        </button>
      )}
      <div className="post-footer">
        <div className="post-stats">
          <span className="post-stat">👍 <strong style={{ color: 'var(--text-primary)' }}>{post.likes?.toLocaleString() ?? 0}</strong></span>
          <span className="post-stat">💬 <strong style={{ color: 'var(--text-primary)' }}>{post.comments?.toLocaleString() ?? 0}</strong></span>
        </div>
        <a href={post.postUrl} target="_blank" rel="noopener noreferrer" className="post-link">View on LinkedIn →</a>
      </div>
      <CommentersList postId={post.id} commentCount={post.comments ?? 0} />
    </article>
  );
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function Dashboard() {
  const sp = useSearchParams();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [interests, setInterests] = useState([]);
  const [stats, setStats] = useState({ profiles: 0, commenters: 0 });
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(sp.get('tab') === 'relevant' ? 'relevant' : 'all');
  const [ticker, setTicker] = useState(0);
  const [syncJob, setSyncJob] = useState(null);

  useEffect(() => { const t = setInterval(() => setTicker(x => x + 1), 1000); return () => clearInterval(t); }, []);

  const toast$ = (msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // Poll sync job progress
  useEffect(() => {
    if (!syncJob?.id || syncJob.status === 'completed' || syncJob.status === 'failed') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync/status/${syncJob.id}`);
        const data = await res.json();
        setSyncJob(data);
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          if (data.status === 'completed') {
            toast$(`Sync complete — ${data.posts} posts, ${data.commenters} commenters`);
            await load();
          } else {
            toast$(data.error || 'Sync failed', 'error');
          }
          setSyncing(false);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [syncJob?.id, syncJob?.status]);

  const load = useCallback(async () => {
    try {
      const [pr, ir, proR] = await Promise.all([fetch('/api/posts'), fetch('/api/interests'), fetch('/api/profiles')]);
      const { posts: p } = await pr.json();
      const { interests: i } = await ir.json();
      const { profiles } = await proR.json();
      const totalCommenters = (p || []).reduce((sum, post) => sum + (post._count?.commenters || 0), 0);
      setPosts(p || []); setInterests(i || []);
      setStats({ profiles: profiles?.length || 0, posts: p?.length || 0, commenters: totalCommenters });
    } catch { toast$('Connection error', 'error'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doSync = async () => {
    setSyncing(true);
    try {
      if (stats.profiles > 30) {
        const res = await fetch('/api/sync/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staleHours: 24 }) });
        const d = await res.json();
        if (res.ok && d.jobId) {
          setSyncJob({ id: d.jobId, status: 'pending', total: d.total, processed: 0 });
          toast$(`Syncing ${d.total} profiles…`);
        } else if (d.total === 0) {
          toast$('All profiles are up to date');
          setSyncing(false);
        } else {
          toast$(d.error || 'Sync failed', 'error');
          setSyncing(false);
        }
      } else {
        const res = await fetch('/api/sync', { method: 'POST' });
        const d = await res.json();
        if (res.ok) { toast$(`Synced — ${d.posts} posts, ${d.commenters ?? 0} commenters`); await load(); }
        else toast$(d.error || 'Sync failed', 'error');
        setSyncing(false);
      }
    } catch { toast$('Sync failed', 'error'); setSyncing(false); }
  };

  const kws = interests.map(i => i.keyword);
  const enriched = posts.map(p => {
    const lower = (p.content || '').toLowerCase();
    const matched = kws.filter(k => lower.includes(k.toLowerCase()));
    return { ...p, matchedKeywords: matched, relevant: matched.length > 0 };
  });
  const relCount = enriched.filter(p => p.relevant).length;

  const displayed = enriched.filter(p => {
    if (tab === 'relevant') return p.relevant;
    if (search) {
      const q = search.toLowerCase();
      return p.content?.toLowerCase().includes(q) || p.author?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  const switchTab = t => { setTab(t); setSearch(''); router.replace(t === 'relevant' ? '/?tab=relevant' : '/'); };

  const pct = syncJob ? Math.round(((syncJob.processed || 0) / Math.max(syncJob.total || 1, 1)) * 100) : 0;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Signal Feed</h1>
          <p>Real-time intelligence from your tracked LinkedIn leaders</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="live-badge"><span className="live-dot" /> Live</div>
          <button className="btn btn-primary" onClick={doSync} disabled={syncing} id="sync-btn" style={{ borderRadius: 100, padding: '10px 24px' }}>
            {syncing ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Syncing…</> : '⚡ Sync Now'}
          </button>
        </div>
      </header>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card cyan">
            <div className="stat-label">Profiles</div>
            <div className="stat-value stat-accent">{stats.profiles}</div>
            <div className="stat-sub">Tracked targets</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Posts</div>
            <div className="stat-value">{posts.length}</div>
            <div className="stat-sub">Indexed signals</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-label">Relevant</div>
            <div className="stat-value stat-amber">{relCount}</div>
            <div className="stat-sub">Matching keywords</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Signal Rate</div>
            <div className="stat-value" style={{ color: 'var(--purple)' }}>
              {posts.length ? `${Math.round((relCount / posts.length) * 100)}%` : '—'}
            </div>
            <div className="stat-sub">Relevance ratio</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid var(--green)' }}>
            <div className="stat-label">Leads</div>
            <div className="stat-value stat-green">{stats.commenters}</div>
            <div className="stat-sub">Engaged commenters</div>
          </div>
        </div>

        {/* Sync Progress */}
        {syncJob && syncJob.status && syncJob.status !== 'completed' && (
          <div className="sync-progress-panel">
            <div className="sync-progress-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {syncJob.status === 'running' && <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'var(--blue)' }} />}
                <span style={{ fontSize: 14, fontWeight: 600, color: syncJob.status === 'failed' ? 'var(--red)' : 'var(--text-primary)' }}>
                  {syncJob.status === 'failed' ? 'Sync Failed' : 'Syncing Profiles…'}
                </span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, fontFeatureSettings: "'tnum'" }}>
                {syncJob.processed || 0} of {syncJob.total || 0} · {pct}%
              </span>
            </div>
            <div className="sync-progress-bar-bg">
              <div className="sync-progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="sync-progress-stats">
              <span style={{ color: 'var(--green)' }}>✓ {syncJob.succeeded || 0} succeeded</span>
              <span style={{ color: 'var(--red)' }}>✗ {syncJob.failed || 0} failed</span>
              <span>📝 {syncJob.posts || 0} posts</span>
              <span>👥 {syncJob.commenters || 0} commenters</span>
              {syncJob.elapsed > 0 && (
                <span>⏱ {formatDuration(syncJob.elapsed)}</span>
              )}
            </div>
            {syncJob.log && syncJob.log.length > 0 && (
              <div className="sync-log">
                {syncJob.log.slice(-5).map((entry, i) => (
                  <div key={i} className="sync-log-entry">{entry.msg}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div className="segmented-control">
            <button className={tab === 'all' ? 'active' : ''} onClick={() => switchTab('all')}>All ({posts.length})</button>
            <button className={tab === 'relevant' ? 'active' : ''} onClick={() => switchTab('relevant')}>Relevant ({relCount})</button>
          </div>
          {tab === 'all' && (
            <div className="search-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input id="search-input" placeholder="Search signals…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          )}
        </div>

        {tab === 'relevant' && kws.length === 0 && (
          <div className="warning-banner">No keywords configured. <a href="/interests" style={{ color: 'var(--blue)', fontWeight: 600 }}>Configure interests →</a></div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: 'var(--text-tertiary)' }}>
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, marginBottom: 20 }} />
            <p style={{ fontSize: 14, fontWeight: 500 }}>Loading signals…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">{tab === 'relevant' ? '◈' : '◉'}</span>
            <h3>{search ? 'No results' : tab === 'relevant' ? 'No relevant signals' : 'No signals yet'}</h3>
            <p style={{ marginBottom: 28, fontSize: 14 }}>
              {search ? 'Try different search terms'
                : tab === 'relevant' ? 'None of your tracked posts match your interest keywords'
                : 'Add targets and sync to pull in their latest posts'}
            </p>
            {tab === 'relevant' ? <a href="/interests" className="btn btn-primary" style={{ borderRadius: 100 }}>Configure Interests</a>
              : !search && <a href="/profiles" className="btn btn-primary" style={{ borderRadius: 100 }}>Add Profiles</a>}
          </div>
        ) : (
          displayed.map(post => <PostCard key={post.id} post={post} showKw={tab === 'relevant'} />)
        )}
      </div>

      {toast && (
        <div className={`toast${toast.type === 'error' ? ' error' : ''}`}>
          {toast.type === 'ok' ? '✓ ' : '✗ '}{toast.msg}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 100, textAlign: 'center' }}><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>}>
      <Dashboard />
    </Suspense>
  );
}
