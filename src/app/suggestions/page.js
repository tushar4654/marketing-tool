'use client';
import { useState, useEffect } from 'react';

const ROLE_META = {
  ceo: { icon: '👑', label: 'CEO', color: 'var(--orange)' },
  cto: { icon: '⚙️', label: 'CTO', color: 'var(--blue)' },
  cro: { icon: '📈', label: 'CRO', color: 'var(--green)' },
  custom: { icon: '✨', label: 'Custom', color: 'var(--purple)' },
};
const PLATFORM_ICONS = { linkedin: '💼', twitter: '𝕏', blog: '📝' };
const REPURPOSE_FORMATS = [
  { key: 'tweet', icon: '🐦', label: 'Tweet' },
  { key: 'thread', icon: '🧵', label: 'Thread' },
  { key: 'carousel', icon: '🎠', label: 'Carousel' },
  { key: 'newsletter', icon: '📧', label: 'Newsletter' },
  { key: 'short_video', icon: '🎬', label: 'Video Script' },
];

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(null);
  // Hook variations state
  const [hookLoading, setHookLoading] = useState(null);
  const [hookResults, setHookResults] = useState({});
  // Repurpose state
  const [repurposeLoading, setRepurposeLoading] = useState(null);
  const [repurposeResults, setRepurposeResults] = useState({});
  const [showRepurpose, setShowRepurpose] = useState(null);

  const showToast = (msg, err) => { setToast({ msg, err }); setTimeout(() => setToast(null), 4000); };

  const loadPersonas = async () => {
    try { const res = await fetch('/api/personas'); setPersonas(await res.json()); } catch { setPersonas([]); }
  };

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (selectedPersona !== 'all') params.set('personaId', selectedPersona);
      const res = await fetch(`/api/suggestions?${params}`);
      setSuggestions(await res.json());
    } catch { setSuggestions([]); }
    setLoading(false);
  };

  useEffect(() => { loadPersonas(); }, []);
  useEffect(() => { loadSuggestions(); }, [selectedPersona, statusFilter]);

  const generate = async () => {
    if (selectedPersona === 'all') { showToast('Select a specific persona to generate suggestions', true); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/suggestions/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personaId: selectedPersona }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message || `Generated ${data.generated} suggestions`);
      loadSuggestions();
    } catch (err) { showToast(err.message, true); }
    setGenerating(false);
  };

  const updateStatus = async (id, status) => {
    try { await fetch('/api/suggestions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); loadSuggestions(); } catch (err) { showToast(err.message, true); }
  };

  const copyText = (text, id) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  // Generate hook variations
  const generateHooks = async (suggestionId, suggestionText, angle) => {
    setHookLoading(suggestionId);
    try {
      const res = await fetch('/api/hooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suggestion: suggestionText, angle }) });
      const data = await res.json();
      if (data.hooks) setHookResults(prev => ({ ...prev, [suggestionId]: data.hooks }));
      else throw new Error(data.error);
    } catch (err) { showToast('Failed to generate hooks: ' + err.message, true); }
    setHookLoading(null);
  };

  // Repurpose content
  const repurpose = async (suggestionId, suggestionText, format) => {
    const key = `${suggestionId}_${format}`;
    setRepurposeLoading(key);
    try {
      const res = await fetch('/api/repurpose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suggestion: suggestionText, format }) });
      const data = await res.json();
      if (data.content) setRepurposeResults(prev => ({ ...prev, [key]: data }));
      else throw new Error(data.error);
    } catch (err) { showToast('Failed to repurpose: ' + err.message, true); }
    setRepurposeLoading(null);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="label-mono">Content Intelligence</div>
          <h1>Suggestions</h1>
          <p>AI-generated posting suggestions tailored to each persona.</p>
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={generating || selectedPersona === 'all'}>
          {generating ? <><span className="spinner" /> Generating…</> : '🧠 Generate Suggestions'}
        </button>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ minWidth: 200 }}>
            <label className="form-label">Persona</label>
            <select className="form-input" value={selectedPersona} onChange={e => setSelectedPersona(e.target.value)}>
              <option value="all">All Personas</option>
              {personas.map(p => {
                const meta = ROLE_META[p.role] || ROLE_META.custom;
                return <option key={p.id} value={p.id}>{meta.icon} {p.name} ({meta.label})</option>;
              })}
            </select>
          </div>
          <div className="segmented-control" style={{ alignSelf: 'flex-end' }}>
            {['pending', 'used', 'dismissed', 'all'].map(s => (
              <button key={s} className={statusFilter === s ? 'active' : ''} onClick={() => setStatusFilter(s)}>
                {s === 'pending' ? '📋 Pending' : s === 'used' ? '✅ Used' : s === 'dismissed' ? '❌ Dismissed' : '🔍 All'}
              </button>
            ))}
          </div>
        </div>

        {personas.length === 0 && !loading && (
          <div className="warning-banner">
            ⚠️ No personas configured. <a href="/personas" style={{ color: 'inherit', fontWeight: 700 }}>Create a persona</a> first to generate suggestions.
          </div>
        )}

        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : suggestions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">💡</span>
            <h3>No suggestions yet</h3>
            <p>Select a persona and click "Generate Suggestions" to create AI-powered content ideas from your scraped feed.</p>
          </div>
        ) : (
          <div className="ci-suggestions-list">
            {suggestions.map(s => {
              const meta = ROLE_META[s.persona?.role] || ROLE_META.custom;
              const srcPost = s.contentPost;
              const hooks = hookResults[s.id];
              const activeRepurpose = Object.entries(repurposeResults).filter(([k]) => k.startsWith(s.id + '_'));

              return (
                <div className="ci-suggestion-card" key={s.id} data-status={s.status}>
                  {/* Header */}
                  <div className="ci-suggestion-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="ci-role-badge" style={{ background: meta.color + '20', color: meta.color }}>{meta.icon} {s.persona?.name}</span>
                      {s.persona?.linkedinProfileUrl && (
                        <a href={s.persona.linkedinProfileUrl} target="_blank" rel="noopener" style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none' }}>
                          Post from this account →
                        </a>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Hook */}
                  {s.hookIdea && (
                    <div className="ci-suggestion-hook">
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>🪝 Hook:</span> {s.hookIdea}
                    </div>
                  )}

                  {/* Suggestion text */}
                  <div className="ci-suggestion-text">{s.suggestion}</div>

                  {/* Angle */}
                  {s.angle && (
                    <div className="ci-suggestion-angle">
                      <span style={{ fontWeight: 600 }}>💡 Angle:</span> {s.angle}
                    </div>
                  )}

                  {/* Source reference */}
                  {srcPost && (
                    <div className="ci-suggestion-source">
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        Inspired by {PLATFORM_ICONS[srcPost.platform]} {srcPost.source?.name || srcPost.authorName || 'Unknown'}
                      </span>
                      {srcPost.postUrl && (
                        <a href={srcPost.postUrl} target="_blank" rel="noopener" style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none', marginLeft: 8 }}>
                          View source →
                        </a>
                      )}
                    </div>
                  )}

                  {/* Hook Variations */}
                  {hooks && (
                    <div style={{ margin: '12px 0', padding: 16, background: 'var(--fill-secondary)', borderRadius: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>🔄 Hook Variations</div>
                      {hooks.map((h, i) => (
                        <div key={i} style={{
                          padding: '10px 14px', marginBottom: 6, borderRadius: 8,
                          background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                          cursor: 'pointer', transition: 'background 0.15s',
                        }} onClick={() => copyText(h.hook, `hook_${s.id}_${i}`)}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{h.style}</span>
                            <div style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 2, fontWeight: 500 }}>"{h.hook}"</div>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                            {copied === `hook_${s.id}_${i}` ? '✓ Copied' : 'Click to copy'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Repurposed Content */}
                  {activeRepurpose.length > 0 && (
                    <div style={{ margin: '12px 0' }}>
                      {activeRepurpose.map(([key, data]) => {
                        const fmt = key.split('_').pop();
                        const fmtMeta = REPURPOSE_FORMATS.find(f => f.key === fmt) || {};
                        return (
                          <div key={key} style={{
                            padding: 16, marginBottom: 8, borderRadius: 12,
                            background: 'linear-gradient(135deg, rgba(88,86,214,0.04), rgba(0,122,255,0.04))',
                            border: '1px solid rgba(88,86,214,0.15)',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)' }}>
                                {fmtMeta.icon} {fmtMeta.label} Format
                              </span>
                              <button className="btn-copy" onClick={() => copyText(data.content, key)} style={{ fontSize: 12 }}>
                                {copied === key ? '✓ Copied!' : '📋 Copy'}
                              </button>
                            </div>
                            <pre style={{
                              fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)',
                              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                              fontFamily: 'inherit', margin: 0,
                            }}>{data.content}</pre>
                            {data.charCount && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>{data.charCount} characters</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="ci-suggestion-actions" style={{ flexWrap: 'wrap' }}>
                    <button className={`btn-copy ${copied === s.id ? 'copied' : ''}`} onClick={() => copyText(s.suggestion, s.id)}>
                      {copied === s.id ? '✓ Copied!' : '📋 Copy'}
                    </button>

                    {/* Hook Variations Button */}
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: 13, padding: '7px 14px', background: hooks ? 'rgba(255,149,0,0.08)' : undefined }}
                      onClick={() => hooks ? setHookResults(prev => { const n = {...prev}; delete n[s.id]; return n; }) : generateHooks(s.id, s.suggestion, s.angle)}
                      disabled={hookLoading === s.id}
                    >
                      {hookLoading === s.id ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Generating…</> : hooks ? '🪝 Hide Hooks' : '🪝 Hook Variations'}
                    </button>

                    {/* Repurpose Button */}
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: 13, padding: '7px 14px' }}
                        onClick={() => setShowRepurpose(showRepurpose === s.id ? null : s.id)}
                      >
                        ✂️ Repurpose
                      </button>
                      {showRepurpose === s.id && (
                        <div style={{
                          position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, zIndex: 100,
                          background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: 8,
                          minWidth: 180,
                        }}>
                          {REPURPOSE_FORMATS.map(f => {
                            const rKey = `${s.id}_${f.key}`;
                            return (
                              <button key={f.key} onClick={() => { repurpose(s.id, s.suggestion, f.key); setShowRepurpose(null); }}
                                disabled={repurposeLoading === rKey}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                  padding: '8px 12px', border: 'none', borderRadius: 8,
                                  background: repurposeResults[rKey] ? 'rgba(52,199,89,0.08)' : 'transparent',
                                  cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.target.style.background = 'var(--fill-secondary)'}
                                onMouseLeave={e => e.target.style.background = repurposeResults[rKey] ? 'rgba(52,199,89,0.08)' : 'transparent'}
                              >
                                <span>{f.icon}</span> {f.label}
                                {repurposeResults[rKey] && <span style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: 11 }}>✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {s.status === 'pending' && (
                      <>
                        <button className="btn btn-outline" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => updateStatus(s.id, 'used')}>✅ Mark Used</button>
                        <button className="btn-danger" onClick={() => updateStatus(s.id, 'dismissed')}>✕ Dismiss</button>
                      </>
                    )}
                    {s.status !== 'pending' && (
                      <button className="btn btn-outline" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => updateStatus(s.id, 'pending')}>↩ Restore</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.err ? 'error' : ''}`}>{toast.msg}</div>}
    </>
  );
}
