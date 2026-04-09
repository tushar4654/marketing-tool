'use client';
import { useEffect, useState } from 'react';

const ROLE_SUGGESTIONS = [
  'VP of Sales', 'VP Engineering', 'CTO', 'CEO', 'Founder',
  'Head of Growth', 'RevOps', 'DevRel', 'Engineering Manager',
  'Director of Marketing', 'Product Manager', 'Customer Success',
  'Head of Partnerships', 'CMO', 'COO',
];

const ANTI_SUGGESTIONS = [
  'Recruiter', 'Student', 'Freelancer', 'Consultant',
  'Career Coach', 'Job Seeker', 'Intern',
];

export default function SettingsPage() {
  const [ctx, setCtx] = useState({
    companyName: '',
    valueProp: '',
    targetRoles: [],
    targetCompanySize: '',
    antiIcpSignals: [],
    customPrompt: '',
  });
  const [roleInput, setRoleInput] = useState('');
  const [antiInput, setAntiInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const notify = (msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch('/api/context')
      .then(r => r.json())
      .then(data => {
        if (!data.error) setCtx(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      });
      const data = await res.json();
      if (res.ok) {
        setCtx(data);
        notify('Company context saved successfully');
      } else {
        notify(data.error || 'Save failed', 'error');
      }
    } catch {
      notify('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addRole = (role) => {
    const r = role.trim();
    if (!r || ctx.targetRoles.includes(r)) return;
    setCtx({ ...ctx, targetRoles: [...ctx.targetRoles, r] });
    setRoleInput('');
  };

  const removeRole = (role) => {
    setCtx({ ...ctx, targetRoles: ctx.targetRoles.filter(r => r !== role) });
  };

  const addAnti = (signal) => {
    const s = signal.trim();
    if (!s || ctx.antiIcpSignals.includes(s)) return;
    setCtx({ ...ctx, antiIcpSignals: [...ctx.antiIcpSignals, s] });
    setAntiInput('');
  };

  const removeAnti = (signal) => {
    setCtx({ ...ctx, antiIcpSignals: ctx.antiIcpSignals.filter(s => s !== signal) });
  };

  const addedRoles = ctx.targetRoles.map(r => r.toLowerCase());
  const addedAnti = ctx.antiIcpSignals.map(s => s.toLowerCase());

  if (loading) {
    return (
      <div style={{ padding: 100, textAlign: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 20px' }} />
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Loading settings…</p>
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Configure your company context for AI-powered lead qualification</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ borderRadius: 100, padding: '10px 28px' }}>
          {saving ? 'Saving…' : '💾 Save Context'}
        </button>
      </header>

      <div className="page-body">
        {/* Company Info */}
        <div className="settings-section">
          <div className="settings-section-header">
            <span className="settings-section-icon">🏢</span>
            <div>
              <h2>Company Profile</h2>
              <p>Tell the AI about your company so it can score leads accurately</p>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Company Name</label>
            <input
              className="form-input"
              placeholder="e.g. Acme Corp"
              value={ctx.companyName}
              onChange={e => setCtx({ ...ctx, companyName: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Value Proposition</label>
            <textarea
              className="form-input form-textarea"
              placeholder="What problem does your company solve? e.g. We help B2B SaaS companies reduce churn using predictive AI..."
              rows={3}
              value={ctx.valueProp}
              onChange={e => setCtx({ ...ctx, valueProp: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Target Company Size</label>
            <select
              className="form-input"
              value={ctx.targetCompanySize}
              onChange={e => setCtx({ ...ctx, targetCompanySize: e.target.value })}
            >
              <option value="">Select a range...</option>
              <option value="1-10">1-10 (Startup)</option>
              <option value="10-50">10-50 (Early Stage)</option>
              <option value="50-200">50-200 (Growth)</option>
              <option value="200-1000">200-1000 (Scale-up)</option>
              <option value="1000-5000">1000-5000 (Mid-Market)</option>
              <option value="5000+">5000+ (Enterprise)</option>
              <option value="Any">Any Size</option>
            </select>
          </div>
        </div>

        {/* Target Roles */}
        <div className="settings-section">
          <div className="settings-section-header">
            <span className="settings-section-icon">🎯</span>
            <div>
              <h2>Target Roles (ICP)</h2>
              <p>Which roles are your ideal buyers? The AI scores higher for these titles.</p>
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <input
                className="form-input"
                placeholder="Add a target role..."
                value={roleInput}
                onChange={e => setRoleInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addRole(roleInput); }
                }}
              />
            </div>
            <button className="btn btn-primary" onClick={() => addRole(roleInput)} disabled={!roleInput.trim()} style={{ borderRadius: 100 }}>
              + Add
            </button>
          </div>

          {ctx.targetRoles.length > 0 && (
            <div className="tag-list" style={{ marginBottom: 16 }}>
              {ctx.targetRoles.map(role => (
                <span key={role} className="tag tag-blue">
                  {role}
                  <button onClick={() => removeRole(role)} className="tag-remove">×</button>
                </span>
              ))}
            </div>
          )}

          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Suggestions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ROLE_SUGGESTIONS.map(s => {
                const added = addedRoles.includes(s.toLowerCase());
                return (
                  <button key={s} className={`chip ${added ? 'chip-green' : 'chip-gray'}`}
                    disabled={added} onClick={() => !added && addRole(s)} type="button">
                    {added ? '✓ ' : '+ '}{s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Anti-ICP */}
        <div className="settings-section">
          <div className="settings-section-header">
            <span className="settings-section-icon">🚫</span>
            <div>
              <h2>Anti-ICP Signals</h2>
              <p>Roles or signals that should be scored LOW (not your target buyers)</p>
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <input
                className="form-input"
                placeholder="Add an anti-ICP signal..."
                value={antiInput}
                onChange={e => setAntiInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addAnti(antiInput); }
                }}
              />
            </div>
            <button className="btn btn-primary" onClick={() => addAnti(antiInput)} disabled={!antiInput.trim()} style={{ borderRadius: 100 }}>
              + Add
            </button>
          </div>

          {ctx.antiIcpSignals.length > 0 && (
            <div className="tag-list" style={{ marginBottom: 16 }}>
              {ctx.antiIcpSignals.map(signal => (
                <span key={signal} className="tag tag-red">
                  {signal}
                  <button onClick={() => removeAnti(signal)} className="tag-remove">×</button>
                </span>
              ))}
            </div>
          )}

          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Suggestions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ANTI_SUGGESTIONS.map(s => {
                const added = addedAnti.includes(s.toLowerCase());
                return (
                  <button key={s} className={`chip ${added ? 'chip-green' : 'chip-gray'}`}
                    disabled={added} onClick={() => !added && addAnti(s)} type="button">
                    {added ? '✓ ' : '+ '}{s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="settings-section">
          <div className="settings-section-header">
            <span className="settings-section-icon">🧠</span>
            <div>
              <h2>Custom AI Instructions</h2>
              <p>Advanced: Add extra context or instructions for the AI evaluator</p>
            </div>
          </div>

          <div className="form-group">
            <textarea
              className="form-input form-textarea"
              placeholder="e.g. We primarily sell to companies using Snowflake or Databricks. Prioritize data engineering leaders. Ignore anyone from competitor companies like X, Y, Z..."
              rows={4}
              value={ctx.customPrompt}
              onChange={e => setCtx({ ...ctx, customPrompt: e.target.value })}
            />
          </div>
        </div>

        <div className="pro-tip" style={{ borderRadius: 12 }}>
          💡 <strong>Tip:</strong> The more specific your ICP configuration, the better the AI scores leads. Include your exact target buyer titles and anti-signals for best results.
        </div>
      </div>

      {toast && <div className={`toast${toast.type === 'error' ? ' error' : ''}`}>{toast.type === 'ok' ? '✓ ' : '✗ '}{toast.msg}</div>}
    </>
  );
}
