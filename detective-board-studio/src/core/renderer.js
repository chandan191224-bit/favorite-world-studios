/* Detective Board Studio Pro. All artwork is procedural and fictional. */
(() => {
  'use strict';
  const DB = window.DB = window.DB || {};
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const boardCache = new Map(), cardCache = new Map(), artCache = new Map(), mediaCache = new Map(), matteCache = new Map(), mediaErrors = new Map(), atmosphereCache = new Map(), edgeLabelCache = new Map(), videoCardCache = new Map();
  let grainCanvas;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, Number(v) || 0));
  const lerp = (a, b, p) => a + (b - a) * p;
  const depthOf = n => Number.isFinite(+n.depth) ? +n.depth : 1;
  const smallDevice = () => (window.matchMedia?.('(max-width:900px)').matches || (navigator.deviceMemory && navigator.deviceMemory <= 4));
  function cached(map,key){const value=map.get(key);if(value){map.delete(key);map.set(key,value);}return value;}
  function cacheCanvas(map,key,value,pixelBudget,entryBudget){map.set(key,value);let pixels=0;for(const c of map.values())pixels+=c.width*c.height;while(map.size>1&&(map.size>entryBudget||pixels>pixelBudget)){const oldest=map.keys().next().value,c=map.get(oldest);pixels-=c.width*c.height;map.delete(oldest);}return value;}
  const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const rng = seed => { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  function easing(p, name) {
    p = clamp(p);
    if (name === 'linear') return p;
    if (name === 'ease-in') return p * p * p;
    if (name === 'ease-out') return 1 - (1 - p) ** 3;
    if (name === 'cinematic') return p * p * p * (p * (p * 6 - 15) + 10);
    return p * p * (3 - 2 * p);
  }
  const pose = (v, bw, bh) => ({ x: Number.isFinite(+v?.x) ? +v.x : bw / 2, y: Number.isFinite(+v?.y) ? +v.y : bh / 2, zoom: clamp(v?.zoom ?? 1, .15, 20), rotation: +v?.rotation || 0, tilt: clamp(v?.tilt || 0, -65, 65) });
  function cameraAt(project, time = 0) {
    const bw = +project.board?.width || 2400, bh = +project.board?.height || 1350;
    const shots = project.shots || [];
    let current = 0, cam = pose(null, bw, bh), shotIndex = -1, p = 0;
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i], duration = Math.max(.05, +s.duration || 4);
      if (time < current + duration || i === shots.length - 1) {
        p = easing((time - current) / duration, s.ease);
        const from = pose(s.from, bw, bh), to = pose(s.to || s.from, bw, bh);
        cam = Object.fromEntries(Object.keys(from).map(k => [k, lerp(from[k], to[k], p)]));
        shotIndex = i; break;
      }
      current += duration;
    }
    const strength = clamp(project.camera?.handheld || 0, 0, 2);
    if (strength) {
      const s = +project.seed || 42;
      cam.x += strength * (Math.sin(time * 1.73 + s) * 3.5 + Math.sin(time * 3.71) * .85);
      cam.y += strength * (Math.sin(time * 1.29 + s * .1) * 2.7 + Math.sin(time * 4.13) * .55);
      cam.rotation += Math.sin(time * .81 + s) * strength * .13;
    }
    return { ...cam, shotIndex, progress: p };
  }
  function matrix(project, time, width, height, view) {
    const bw = +project.board?.width || 2400, bh = +project.board?.height || 1350;
    const c = view ? pose(view, bw, bh) : cameraAt(project, time);
    const scale = Math.min(width / bw, height / bh) * c.zoom;
    const angle = -c.rotation * RAD, co = Math.cos(angle), si = Math.sin(angle);
    const sy = Math.max(.42, Math.cos(c.tilt * RAD)), shear = Math.sin(c.tilt * RAD) * .11;
    const a = scale * co, b = scale * si, cc = scale * (co * shear - si * sy), d = scale * (si * shear + co * sy);
    return { a, b, c: cc, d, e: width / 2 - a * c.x - cc * c.y, f: height / 2 - b * c.x - d * c.y, camera: c, scale };
  }
  function projectPoint(project, time, x, y, width, height, view) {
    const m = matrix(project, time, width, height, view);
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
  }
  function unprojectPoint(project, time, x, y, width, height, view) {
    const m = matrix(project, time, width, height, view), det = m.a * m.d - m.b * m.c;
    x -= m.e; y -= m.f;
    return { x: (m.d * x - m.c * y) / det, y: (-m.b * x + m.a * y) / det };
  }
  function roundRect(ctx, x, y, w, h, r = 3) {
    r = Math.min(r, w / 2, h / 2); ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function tornRect(ctx, w, h, seed, amount = 3) {
    const r = rng(seed); ctx.beginPath(); ctx.moveTo(0, 0);
    for (let x = 0; x < w; x += 9) ctx.lineTo(x, r() * amount);
    for (let y = 0; y < h; y += 12) ctx.lineTo(w - r() * amount, y);
    for (let x = w; x > 0; x -= 9) ctx.lineTo(x, h - r() * amount);
    for (let y = h; y > 0; y -= 12) ctx.lineTo(r() * amount, y);
    ctx.closePath();
  }
  function trackedText(ctx, text, x, y, spacing = 2) {
    for (const ch of String(text)) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + spacing; }
    return x;
  }
  function wrap(ctx, text, x, y, width, lineHeight, maxLines = 10) {
    const paragraphs = String(text || '').split('\n'); let lineNo = 0;
    for (const para of paragraphs) {
      const words = para.split(/\s+/), lines = []; let line = '';
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > width && line) { lines.push(line); line = word; } else line = test;
      }
      lines.push(line);
      for (const l of lines) { if (lineNo >= maxLines) return y + lineNo * lineHeight; ctx.fillText(l, x, y + lineNo++ * lineHeight, width); }
    }
    return y + lineNo * lineHeight;
  }
  function fitFont(ctx, text, size, family, maxWidth, min = 12) {
    let n = size; ctx.font = `bold ${n}px ${family}`;
    while (n > min && ctx.measureText(String(text || '')).width > maxWidth) ctx.font = `bold ${--n}px ${family}`;
    return n;
  }
  function ruledLines(ctx, x, y, w, count, height = 11, seed = 1) {
    const r = rng(seed); ctx.fillStyle = '#5b5549'; ctx.globalAlpha *= .34;
    for (let i = 0; i < count; i++) { const end = i % 5 === 4 ? .45 + r() * .4 : .86 + r() * .14; ctx.fillRect(x, y + i * height, w * end, 1.7); }
    ctx.globalAlpha /= .34;
  }
  function drawBoardHeaderAndLight(ctx,project){
    const b=project.board||{},bw=+b.width||2400,bh=+b.height||1350;
    if(b.showHeader!==false){ctx.save();ctx.fillStyle=DB.themes?.[b.theme]?.accent||'#d4b17d';ctx.globalAlpha=.82;ctx.font='bold 14px monospace';trackedText(ctx,b.subtitle||'CASE ARCHIVE / FICTIONAL DEMO',65,53,2);ctx.fillStyle=['whiteboard','archive','dossier'].includes(b.theme)?'#3f453c':'#e8dfc9';ctx.font='bold 42px Georgia,serif';ctx.fillText(b.header||project.name||'THE CASE BOARD',65,107,bw-130);ctx.strokeStyle='#c9ac7645';ctx.beginPath();ctx.moveTo(65,125);ctx.lineTo(bw-65,125);ctx.stroke();ctx.restore();}
    const light=clamp(b.lighting??.35);if(light){const g=ctx.createLinearGradient(0,0,bw,bh);g.addColorStop(0,`rgba(255,205,121,${light*.22})`);g.addColorStop(.48,'#00000000');g.addColorStop(1,`rgba(0,5,9,${light*.4})`);ctx.fillStyle=g;ctx.fillRect(0,0,bw,bh);}
  }
  function boardTexture(project,preview=true) {
    const b = project.board || {}, theme = b.theme || 'cork', color = b.color || DB.themes?.[theme]?.color || '#473c31';
    const materialKey = [theme, color, project.seed, b.frame].join('|');
    const key = preview?[materialKey,b.width,b.height,b.showHeader,b.header,b.subtitle,project.name,b.lighting,'preview'].join('|'):materialKey+'|export';
    if (boardCache.has(key)) return cached(boardCache,key);
    const c = makeCanvas(1600, 900), ctx = c.getContext('2d'), r = rng(hash(materialKey));
    ctx.fillStyle = color; ctx.fillRect(0, 0, 1600, 900);
    if (theme === 'cork') {
      for (let i = 0; i < 35000; i++) {
        ctx.fillStyle = i % 3 ? `rgba(233,192,133,${.025 + r() * .105})` : `rgba(20,12,5,${.02 + r() * .15})`;
        ctx.fillRect(r() * 1600, r() * 900, 1 + r() * 5, 1 + r() * 2.7);
      }
    } else if (theme === 'blueprint' || theme === 'whiteboard') {
      ctx.strokeStyle = theme === 'blueprint' ? '#a0d9f022' : '#365b5a13'; ctx.lineWidth = .7;
      for (let x = 0; x < 1600; x += 26) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 900); ctx.stroke(); }
      for (let y = 0; y < 900; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1600, y); ctx.stroke(); }
    } else if (theme === 'crimson') {
      for(let i=0;i<20000;i++){ctx.fillStyle=i%2?'#deb6a30b':'#0000000e';ctx.fillRect(r()*1600,r()*900,.7,1+r()*7);}
      const nap=ctx.createLinearGradient(0,0,1600,650);nap.addColorStop(0,'#b66b6a11');nap.addColorStop(.45,'#00000000');nap.addColorStop(1,'#00000030');ctx.fillStyle=nap;ctx.fillRect(0,0,1600,900);
    } else if (theme === 'charcoal') {
      for(let i=0;i<24000;i++){ctx.fillStyle=i%2?'#bcc7ce0b':'#00000016';ctx.fillRect(r()*1600,r()*900,1+r()*5,.8);}
      ctx.strokeStyle='#b1bbc508';for(let x=25;x<1600;x+=55){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+60,900);ctx.stroke();}
    } else {
      for (let i = 0; i < 35000; i++) { ctx.fillStyle = i % 2 ? '#ffffff05' : '#0000000d'; ctx.fillRect(r() * 1600, r() * 900, r() * 4 + .5, .7); }
      if (theme === 'archive' || theme === 'dossier') {
        for (let y = 35; y < 900; y += 73) { ctx.strokeStyle = '#0000000b'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1600, y + 1); ctx.stroke(); }
      }
    }
    const shade = ctx.createLinearGradient(0, 0, 1600, 900); shade.addColorStop(0, '#e8b66c14'); shade.addColorStop(.5, '#00000000'); shade.addColorStop(1, '#00000030'); ctx.fillStyle = shade; ctx.fillRect(0, 0, 1600, 900);
    if (b.frame !== false) {
      ctx.strokeStyle = '#0b0b0a'; ctx.lineWidth = 18; ctx.strokeRect(0, 0, 1600, 900);
      ctx.strokeStyle = '#ab83594a'; ctx.lineWidth = 2; ctx.strokeRect(12, 12, 1576, 876);
      ctx.strokeStyle = '#00000045'; ctx.lineWidth = 3; ctx.strokeRect(16, 16, 1568, 868);
    }
    // Preview bakes text layout; export paints the title as vectors at output resolution.
    if(preview){const bw=+b.width||2400,bh=+b.height||1350;ctx.save();ctx.scale(1600/bw,900/bh);drawBoardHeaderAndLight(ctx,project);ctx.restore();}
    return cacheCanvas(boardCache,key,c,smallDevice()?3000000:6000000,smallDevice()?2:4);
  }
  function paperTexture(ctx, w, h, seed) {
    const r = rng(seed); ctx.save(); ctx.globalAlpha *= .075;
    for (let i = 0; i < 650; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#514332'; ctx.fillRect(r() * w, r() * h, .4 + r() * 2.5, .5); }
    ctx.restore();
  }
  function photoArt(node, w, h) {
    w=Math.max(8,Math.round(w));h=Math.max(8,Math.round(h));
    const key = `${node.id}|${node.art || ''}|${w}|${h}`;
    if (artCache.has(key)) return cached(artCache,key);
    const c = makeCanvas(w, h), ctx = c.getContext('2d'), seed = hash(node.id + (node.art || '')), r = rng(seed);
    const hint=(node.id+' '+node.text+' '+node.title).toLowerCase();
    const kind = node.art || (/witness|person|suspect|portrait|identity|unknown|interview/.test(hint)?'portrait':/building|warehouse|entrance|office|estate|house/.test(hint)?'building':/evidence|key|specimen|object/.test(hint)?'evidence':/harbour|dock|quay|cargo|shipment|port/.test(hint)?'harbour':/street|route|camera|screen/.test(hint)?'street':['harbour','portrait','building','evidence','street'][seed % 5]);
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#9aafa9'); sky.addColorStop(.47, '#596e70'); sky.addColorStop(1, '#17292c'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    if (/portrait|suspect|person|silhouette/.test(kind)) {
      const wall = ctx.createLinearGradient(0, 0, w, h); wall.addColorStop(0, '#9c9c8d'); wall.addColorStop(1, '#3f504f'); ctx.fillStyle = wall; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#1d2b2d38'; ctx.lineWidth = 1;
      for (let y = h * .12; y < h; y += h * .13) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      const cx = w * .52, cy = h * .4;
      const body = ctx.createLinearGradient(w * .2, 0, w * .8, h); body.addColorStop(0, '#101d20'); body.addColorStop(.55, '#263237'); body.addColorStop(1, '#080f12'); ctx.fillStyle = body;
      ctx.beginPath(); ctx.moveTo(w * .1, h); ctx.bezierCurveTo(w * .13, h * .71, w * .35, h * .63, cx, h * .64); ctx.bezierCurveTo(w * .72, h * .63, w * .91, h * .77, w * .95, h); ctx.fill();
      ctx.fillStyle = '#111b1e'; ctx.fillRect(cx - w * .07, cy + h * .16, w * .14, h * .13);
      const face = ctx.createRadialGradient(cx - w * .07, cy - h * .05, 2, cx, cy, w * .26); face.addColorStop(0, '#a7997e'); face.addColorStop(.38, '#645f54'); face.addColorStop(1, '#192526'); ctx.fillStyle = face;
      ctx.beginPath(); ctx.ellipse(cx, cy, w * .18, h * .23, -.08, 0, TAU); ctx.fill();
      ctx.fillStyle = '#172325'; ctx.beginPath(); ctx.ellipse(cx - w * .02, cy - h * .13, w * .2, h * .12, -.1, Math.PI, TAU + .2); ctx.lineTo(cx + w * .18, cy); ctx.lineTo(cx + w * .13, cy - h * .13); ctx.lineTo(cx - w * .15, cy - h * .14); ctx.lineTo(cx - w * .18, cy + h * .03); ctx.fill();
      ctx.fillStyle = '#152122'; ctx.fillRect(cx - w * .13, cy - h * .025, w * .1, 3); ctx.fillRect(cx + w * .025, cy - h * .025, w * .1, 3);
      ctx.strokeStyle = '#c4baa133'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy + h * .005); ctx.lineTo(cx - w * .025, cy + h * .1); ctx.lineTo(cx + w * .035, cy + h * .1); ctx.stroke();
      ctx.strokeStyle = '#0b1719'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - w * .06, cy + h * .145); ctx.lineTo(cx + w * .075, cy + h * .14); ctx.stroke();
      ctx.fillStyle = '#d0c4a94a'; ctx.beginPath(); ctx.moveTo(cx - w * .08, h * .69); ctx.lineTo(cx, h * .9); ctx.lineTo(cx + w * .09, h * .69); ctx.lineTo(cx + w * .025, h * .74); ctx.lineTo(cx - w * .025, h * .74); ctx.fill();
    } else if (/harbour|dock|ship|port/.test(kind)) {
      ctx.fillStyle = '#d1c4a36a'; ctx.fillRect(0, h * .4, w, h * .045);
      for (let i = 0; i < 9; i++) { const x = i * w / 8; ctx.fillStyle = '#28383b'; ctx.fillRect(x, h * .35 + r() * h * .05, w * .13, h * .14); }
      ctx.fillStyle = '#273d41'; ctx.fillRect(0, h * .49, w, h * .51);
      for (let i = 0; i < 100; i++) { ctx.fillStyle = i % 3 ? '#a9b7aa25' : '#0d1e2b55'; ctx.fillRect(r() * w, h * .5 + r() * h * .5, r() * w * .2, 1); }
      for (const [x, y, len] of [[.12,.54,.53],[.58,.44,.3]]) { ctx.fillStyle = '#111f26'; ctx.beginPath(); ctx.moveTo(w*x,h*y); ctx.lineTo(w*(x+len),h*y); ctx.lineTo(w*(x+len*.83),h*(y+.14)); ctx.lineTo(w*(x+.08),h*(y+.12)); ctx.fill(); ctx.fillStyle='#58645b';ctx.fillRect(w*(x+.18),h*(y-.12),w*len*.3,h*.12); }
      ctx.strokeStyle = '#1a292b'; ctx.lineWidth = 3;
      for (const x of [.13,.7]) { ctx.beginPath();ctx.moveTo(w*x,h*.44);ctx.lineTo(w*x,h*.05);ctx.lineTo(w*(x+.25),h*.16);ctx.moveTo(w*x,h*.1);ctx.lineTo(w*(x-.1),h*.23);ctx.stroke(); ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w*(x+.24),h*.16);ctx.lineTo(w*(x+.24),h*.39);ctx.stroke(); }
      ctx.fillStyle='#0b151c';ctx.beginPath();ctx.moveTo(0,h*.93);ctx.lineTo(w,h*.74);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
    } else if (/evidence|key|object|weapon/.test(kind)) {
      ctx.fillStyle = '#b3a78d'; ctx.fillRect(0, 0, w, h);
      for (let i=0;i<600;i++) {ctx.fillStyle=i%2?'#5e533212':'#ffffff15';ctx.fillRect(r()*w,r()*h,1+r()*3,1);}
      ctx.save();ctx.translate(w*.52,h*.52);ctx.rotate(-.4);
      ctx.shadowColor='#00000066';ctx.shadowBlur=8;ctx.shadowOffsetY=5;
      ctx.strokeStyle='#4b554e';ctx.lineWidth=w*.043;ctx.beginPath();ctx.arc(-w*.12,0,w*.1,0,TAU);ctx.moveTo(-w*.02,0);ctx.lineTo(w*.29,0);ctx.lineTo(w*.29,h*.08);ctx.moveTo(w*.2,0);ctx.lineTo(w*.2,h*.06);ctx.stroke();ctx.restore();
      ctx.fillStyle='#ded7bd';ctx.fillRect(w*.06,h*.76,w*.27,h*.16);ctx.fillStyle='#292d26';ctx.font=`bold ${h*.07}px monospace`;ctx.fillText('E-07',w*.09,h*.87);
    } else {
      ctx.fillStyle='#202e30';ctx.fillRect(0,h*.6,w,h*.4);
      for(let i=0;i<7;i++) {const x=i*w/6,bh=h*(.28+r()*.25);ctx.fillStyle=['#374345','#465455','#293b3e'][i%3];ctx.fillRect(x,h*.67-bh,w*.19,bh);ctx.fillStyle='#c6bd864c';for(let yy=h*.67-bh+9;yy<h*.65;yy+=14)for(let xx=x+8;xx<x+w*.16;xx+=13)if(r()>.3)ctx.fillRect(xx,yy,5,6);}
      ctx.fillStyle='#17282b';ctx.beginPath();ctx.moveTo(w*.42,h*.61);ctx.lineTo(w*.65,h*.61);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
      ctx.strokeStyle='#c7bb8b75';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.55,h*.68);ctx.lineTo(w*.6,h*.9);ctx.stroke();
      ctx.fillStyle='#102025';ctx.fillRect(w*.17,h*.36,3,h*.49);ctx.fillStyle='#e8ce95';ctx.beginPath();ctx.arc(w*.17,h*.36,3,0,TAU);ctx.fill();
      if(/street|building|warehouse/.test(kind)) {ctx.fillStyle='#162123';ctx.fillRect(w*.7,h*.18,w*.24,h*.54);ctx.fillStyle='#b3b1a54a';ctx.fillRect(w*.73,h*.22,w*.17,h*.025);}
    }
    const vignette=ctx.createRadialGradient(w*.43,h*.38,w*.1,w*.5,h*.5,Math.max(w,h)*.68);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#07171b99');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
    ctx.globalAlpha=.1;for(let i=0;i<3000;i++){ctx.fillStyle=i%2?'white':'black';ctx.fillRect(r()*w,r()*h,1,1);}ctx.globalAlpha=1;
    return cacheCanvas(artCache,key,c,smallDevice()?4000000:9000000,80);
  }
  function isVideoMedia(m){return m?.kind==='video'||/^data:video\//.test(m?.dataUrl||m?.url||'');}
  function mediaKey(project,node){return isVideoMedia(project.media?.[node.media])?node.media+'::'+node.id:node.media;}
  function mediaImage(project, node) {
    if (!node.media) return null;
    const entry = mediaCache.get(mediaKey(project,node)), m = project.media?.[node.media];
    return entry && entry.source === (m?.dataUrl || m?.url || m?.path) && entry.ready ? entry.el : null;
  }
  function drawImageFit(ctx, image, x, y, w, h, node) {
    if(w<=0||h<=0)return;
    const iw=image.videoWidth||image.naturalWidth||image.width,ih=image.videoHeight||image.naturalHeight||image.height;
    if(!iw||!ih)return;
    if(image.tagName==='VIDEO')ctx._videoRect={x,y,w,h};
    const contain=node.mediaFit==='contain',s=(contain?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih))*clamp(node.mediaZoom||1,.1,8),dw=iw*s,dh=ih*s;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle='#202b2b';ctx.fillRect(x,y,w,h);
    ctx.drawImage(image,x+(w-dw)*clamp(node.mediaX??.5),y+(h-dh)*clamp(node.mediaY??.5),dw,dh);ctx.restore();
  }
  function mapArt(ctx,x,y,w,h,seed,accent='#aa3f35'){
    const r=rng(seed);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle='#c9c8ac';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#a3ad9160';ctx.lineWidth=12;for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(x+r()*w,y);ctx.bezierCurveTo(x+r()*w,y+h*.3,x+r()*w,y+h*.7,x+r()*w,y+h);ctx.stroke();}
    ctx.fillStyle='#839e9c';ctx.beginPath();ctx.moveTo(x+w*.65,y-10);ctx.bezierCurveTo(x+w*.25,y+h*.4,x+w*1.1,y+h*.3,x+w*.55,y+h+10);ctx.lineTo(x+w*.7,y+h+10);ctx.bezierCurveTo(x+w*1.15,y+h*.3,x+w*.4,y+h*.35,x+w*.78,y-10);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#eeead1';ctx.lineWidth=6;
    for(let i=0;i<9;i++){const yy=y+(i+.3)*h/9;ctx.beginPath();ctx.moveTo(x-5,yy);ctx.lineTo(x+w,yy+(r()-.5)*h*.3);ctx.stroke();}
    for(let i=0;i<8;i++){const xx=x+(i+.4)*w/8;ctx.beginPath();ctx.moveTo(xx,y-5);ctx.lineTo(xx+(r()-.5)*w*.3,y+h+5);ctx.stroke();}
    ctx.strokeStyle='#8a81625a';ctx.lineWidth=1;for(let i=0;i<16;i++){ctx.strokeRect(x+r()*w,y+r()*h,9+r()*18,6+r()*15);}
    ctx.setLineDash([5,4]);ctx.strokeStyle=accent;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x+w*.24,y+h*.7);ctx.bezierCurveTo(x+w*.5,y+h*.2,x+w*.45,y+h*.8,x+w*.8,y+h*.3);ctx.stroke();ctx.setLineDash([]);
    for(const [xx,yy] of [[.24,.7],[.8,.3]]){ctx.fillStyle=accent;ctx.beginPath();ctx.arc(x+w*xx,y+h*yy,5,0,TAU);ctx.fill();ctx.strokeStyle=accent;ctx.beginPath();ctx.arc(x+w*xx,y+h*yy,10,0,TAU);ctx.stroke();}
    ctx.fillStyle='#465447';ctx.font=`${Math.max(8,w*.031)}px monospace`;ctx.fillText('NORTH QUAY',x+w*.06,y+h*.2);ctx.fillText('RIVER DISTRICT',x+w*.48,y+h*.88);
    ctx.strokeStyle='#464b3c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+w-21,y+14);ctx.lineTo(x+w-21,y+37);ctx.moveTo(x+w-26,y+20);ctx.lineTo(x+w-21,y+14);ctx.lineTo(x+w-16,y+20);ctx.stroke();ctx.restore();
  }
  function fingerprint(ctx,x,y,w,h,seed){
    if(w<=0||h<=0)return;
    const r=rng(seed);ctx.save();ctx.translate(x+w*.5,y+h*.5);ctx.rotate(-.12);ctx.strokeStyle='#262f2b';ctx.lineWidth=Math.max(1.1,w*.008);ctx.globalAlpha*=.8;
    for(let i=0;i<18;i++){const rx=w*(.07+i*.019),ry=h*(.08+i*.021);ctx.beginPath();for(let j=0;j<=110;j++){const a=j/110*TAU,pulse=1+.065*Math.sin(a*3+i*.12);const xx=Math.cos(a)*rx*pulse+(Math.sin(a*2+i*.08))*w*.018,yy=Math.sin(a)*ry; if(j===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.stroke();}
    ctx.globalAlpha*=.3;for(let i=0;i<30;i++){ctx.fillStyle='#25312a';ctx.fillRect((r()-.5)*w*.85,(r()-.5)*h*.85,1,1);}ctx.restore();
  }
  function tape(ctx,x,y,w,h,seed,color='#dbc792'){
    ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.globalAlpha*=.72;tornRect(ctx,w,h,seed,2.7);ctx.fill();ctx.strokeStyle='#fff7d24a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(4,2);ctx.lineTo(w-5,2);ctx.stroke();ctx.restore();
  }
  function nodeSurface(project,node,progress=1,surfaceScale=1,highQuality=false){
    const w=Math.max(12,+node.w||250),h=Math.max(12,+node.h||220),seed=hash(node.id),type=node.type||'photo';
    const media=mediaImage(project,node),isVideo=!!media&&media.tagName==='VIDEO';
    const special=['circle','stamp','text','tape'].includes(type),pad=special?12:40;
    const rasterScale=highQuality?Math.min(clamp(surfaceScale,1,4),4096/Math.max(w+pad*2,h+pad*2)):Math.min(1,1600/Math.max(w+pad*2,h+pad*2));
    const key=JSON.stringify(node)+'|'+(mediaCache.get(mediaKey(project,node))?.revision||0)+'|'+(progress<1?Math.round(progress*60):'full')+'|scale:'+rasterScale.toFixed(4);
    if(!isVideo&&cardCache.has(key))return cached(cardCache,key);
    if(isVideo&&videoCardCache.has(key)){
      // Reuse the video card's raster. Only the moving image and its local overlays change.
      const c=cached(videoCardCache,key),ctx=c._ctx,rect=c._videoRect;
      if(rect){ctx.save();ctx.beginPath();ctx.rect(rect.x,rect.y,rect.w,rect.h);ctx.clip();drawImageFit(ctx,media,rect.x,rect.y,rect.w,rect.h,node);
        if(type==='screen'){ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#001b17';for(let yy=10;yy<h-40;yy+=3)ctx.fillRect(10,yy,w-20,1);ctx.restore();ctx.fillStyle='#b95443';ctx.beginPath();ctx.arc(w-18,20,3,0,TAU);ctx.fill();ctx.font='9px monospace';ctx.fillStyle='#e1e8df';ctx.fillText('REC',w-47,23);}
        if(type==='photo'||type==='map')paperTexture(ctx,w,h,seed);
        if(type==='evidence'){ctx.strokeStyle='#ffffff26';ctx.beginPath();ctx.moveTo(w*.8,46);ctx.lineTo(w*.65,h-43);ctx.moveTo(w*.9,46);ctx.lineTo(w*.75,h-43);ctx.stroke();}
        if(node.tape){ctx.save();ctx.translate(w/2-41,-8);ctx.rotate(-.04);tape(ctx,0,0,82,26,hash(node.id+'tape'));ctx.restore();}
        if(node.pin!==false&&!['circle','stamp','text','tape'].includes(type))drawPin(ctx,w/2,12,node.pinColor||'#ad4034');ctx.restore();}
      return c;
    }
    const c=makeCanvas((w+pad*2)*rasterScale,(h+pad*2)*rasterScale),ctx=c.getContext('2d');c._pad=pad;ctx.scale(rasterScale,rasterScale);ctx.translate(pad,pad);
    const color=node.color||'#e9dfc8',ink=node.ink||'#26302b',text=String(node.text||node.title||''),sub=String(node.subtitle||''),body=String(node.body||''),font=node.fontFamily||'Georgia,serif';
    const typed=progress<1?text.slice(0,Math.ceil(text.length*progress)):text;
    if(!special){ctx.shadowColor='#03080970';ctx.shadowBlur=(9+depthOf(node)*2)*rasterScale;ctx.shadowOffsetX=4*rasterScale;ctx.shadowOffsetY=(6+depthOf(node)*1.5)*rasterScale;ctx.fillStyle=color;ctx.fillRect(1,1,w-2,h-2);ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=ctx.shadowOffsetY=0;}
    ctx.fillStyle=color;
    if(type==='circle'){
      ctx.strokeStyle=color;ctx.lineWidth=Math.max(3,Math.min(w,h)*.025);ctx.lineCap='round';ctx.beginPath();ctx.ellipse(w*.5,h*.5,w*.46,h*.43,-.06,0,TAU*.98);ctx.stroke();ctx.globalAlpha=.45;ctx.beginPath();ctx.ellipse(w*.5+2,h*.5-1,w*.45,h*.44,.015,0,TAU*.96);ctx.stroke();
    }else if(type==='text'){
      ctx.fillStyle=color;const size=clamp(node.fontSize||32,10,180);ctx.font=`${node.bold===false?'':'bold '}${size}px ${node.fontFamily||'Georgia,serif'}`;wrap(ctx,typed,0,size,w,size*1.15,Math.max(1,Math.floor(h/(size*1.15))));
    }else if(type==='stamp'){
      ctx.save();ctx.translate(w*.5,h*.5);ctx.rotate(-.035);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=3;roundRect(ctx,-w*.47,-h*.37,w*.94,h*.74,2);ctx.stroke();ctx.lineWidth=1;ctx.strokeRect(-w*.45,-h*.31,w*.9,h*.62);fitFont(ctx,typed||'CLASSIFIED',h*.35,'monospace',w*.83);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(typed||'CLASSIFIED',0,1,w*.83);ctx.restore();
      const r=rng(seed);ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=.28;for(let i=0;i<95;i++){ctx.fillRect(r()*w,r()*h,r()*7+1,1+r()*2);}ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    }else if(type==='tape'){
      tape(ctx,0,0,w,h,seed,color);ctx.fillStyle=ink;ctx.font=`bold ${Math.min(22,h*.55)}px monospace`;ctx.textBaseline='middle';ctx.fillText(typed,10,h*.53,w-20);
    }else if(type==='label'){
      tornRect(ctx,w,h,seed,1.8);ctx.fill();paperTexture(ctx,w,h,seed);ctx.fillStyle=ink;ctx.font=`bold ${Math.min(24,h*.38)}px monospace`;ctx.textBaseline='middle';ctx.fillText(typed,14,h*.52,w-28);ctx.strokeStyle='#6b5a3c33';ctx.strokeRect(5,5,w-10,h-10);
    }else if(type==='note'){
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.lineTo(w,h-16);ctx.lineTo(w-17,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
      const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#fff8db28');shade.addColorStop(.87,'#00000000');shade.addColorStop(1,'#796d382c');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h-17);
      ctx.fillStyle='#e2cf86';ctx.beginPath();ctx.moveTo(w-17,h);ctx.lineTo(w-17,h-16);ctx.lineTo(w,h-16);ctx.fill();paperTexture(ctx,w,h,seed);
      ctx.fillStyle=ink;ctx.font=`italic bold ${Math.min(28,w*.105)}px ${font}`;const yy=wrap(ctx,typed,18,Math.min(42,h*.24),w-36,Math.min(35,w*.13),5);
      if(body){ctx.font=`${Math.min(16,w*.065)}px monospace`;wrap(ctx,body,18,yy+12,w-36,21,Math.max(1,Math.floor((h-yy-20)/21)));}
      if(sub){ctx.font='11px monospace';ctx.fillStyle='#4d4838';ctx.fillText(sub,18,h-15,w-36);}
    }else if(type==='folder'){
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,16);ctx.lineTo(16,16);ctx.lineTo(23,1);ctx.lineTo(w*.43,1);ctx.lineTo(w*.48,16);ctx.lineTo(w,16);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
      ctx.fillStyle='#ffffff18';ctx.fillRect(2,20,w-4,4);ctx.fillStyle='#45372225';ctx.fillRect(0,h-6,w,6);paperTexture(ctx,w,h,seed);
      ctx.fillStyle='#e9ddbd';ctx.fillRect(w*.12,h*.3,w*.76,h*.41);ctx.strokeStyle='#6d5b3f';ctx.lineWidth=1;ctx.strokeRect(w*.12,h*.3,w*.76,h*.41);ctx.fillStyle=ink;ctx.font=`bold ${Math.min(23,w*.065)}px monospace`;wrap(ctx,typed,w*.17,h*.43,w*.66,28,2);ctx.font='11px monospace';ctx.fillText(sub||'RESTRICTED ACCESS',w*.17,h*.64,w*.66);
      ctx.strokeStyle='#705a3970';ctx.beginPath();ctx.moveTo(w*.07,h*.83);ctx.lineTo(w*.92,h*.83);ctx.stroke();
    }else if(type==='photo'||type==='screen'){
      const screen=type==='screen',pad=screen?10:14,bottom=screen?40:55;roundRect(ctx,0,0,w,h,screen?4:1);ctx.fillStyle=screen?'#152421':color;ctx.fill();
      const image=media||photoArt(node,Math.round((w-pad*2)*rasterScale),Math.round((h-pad-bottom)*rasterScale));drawImageFit(ctx,image,pad,pad,w-pad*2,h-pad-bottom,node);
      ctx.fillStyle=screen?'#94c2b4':ink;ctx.font=`${screen?'':'italic '}${Math.min(20,w*.066)}px ${screen?(node.fontFamily||'monospace'):font}`;ctx.fillText(typed,pad,h-bottom*.43,w-pad*2);
      ctx.font=`${Math.max(8,Math.min(10,w*.035))}px monospace`;ctx.fillStyle=screen?'#7baf9b':'#797264';ctx.fillText(sub||'EXHIBIT / ARCHIVE PHOTO',pad,h-10,w-pad*2);
      if(screen){ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#001b17';for(let yy=pad;yy<h-bottom;yy+=3)ctx.fillRect(pad,yy,w-pad*2,1);ctx.restore();ctx.fillStyle='#b95443';ctx.beginPath();ctx.arc(w-18,20,3,0,TAU);ctx.fill();ctx.font='9px monospace';ctx.fillStyle='#e1e8df';ctx.fillText('REC',w-47,23);}
      else paperTexture(ctx,w,h,seed);
    }else if(type==='map'){
      tornRect(ctx,w,h,seed,2);ctx.fill();if(media)drawImageFit(ctx,media,10,32,w-20,h-58,node);else mapArt(ctx,10,32,w-20,h-58,seed,node.accent||'#a03f34');
      ctx.fillStyle=ink;ctx.font='bold 13px monospace';ctx.fillText(typed||'DISTRICT SEARCH AREA',12,22,w-24);ctx.font='9px monospace';ctx.fillText(sub||'FIELD MAP / NOT TO SCALE',12,h-11,w-24);paperTexture(ctx,w,h,seed);
    }else if(type==='fingerprint'){
      tornRect(ctx,w,h,seed,2);ctx.fill();ctx.fillStyle=ink;ctx.font='bold 12px monospace';ctx.fillText(typed||'LATENT PRINT / 07',15,30,w-30);ctx.strokeStyle='#6a6c5b50';ctx.strokeRect(14,45,w-28,h-88);fingerprint(ctx,22,50,w-44,h-105,seed);ctx.font='10px monospace';ctx.fillText(sub||'EVIDENCE ANALYSIS',15,h-24,w-30);ctx.font='8px monospace';ctx.fillText('RIDGE PATTERN / FICTIONAL SPECIMEN',15,h-11,w-30);paperTexture(ctx,w,h,seed);
    }else if(type==='evidence'){
      ctx.fillStyle='#d2c9ab';tornRect(ctx,w,h,seed,1.5);ctx.fill();ctx.fillStyle='#faf8df38';ctx.fillRect(9,43,w-18,h-83);
      if(media)drawImageFit(ctx,media,12,45,w-24,h-87,node);else drawImageFit(ctx,photoArt({...node,art:'evidence'},Math.round((w-24)*rasterScale),Math.round((h-87)*rasterScale)),12,45,w-24,h-87,node);
      ctx.strokeStyle='#f6edcf8a';ctx.lineWidth=2;ctx.strokeRect(9,43,w-18,h-83);ctx.fillStyle='#c29645';ctx.fillRect(0,5,w,22);ctx.fillStyle='#252f28';ctx.font='bold 10px monospace';trackedText(ctx,'E V I D E N C E',12,20,1.2);ctx.font='bold 12px monospace';ctx.fillText(typed,12,h-22,w-24);ctx.font='8px monospace';ctx.fillText(sub||'SEALED / FICTIONAL CASE',12,h-9,w-24);
      ctx.strokeStyle='#ffffff26';ctx.beginPath();ctx.moveTo(w*.8,46);ctx.lineTo(w*.65,h-43);ctx.moveTo(w*.9,46);ctx.lineTo(w*.75,h-43);ctx.stroke();
    }else if(type==='newspaper'){
      tornRect(ctx,w,h,seed,3.5);ctx.fill();paperTexture(ctx,w,h,seed);ctx.fillStyle=ink;ctx.textAlign='center';ctx.font=`bold ${Math.min(26,w*.075)}px Georgia,serif`;ctx.fillText(node.publication||node.title||'THE EVENING RECORD',w*.5,31,w-24);ctx.textAlign='left';ctx.strokeStyle='#605d4b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(12,42);ctx.lineTo(w-12,42);ctx.stroke();ctx.font='8px monospace';ctx.fillText(sub||'NORTH QUAY / ARCHIVE EDITION',12,54,w-24);
      ctx.font=`bold ${Math.min(25,w*.076)}px ${font}`;const yy=wrap(ctx,typed,12,83,w-24,Math.min(28,w*.085),3);
      const imageH=Math.max(42,Math.min(h*.33,h-yy-65));if(h-yy>80){const img=media||photoArt({...node,art:node.art||'harbour'},Math.round((w-26)*rasterScale),Math.round(imageH*rasterScale));drawImageFit(ctx,img,13,yy+1,w-26,imageH,node);}
      const by=yy+imageH+19;ctx.font='10px Georgia,serif';if(body)wrap(ctx,body,13,by,w-26,13,Math.max(1,Math.floor((h-by-10)/13)));else{ruledLines(ctx,13,by,w*.43,Math.max(1,Math.floor((h-by-12)/8)),8,seed);ruledLines(ctx,w*.53,by,w*.43,Math.max(1,Math.floor((h-by-12)/8)),8,seed+1);}
    }else{
      // Document is also the safe fallback for unknown node types.
      tornRect(ctx,w,h,seed,2.2);ctx.fill();paperTexture(ctx,w,h,seed);
      ctx.fillStyle='#977f5550';ctx.fillRect(13,13,w-26,3);ctx.fillStyle=ink;ctx.font='9px monospace';trackedText(ctx,sub||'CASE ARCHIVE / INTERNAL',15,34,.7);
      ctx.font=`bold ${Math.min(25,w*.08)}px ${font}`;const yy=wrap(ctx,typed,15,67,w-30,Math.min(29,w*.095),3);ctx.strokeStyle='#6d66524a';ctx.beginPath();ctx.moveTo(15,yy+2);ctx.lineTo(w-15,yy+2);ctx.stroke();
      let bodyY=yy+23;
      if(media){const ih=Math.min(h*.32,h-bodyY-36);if(ih>20){drawImageFit(ctx,media,15,bodyY-10,w-30,ih,node);bodyY+=ih+4;}}
      ctx.font='12px Georgia,serif';if(body)wrap(ctx,body,15,bodyY,w-30,17,Math.max(1,Math.floor((h-bodyY-35)/17)));else ruledLines(ctx,15,bodyY,w-30,Math.max(2,Math.floor((h-bodyY-38)/11)),11,seed);
      ctx.fillStyle='#726b58';ctx.font='8px monospace';ctx.fillText(node.footer||'FAVORITE WORLD / FICTIONAL DEMO',15,h-16,w-30);ctx.fillStyle='#a53e31';ctx.font='bold 9px monospace';ctx.fillText('FILE COPY',w-75,h-16);
    }
    if(node.tape){ctx.save();ctx.translate(w/2-41,-8);ctx.rotate(-.04);tape(ctx,0,0,82,26,hash(node.id+'tape'));ctx.restore();}
    if(node.pin!==false&&!special)drawPin(ctx,w/2,12,node.pinColor||'#ad4034');
    if(isVideo){c._ctx=ctx;c._videoRect=ctx._videoRect;cacheCanvas(videoCardCache,key,c,highQuality?(smallDevice()?16000000:32000000):(smallDevice()?4000000:8000000),12);}else cacheCanvas(cardCache,key,c,highQuality?(smallDevice()?24000000:60000000):(smallDevice()?6000000:16000000),180);return c;
  }
  function revealState(node,time,editor){
    const start=Number(node.enter)||0,end=node.exit==null?Infinity:Number(node.exit),duration=Math.max(.02,Number(node.revealDuration)||.7);
    if(node.hidden)return{visible:false};
    if(editor)return{visible:true,alpha:1,p:1,dx:0,dy:0,scale:1,rotation:0};
    if(time<start||time>end)return{visible:false};
    const p=clamp((time-start)/duration),e=easing(p,'ease-out'),r=node.reveal||'pin';
    const fade=end<Infinity?clamp((end-time)/Math.min(.4,duration)):1;
    const state={visible:true,alpha:fade,p:r==='typewriter'?p:1,dx:0,dy:0,scale:1,rotation:0};
    if(r==='none'||r==='typewriter')return state;
    if(r==='fade')state.alpha*=e;
    if(r==='pin'){state.alpha*=clamp(p*4);state.scale=.84+.16*e;state.rotation=(1-e)*-6;}
    if(r==='drop'){state.alpha*=clamp(p*5);state.dy=-90*(1-e);state.rotation=(1-e)*12;}
    if(r==='slide'){state.alpha*=clamp(p*3);state.dx=-100*(1-e);}
    if(r==='scale'){state.alpha*=clamp(p*3);state.scale=.15+.85*e;}
    return state;
  }
  function pinPosition(node,state,cam,project,editor){const a=((+node.rotation||0)+(state?.rotation||0))*RAD,py=(-( +node.h||220)*.5+12)*(state?.scale??1),parallax=editor?0:clamp(project?.camera?.parallax||0,0,2)*depthOf(node)*.005;return{x:(+node.x||0)+(state?.dx||0)-Math.sin(a)*py+((+node.x||0)-(cam?.x||0))*parallax,y:(+node.y||0)+(state?.dy||0)+Math.cos(a)*py+((+node.y||0)-(cam?.y||0))*parallax};}
  function drawPin(ctx,x,y,color='#a83f35',matte=false){
    ctx.save();ctx.translate(x,y);if(matte){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,7,0,TAU);ctx.fill();ctx.restore();return;}
    ctx.fillStyle='#0000005c';ctx.beginPath();ctx.ellipse(3,5,8,4,-.2,0,TAU);ctx.fill();ctx.strokeStyle='#c5b897';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,1);ctx.lineTo(3,7);ctx.stroke();
    const g=ctx.createRadialGradient(-2,-3,0,1,1,8);g.addColorStop(0,'#efd6b4');g.addColorStop(.21,color);g.addColorStop(1,'#4e211e');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,6.5,0,TAU);ctx.fill();ctx.fillStyle='#ffffff65';ctx.beginPath();ctx.arc(-1.5,-2,1.4,0,TAU);ctx.fill();ctx.restore();
  }
  function edgeLabelSurface(label,surfaceScale=1){
    const text=String(label),scale=clamp(surfaceScale,1,4),key=text+'|scale:'+scale;if(edgeLabelCache.has(key))return cached(edgeLabelCache,key);
    const probe=makeCanvas(1,1).getContext('2d');probe.font='11px monospace';const tw=Math.ceil(Math.min(210,probe.measureText(text).width+18));
    const c=makeCanvas(tw*scale,20*scale),ctx=c.getContext('2d');c._logicalWidth=tw;ctx.scale(scale,scale);ctx.fillStyle='#d7c7a8';ctx.fillRect(0,0,tw,20);ctx.fillStyle='#392f26';ctx.font='11px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,tw/2,10,tw-12);
    return cacheCanvas(edgeLabelCache,key,c,scale>1?1500000:150000,150);
  }
  function drawEdge(ctx,project,edge,time,editor,matte,nodes,cam,surfaceScale=1){
    const a=nodes.get(edge.from),b=nodes.get(edge.to);if(!a||!b||a.hidden||b.hidden||edge.hidden)return;
    const as=revealState(a,time,editor),bs=revealState(b,time,editor);if(!as.visible||!bs.visible)return;
    const p=editor?1:clamp((time-(+edge.start||0))/Math.max(.02,+edge.duration||1));if(p<=0)return;
    const start=pinPosition(a,as,cam,project,editor),end=pinPosition(b,bs,cam,project,editor),dx=end.x-start.x,dy=end.y-start.y,len=Math.hypot(dx,dy);
    const sag=clamp(edge.sag??.1,-1,1)*Math.min(len,500)*.32;
    const control={x:(start.x+end.x)/2+(-dy/(len||1))*sag*.2,y:(start.y+end.y)/2+sag};
    const mid={x:lerp(start.x,control.x,p),y:lerp(start.y,control.y,p)},mid2={x:lerp(control.x,end.x,p),y:lerp(control.y,end.y,p)},last={x:lerp(mid.x,mid2.x,p),y:lerp(mid.y,mid2.y,p)};
    ctx.save();ctx.globalAlpha*=Math.min(as.alpha,bs.alpha);ctx.lineCap='round';ctx.lineJoin='round';
    const string=edge.style==='string'||!edge.style,width=clamp(edge.width||3,.4,24);
    if(edge.style==='dashed')ctx.setLineDash([width*3,width*2.7]);
    if(!matte){ctx.strokeStyle='#00000075';ctx.lineWidth=width+2;ctx.beginPath();ctx.moveTo(start.x+1,start.y+3);ctx.quadraticCurveTo(mid.x+1,mid.y+3,last.x+1,last.y+3);ctx.stroke();}
    ctx.strokeStyle=matte?'#fff':(edge.color||'#b93534');ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.quadraticCurveTo(mid.x,mid.y,last.x,last.y);ctx.stroke();
    if(string&&!matte){ctx.globalAlpha*=.5;ctx.strokeStyle='#ffcb9f';ctx.lineWidth=Math.max(.5,width*.22);ctx.beginPath();ctx.moveTo(start.x,start.y-.65);ctx.quadraticCurveTo(mid.x,mid.y-.65,last.x,last.y-.65);ctx.stroke();ctx.globalAlpha/= .5;}
    if(edge.style==='arrow') {const angle=Math.atan2(last.y-mid.y,last.x-mid.x);ctx.fillStyle=matte?'#fff':edge.color||'#b93534';ctx.translate(last.x,last.y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-13,-6);ctx.lineTo(-13,6);ctx.closePath();ctx.fill();ctx.rotate(-angle);ctx.translate(-last.x,-last.y);}
    if(edge.label&&p>.65){const x=(start.x+end.x)/2,y=(start.y+end.y)/2+sag*.5,label=edgeLabelSurface(edge.label,surfaceScale),lw=label._logicalWidth;ctx.setLineDash([]);if(matte){ctx.fillStyle='#fff';ctx.fillRect(x-lw/2,y-10,lw,20);}else ctx.drawImage(label,x-lw/2,y-10,lw,20);}
    ctx.restore();
  }
  function drawNode(ctx,project,node,time,options,cam){
    const state=revealState(node,time,options.editor);if(!state.visible||state.alpha<=.001)return;
    const w=Math.max(12,+node.w||250),h=Math.max(12,+node.h||220),matte=options.mode==='matte';
    const parallax=options.editor?0:clamp(project.camera?.parallax||0,0,2)*depthOf(node)*.005;
    ctx.save();ctx.globalAlpha*=clamp(node.opacity??1)*state.alpha;
    ctx.translate((+node.x||0)+state.dx+(+node.x-cam.x)*parallax,(+node.y||0)+state.dy+(+node.y-cam.y)*parallax);
    ctx.rotate(((+node.rotation||0)+state.rotation)*RAD);ctx.scale(state.scale,state.scale);ctx.translate(-w/2,-h/2);
    const special=['circle','stamp','text','tape'].includes(node.type);
    if(matte){
      if(special){const key=JSON.stringify(node)+'|'+Math.round(state.p*60)+'|scale:'+options._surfaceScale+'|preview:'+!!options.preview;let surface=cached(matteCache,key);if(!surface){const base=nodeSurface(project,node,state.p,options._surfaceScale,!options.preview);surface=makeCanvas(base.width,base.height);surface._pad=base._pad;const mc=surface.getContext('2d');mc.drawImage(base,0,0);mc.globalCompositeOperation='source-in';mc.fillStyle='#fff';mc.fillRect(0,0,surface.width,surface.height);cacheCanvas(matteCache,key,surface,smallDevice()?2000000:5000000,100);}const pad=surface._pad||12;ctx.drawImage(surface,-pad,-pad,w+pad*2,h+pad*2);}
      else{ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
    }else{
      const surface=nodeSurface(project,node,state.p,options._surfaceScale,!options.preview),pad=surface._pad||12;ctx.drawImage(surface,-pad,-pad,w+pad*2,h+pad*2);
    }
    if(matte&&node.pin!==false&&!special)drawPin(ctx,w/2,12,node.pinColor||'#ad4034',true);
    if(options.editor&&options.selected===node.id){ctx.save();ctx.strokeStyle='#f0bb69';ctx.lineWidth=2.5/(options._scale||1);ctx.setLineDash([7/(options._scale||1),4/(options._scale||1)]);ctx.strokeRect(-5,-5,w+10,h+10);ctx.setLineDash([]);ctx.fillStyle='#f0bb69';for(const [x,y]of[[0,0],[w,0],[w,h],[0,h]])ctx.fillRect(x-4,y-4,8,8);ctx.restore();}
    ctx.restore();
  }
  function atmosphereSurface(project,W,H){
    const b=project.board||{},spot=clamp(b.spotlight||0),vignette=clamp(b.vignette??.32),grain=clamp(b.grain??.12),bars=clamp(project.camera?.letterbox||0,0,.2);
    const key=[W,H,spot,vignette,grain,bars].join('|');if(atmosphereCache.has(key))return cached(atmosphereCache,key);
    const c=makeCanvas(W,H),ctx=c.getContext('2d');
    if(spot){const g=ctx.createRadialGradient(W*.4,H*.4,0,W*.5,H*.5,Math.max(W,H)*.7);g.addColorStop(0,'#ffc17000');g.addColorStop(.3,'#ffcb8e00');g.addColorStop(1,`rgba(0,5,10,${spot*.45})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
    if(vignette){const g=ctx.createRadialGradient(W*.5,H*.5,Math.min(W,H)*.25,W*.5,H*.5,Math.max(W,H)*.65);g.addColorStop(0,'#00000000');g.addColorStop(1,`rgba(0,0,0,${vignette*.9})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
    if(grain){if(!grainCanvas){grainCanvas=makeCanvas(480,270);const gc=grainCanvas.getContext('2d'),gr=rng(43051);for(let i=0;i<22000;i++){gc.fillStyle=i%2?'#ffffff70':'#00000070';gc.fillRect(gr()*480,gr()*270,1,1);}}ctx.save();ctx.globalAlpha=grain*.23;ctx.drawImage(grainCanvas,0,0,W,H);ctx.restore();}
    if(bars){ctx.fillStyle='#050706';ctx.fillRect(0,0,W,H*bars);ctx.fillRect(0,H-H*bars,W,H*bars);}
    return cacheCanvas(atmosphereCache,key,c,smallDevice()?1500000:5000000,3);
  }
  function render(ctx,project,time=0,options={}){
    const W=+options.width||ctx.canvas.width,H=+options.height||ctx.canvas.height,mode=options.mode||'composite',b=project.board||{},bw=+b.width||2400,bh=+b.height||1350;
    const m=matrix(project,time,W,H,options.view),matte=mode==='matte';
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,W,H);
    if(mode==='green'||mode==='blue'||matte){ctx.fillStyle=matte?'#000':mode==='green'?'#00ff00':'#0000ff';ctx.fillRect(0,0,W,H);}else if(mode!=='alpha'){ctx.fillStyle='#101311';ctx.fillRect(0,0,W,H);}
    ctx.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);
    if(mode==='composite'){ctx.drawImage(boardTexture(project,!!options.preview),0,0,bw,bh);if(!options.preview)drawBoardHeaderAndLight(ctx,project);}
    const nodes=(project.nodes||[]).slice().sort((a,b)=>(+a.z||0)-(+b.z||0)),nodeMap=new Map(nodes.map(n=>[n.id,n]));
    const opts={...options,mode,_scale:m.scale,_surfaceScale:options.preview?1:clamp(Math.ceil(m.scale),1,4)};
    if(!b.stringsOnTop)for(const e of project.edges||[])drawEdge(ctx,project,e,time,options.editor,matte,nodeMap,m.camera,opts._surfaceScale);
    for(const n of nodes){
      // Avoid paper/shadow work outside a close-up camera's visible region.
      const sx=m.a*(+n.x||0)+m.c*(+n.y||0)+m.e,sy=m.b*(+n.x||0)+m.d*(+n.y||0)+m.f;
      const radius=(Math.hypot(+n.w||250,+n.h||220)*.55+140)*m.scale;
      if(sx+radius<0||sy+radius<0||sx-radius>W||sy-radius>H)continue;
      drawNode(ctx,project,n,time,opts,m.camera);
    }
    if(b.stringsOnTop){for(const e of project.edges||[])drawEdge(ctx,project,e,time,options.editor,matte,nodeMap,m.camera,opts._surfaceScale);for(const n of nodes){const state=revealState(n,time,options.editor);if(n.pin!==false&&state.visible){const pin=pinPosition(n,state,m.camera,project,options.editor);drawPin(ctx,pin.x,pin.y,n.pinColor||'#ad4034',matte);}}}
    ctx.setTransform(1,0,0,1,0,0);
    if(mode==='composite')ctx.drawImage(atmosphereSurface(project,W,H),0,0);
    ctx.restore();return {camera:m.camera,width:W,height:H};
  }
  function waitEvent(el,event,timeout=8000){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(new Error(`Media ${event} timed out`));},timeout);const ok=()=>{cleanup();resolve();},bad=()=>{cleanup();reject(new Error('Cannot read this media file'));};const cleanup=()=>{clearTimeout(timer);el.removeEventListener(event,ok);el.removeEventListener('error',bad);};el.addEventListener(event,ok,{once:true});el.addEventListener('error',bad,{once:true});});}
  async function ensureMedia(id,m,publicId=id){
    const source=m.dataUrl||m.url||m.path;if(!source)throw new Error('Media has no readable source. Re-import the original file.');
    let cache=mediaCache.get(id);if(cache?.source===source){if(cache.promise)await cache.promise;if(cache.error)throw new Error(cache.error);return cache;}
    if(cache?.el?.tagName==='VIDEO'){cache.el.pause();cache.el.removeAttribute('src');cache.el.load();}
    const video=m.kind==='video'||/^data:video\//.test(source),el=document.createElement(video?'video':'img');
    cache={el,source,ready:false,revision:(cache?.revision||0)+1,error:null,promise:null};mediaCache.set(id,cache);
    if(video){el.muted=true;el.preload='auto';el.playsInline=true;el.loop=false;el.addEventListener('seeked',()=>{try{DB.onMediaReady?.({id:publicId,kind:'video'});}catch{}});}else el.decoding='async';
    cache.promise=(async()=>{try{const loaded=waitEvent(el,video?'loadeddata':'load');el.src=source;await loaded;if(!video&&el.decode)await el.decode();cache.ready=true;mediaErrors.delete(publicId);try{DB.onMediaReady?.({id:publicId,kind:video?'video':'image'});}catch{}}catch(error){cache.error=error.message;throw error;}finally{cache.promise=null;}})();
    await cache.promise;return cache;
  }
  async function prepare(project,time=0,options={}){
    const jobs=[],refs=(project.nodes||[]).filter(n=>n.media&&!n.hidden),used=new Set(refs.map(n=>n.media)),queued=new Set();
    for(const ref of refs){const id=ref.media,m=project.media?.[id],key=mediaKey(project,ref);if(queued.has(key))continue;queued.add(key);jobs.push((async()=>{if(!m)throw new Error('Media is missing from this project. Re-import the original file.');const cache=await ensureMedia(key,m,id);if(!cache?.ready||cache.el.tagName!=='VIDEO')return;const el=cache.el;const offset=+ref.mediaOffset||+m.offset||0;const length=el.duration||1;const local=Math.max(0,time-(+ref.enter||0)+offset);const desired=clamp(m.loop===false?Math.min(length-.04,local):local%length,0,Math.max(0,length-.015));
      if(options.preview){if(!el.seeking&&Math.abs(el.currentTime-desired)>.085){el.currentTime=clamp(desired,0,Math.max(0,length-.015));}return;}
      if(el.seeking)await waitEvent(el,'seeked');
      if(Math.abs(el.currentTime-desired)>.0005){const sought=waitEvent(el,'seeked');el.currentTime=clamp(desired,0,Math.max(0,length-.015));await sought;}
    })().catch(error=>{if(mediaErrors.get(id)!==error.message){mediaErrors.set(id,error.message);try{DB.onMediaError?.({id,error:error.message});}catch{}}return{id,error:error.message};}));}
    if(options.preview){Promise.all(jobs).catch(()=>{});return{ready:true,pending:jobs.length};}
    const results=await Promise.all(jobs),errors=results.filter(Boolean);if(errors.length)throw new Error(errors.map(e=>`${e.id}: ${e.error}`).join('; '));return{ready:true,media:used.size};
  }
  async function prepareSurfaces(project,options={}){
    await prepare(project,+options.time||0);boardTexture(project);let count=0;
    for(const n of project.nodes||[]){if(n.hidden)continue;nodeSurface(project,n,1);count++;if(options.yieldWork!==false&&count%4===0)await new Promise(resolve=>setTimeout(resolve,0));}
    for(const e of project.edges||[])if(e.label)edgeLabelSurface(e.label);
    if(options.width&&options.height)atmosphereSurface(project,options.width,options.height);
    return {nodes:count,ready:true};
  }
  function clearCaches(){boardCache.clear();cardCache.clear();artCache.clear();matteCache.clear();atmosphereCache.clear();edgeLabelCache.clear();videoCardCache.clear();mediaErrors.clear();for(const c of mediaCache.values())if(c.el.tagName==='VIDEO'){c.el.pause();c.el.removeAttribute('src');c.el.load();}mediaCache.clear();}
  DB.renderer={render,cameraAt,projectPoint,unprojectPoint,prepare,prepareSurfaces,clearCaches,mediaCache,mediaErrors};
})();
