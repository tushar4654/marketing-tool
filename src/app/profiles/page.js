'use client';
import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';

const AC = ['', 'avatar-green', 'avatar-purple', 'avatar-orange', 'avatar-pink'];
const AVCLASS = n => { if(!n) return ''; const s=n.split('').reduce((a,c)=>a+c.charCodeAt(0),0); return AC[s%AC.length]; };
const INIT = n => { if(!n) return '?'; return n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); };

const QUICK = [
  'https://www.linkedin.com/in/rauchg/',
  'https://www.linkedin.com/in/paul-copplestone-78a82145/',
  'https://www.linkedin.com/in/hanwwang/',
  'https://www.linkedin.com/in/zenorocha/',
  'https://www.linkedin.com/in/spencerwkimball/',
  'https://www.linkedin.com/in/nicolasdessaigne/',
  'https://www.linkedin.com/in/jeanmichellemieux/',
  'https://www.linkedin.com/in/adamduvander/',
  'https://www.linkedin.com/in/rizel-bobb-semple/',
  'https://www.linkedin.com/in/kelsey-hightower-849b342b2/',
  'https://www.linkedin.com/in/samjulien/',
  'https://www.linkedin.com/in/akukic/',
  'https://www.linkedin.com/in/shawnswyxwang/',
  'https://www.linkedin.com/in/lindalian1/',
  'https://www.linkedin.com/in/kevincwhite/',
  'https://www.linkedin.com/in/franklweb/',
  'https://www.linkedin.com/in/robzuber/',
  'https://www.linkedin.com/in/emilieschario/',
  'https://www.linkedin.com/in/astasiamyers/',
  'https://www.linkedin.com/in/sangeetahanda/',
  'https://www.linkedin.com/in/kylepoyar/',
  'https://www.linkedin.com/in/elenaverna/',
  'https://www.linkedin.com/in/breezybeaumont/',
  'https://www.linkedin.com/in/sahil-aggarwal-pocus/',
  'https://www.linkedin.com/in/alexagrabell/',
];

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [del, setDel] = useState(null);
  const [form, setForm] = useState({ url: '', name: '', title: '' });
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const fileRef = useRef(null);

  const notify = (msg, type='ok') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const load = async () => {
    setLoading(true);
    const { profiles } = await fetch('/api/profiles').then(r=>r.json()).catch(()=>({profiles:[]}));
    setProfiles(profiles||[]);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const add = async e => {
    e.preventDefault();
    if (!form.url.trim()) return;
    setAdding(true);
    const res = await fetch('/api/profiles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
    const d = await res.json();
    if(res.ok){notify('Profile added');setForm({url:'',name:'',title:''});await load();}
    else notify(d.error||'Failed','error');
    setAdding(false);
  };

  const remove = async id => {
    setDel(id);
    const res = await fetch(`/api/profiles/${id}`,{method:'DELETE'});
    if(res.ok){notify('Profile removed');await load();}
    else notify('Failed','error');
    setDel(null);
  };

  const bulkImport = async () => {
    const urls = bulkText.split('\n').map(u => u.trim()).filter(u => u.includes('linkedin.com/in/'));
    if (urls.length === 0) { notify('No valid LinkedIn URLs found', 'error'); return; }
    setBulkLoading(true);
    try {
      const res = await fetch('/api/profiles/bulk', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ urls }) });
      const d = await res.json();
      if (res.ok) {
        notify(`Imported ${d.inserted} profiles (${d.skipped} duplicates skipped)`);
        setBulkText('');
        setShowBulk(false);
        await load();
      } else notify(d.error || 'Import failed', 'error');
    } catch { notify('Import failed', 'error'); }
    setBulkLoading(false);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkLoading(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const urls = [];
      for (const row of rows) {
        for (const cell of row) {
          const val = String(cell || '').trim();
          if (val.includes('linkedin.com/in/')) urls.push(val);
        }
      }
      if (urls.length === 0) {
        notify('No LinkedIn URLs found in file', 'error');
        setBulkLoading(false);
        return;
      }
      const res = await fetch('/api/profiles/bulk', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ urls }) });
      const d = await res.json();
      if (res.ok) {
        notify(`Imported ${d.inserted} profiles from ${file.name}`);
        await load();
      } else notify(d.error || 'Import failed', 'error');
    } catch (err) {
      notify('Failed to parse file: ' + err.message, 'error');
    }
    setBulkLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const validCount = bulkText.split('\n').filter(u=>u.includes('linkedin.com/in/')).length;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Tracked Profiles</h1>
          <p>{profiles.length} LinkedIn profiles under intelligence monitoring</p>
        </div>
        <a href="/" className="btn btn-outline" style={{ borderRadius: 100 }}>← Back to Feed</a>
      </header>

      <div className="page-body">
        {/* Add Single Profile */}
        <div className="add-form">
          <h2>Add a Profile</h2>
          <p className="form-sub">Paste a LinkedIn URL — name and title auto-fill on next sync</p>
          <form onSubmit={add}>
            <div className="form-row" style={{marginBottom:16}}>
              <div className="form-group" style={{flex:2}}>
                <label className="form-label">LinkedIn URL</label>
                <input className="form-input" type="url" placeholder="https://linkedin.com/in/username" value={form.url} onChange={e=>setForm({...form,url:e.target.value})} required id="profile-url-input" />
              </div>
              <div className="form-group" style={{flex:1}}>
                <label className="form-label">Display Name</label>
                <input className="form-input" type="text" placeholder="e.g. Jason Lemkin" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
              </div>
              <div className="form-group" style={{flex:1}}>
                <label className="form-label">Title / Role</label>
                <input className="form-input" type="text" placeholder="e.g. Founder" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <button type="submit" className="btn btn-primary" disabled={adding||!form.url.trim()} id="add-profile-btn" style={{ borderRadius: 100 }}>
                {adding ? <><span className="spinner" style={{width:14,height:14,borderWidth:2,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}}/> Adding…</> : 'Add Profile'}
              </button>
              <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                <span className="section-label" style={{ marginRight: 4 }}>Quick add:</span>
                {QUICK.slice(0, 8).map(url=>{
                  const h=url.split('/in/')[1]?.replace('/', '');
                  const added=profiles.some(p=>p.url===url);
                  return <button key={url} type="button" className={`chip ${added?'chip-green':'chip-gray'}`}
                    disabled={added||adding} onClick={()=>!added&&setForm({...form,url})}>
                    {added?'✓ ':'+ '}{h}
                  </button>;
                })}
              </div>
            </div>
          </form>
        </div>

        {/* Bulk Import */}
        <div className="add-form">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}} onClick={()=>setShowBulk(!showBulk)}>
            <h2 style={{marginBottom:0}}>{showBulk ? '▾' : '▸'} Bulk Import</h2>
            {!showBulk && <span className="section-label">Upload Excel or paste URLs</span>}
          </div>
          {showBulk && (
            <div style={{marginTop:20}}>
              <div style={{display:'flex',gap:12,marginBottom:16,alignItems:'center'}}>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{display:'none'}} id="file-upload" />
                <button className="btn btn-outline" onClick={()=>fileRef.current?.click()} disabled={bulkLoading} style={{borderRadius:100}}>
                  {bulkLoading ? <><span className="spinner" style={{width:14,height:14,borderWidth:2}}/> Processing…</> : '📁 Upload Excel / CSV'}
                </button>
                <span style={{color:'var(--text-tertiary)',fontSize:13}}>or paste URLs below</span>
              </div>
              <textarea
                className="form-input"
                rows={5}
                placeholder={"https://www.linkedin.com/in/username1/\nhttps://www.linkedin.com/in/username2/\nhttps://www.linkedin.com/in/username3/"}
                value={bulkText}
                onChange={e=>setBulkText(e.target.value)}
                style={{resize:'vertical',marginBottom:12}}
              />
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <button className="btn btn-primary" onClick={bulkImport} disabled={bulkLoading||!bulkText.trim()} style={{borderRadius:100}}>
                  {bulkLoading ? <><span className="spinner" style={{width:14,height:14,borderWidth:2,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}}/> Importing…</> : `Import ${validCount} Profiles`}
                </button>
                <span style={{fontSize:13,color:'var(--text-secondary)',fontWeight:500}}>{validCount} valid URLs detected</span>
              </div>
            </div>
          )}
        </div>

        <div className="section-header">
          <span className="section-label">{profiles.length} profiles tracked</span>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:80,color:'var(--text-tertiary)'}}>
            <div className="spinner" style={{width:28,height:28,borderWidth:3,marginBottom:16}}/>
            <p style={{fontSize:14,fontWeight:500}}>Loading profiles…</p>
          </div>
        ) : profiles.length===0 ? (
          <div className="empty-state">
            <span className="empty-icon">◎</span>
            <h3>No profiles added yet</h3>
            <p>Add a LinkedIn profile URL above to start monitoring</p>
          </div>
        ) : (
          <div className="profile-grid">
            {profiles.map(p => (
              <div key={p.id} className="profile-card">
                <div className="profile-card-top">
                  <div className={`avatar-lg ${AVCLASS(p.name)}`}>{INIT(p.name)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="profile-name">{p.name||'Unknown'}</div>
                    {p.title&&<div className="profile-role">{p.title}</div>}
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="profile-url">
                      {p.url.replace('https://','').replace('http://','').replace('www.','')}
                    </a>
                  </div>
                  <span className="profile-badge">{p._count?.posts??0} posts</span>
                </div>
                <div className="profile-card-actions">
                  <a href={`/profiles/${p.id}`} className="btn btn-primary" style={{fontSize:13,padding:'8px 18px',flex:1,justifyContent:'center',borderRadius:100}}>
                    View Signals →
                  </a>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Open LinkedIn">↗</a>
                  <button className="btn-danger" onClick={()=>remove(p.id)} disabled={del===p.id} title="Remove">
                    {del===p.id?'…':'×'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toast&&<div className={`toast${toast.type==='error'?' error':''}`}>{toast.type==='ok'?'✓ ':'✗ '}{toast.msg}</div>}
    </>
  );
}
