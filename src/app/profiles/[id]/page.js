'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

const AC = ['', 'avatar-green', 'avatar-purple', 'avatar-orange', 'avatar-pink'];
const AVCLASS = n => { if(!n) return ''; const s=n.split('').reduce((a,c)=>a+c.charCodeAt(0),0); return AC[s%AC.length]; };
const INIT = n => n?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?';

function timeAgo(d){
  if(!d) return '';
  const ms=Date.now()-new Date(d).getTime();
  const m=Math.floor(ms/60000);
  if(m<60) return `${m}m ago`;
  const h=Math.floor(m/60);
  if(h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

function highlight(text,kws){
  if(!kws?.length||!text) return text;
  const pat=new RegExp(`(${kws.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})`, 'gi');
  return text.split(pat).map((p,i)=>pat.test(p)?<mark key={i}>{p}</mark>:p);
}

function PostCard({post,keywords}){
  const [exp,setExp]=useState(false);
  const matched=keywords.filter(kw=>(post.content||'').toLowerCase().includes(kw.toLowerCase()));
  const long=post.content.length>320;
  const text=exp||!long?post.content:post.content.slice(0,320)+'…';
  return (
    <article className={`post-card${matched.length>0?' relevant':''}`}>
      {matched.length>0&&(
        <div className="keyword-chips">
          {matched.map(kw=><span key={kw} className="keyword-chip">⟁ {kw}</span>)}
        </div>
      )}
      <p className="post-content">{highlight(text,matched)}</p>
      {long&&<button onClick={()=>setExp(!exp)} style={{background:'none',border:'none',color:'var(--cyan)',fontSize:11,fontWeight:700,cursor:'pointer',padding:'0 0 12px',fontFamily:"'JetBrains Mono',monospace",letterSpacing:'0.5px'}}>{exp?'[ COLLAPSE ]':'[ EXPAND ]'}</button>}
      <div className="post-footer">
        <div className="post-stats">
          <span className="post-stat">👍 <strong style={{color:'var(--text)'}}>{post.likes?.toLocaleString()??0}</strong></span>
          <span className="post-stat">💬 <strong style={{color:'var(--text)'}}>{post.comments?.toLocaleString()??0}</strong></span>
          {post.postedAt&&<span className="post-stat" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{timeAgo(post.postedAt)}</span>}
        </div>
        {post.postUrl&&<a href={post.postUrl} target="_blank" rel="noopener noreferrer" className="post-link">VIEW ORIGINAL →</a>}
      </div>
    </article>
  );
}

export default function ProfileDetail(){
  const {id}=useParams();
  const [profile,setProfile]=useState(null);
  const [posts,setPosts]=useState([]);
  const [kws,setKws]=useState([]);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState('all');
  const [search,setSearch]=useState('');

  const load=useCallback(async()=>{
    try{
      const [pr,proR,ir]=await Promise.all([fetch(`/api/posts?profileId=${id}`),fetch('/api/profiles'),fetch('/api/interests')]);
      const {posts:p}=await pr.json();
      const {profiles}=await proR.json();
      const {interests}=await ir.json();
      setPosts(p||[]);
      setProfile(profiles?.find(x=>x.id===id)||null);
      setKws((interests||[]).map(i=>i.keyword));
    }catch(e){console.error(e);}finally{setLoading(false);}
  },[id]);

  useEffect(()=>{load();},[load]);

  const rel=posts.filter(p=>kws.some(k=>(p.content||'').toLowerCase().includes(k.toLowerCase())));
  const displayed=(tab==='relevant'?rel:posts).filter(p=>!search||(p.content||'').toLowerCase().includes(search.toLowerCase()));
  const likes=posts.reduce((s,p)=>s+(p.likes||0),0);
  const avgLikes=posts.length?Math.round(likes/posts.length):0;
  const rate=posts.length?Math.round((rel.length/posts.length)*100):0;

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>
      <div style={{textAlign:'center',color:'var(--text-muted)'}}>
        <div className="spinner" style={{width:32,height:32,borderWidth:3,marginBottom:20}}/>
        <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,letterSpacing:2}}>LOADING INTEL…</p>
      </div>
    </div>
  );

  if(!profile) return (
    <div className="page-body" style={{padding:40}}>
      <div className="empty-state">
        <span className="empty-icon">◎</span>
        <h3>Target not found</h3>
        <p><a href="/profiles" className="post-link">← BACK TO TARGETS</a></p>
      </div>
    </div>
  );

  return (
    <>
      <header className="page-header" style={{alignItems:'center',paddingBottom:28}}>
        <div style={{flex:1}}>
          <div className="breadcrumb">
            <a href="/profiles">‹ TARGETS</a><span>/</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace"}}>{profile.name}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:16,marginTop:4}}>
            <div className={`avatar-lg ${AVCLASS(profile.name)}`} style={{width:56,height:56,fontSize:20}}>{INIT(profile.name)}</div>
            <div>
              <h1 style={{fontSize:26}}>{profile.name}</h1>
              {profile.title&&<p style={{margin:'4px 0 0'}}>{profile.title}</p>}
              <a href={profile.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'var(--cyan)',fontFamily:"'JetBrains Mono',monospace",opacity:0.7,textDecoration:'none'}}>
                {profile.url.replace('https://','')}
              </a>
            </div>
          </div>
        </div>
        <a href={profile.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{fontSize:12,letterSpacing:1}}>
          LINKEDIN ↗
        </a>
      </header>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card cyan">
            <div className="stat-label">Total Posts</div>
            <div className="stat-value stat-accent">{posts.length}</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-label">⟁ Relevant</div>
            <div className="stat-value stat-amber">{rel.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Likes</div>
            <div className="stat-value">{likes.toLocaleString()}</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Signal Rate</div>
            <div className="stat-value" style={{color:'var(--purple)',textShadow:'0 0 20px rgba(191,0,255,0.50)'}}>{rate}%</div>
          </div>
        </div>

        {/* Match panel */}
        {kws.length>0&&posts.length>0&&(
          <div className="insight-panel">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <h3>⟁ Signal Match Rate</h3>
              <span style={{fontSize:28,fontWeight:700,color:'var(--amber)',textShadow:'0 0 20px rgba(255,184,0,0.50)',fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.5}}>{rate}%</span>
            </div>
            <div className="progress-bar" style={{marginBottom:12}}>
              <div className="progress-fill" style={{width:`${rate}%`}}/>
            </div>
            <p style={{margin:0}}>{rel.length} of {posts.length} posts from {profile.name} match your signal filters · keywords: {kws.map(k=><span key={k} style={{color:'var(--cyan)'}}>{k}</span>).reduce((a,b)=>[a,', ',b])}</p>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,gap:12,flexWrap:'wrap'}}>
          <div className="segmented-control">
            <button className={tab==='all'?'active':''} onClick={()=>setTab('all')}>ALL POSTS ({posts.length})</button>
            <button className={tab==='relevant'?'active':''} onClick={()=>setTab('relevant')}>⟁ RELEVANT ({rel.length})</button>
          </div>
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--cyan)',opacity:0.6}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="search posts…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>

        {displayed.length===0 ? (
          <div className="empty-state">
            <span className="empty-icon">⟁</span>
            <h3>{tab==='relevant'?'No relevant signals':'No posts yet'}</h3>
            <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13}}>
              {tab==='relevant'?`// none of ${profile.name}'s posts match your signal filters`:'// sync to pull in latest posts'}
            </p>
          </div>
        ) : displayed.map(p=><PostCard key={p.id} post={p} keywords={kws}/>)}
      </div>
    </>
  );
}
