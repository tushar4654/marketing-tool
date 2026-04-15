'use client';
import { useState, useEffect } from 'react';

const ROLE_META = {
  ceo: { icon: '👑', label: 'CEO', color: '#FF9500' },
  cto: { icon: '⚙️', label: 'CTO', color: '#007AFF' },
  cro: { icon: '📈', label: 'CRO', color: '#34C759' },
  custom: { icon: '✨', label: 'Custom', color: '#5856D6' },
};
const PLATFORM_ICONS = { linkedin: '💼', twitter: '𝕏', blog: '📝' };
const PLATFORM_LABELS = { linkedin: 'LinkedIn', twitter: 'Twitter/X', blog: 'Blog' };

export default function TrendingPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [channelFilter, setChannelFilter] = useState('all');
  const [showDrafts, setShowDrafts] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('');

  useEffect(() => {
    fetch('/api/personas').then(r => r.json()).then(d => setPersonas(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => { analyze(false); }, [selectedPersona]);

  async function analyze(force = false) {
    setLoading(true);
    setError(null);
    setSelectedTopic(null);
    const params = new URLSearchParams();
    if (force) params.set('refresh', 'true');
    if (selectedPersona) params.set('personaId', selectedPersona);
    try {
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

  const heatLabel = (h) => h >= 9 ? '🔥' : h >= 7 ? '🌡️' : h >= 5 ? '📈' : '💡';

  const bucketColor = (bucket) => {
    const b = (bucket || '').toLowerCase();
    if (b.includes('humble')) return { bg: 'rgba(255,149,0,0.08)', color: '#FF9500', label: '🏆 Humble Brag' };
    if (b.includes('build')) return { bg: 'rgba(88,86,214,0.08)', color: '#5856D6', label: '🔨 Build in Public' };
    if (b.includes('tactical')) return { bg: 'rgba(0,122,255,0.08)', color: '#007AFF', label: '🎯 Tactical' };
    if (b.includes('topical')) return { bg: 'rgba(255,59,48,0.08)', color: '#FF3B30', label: '⚡ Topical' };
    return { bg: 'var(--fill-secondary)', color: 'var(--text-secondary)', label: bucket };
  };

  const activeTopic = selectedTopic !== null ? data?.topics?.[selectedTopic] : null;
  const filteredPosts = activeTopic?.matchedPosts?.filter(p => channelFilter === 'all' || p.platform === channelFilter) || [];
  const activePersona = personas.find(p => p.id === selectedPersona);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>🔥 Trending Intelligence</h1>
          <p>AI-powered trending topics with real post previews and persona-tailored drafts</p>
        </div>
        <button className="btn btn-primary" onClick={() => analyze(true)} disabled={loading} style={{ borderRadius: 100, padding: '10px 28px' }}>
          {loading ? '⏳ Analyzing…' : '🔄 Refresh'}
        </button>
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
            <div style={{ padding: '8px 16px', borderRadius: 100, background: (ROLE_META[activePersona.role]?.color || '#5856D6') + '15', color: ROLE_META[activePersona.role]?.color || '#5856D6', fontSize: 13, fontWeight: 600, alignSelf: 'flex-end' }}>
              {ROLE_META[activePersona.role]?.icon} Drafts for {activePersona.name}
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>🧠</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Analyzing 300+ posts…</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Extracting trends and matching real posts</p>
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
            {/* Dashboard Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              <div className="stat-card"><div className="stat-label">Posts Analyzed</div><div className="stat-value">{data.stats?.totalPosts || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Topics Found</div><div className="stat-value">{data.topics?.length || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Hot Topics (8+)</div><div className="stat-value" style={{ color: '#FF3B30' }}>{data.topics?.filter(t => t.heat >= 8).length || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Ready Drafts</div><div className="stat-value" style={{ color: 'var(--green)' }}>{data.topics?.reduce((sum, t) => sum + (t.suggestions?.length || 0), 0)}</div></div>
            </div>

            {/* ─── TOPIC BUTTONS ─── */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Click a topic to see posts & drafts
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {data.topics?.map((topic, i) => (
                  <button key={i} onClick={() => { setSelectedTopic(selectedTopic === i ? null : i); setChannelFilter('all'); setShowDrafts(false); }}
                    style={{
                      padding: '10px 18px', borderRadius: 100, border: selectedTopic === i ? '2px solid var(--blue)' : '1px solid var(--border-primary)',
                      background: selectedTopic === i ? 'var(--blue)' : 'var(--bg-secondary)', color: selectedTopic === i ? '#fff' : 'var(--text-primary)',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                    }}>
                    <span style={{ fontSize: 16 }}>{topic.emoji}</span>
                    {topic.topic}
                    <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: heatColor(topic.heat), color: '#fff' }}>
                      {heatLabel(topic.heat)} {topic.heat}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.7 }}>{topic.count}p</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ─── EXPANDED TOPIC PANEL ─── */}
            {activeTopic && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', overflow: 'hidden', marginBottom: 24 }}>
                {/* Topic Header */}
                <div style={{ height: 4, background: heatColor(activeTopic.heat) }} />
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{activeTopic.emoji}</span> {activeTopic.topic}
                      </h2>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{activeTopic.description}</p>
                    </div>
                    <button onClick={() => setShowDrafts(!showDrafts)} style={{
                      padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600, border: '1px solid var(--border-primary)',
                      background: showDrafts ? 'var(--blue)' : 'var(--fill-secondary)', color: showDrafts ? '#fff' : 'var(--text-primary)',
                      cursor: 'pointer',
                    }}>
                      {showDrafts ? '📰 Show Posts' : `✍️ ${activeTopic.suggestions?.length || 0} Drafts`}
                    </button>
                  </div>

                  {/* Angles */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {activeTopic.angles?.map((angle, k) => (
                      <div key={k} onClick={() => copyText(angle, `angle_${selectedTopic}_${k}`)}
                        style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-primary)', background: 'var(--fill-secondary)', borderRadius: 100, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        💡 {angle}
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{copied === `angle_${selectedTopic}_${k}` ? '✓' : 'copy'}</span>
                      </div>
                    ))}
                  </div>

                  {showDrafts ? (
                    /* ─── DRAFTS VIEW ─── */
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase' }}>
                        ✍️ {data.persona ? `Drafts for ${data.persona.name}` : 'Ready-to-Post Drafts'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: activeTopic.suggestions?.length > 1 ? 'repeat(2, 1fr)' : '1fr', gap: 16 }}>
                        {activeTopic.suggestions?.map((sug, si) => {
                          const bk = bucketColor(sug.bucket);
                          const sugId = `sug_${selectedTopic}_${si}`;
                          return (
                            <div key={si} style={{ padding: 20, borderRadius: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: bk.bg, color: bk.color }}>{bk.label}</span>
                                <button onClick={() => copyText(sug.hook + '\n\n' + sug.draft, sugId)} style={{
                                  padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600, border: '1px solid var(--border-primary)',
                                  background: copied === sugId ? 'var(--green)' : 'var(--fill-secondary)', color: copied === sugId ? '#fff' : 'var(--text-primary)', cursor: 'pointer',
                                }}>
                                  {copied === sugId ? '✓ Copied!' : '📋 Copy Post'}
                                </button>
                              </div>
                              <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, background: 'rgba(255,149,0,0.06)', borderLeft: '3px solid var(--orange)', fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>
                                🪝 {sug.hook}
                              </div>
                              <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{sug.draft}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* ─── POSTS VIEW ─── */
                    <div>
                      {/* Channel Filter */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Filter by:</span>
                        {['all', 'linkedin', 'twitter', 'blog'].map(ch => {
                          const count = activeTopic.matchedPosts?.filter(p => ch === 'all' || p.platform === ch).length || 0;
                          return (
                            <button key={ch} onClick={() => setChannelFilter(ch)} style={{
                              padding: '5px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: '1px solid var(--border-primary)',
                              background: channelFilter === ch ? 'var(--blue)' : 'var(--fill-secondary)', color: channelFilter === ch ? '#fff' : 'var(--text-primary)',
                              cursor: 'pointer', opacity: count === 0 && ch !== 'all' ? 0.4 : 1,
                            }}>
                              {ch === 'all' ? `🌐 All (${activeTopic.matchedPosts?.length || 0})` : `${PLATFORM_ICONS[ch]} ${PLATFORM_LABELS[ch]} (${count})`}
                            </button>
                          );
                        })}
                      </div>

                      {/* Posts */}
                      {filteredPosts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
                          No posts found for this channel filter.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {filteredPosts.map((post, pi) => (
                            <div key={pi} style={{ padding: 16, borderRadius: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: post.platform === 'twitter' ? '#1DA1F220' : post.platform === 'linkedin' ? '#0A66C220' : '#FF950020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                                  {PLATFORM_ICONS[post.platform]}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{post.authorName}</span>
                                  {post.sourceName && post.sourceName !== post.authorName && (
                                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 6 }}>via {post.sourceName}</span>
                                  )}
                                </div>
                                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: post.platform === 'twitter' ? '#1DA1F215' : post.platform === 'linkedin' ? '#0A66C215' : '#FF950015', color: post.platform === 'twitter' ? '#1DA1F2' : post.platform === 'linkedin' ? '#0A66C2' : '#FF9500' }}>
                                  {PLATFORM_LABELS[post.platform]}
                                </span>
                                {post.postedAt && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(post.postedAt).toLocaleDateString()}</span>}
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {post.content}
                              </div>
                              {post.postUrl && (
                                <a href={post.postUrl} target="_blank" rel="noopener" style={{ fontSize: 11, color: 'var(--blue)', textDecoration: 'none', marginTop: 8, display: 'inline-block' }}>
                                  View original →
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

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
