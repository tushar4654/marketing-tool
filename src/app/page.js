'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ROLE_META = {
  ceo: { icon: '👑', color: '#FF9500' },
  cto: { icon: '⚙️', color: '#007AFF' },
  cro: { icon: '📈', color: '#34C759' },
  custom: { icon: '✨', color: '#5856D6' },
};

export default function HomePage() {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/brief').then(r => r.json()).then(d => { setBrief(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const copyText = (text, id) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div className="page-body" style={{ textAlign: 'center', padding: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>☕</div>
      <h3 style={{ color: 'var(--text-primary)' }}>Preparing your brief…</h3>
    </div>
  );

  const s = brief?.stats || {};

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{greeting} ✨</h1>
          <p>Here's what's ready for you today</p>
        </div>
      </div>

      <div className="page-body">
        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <div className="stat-card" onClick={() => router.push('/suggestions')} style={{ cursor: 'pointer' }}>
            <div className="stat-label">📋 Ready to Post</div>
            <div className="stat-value" style={{ color: 'var(--blue)' }}>{s.pendingCount || 0}</div>
            <div className="stat-sub">pending suggestions</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">✅ Used This Week</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{s.usedThisWeek || 0}</div>
            <div className="stat-sub">posts published</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">📊 Content Library</div>
            <div className="stat-value">{s.totalPosts || 0}</div>
            <div className="stat-sub">from {s.totalSources || 0} sources</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">🔥 Used This Month</div>
            <div className="stat-value" style={{ color: 'var(--orange)' }}>{s.usedThisMonth || 0}</div>
            <div className="stat-sub">content pieces posted</div>
          </div>
        </div>

        {/* Hot Topics Strip */}
        {brief?.hotTopics?.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🔥 Hot Right Now</h2>
              <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => router.push('/trending')}>
                See all trending →
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${brief.hotTopics.length}, 1fr)`, gap: 16 }}>
              {brief.hotTopics.map((topic, i) => (
                <div key={i} style={{
                  padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)', cursor: 'pointer',
                }} onClick={() => router.push('/trending')}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{topic.emoji}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{topic.topic}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{topic.description}</div>
                  <div style={{ marginTop: 8, padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, display: 'inline-block',
                    background: topic.heat >= 9 ? 'linear-gradient(135deg, #FF3B30, #FF6B35)' : 'linear-gradient(135deg, #FF9500, #FFCC02)',
                    color: '#fff' }}>
                    🔥 Heat {topic.heat}/10
                  </div>
                  {topic.topDraft && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'var(--fill-secondary)', fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: 'var(--orange)', marginBottom: 4 }}>🪝 Quick draft:</div>
                      <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>"{topic.topDraft.hook}"</div>
                      <button className="btn-copy" style={{ marginTop: 8, fontSize: 11 }}
                        onClick={e => { e.stopPropagation(); copyText(topic.topDraft.hook + '\n\n' + topic.topDraft.draft, `topic_${i}`); }}>
                        {copied === `topic_${i}` ? '✓ Copied!' : '📋 Copy Draft'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ready to Post — Top 5 Suggestions */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📋 Ready to Post</h2>
            <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => router.push('/suggestions')}>
              View all suggestions →
            </button>
          </div>
          {!brief?.pendingSuggestions?.length ? (
            <div style={{ padding: 40, textAlign: 'center', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
              <h3 style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>No pending suggestions</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Go to <a href="/suggestions" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>Suggestions</a> and generate new ideas.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {brief.pendingSuggestions.map((sug, i) => {
                const meta = ROLE_META[sug.persona?.role] || ROLE_META.custom;
                return (
                  <div key={sug.id} style={{
                    padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: meta.color + '15', color: meta.color }}>
                        {meta.icon} {sug.persona?.name}
                      </span>
                      {sug.contentPost?.platform && (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {sug.contentPost.platform === 'linkedin' ? '💼' : sug.contentPost.platform === 'twitter' ? '𝕏' : '📝'} inspired
                        </span>
                      )}
                    </div>
                    {sug.hookIdea && (
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.5 }}>
                        🪝 {sug.hookIdea}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {sug.suggestion?.slice(0, 200)}{sug.suggestion?.length > 200 ? '…' : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className={`btn-copy ${copied === sug.id ? 'copied' : ''}`}
                        onClick={() => copyText(sug.suggestion, sug.id)}>
                        {copied === sug.id ? '✓ Copied!' : '📋 Copy Post'}
                      </button>
                      <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 14px' }}
                        onClick={() => router.push('/suggestions')}>
                        Edit & Customize →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { icon: '🔥', label: 'Trending Intelligence', desc: 'See what topics are hot right now', href: '/trending' },
            { icon: '📡', label: 'Sync Sources', desc: 'Pull latest posts from your sources', href: '/content-sources' },
            { icon: '📰', label: 'Browse All Feed', desc: 'Search through 700+ scraped posts', href: '/content-feed' },
          ].map(action => (
            <div key={action.href} onClick={() => router.push(action.href)} style={{
              padding: 24, borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)',
              border: '1px solid var(--border-primary)', cursor: 'pointer', textAlign: 'center',
              transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{action.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{action.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{action.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
