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
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [tableSort, setTableSort] = useState({ col: 'name', dir: 'asc' });
  const [confirmDelete, setConfirmDelete] = useState(null);

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
      const res = await fetch('/api/content-sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
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
      setConfirmDelete(null);
      load();
    } catch (err) { showToast(err.message, true); }
  };

  const syncAll = async (fullHistory = false) => {
    setSyncing(true);
    setSyncType(fullHistory ? 'history' : 'latest');
    try {
      const res = await fetch('/api/content-sources/sync-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullHistory }) });
      const data = await res.json();
      const total = (data.linkedin?.synced || 0) + (data.twitter?.synced || 0) + (data.rss?.synced || 0);
      showToast(`Synced ${total} posts${fullHistory ? ' (full history)' : ''}`);
      load();
    } catch (err) { showToast(err.message, true); }
    setSyncing(false);
    setSyncType(null);
  };

  const exportCSV = () => { window.open('/api/content-sources?format=csv', '_blank'); };

  const grouped = { linkedin: [], twitter: [], blog: [] };
  sources.forEach(s => { if (grouped[s.platform]) grouped[s.platform].push(s); });

  const sortedSources = [...sources].sort((a, b) => {
    const { col, dir } = tableSort;
    const m = dir === 'asc' ? 1 : -1;
    if (col === 'name') return m * (a.name || '').localeCompare(b.name || '');
    if (col === 'platform') return m * a.platform.localeCompare(b.platform);
    if (col === 'posts') return m * ((a._count?.posts || 0) - (b._count?.posts || 0));
    if (col === 'synced') return m * (new Date(a.lastScrapedAt || 0) - new Date(b.lastScrapedAt || 0));
    return 0;
  });

  const toggleSort = (col) => setTableSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }));
  const sortIcon = (col) => tableSort.col === col ? (tableSort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <>
      <div className="page-header">
        <div>
          <div className="label-mono">Content Intelligence</div>
          <h1>Content Sources</h1>
          <p>Track LinkedIn profiles, Twitter accounts, and blogs for content inspiration.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={exportCSV} title="Export all sources as CSV for vlookup">
            📥 Export CSV
          </button>
          <button className="btn btn-outline" onClick={() => syncAll(true)} disabled={syncing}>
            {syncing && syncType === 'history' ? <><span className="spinner" /> Fetching…</> : '📚 Full History Sync'}
          </button>
          <button className="btn btn-primary" onClick={() => syncAll(false)} disabled={syncing}>
            {syncing && syncType === 'latest' ? <><span className="spinner" /> Syncing…</> : '⚡ Sync Latest'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Info */}
        <div className="pro-tip" style={{ marginBottom: 24, marginTop: 0 }}>
          <span>💡</span>
          <div>
            <strong>Smart sync:</strong> New sources automatically get full history (100 posts) on first sync. Use <strong>Export CSV</strong> to download your list, vlookup against your master sheet, and find gaps.
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
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {Object.entries(PLATFORM_META).map(([key, meta]) => (
            <div className="stat-card" key={key}>
              <div className="stat-label">{meta.icon} {meta.label}</div>
              <div className="stat-value" style={{ color: meta.color }}>{grouped[key]?.length || 0}</div>
              <div className="stat-sub">{grouped[key]?.reduce((a, s) => a + (s._count?.posts || 0), 0)} posts</div>
            </div>
          ))}
          <div className="stat-card">
            <div className="stat-label">📊 Total</div>
            <div className="stat-value">{sources.length}</div>
            <div className="stat-sub">{sources.reduce((a, s) => a + (s._count?.posts || 0), 0)} posts</div>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>All Sources ({sources.length})</h2>
          <div className="segmented-control" style={{ minWidth: 200 }}>
            <button className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')}>📊 Cards</button>
            <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>📋 Table</button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : sources.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📡</span>
            <h3>No sources yet</h3>
            <p>Add LinkedIn profiles, Twitter accounts, or blog RSS feeds to start tracking content.</p>
          </div>
        ) : viewMode === 'table' ? (
          /* ─── TABLE VIEW ─── */
          <div style={{ overflow: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--fill-secondary)' }}>
                  {[
                    { col: 'name', label: 'Name' },
                    { col: 'platform', label: 'Platform' },
                    { col: 'url', label: 'URL' },
                    { col: 'posts', label: 'Posts' },
                    { col: 'synced', label: 'Last Synced' },
                    { col: null, label: 'Actions' },
                  ].map(h => (
                    <th key={h.label} onClick={h.col ? () => toggleSort(h.col) : undefined} style={{
                      padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)',
                      cursor: h.col ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap',
                      borderBottom: '1px solid var(--border-primary)',
                    }}>
                      {h.label}{h.col ? sortIcon(h.col) : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedSources.map(s => {
                  const meta = PLATFORM_META[s.platform] || {};
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: meta.color + '15', color: meta.color }}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', maxWidth: 300 }}>
                        <a href={s.url} target="_blank" rel="noopener" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: 12 }}>
                          {s.url.replace(/https?:\/\//, '').slice(0, 45)}{s.url.length > 50 ? '…' : ''}
                        </a>
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>{s._count?.posts || 0}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {s.lastScrapedAt ? new Date(s.lastScrapedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {confirmDelete === s.id ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-danger" onClick={() => deleteSource(s.id)} style={{ fontSize: 11 }}>Confirm</button>
                            <button className="btn btn-outline" onClick={() => setConfirmDelete(null)} style={{ fontSize: 11, padding: '4px 8px' }}>Cancel</button>
                          </div>
                        ) : (
                          <button className="btn-danger" onClick={() => setConfirmDelete(s.id)} style={{ fontSize: 11 }}>✕ Remove</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ─── CARD VIEW ─── */
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
                        <div className="avatar-lg" style={{ background: `linear-gradient(135deg, ${meta.color}, var(--teal))` }}>{meta.icon}</div>
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
