'use client';
import { useEffect, useState } from 'react';

const SUGG = ['intent signals','GTM','hiring','pipeline','outbound','PLG','product-led growth','ICP','go-to-market','revenue','churn','expansion','sales motion','demand gen','ABM','AI','pricing','positioning','competitive','win rate'];
const ICONS = { hiring:'🏷️', gtm:'🎯','intent signals':'⚡', default:'◈' };
const IC = ['interest-icon-blue','interest-icon-indigo','interest-icon-amber'];
const icon = kw => ICONS[kw.toLowerCase()]||ICONS.default;

function ago(d){
  if(!d) return '';
  const days=Math.floor((Date.now()-new Date(d).getTime())/86400000);
  if(days===0) return 'today';
  if(days===1) return 'yesterday';
  return `${days}d ago`;
}

export default function InterestsPage(){
  const [interests,setInterests]=useState([]);
  const [form,setForm]=useState({keyword:'',description:''});
  const [adding,setAdding]=useState(false);
  const [rm,setRm]=useState(null);
  const [toast,setToast]=useState(null);

  const notify=(msg,type='ok')=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};
  const load=async()=>{const {interests:i}=await fetch('/api/interests').then(r=>r.json()).catch(()=>({interests:[]}));setInterests(i||[]);};
  useEffect(()=>{load();},[]);

  const add=async(e,kw,desc)=>{
    if(e)e.preventDefault();
    const keyword=(kw||form.keyword).trim();
    const description=(desc||form.description).trim();
    if(!keyword)return;
    setAdding(true);
    const res=await fetch('/api/interests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keyword,description})});
    const d=await res.json();
    if(res.ok){notify(`"${keyword}" added to filters`);setForm({keyword:'',description:''});await load();}
    else notify(d.error||'Failed','error');
    setAdding(false);
  };

  const remove=async id=>{
    setRm(id);
    await fetch(`/api/interests/${id}`,{method:'DELETE'}).catch(()=>{});
    notify('Keyword removed');
    await load();
    setRm(null);
  };

  const addedKws=interests.map(i=>i.keyword.toLowerCase());

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Interest Filters</h1>
          <p>Posts matching these keywords appear in your relevant feed</p>
        </div>
      </header>

      <div className="page-body">
        <div className="add-form">
          <h2>Add a Keyword</h2>
          <p className="form-sub">Any post containing this keyword (case-insensitive) routes to your relevant feed</p>
          <form onSubmit={e=>add(e)}>
            <div className="form-row" style={{marginBottom:16}}>
              <div className="form-group" style={{flex:1}}>
                <label className="form-label">Keyword / Topic</label>
                <input id="keyword-input" className="form-input" type="text" placeholder='"intent signals" or "PLG"' value={form.keyword} onChange={e=>setForm({...form,keyword:e.target.value})} />
              </div>
              <div className="form-group" style={{flex:1}}>
                <label className="form-label">Description (Optional)</label>
                <input className="form-input" type="text" placeholder="Why is this relevant?" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
              </div>
              <button type="submit" id="add-keyword-btn" className="btn btn-primary" disabled={adding||!form.keyword.trim()} style={{alignSelf:'flex-end',borderRadius:100}}>
                {adding?'Adding…':'Add Filter'}
              </button>
            </div>
          </form>

          <div style={{marginTop:8}}>
            <div className="section-label" style={{marginBottom:10}}>Suggestions</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {SUGG.map(s=>{
                const isAdded=addedKws.includes(s.toLowerCase());
                return <button key={s} className={`chip ${isAdded?'chip-green':'chip-gray'}`}
                  disabled={isAdded||adding} onClick={()=>!isAdded&&add(null,s,'')} type="button">
                  {isAdded?'✓ ':'+ '}{s}
                </button>;
              })}
            </div>
          </div>
        </div>

        <div className="section-header">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span className="section-label">Active Filters</span>
            {interests.length>0&&<span style={{background:'var(--blue-dim)',color:'var(--blue)',fontSize:12,fontWeight:600,padding:'2px 8px',borderRadius:100}}>{interests.length}</span>}
          </div>
          {interests.length>0&&<a href="/?tab=relevant" className="post-link" style={{fontSize:13}}>View Relevant Feed →</a>}
        </div>

        {interests.length===0 ? (
          <div className="empty-state" style={{padding:'48px 0'}}>
            <span className="empty-icon">◈</span>
            <h3>No filters defined</h3>
            <p>Add keywords above to start filtering posts by relevance</p>
          </div>
        ) : (
          <div className="add-form" style={{padding:0,overflow:'hidden'}}>
            <div className="interest-list" style={{padding:'0 28px'}}>
              {interests.map((interest,idx)=>(
                <div key={interest.id} className="interest-row">
                  <div className={`interest-icon ${IC[idx%IC.length]}`}>{icon(interest.keyword)}</div>
                  <div style={{flex:1}}>
                    <div className="interest-name">{interest.keyword}</div>
                    {interest.description&&<div className="interest-meta">{interest.description}</div>}
                    <div className="interest-meta">Added {ago(interest.createdAt)}</div>
                  </div>
                  <button className="btn-danger" onClick={()=>remove(interest.id)} disabled={rm===interest.id} title="Remove">
                    {rm===interest.id?'…':'×'}
                  </button>
                </div>
              ))}
            </div>
            <div className="pro-tip" style={{margin:'0 28px 28px',borderRadius:12}}>
              💡 Tip: Multi-word phrases like <strong style={{color:'var(--blue)'}}>intent signals</strong> surface higher signal-to-noise posts
            </div>
          </div>
        )}
      </div>
      {toast&&<div className={`toast${toast.type==='error'?' error':''}`}>{toast.type==='ok'?'✓ ':'✗ '}{toast.msg}</div>}
    </>
  );
}
