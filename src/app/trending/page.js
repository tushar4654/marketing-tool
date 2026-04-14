'use client';
import { useState, useEffect } from 'react';

const ROLE_META = {
  ceo: { icon: '👑', label: 'CEO', color: '#FF9500' },
  cto: { icon: '⚙️', label: 'CTO', color: '#007AFF' },
  cro: { icon: '📈', label: 'CRO', color: '#34C759' },
  custom: { icon: '✨', label: 'Custom', color: '#5856D6' },
};

export default function TrendingPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('');

  useEffect(() => {
    fetch('/api/personas').then(r => r.json()).then(d => setPersonas(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => { analyze(false); }, [selectedPersona]);

  async function analyze(force = false) {
    setLoading(true);
    setError(null);
    setExpandedTopic(null);
    try {
      const params = new URLSearchParams();
      if (force) params.set('refresh', 'true');
      if (selectedPersona) params.set('personaId', selectedPersona);
      const r = await fetch(`/api/trending?${params}`);
      if (!r.ok) throw new Error('Failed to analyze');
      setData(await r.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  const copyText = (text, id) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  const heatColor = (heat) => {
    if (heat >= 9) return 'linear-gradient(135deg, #FF3B30, #FF6B35)';
    if (heat >= 7) return 'linear-gradient(135deg, #FF9500, #FFCC02)';
    if (heat >= 5) return 'linear-gradient(135deg, #34C759, #30D158)';
    return 'linear-gradient(135deg, #5AC8FA, #007AFF)';
  };

  const heatLabel = (heat) => {
    if (heat >= 9) return '🔥 On Fire';
    if (heat >= 7) return '🌡️ Hot';
    if (heat >= 5) return '📈 Rising';
    return '💡 Emerging';
  };

  const bucketColor = (bucket) => {
    const b = (bucket || '').toLowerCase();
    if (b.includes('humble')) return { bg: 'rgba(255,149,0,0.08)', color: '#FF9500', label: '🏆 Humble Brag' };
    if (b.includes('build')) return { bg: 'rgba(88,86,214,0.08)', color: '#5856D6', label: '🔨 Build in Public' };
    if (b.includes('tactical')) return { bg: 'rgba(0,122,255,0.08)', color: '#007AFF', label: '🎯 Tactical' };
    if (b.includes('topical')) return { bg: 'rgba(255,59,48,0.08)', color: '#FF3B30', label: '⚡ Topical' };
    return { bg: 'var(--fill-secondary)', color: 'var(--text-secondary)', label: bucket };
  };

  const activePersona = personas.find(p => p.id === selectedPersona);
  const activeMeta = ROLE_META[activePersona?.role] || ROLE_META.custom;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>🔥 Trending Intelligence</h1>
          <p>AI-powered analysis — with persona-tailored post drafts per topic</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => analyze(true)} disabled={loading} style={{ borderRadius: 100, padding: '10px 28px' }}>
            {loading ? '⏳ Analyzing…' : '🔄 Refresh'}
          </button>
        </div>
      </header>

      <div className="page-body">
        {/* Persona Selector */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 240, margin: 0 }}>
            <label className="form-label">Generate drafts as</label>
            <select className="form-input" value={selectedPersona} onChange={e => setSelectedPersona(e.target.value)}>
              <option value="">Generic CEO/CRO</option>
              {personas.map(p => {
                const meta = ROLE_META[p.role] || ROLE_META.custom;
                return <option key={p.id} value={p.id}>{meta.icon} {p.name} ({meta.label})</option>;
              })}
            </select>
          </div>
          {activePersona && (
            <div style={{ padding: '8px 16px', borderRadius: 100, background: activeMeta.color + '15', color: activeMeta.color, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-end' }}>
              {activeMeta.icon} Drafts personalized for {activePersona.name}
              {activePersona.contextMarkdown && <span style={{ fontSize: 10, opacity: 0.7 }}>• Using content brief</span>}
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>🧠</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
              Analyzing 300+ posts{activePersona ? ` for ${activePersona.name}` : ''}…
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Extracting trends and generating personalized drafts</p>
          </div>
        )}

        {error && (
          <div className="empty-state" style={{ background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.2)' }}>
            <p style={{ color: '#FF3B30' }}>⚠️ {error}</p>
            <button className="btn btn-primary" onClick={() => analyze(true)} style={{ marginTop: 12 }}>Retry</button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              <div className="stat-card"><div className="stat-label">Posts Analyzed</div><div className="stat-value">{data.stats?.totalPosts || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Topics Found</div><div className="stat-value">{data.topics?.length || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Hot Topics (8+)</div><div className="stat-value" style={{ color: '#FF3B30' }}>{data.topics?.filter(t => t.heat >= 8).length || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Ready Drafts</div><div className="stat-value" style={{ color: 'var(--green)' }}>{data.topics?.reduce((sum, t) => sum + (t.suggestions?.length || 0), 0)}</div></div>
            </div>

            {/* Sources */}
            <div className="settings-section" style={{ marginBottom: 24, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>📊 Most Active Sources</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {data.stats?.topSources?.map((s, i) => (
                  <div key={i} style={{ padding: '8px 16px', borderRadius: 100, background: i === 0 ? 'var(--blue)' : 'var(--fill-secondary)', color: i === 0 ? '#fff' : 'var(--text-primary)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {s.name} <span style={{ opacity: 0.7, fontWeight: 400 }}>{s.count} posts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Topic Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {data.topics?.map((topic, i) => {
                const isExpanded = expandedTopic === i;
                const hasSuggestions = topic.suggestions?.length > 0;
                return (
                  <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', overflow: 'hidden' }}>
                    <div style={{ height: 4, background: heatColor(topic.heat) }} />
                    <div style={{ padding: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                          <span style={{ fontSize: 28 }}>{topic.emoji}</span>
                          <div>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{topic.topic}</h3>
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{topic.count} posts</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: heatColor(topic.heat), color: '#fff', whiteSpace: 'nowrap' }}>
                            {heatLabel(topic.heat)} {topic.heat}/10
                          </div>
                          {hasSuggestions && (
                            <button onClick={() => setExpandedTopic(isExpanded ? null : i)} style={{
                              padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: '1px solid var(--border-primary)',
                              background: isExpanded ? 'var(--blue)' : 'var(--fill-secondary)', color: isExpanded ? '#fff' : 'var(--text-primary)',
                              cursor: 'pointer', transition: 'all 0.2s',
                            }}>
                              {isExpanded ? '▼ Hide Drafts' : `✍️ ${topic.suggestions.length} Drafts`}
                            </button>
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{topic.description}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {topic.accounts?.map((a, j) => (
                            <span key={j} style={{ padding: '3px 10px', borderRadius: 100, fontSize: 12, background: 'var(--fill-tertiary)', color: 'var(--text-primary)', fontWeight: 500 }}>{a}</span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {topic.platforms?.map((p, m) => (
                            <span key={m} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: p === 'twitter' ? 'rgba(29,161,242,0.1)' : p === 'linkedin' ? 'rgba(10,102,194,0.1)' : 'rgba(255,149,0,0.1)', color: p === 'twitter' ? '#1DA1F2' : p === 'linkedin' ? '#0A66C2' : '#FF9500', fontWeight: 600 }}>
                              {p === 'twitter' ? '𝕏' : p === 'linkedin' ? '💼 LI' : '📝 Blog'}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: isExpanded ? 16 : 0 }}>
                        {topic.angles?.map((angle, k) => (
                          <div key={k} onClick={() => copyText(angle, `angle_${i}_${k}`)} style={{
                            padding: '6px 12px', fontSize: 12, color: 'var(--text-primary)', background: 'var(--fill-secondary)', borderRadius: 100,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            💡 {angle}
                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{copied === `angle_${i}_${k}` ? '✓' : 'copy'}</span>
                          </div>
                        ))}
                      </div>

                      {/* Expanded Drafts */}
                      {isExpanded && hasSuggestions && (
                        <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            ✍️ {data.persona ? `Drafts for ${data.persona.name}` : 'Ready-to-Post Drafts'}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: topic.suggestions.length > 1 ? 'repeat(2, 1fr)' : '1fr', gap: 16 }}>
                            {topic.suggestions.map((sug, si) => {
                              const bk = bucketColor(sug.bucket);
                              const sugId = `sug_${i}_${si}`;
                              return (
                                <div key={si} style={{ padding: 20, borderRadius: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: bk.bg, color: bk.color }}>{bk.label}</span>
                                    <button onClick={() => copyText(sug.hook + '\n\n' + sug.draft, sugId)} style={{
                                      padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600, border: '1px solid var(--border-primary)',
                                      background: copied === sugId ? 'var(--green)' : 'var(--fill-secondary)', color: copied === sugId ? '#fff' : 'var(--text-primary)',
                                      cursor: 'pointer',
                                    }}>
                                      {copied === sugId ? '✓ Copied!' : '📋 Copy Post'}
                                    </button>
                                  </div>
                                  <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, background: 'rgba(255,149,0,0.06)', borderLeft: '3px solid var(--orange)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                    🪝 {sug.hook}
                                  </div>
                                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{sug.draft}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', padding: 24, fontSize: 12, color: 'var(--text-tertiary)' }}>
              {data._cached && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 100, background: 'rgba(52,199,89,0.1)', color: 'var(--green)', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                  ⚡ Served from cache — 0 tokens used
                </div>
              )}
              <div>
                {data.persona ? `Personalized for ${data.persona.name} • ` : ''}Analysis by Claude AI • {new Date(data.stats?.analyzedAt).toLocaleString()}
                {data.stats?.tokensUsed?.input && !data._cached && <span> • {data.stats.tokensUsed.input + data.stats.tokensUsed.output} tokens</span>}
              </div>
            </div>
          </>
        )}
      </div>
      <style jsx>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.7; } }
      `}</style>
    </>
  );
}
