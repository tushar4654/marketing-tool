'use client';
import { useState, useEffect } from 'react';

const ROLE_META = {
  ceo: { icon: '👑', label: 'CEO', color: 'var(--orange)', template: `# CEO Persona Context\n\n## Company Overview\n- Company Name: \n- Industry: \n- Stage: \n\n## Voice & Tone\n- Visionary, strategic, culture-focused\n- Talks about market trends, company mission, leadership lessons\n- Inspires employees, investors, and the broader community\n\n## Key Topics\n- Company culture & values\n- Market vision & strategy\n- Leadership insights\n- Industry trends & predictions\n- Hiring & team building` },
  cto: { icon: '⚙️', label: 'CTO', color: 'var(--blue)', template: `# CTO Persona Context\n\n## Company Overview\n- Company Name: \n- Tech Stack: \n- Engineering Team Size: \n\n## Voice & Tone\n- Technical but accessible, engineering-culture focused\n- Talks about architecture decisions, tech trends, developer experience\n- Educates and shares lessons learned\n\n## Key Topics\n- Architecture & system design decisions\n- Engineering culture & practices\n- New technologies & frameworks\n- Scaling challenges & solutions\n- Developer productivity & tooling` },
  cro: { icon: '📈', label: 'CRO', color: 'var(--green)', template: `# CRO Persona Context\n\n## Company Overview\n- Company Name: \n- Target Market: \n- ACV Range: \n\n## Voice & Tone\n- Revenue-focused, data-driven, pragmatic\n- Talks about pipeline, sales strategy, customer success\n- Shares GTM playbooks and metrics\n\n## Key Topics\n- Revenue growth strategies\n- Sales pipeline & forecasting\n- Customer acquisition & retention\n- GTM motions & playbooks\n- Sales team management & enablement` },
  custom: { icon: '✨', label: 'Custom', color: 'var(--purple)', template: `# Custom Persona Context\n\n## Role Description\n- Title: \n- Focus Area: \n\n## Voice & Tone\n- Describe the persona's communication style\n\n## Key Topics\n- Topic 1\n- Topic 2\n- Topic 3` },
};

export default function PersonasPage() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', role: 'ceo', linkedinProfileUrl: '', contextMarkdown: '' });
  const [showForm, setShowForm] = useState(false);

  const showToast = (msg, err) => { setToast({ msg, err }); setTimeout(() => setToast(null), 4000); };

  const load = async () => {
    try {
      const res = await fetch('/api/personas');
      const data = await res.json();
      setPersonas(Array.isArray(data) ? data : []);
    } catch { setPersonas([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRoleChange = (role) => {
    setForm({ ...form, role, contextMarkdown: form.contextMarkdown || ROLE_META[role]?.template || '' });
  };

  const savePersona = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    try {
      const url = editing ? `/api/personas/${editing}` : '/api/personas';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setForm({ name: '', role: 'ceo', linkedinProfileUrl: '', contextMarkdown: '' });
      setEditing(null);
      setShowForm(false);
      showToast(editing ? 'Persona updated' : 'Persona created');
      load();
    } catch (err) { showToast(err.message, true); }
  };

  const startEdit = (p) => {
    setForm({ name: p.name, role: p.role, linkedinProfileUrl: p.linkedinProfileUrl || '', contextMarkdown: p.contextMarkdown || '' });
    setEditing(p.id);
    setShowForm(true);
  };

  const deletePersona = async (id) => {
    try {
      await fetch(`/api/personas/${id}`, { method: 'DELETE' });
      showToast('Persona deleted');
      load();
    } catch (err) { showToast(err.message, true); }
  };

  const startNew = () => {
    setForm({ name: '', role: 'ceo', linkedinProfileUrl: '', contextMarkdown: ROLE_META.ceo.template });
    setEditing(null);
    setShowForm(true);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="label-mono">Content Intelligence</div>
          <h1>Personas</h1>
          <p>Define personas (CEO, CTO, CRO) with company context for AI-tailored content suggestions.</p>
        </div>
        <button className="btn btn-primary" onClick={startNew}>+ New Persona</button>
      </div>

      <div className="page-body">
        {/* Create/Edit Form */}
        {showForm && (
          <div className="add-form">
            <h2>{editing ? 'Edit Persona' : 'Create Persona'}</h2>
            <p className="form-sub">Each persona gets tailored content suggestions based on their role and context.</p>
            <form onSubmit={savePersona}>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Name</label>
                  <input className="form-input" placeholder="e.g. John Smith" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group" style={{ minWidth: 160 }}>
                  <label className="form-label">Role</label>
                  <select className="form-input" value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                    {Object.entries(ROLE_META).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.icon} {meta.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">LinkedIn Profile URL <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(which account to post from)</span></label>
                <input className="form-input" placeholder="https://linkedin.com/in/username" value={form.linkedinProfileUrl} onChange={e => setForm({ ...form, linkedinProfileUrl: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Company Context (Markdown)</label>
                <textarea
                  className="form-input form-textarea"
                  style={{ minHeight: 260, fontFamily: "'SF Mono', 'Menlo', 'Consolas', monospace", fontSize: 13, lineHeight: 1.6 }}
                  placeholder="Describe the company, the persona's voice, key topics…"
                  value={form.contextMarkdown}
                  onChange={e => setForm({ ...form, contextMarkdown: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Create Persona'}</button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Persona Cards */}
        {loading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : personas.length === 0 && !showForm ? (
          <div className="empty-state">
            <span className="empty-icon">👤</span>
            <h3>No personas yet</h3>
            <p>Create personas for your team (CEO, CTO, CRO) to get role-tailored content suggestions.</p>
          </div>
        ) : (
          <div className="profile-grid">
            {personas.map(p => {
              const meta = ROLE_META[p.role] || ROLE_META.custom;
              return (
                <div className="profile-card ci-persona-card" key={p.id}>
                  <div className="profile-card-top">
                    <div className="avatar-lg" style={{ background: `linear-gradient(135deg, ${meta.color}, var(--purple))`, fontSize: 22 }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="profile-name">{p.name}</div>
                      <div className="profile-role" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span className="ci-role-badge" style={{ background: meta.color + '20', color: meta.color }}>{meta.label}</span>
                      </div>
                      {p.linkedinProfileUrl && (
                        <a className="profile-url" href={p.linkedinProfileUrl} target="_blank" rel="noopener">
                          {p.linkedinProfileUrl.replace(/https?:\/\//, '').slice(0, 35)}
                        </a>
                      )}
                    </div>
                    <div className="profile-badge">{p._count?.suggestions || 0} suggestions</div>
                  </div>
                  {p.contextMarkdown && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden', padding: '8px 0', borderTop: '1px solid var(--separator)' }}>
                      {p.contextMarkdown.slice(0, 150)}…
                    </div>
                  )}
                  <div className="profile-card-actions">
                    <button className="btn btn-outline" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => startEdit(p)}>✏️ Edit</button>
                    <button className="btn-danger" style={{ marginLeft: 'auto' }} onClick={() => deletePersona(p.id)}>✕ Delete</button>
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
