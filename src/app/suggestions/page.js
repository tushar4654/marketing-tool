'use client';
import { useState, useEffect } from 'react';

const ROLE_META = {
  ceo: { icon: '👑', label: 'CEO', color: 'var(--orange)' },
  cto: { icon: '⚙️', label: 'CTO', color: 'var(--blue)' },
  cro: { icon: '📈', label: 'CRO', color: 'var(--green)' },
  custom: { icon: '✨', label: 'Custom', color: 'var(--purple)' },
};
const PLATFORM_ICONS = { linkedin: '💼', twitter: '𝕏', blog: '📝' };
const PLATFORM_LABELS = { linkedin: 'LinkedIn', twitter: 'Twitter/X', blog: 'Blog' };

const DISMISS_REASONS = [
  { key: 'not_relevant', label: 'Not relevant to my audience' },
  { key: 'already_covered', label: 'Topic already covered' },
  { key: 'too_generic', label: 'Too generic / not specific enough' },
  { key: 'wrong_tone', label: 'Wrong tone or angle' },
  { key: 'low_quality', label: 'Source post is low quality' },
  { key: 'other', label: 'Other reason' },
];

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
  const [hookLoading, setHookLoading] = useState(null);
  const [hookResults, setHookResults] = useState({});
  const [repurposeLoading, setRepurposeLoading] = useState(null);
  const [repurposeResults, setRepurposeResults] = useState({});
  const [showRepurpose, setShowRepurpose] = useState(null);
  const [dismissingId, setDismissingId] = useState(null);
  const [dismissOtherText, setDismissOtherText] = useState('');
  const [expandedSource, setExpandedSource] = useState(null);

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
    if (selectedPersona === 'all') { showToast('Select a specific persona to generate', true); return; }
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

  const updateStatus = async (id, status, dismissReason = null) => {
    try {
      const body = { id, status };
      if (dismissReason) body.dismissReason = dismissReason;
      await fetch('/api/suggestions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setDismissingId(null);
      setDismissOtherText('');
      loadSuggestions();
    } catch (err) { showToast(err.message, true); }
  };

  const copyText = (text, id) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  const generateHooks = async (suggestionId, suggestionText, angle) => {
    setHookLoading(suggestionId);
    try {
      const res = await fetch('/api/hooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suggestion: suggestionText, angle }) });
      const data = await res.json();
      if (data.hooks) setHookResults(prev => ({ ...prev, [suggestionId]: data.hooks }));
      else throw new Error(data.error);
    } catch (err) { showToast('Failed: ' + err.message, true); }
    setHookLoading(null);
  };

  const repurpose = async (suggestionId, suggestionText, format) => {
    const key = `${suggestionId}_${format}`;
    setRepurposeLoading(key);
    try {
      const res = await fetch('/api/repurpose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suggestion: suggestionText, format }) });
      const data = await res.json();
      if (data.content) setRepurposeResults(prev => ({ ...prev, [key]: data }));
      else throw new Error(data.error);
    } catch (err) { showToast('Failed: ' + err.message, true); }
    setRepurposeLoading(null);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="label-mono">Content Intelligence</div>
          <h1>Suggestions</h1>
          <p>AI-generated posting suggestions — original post first, your angle second.</p>
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={generating || selectedPersona === 'all'}>
          {generating ? <><span className="spinner" /> Generating…</> : '🧠 Generate Suggestions'}
        </button>
      </div>

      <div className="page-body">
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
            ⚠️ No personas configured. <a href="/personas" style={{ color: 'inherit', fontWeight: 700 }}>Create a persona</a> first.
          </div>
        )}

        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : suggestions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">💡</span>
            <h3>No suggestions yet</h3>
            <p>Select a persona and click "Generate Suggestions" to create AI-powered content ideas.</p>
          </div>
        ) : (
          <div className="ci-suggestions-list">
            {suggestions.map(s => {
              const meta = ROLE_META[s.persona?.role] || ROLE_META.custom;
              const srcPost = s.contentPost;
              const hooks = hookResults[s.id];
              const activeRepurpose = Object.entries(repurposeResults).filter(([k]) => k.startsWith(s.id + '_'));
              const isSourceExpanded = expandedSource === s.id;
              const srcContent = srcPost?.content || '';
              const srcPreview = srcContent.length > 200 ? srcContent.slice(0, 200) + '…' : srcContent;

              return (
                <div className="ci-suggestion-card" key={s.id} data-status={s.status} style={{ padding: 0, overflow: 'hidden' }}>

                  {/* ─── ORIGINAL POST (PRIMARY) ─── */}
                  {srcPost && (
                    <div style={{ padding: 20, background: 'var(--fill-secondary)', borderBottom: '1px solid var(--border-primary)', cursor: 'pointer' }}
                      onClick={() => setExpandedSource(isSourceExpanded ? null : s.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div className={`avatar ${srcPost.platform === 'twitter' ? 'avatar-purple' : srcPost.platform === 'blog' ? 'avatar-orange' : ''}`} style={{ width: 32, height: 32, fontSize: 14 }}>
                          {PLATFORM_ICONS[srcPost.platform]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {srcPost.source?.name || srcPost.authorName || 'Unknown'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', gap: 8 }}>
                            <span className="ci-platform-chip" data-platform={srcPost.platform} style={{ fontSize: 10 }}>
                              {PLATFORM_ICONS[srcPost.platform]} {PLATFORM_LABELS[srcPost.platform]}
                            </span>
                            {srcPost.postedAt && <span>{new Date(srcPost.postedAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        {srcPost.postUrl && (
                          <a href={srcPost.postUrl} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>
                            View original →
                          </a>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{isSourceExpanded ? '▲' : '▼'}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {isSourceExpanded ? srcContent : srcPreview}
                      </div>
                    </div>
                  )}

                  {/* ─── SUGGESTED ANGLE (SECONDARY) ─── */}
                  <div style={{ padding: 20 }}>
                    <div className="ci-suggestion-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💡 Your Angle</span>
                        <span className="ci-role-badge" style={{ background: meta.color + '20', color: meta.color }}>{meta.icon} {s.persona?.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{new Date(s.createdAt).toLocaleDateString()}</span>
                    </div>

                    {s.hookIdea && (
                      <div className="ci-suggestion-hook">
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>🪝 Hook:</span> {s.hookIdea}
                      </div>
                    )}

                    <div className="ci-suggestion-text">{s.suggestion}</div>

                    {s.angle && (
                      <div className="ci-suggestion-angle">
                        <span style={{ fontWeight: 600 }}>💡 Angle:</span> {s.angle}
                      </div>
                    )}

                    {/* Dismiss reason badge for dismissed suggestions */}
                    {s.status === 'dismissed' && s.dismissReason && (
                      <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.1)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                        ❌ Dismissed: {DISMISS_REASONS.find(r => r.key === s.dismissReason)?.label || s.dismissReason}
                      </div>
                    )}

                    {/* Hook Variations */}
                    {hooks && (
                      <div style={{ margin: '12px 0', padding: 16, background: 'var(--fill-secondary)', borderRadius: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>🔄 Hook Variations</div>
                        {hooks.map((h, i) => (
                          <div key={i} style={{ padding: '10px 14px', marginBottom: 6, borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => copyText(h.hook, `hook_${s.id}_${i}`)}>
                            <div>
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase' }}>{h.style}</span>
                              <div style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 2, fontWeight: 500 }}>"{h.hook}"</div>
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{copied === `hook_${s.id}_${i}` ? '✓ Copied' : 'Click to copy'}</span>
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
                            <div key={key} style={{ padding: 16, marginBottom: 8, borderRadius: 12, background: 'linear-gradient(135deg, rgba(88,86,214,0.04), rgba(0,122,255,0.04))', border: '1px solid rgba(88,86,214,0.15)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)' }}>{fmtMeta.icon} {fmtMeta.label} Format</span>
                                <button className="btn-copy" onClick={() => copyText(data.content, key)} style={{ fontSize: 12 }}>{copied === key ? '✓ Copied!' : '📋 Copy'}</button>
                              </div>
                              <pre style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', margin: 0 }}>{data.content}</pre>
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

                      <button className="btn btn-outline" style={{ fontSize: 13, padding: '7px 14px', background: hooks ? 'rgba(255,149,0,0.08)' : undefined }}
                        onClick={() => hooks ? setHookResults(prev => { const n = {...prev}; delete n[s.id]; return n; }) : generateHooks(s.id, s.suggestion, s.angle)}
                        disabled={hookLoading === s.id}>
                        {hookLoading === s.id ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Generating…</> : hooks ? '🪝 Hide Hooks' : '🪝 Hook Variations'}
                      </button>

                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button className="btn btn-outline" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => setShowRepurpose(showRepurpose === s.id ? null : s.id)}>
                          ✂️ Repurpose
                        </button>
                        {showRepurpose === s.id && (
                          <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, zIndex: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: 8, minWidth: 180 }}>
                            {REPURPOSE_FORMATS.map(f => (
                              <button key={f.key} onClick={() => { repurpose(s.id, s.suggestion, f.key); setShowRepurpose(null); }}
                                disabled={repurposeLoading === `${s.id}_${f.key}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', borderRadius: 8, background: repurposeResults[`${s.id}_${f.key}`] ? 'rgba(52,199,89,0.08)' : 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                                <span>{f.icon}</span> {f.label}
                                {repurposeResults[`${s.id}_${f.key}`] && <span style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: 11 }}>✓</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {s.status === 'pending' && (
                        <>
                          <button className="btn btn-outline" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => updateStatus(s.id, 'used')}>✅ Mark Used</button>

                          {/* Dismiss with reason */}
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button className="btn-danger" onClick={() => setDismissingId(dismissingId === s.id ? null : s.id)}>✕ Dismiss</button>
                            {dismissingId === s.id && (
                              <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 6, zIndex: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: 8, minWidth: 260 }}>
                                <div style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Why are you dismissing?</div>
                                {DISMISS_REASONS.map(r => (
                                  <button key={r.key} onClick={() => r.key === 'other' ? null : updateStatus(s.id, 'dismissed', r.key)}
                                    style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', textAlign: 'left' }}
                                    onMouseEnter={e => e.target.style.background = 'var(--fill-secondary)'}
                                    onMouseLeave={e => e.target.style.background = 'transparent'}>
                                    {r.key === 'other' ? (
                                      <div onClick={e => e.stopPropagation()}>
                                        <div style={{ marginBottom: 6 }}>Other:</div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                          <input type="text" placeholder="Your reason…" value={dismissOtherText} onChange={e => setDismissOtherText(e.target.value)}
                                            className="form-input" style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}
                                            onClick={e => e.stopPropagation()} />
                                          <button className="btn-danger" style={{ fontSize: 11, padding: '4px 8px' }}
                                            onClick={e => { e.stopPropagation(); updateStatus(s.id, 'dismissed', dismissOtherText || 'other'); }}>
                                            Go
                                          </button>
                                        </div>
                                      </div>
                                    ) : r.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {s.status !== 'pending' && (
                        <button className="btn btn-outline" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => updateStatus(s.id, 'pending')}>↩ Restore</button>
                      )}
                    </div>
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
