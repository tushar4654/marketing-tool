'use client';
import { useState, useEffect } from 'react';

const PLATFORM_META = {
  linkedin: { icon: '💼', label: 'LinkedIn', color: 'var(--blue)' },
  twitter:  { icon: '𝕏', label: 'Twitter/X', color: 'var(--text-primary)' },
  blog:     { icon: '📝', label: 'Blog/RSS', color: 'var(--orange)' },
};

export default function ContentSourcesPage() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncType, setSyncType] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: '', platform: 'linkedin', url: '', rssFeedUrl: '' });

  const showToast = (msg, err) => { setToast({ msg, err }); setTimeout(() => setToast(null), 4000); };

  const load = async () => {
    try {
      const res = await fetch('/api/content-sources');
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
    } catch { setSources([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addSource = async (e) => {
    e.preventDefault();
    if (!form.name || !form.url) return;
    try {
      const res = await fetch('/api/content-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setForm({ name: '', platform: 'linkedin', url: '', rssFeedUrl: '' });
      showToast('Source added');
      load();
    } catch (err) { showToast(err.message, true); }
  };

  const deleteSource = async (id) => {
    try {
      await fetch(`/api/content-sources/${id}`, { method: 'DELETE' });
      showToast('Source removed');
      load();
    } catch (err) { showToast(err.message, true); }
  };

  const syncAll = async (fullHistory = false) => {
    setSyncing(true);
    setSyncType(fullHistory ? 'history' : 'latest');
    try {
      const res = await fetch('/api/content-sources/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullHistory }),
      });
      const data = await res.json();
      const total = (data.linkedin?.synced || 0) + (data.twitter?.synced || 0) + (data.rss?.synced || 0);
      showToast(`Synced ${total} posts${fullHistory ? ' (full history)' : ''}`);
      load();
    } catch (err) { showToast(err.message, true); }
    setSyncing(false);
    setSyncType(null);
  };

  const grouped = { linkedin: [], twitter: [], blog: [] };
  sources.forEach(s => { if (grouped[s.platform]) grouped[s.platform].push(s); });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="label-mono">Content Intelligence</div>
          <h1>Content Sources</h1>
          <p>Track LinkedIn profiles, Twitter accounts, and blogs for content inspiration.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => syncAll(true)} disabled={syncing} title="Fetch up to 100 historical posts per source (first-time recommended)">
            {syncing && syncType === 'history' ? <><span className="spinner" /> Fetching…</> : '📚 Full History Sync'}
          </button>
          <button className="btn btn-primary" onClick={() => syncAll(false)} disabled={syncing} title="Fetch only the latest post from each source">
            {syncing && syncType === 'latest' ? <><span className="spinner" /> Syncing…</> : '⚡ Sync Latest'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Info banner */}
        <div className="pro-tip" style={{ marginBottom: 24, marginTop: 0 }}>
          <span>💡</span>
          <div>
            <strong>Smart sync:</strong> New sources automatically get full history (100 posts) on first sync. Existing sources only fetch the latest post. Just click <strong>Sync Latest</strong> — the system handles the rest. Use <strong>Full History Sync</strong> only if you want to re-fetch everything.
          </div>
        </div>

        {/* Add Source Form */}
        <div className="add-form">
          <h2>Add Content Source</h2>
          <p className="form-sub">Add a LinkedIn profile, Twitter account, or blog RSS feed to track.</p>
          <form onSubmit={addSource}>
            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="e.g. Jason Lemkin" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group" style={{ minWidth: 160 }}>
                <label className="form-label">Platform</label>
                <select className="form-input" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                  <option value="linkedin">💼 LinkedIn</option>
                  <option value="twitter">𝕏 Twitter/X</option>
                  <option value="blog">📝 Blog/RSS</option>
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">{form.platform === 'twitter' ? 'Twitter/X URL or @handle' : form.platform === 'blog' ? 'Blog URL' : 'LinkedIn Profile URL'}</label>
                <input className="form-input" placeholder={form.platform === 'twitter' ? 'https://x.com/elonmusk' : form.platform === 'blog' ? 'https://blog.example.com' : 'https://linkedin.com/in/username'} value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
              </div>
              {form.platform === 'blog' && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">RSS Feed URL <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                  <input className="form-input" placeholder="https://blog.example.com/rss.xml" value={form.rssFeedUrl} onChange={e => setForm({ ...form, rssFeedUrl: e.target.value })} />
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary">+ Add Source</button>
          </form>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {Object.entries(PLATFORM_META).map(([key, meta]) => (
            <div className="stat-card" key={key}>
              <div className="stat-label">{meta.icon} {meta.label}</div>
              <div className="stat-value" style={{ color: meta.color }}>{grouped[key]?.length || 0}</div>
              <div className="stat-sub">{grouped[key]?.reduce((a, s) => a + (s._count?.posts || 0), 0)} posts scraped</div>
            </div>
          ))}
        </div>

        {/* Sources by platform */}
        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : sources.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📡</span>
            <h3>No sources yet</h3>
            <p>Add LinkedIn profiles, Twitter accounts, or blog RSS feeds to start tracking content.</p>
          </div>
        ) : (
          Object.entries(PLATFORM_META).map(([platform, meta]) => {
            const items = grouped[platform];
            if (!items || items.length === 0) return null;
            return (
              <div key={platform}>
                <div className="section-header">
                  <span className="section-label">{meta.icon} {meta.label} Sources ({items.length})</span>
                </div>
                <div className="profile-grid">
                  {items.map(s => (
                    <div className="profile-card" key={s.id}>
                      <div className="profile-card-top">
                        <div className="avatar-lg" style={{ background: `linear-gradient(135deg, ${meta.color}, var(--teal))` }}>
                          {meta.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="profile-name">{s.name}</div>
                          <a className="profile-url" href={s.url} target="_blank" rel="noopener">{s.url.replace(/https?:\/\//, '').slice(0, 40)}…</a>
                        </div>
                        <div className="profile-badge">{s._count?.posts || 0} posts</div>
                      </div>
                      <div className="profile-card-actions">
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {s.lastScrapedAt ? `Last synced: ${new Date(s.lastScrapedAt).toLocaleDateString()}` : 'Never synced'}
                        </span>
                        <button className="btn-danger" style={{ marginLeft: 'auto' }} onClick={() => deleteSource(s.id)}>✕ Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {toast && <div className={`toast ${toast.err ? 'error' : ''}`}>{toast.msg}</div>}
    </>
  );
}
