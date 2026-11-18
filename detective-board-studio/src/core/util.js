window.DB = window.DB || {};
(() => {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, Number.isFinite(+v) ? +v : a));
  DB.util = {
    clamp, lerp: (a, b, p) => a + (b - a) * p,
    ease(p, name = 'smooth') { p = clamp(p); if (name === 'linear') return p; if (name === 'ease-in') return p*p*p; if (name === 'ease-out') return 1 - (1-p)**3; if (name === 'cinematic') return p*p*p*(p*(p*6-15)+10); return p*p*(3-2*p); },
    rng(seed = 1) { let s = (typeof seed === 'string' ? [...seed].reduce((v,c) => Math.imul(v,31)+c.charCodeAt(0)|0,0) : seed) >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
    uid: (p = 'id') => p + '-' + (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + (++DB._seq || (DB._seq=1)))).slice(0,16),
    clone: o => JSON.parse(JSON.stringify(o)),
    canvas(w,h) { const c = document.createElement('canvas'); c.width=w; c.height=h; return c; },
    escape: text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    slug: text => String(text || 'detective-board').replace(/[^\w\u0900-\u097f -]/g,'').trim().replace(/\s+/g,'-') || 'detective-board',
    time: t => `${Math.floor(t/60).toString().padStart(2,'0')}:${(t%60).toFixed(1).padStart(4,'0')}`,
    download(blob, name) { const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000); },
    tick: () => new Promise(resolve => setTimeout(resolve,0)),
  };
  DB.duration = p => p.shots?.length ? p.shots.reduce((sum,s)=>sum+Math.max(.1,+s.duration||4),0) : Math.max(1,+p.duration||20);
  DB.validate = data => {
    if (!data || data.version !== 1 || !Array.isArray(data.nodes) || !Array.isArray(data.shots)) throw new Error('Choose a Detective Board Studio project (.detective.json).');
    const p=DB.util.clone(data), base=DB.makeProject(DB.templates[0].id);
    p.board={...base.board,...p.board};p.camera={...base.camera,...p.camera};p.media=p.media||{};p.edges=p.edges||[];
    p.width=DB.util.clamp(+p.width||1920,240,7680);p.height=DB.util.clamp(+p.height||1080,240,7680);p.fps=DB.util.clamp(+p.fps||30,1,60);p.seed=+p.seed||42;
    if (p.nodes.length>500 || p.edges.length>2000 || p.shots.length>200) throw new Error('This project exceeds the editor limit (500 clues, 2000 connections, 200 shots).');
    const ids=new Set();for(const n of p.nodes){if(!n.id||ids.has(n.id)) n.id=DB.util.uid('clue');ids.add(n.id);Object.assign(n,{...DB.nodeDefaults(n.type),...n});for(const k of ['x','y','w','h','rotation','enter','revealDuration']) if(!Number.isFinite(+n[k])) throw new Error('A clue contains an invalid '+k+' value.');n.w=Math.max(12,+n.w);n.h=Math.max(12,+n.h);}
    p.edges=p.edges.filter(e=>ids.has(e.from)&&ids.has(e.to));
    for (const s of p.shots) {s.duration=DB.util.clamp(+s.duration||4,.1,300);for(const key of ['from','to']){s[key]={x:p.board.width/2,y:p.board.height/2,zoom:1,rotation:0,tilt:0,...s[key]};for(const k of ['x','y','zoom','rotation','tilt'])if(!Number.isFinite(+s[key][k]))throw new Error('A camera shot contains an invalid '+k+' value.');s[key].zoom=DB.util.clamp(+s[key].zoom,.15,10);}}
    p.duration=DB.duration(p);return p;
  };
})();
