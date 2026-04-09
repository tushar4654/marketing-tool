'use client';
import { useEffect, useState, useCallback } from 'react';

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

function ScoreBadge({ score }) {
  const color = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--orange)' : 'var(--red)';
  const bg = score >= 80 ? 'var(--green-dim)' : score >= 50 ? 'var(--orange-dim)' : 'var(--red-dim)';
  const label = score >= 80 ? 'Strong' : score >= 50 ? 'Partial' : 'Weak';
  return (
    <div className="score-badge" style={{ '--score-color': color, '--score-bg': bg }}>
      <div className="score-bar-bg">
        <div className="score-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="score-value">{score}</span>
      <span className="score-label" style={{ color }}>{label}</span>
    </div>
  );
}

function IntentBadge({ level }) {
  const config = {
    high: { emoji: '🟢', label: 'High Intent', cls: 'intent-high' },
    medium: { emoji: '🟡', label: 'Medium', cls: 'intent-medium' },
    low: { emoji: '🔴', label: 'Low', cls: 'intent-low' },
  };
  const c = config[level] || config.low;
  return <span className={`intent-badge ${c.cls}`}>{c.emoji} {c.label}</span>;
}

function LeadCard({ lead }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copyDm = () => {
    if (!lead.suggestedDm) return;
    navigator.clipboard.writeText(lead.suggestedDm).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`lead-card ${lead.intentLevel === 'high' ? 'lead-high' : ''}`}>
      <div className="lead-card-top">
        <div className={`avatar ${getAvatarClass(lead.name)}`}>{initials(lead.name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="lead-name">{lead.name || 'Unknown'}</div>
          <div className="lead-title">{lead.title || 'No title'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <IntentBadge level={lead.intentLevel} />
          <ScoreBadge score={lead.icpScore ?? 0} />
        </div>
      </div>

      {lead.reasoning && (
        <div className="lead-reasoning">
          <span className="lead-reasoning-icon">💡</span>
          {lead.reasoning}
        </div>
      )}

      {lead.suggestedDm && (
        <div className="lead-dm-section">
          <button className="lead-dm-toggle" onClick={() => setExpanded(!expanded)}>
            <span>✉️ Suggested DM</span>
            <span style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s ease', fontSize: 11 }}>▾</span>
          </button>
          {expanded && (
            <div className="lead-dm-content">
              <p>{lead.suggestedDm}</p>
              <button className={`btn-copy ${copied ? 'copied' : ''}`} onClick={copyDm}>
                {copied ? '✓ Copied!' : '📋 Copy DM'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="lead-card-footer">
        {lead.post && (
          <span className="lead-post-context">
            Engaged on <a href={lead.post.postUrl} target="_blank" rel="noopener noreferrer">{lead.post.author?.name || 'a'}&apos;s post</a>
          </span>
        )}
        <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="post-link">
          View Profile →
        </a>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qualifying, setQualifying] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const notify = (msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const loadData = useCallback(async () => {
    try {
      const [pipeRes, statRes] = await Promise.all([
        fetch('/api/pipeline'),
        fetch('/api/qualify'),
      ]);
      const pipeData = await pipeRes.json();
      const statData = await statRes.json();
      setLeads(pipeData.leads || []);
      setStats(statData);
    } catch {
      notify('Failed to load pipeline', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runQualify = async (requalify = false) => {
    setQualifying(true);
    try {
      const res = await fetch('/api/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requalify }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(data.message || `Qualified ${data.evaluated} leads`);
        await loadData();
      } else {
        notify(data.error || 'Qualification failed', 'error');
      }
    } catch {
      notify('Qualification failed', 'error');
    } finally {
      setQualifying(false);
    }
  };

  const filtered = leads.filter(lead => {
    if (tab === 'high') return lead.intentLevel === 'high';
    if (tab === 'icp80') return (lead.icpScore ?? 0) >= 80;
    return true;
  }).filter(lead => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (lead.name || '').toLowerCase().includes(q) ||
           (lead.title || '').toLowerCase().includes(q) ||
           (lead.reasoning || '').toLowerCase().includes(q);
  });

  const highCount = leads.filter(l => l.intentLevel === 'high').length;
  const icp80Count = leads.filter(l => (l.icpScore ?? 0) >= 80).length;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Lead Pipeline</h1>
          <p>AI-qualified leads from your tracked post commenters</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-outline" onClick={() => runQualify(true)} disabled={qualifying}
            style={{ borderRadius: 100, fontSize: 13 }}>
            🔄 Re-qualify All
          </button>
          <button className="btn btn-primary" onClick={() => runQualify(false)} disabled={qualifying}
            style={{ borderRadius: 100, padding: '10px 24px' }}>
            {qualifying ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Qualifying…</>
            ) : '🧠 Qualify Leads'}
          </button>
        </div>
      </header>

      <div className="page-body">
        {/* Stats */}
        {stats && (
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="stat-card cyan">
              <div className="stat-label">Total Leads</div>
              <div className="stat-value stat-accent">{stats.total}</div>
              <div className="stat-sub">Scraped commenters</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '3px solid var(--green)' }}>
              <div className="stat-label">High Intent</div>
              <div className="stat-value stat-green">{stats.high}</div>
              <div className="stat-sub">Ready for outreach</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-label">Medium</div>
              <div className="stat-value stat-amber">{stats.medium}</div>
              <div className="stat-sub">Worth monitoring</div>
            </div>
            <div className="stat-card purple">
              <div className="stat-label">Avg Score</div>
              <div className="stat-value" style={{ color: 'var(--purple)' }}>{stats.avgScore}</div>
              <div className="stat-sub">ICP match average</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '3px solid var(--text-tertiary)' }}>
              <div className="stat-label">Pending</div>
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-sub">Not yet qualified</div>
            </div>
          </div>
        )}

        {/* Qualifying progress */}
        {qualifying && (
          <div className="sync-progress-panel" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'var(--blue)' }} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>Running AI qualification…</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, position: 'relative' }}>
              Evaluating commenters against your ICP using Gemini. This may take a minute.
            </p>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div className="segmented-control">
            <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All ({leads.length})</button>
            <button className={tab === 'high' ? 'active' : ''} onClick={() => setTab('high')}>🟢 High Intent ({highCount})</button>
            <button className={tab === 'icp80' ? 'active' : ''} onClick={() => setTab('icp80')}>🎯 ICP ≥80 ({icp80Count})</button>
          </div>
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* No context warning */}
        {stats && stats.total > 0 && stats.evaluated === 0 && !qualifying && (
          <div className="warning-banner" style={{ marginBottom: 24 }}>
            ⚡ You have {stats.total} commenters ready to qualify.{' '}
            <a href="/settings" style={{ color: 'var(--blue)', fontWeight: 600 }}>Set up your ICP first →</a>{' '}
            then click <strong>🧠 Qualify Leads</strong>.
          </div>
        )}

        {/* Lead cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: 'var(--text-tertiary)' }}>
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, marginBottom: 20 }} />
            <p style={{ fontSize: 14, fontWeight: 500 }}>Loading pipeline…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🎯</span>
            <h3>{leads.length === 0 ? 'No qualified leads yet' : 'No leads match your filter'}</h3>
            <p style={{ marginBottom: 28, fontSize: 14 }}>
              {leads.length === 0
                ? 'Sync your profiles to scrape commenters, then click "Qualify Leads" to run AI scoring.'
                : 'Try adjusting your filter or search terms.'}
            </p>
            {leads.length === 0 && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <a href="/settings" className="btn btn-outline" style={{ borderRadius: 100 }}>⚙ Configure ICP</a>
                <a href="/" className="btn btn-primary" style={{ borderRadius: 100 }}>⚡ Go to Dashboard</a>
              </div>
            )}
          </div>
        ) : (
          <div className="leads-grid">
            {filtered.map(lead => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>

      {toast && <div className={`toast${toast.type === 'error' ? ' error' : ''}`}>{toast.type === 'ok' ? '✓ ' : '✗ '}{toast.msg}</div>}
    </>
  );
}
