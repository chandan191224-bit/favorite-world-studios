/* Timeline Animation Studio Pro. Original deterministic Canvas artwork; no runtime assets. */
(() => {
  'use strict';
  const TL = window.TL = window.TL || {};
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const backgrounds = new Map(), art = new Map(), images = new Map();
  const C = (v, a = 0, b = 1) => Math.min(b, Math.max(a, Number(v) || 0));
  const L = (a, b, p) => a + (b - a) * p;
  const ease = (p, name = 'cinematic') => {
    p = C(p);
    if (name === 'linear') return p;
    if (name === 'ease-in') return p * p * p;
    if (name === 'ease-out') return 1 - (1-p) ** 3;
    if (name === 'smooth') return p*p*(3-2*p);
    return p*p*p*(p*(p*6-15)+10);
  };
  const hash = s => { let n = 2166136261; for (const c of String(s)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };
  const rng = seed => { let n=hash(seed); return () => { n+=0x6D2B79F5; let t=n; t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296; }; };
  const canvas = (w,h) => { const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c; };
  function cache(map,key,value,limit=24) { map.set(key,value);while(map.size>limit)map.delete(map.keys().next().value);return value; }
  function rr(ctx,x,y,w,h,r=5) { r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath(); }
  function stroke(ctx, points, color, width=3, progress=1, dashed=false) {
    if(points.length<2||progress<=0)return;
    const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
    let remaining=lengths.reduce((a,b)=>a+b,0)*C(progress);
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++){const d=lengths[i-1];if(remaining>=d){ctx.lineTo(points[i].x,points[i].y);remaining-=d;}else{const p=d?remaining/d:0;ctx.lineTo(L(points[i-1].x,points[i].x,p),L(points[i-1].y,points[i].y,p));break;}}
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash(dashed?[10,10]:[]);ctx.stroke();ctx.setLineDash([]);
  }
  function fit(ctx,text,size,family,width,weight='normal',min=12) { let n=size;ctx.font=`${weight} ${n}px ${family}`;while(n>min&&ctx.measureText(String(text)).width>width)ctx.font=`${weight} ${--n}px ${family}`;return n; }
  function wrap(ctx,text,x,y,width,lineHeight,max=3,align='left') {
    const words=String(text||'').split(/\s+/),lines=[];let current='';
    for(const word of words){const t=current?current+' '+word:word;if(ctx.measureText(t).width>width&&current){lines.push(current);current=word;}else current=t;}if(current)lines.push(current);
    ctx.textAlign=align;
    for(let i=0;i<Math.min(max,lines.length);i++){let line=lines[i];if(i===max-1&&lines.length>max){while(ctx.measureText(line+'…').width>width&&line.length)line=line.slice(0,-1);line+='…';}ctx.fillText(line,x,y+i*lineHeight,width);}
    return Math.min(max,lines.length)*lineHeight;
  }
  function tracked(ctx,text,x,y,spacing=2,maxWidth=Infinity) {const letters=Array.from(String(text)),natural=letters.reduce((sum,ch)=>sum+ctx.measureText(ch).width,0)+Math.max(0,letters.length-1)*spacing;ctx.save();ctx.translate(x,y);if(natural>maxWidth)ctx.scale(maxWidth/natural,1);ctx.textAlign='left';let cursor=0;for(const ch of letters){ctx.fillText(ch,cursor,0);cursor+=ctx.measureText(ch).width+spacing;}ctx.restore();return x+Math.min(natural,maxWidth);}
  function palette(project,mode) {
    const theme=TL.themes?.[project.theme]||{},s={background:'#eee7d9',foreground:'#222a29',accent:'#ab5934',secondary:'#788477',font:'Georgia',lineWidth:4,nodeSize:12,textScale:1,grid:false,texture:.12,showDates:true,showDescriptions:true,showHeader:true,showFooter:true,cardStyle:'plain',...theme,...project.style};
    const matte=mode==='matte';
    return {...s,background:matte?'#000000':s.background,foreground:matte?'#ffffff':s.foreground,accent:matte?'#ffffff':s.accent,secondary:matte?'#ffffff':s.secondary,matte,mode};
  }
  function bounds(project) {
    const ratio=(+project.width||1920)/(+project.height||1080),portrait=ratio<.9;
    const w=ratio>=1?1920:1080,h=w/ratio;
    return {w,h,portrait,left:w*.085,right:w*.915,top:portrait?h*.235:h*.30,bottom:portrait?h*.84:h*.82,cx:w/2,cy:portrait?h*.55:h*.56};
  }
  function valueProgress(project,e,index,count,includeEnd=false) {
    if(project.spacing!=='proportional')return count>1?index/(count-1):.5;
    const values=project.events.map(x=>+x.value).filter(Number.isFinite),ends=includeEnd?project.events.map(x=>+x.endValue).filter(Number.isFinite):[];
    const min=Math.min(...values,...ends),max=Math.max(...values,...ends);
    return max>min?C((+e.value-min)/(max-min)):(count>1?index/(count-1):.5);
  }
  function timelinePhase(project,time) {
    const events=project.events||[];
    if(!events.length)return{index:0,fraction:0,value:0};
    const ordered=events.map((e,i)=>({e,i})).sort((a,b)=>(+a.e.start||0)-(+b.e.start||0));
    let item=ordered[0],next=ordered[0],fraction=0;
    for(let i=0;i<ordered.length;i++){if(time>=(+ordered[i].e.start||0)){item=ordered[i];next=ordered[Math.min(i+1,ordered.length-1)];}else break;}
    if(item!==next){const a=+item.e.start||0,b=+next.e.start||a+1;fraction=ease((time-a)/(b-a),project.animation?.ease);}
    return{index:item.i,next:next.i,fraction,value:L(+item.e.value||0,+next.e.value||0,fraction)};
  }
  function geometry(project,time=0,editor=false) {
    const b=bounds(project),{w,h,left,right,top,bottom,cx,cy,portrait}=b,events=project.events||[],n=events.length,layout=project.layout||'horizontal';
    const reversed=project.direction==='reverse',displayIndex=i=>reversed?n-1-i:i;
    const gap=n>1?(right-left)/(n-1):0,sy=bottom-top;
    const points=events.map((e,i)=>{
      const j=displayIndex(i),p=valueProgress(project,e,j,n,layout==='gantt'),q=reversed?1-p:p;
      const point={id:e.id,index:i,x:L(left,right,q),y:cy,p:q,label:'below',side:1,scale:1,lane:C(e.lane,0,3)};
      if(layout==='horizontal'){point.y=portrait?L(top,bottom,j/Math.max(1,n-1)):cy; if(portrait){point.x=left+35;point.label='right';}else point.label=i%2?'below':'above';}
      if(layout==='alternating'){if(portrait){point.x=cx;point.y=L(top,bottom,j/Math.max(1,n-1));point.label=i%2?'right':'left';}else{point.y=cy;point.label=i%2?'below':'above';}}
      if(layout==='vertical'){point.x=portrait?w*.28:w*.38;point.y=L(top,bottom,q);point.label='right';}
      if(layout==='zigzag'){point.x=portrait?(j%2?right-w*.14:left+w*.14):(left+gap*j);point.y=portrait?L(top,bottom,j/Math.max(1,n-1)):cy+(j%2?sy*.34:-sy*.34);point.label=portrait?(j%2?'left':'right'):(j%2?'above':'below');}
      if(layout==='serpentine'){
        const cols=portrait?2:Math.min(4,Math.ceil(n/2)),rows=Math.ceil(n/cols),row=Math.floor(j/cols),col=j%cols,flow=row%2?cols-1-col:col;
        point.x=L(left+60,right-60,cols>1?flow/(cols-1):.5);point.y=L(top+40,bottom-35,rows>1?row/(rows-1):.5);point.label=row%2?'above':'below';point.row=row;
      }
      if(layout==='circular'||layout==='spiral'){
        const radius=Math.min((right-left)*.35,sy*.55),angle=-Math.PI/2+j/Math.max(1,n)*TAU;
        const rad=layout==='spiral'?L(radius*.38,radius,j/Math.max(1,n-1)):radius;
        const a=layout==='spiral'?(-Math.PI/2+j/Math.max(1,n-1)*TAU*1.45):angle;
        point.x=cx+Math.cos(a)*rad;point.y=cy+Math.sin(a)*rad;point.angle=a;point.label=Math.cos(a)>=0?'right':'left';point.rad=rad;
      }
      if(layout==='branching'){
        const maxLane=Math.max(1,...events.map(x=>C(x.lane,0,3))),lane=j===0?0:(C(e.lane,0,3)/maxLane-.5)*2;
        const dates=[...new Set(events.map(x=>+x.value||0))].sort((a,b)=>a-b),rank=dates.indexOf(+e.value||0),depth=dates.length>1?rank/Math.max(1,dates.length-1):j/Math.max(1,n-1);
        point.x=portrait?cx+lane*w*.25:L(left+40,right-40,reversed?1-depth:depth);point.y=portrait?L(top,bottom,depth):cy+lane*sy*.28;point.label=portrait?'below':(lane<0?'above':'below');
        point.parent=-1;for(let k=i-1;k>=0;k--)if(C(events[k].lane,0,3)===C(e.lane,0,3)){point.parent=k;break;}if(i>0&&point.parent<0)point.parent=0;
      }
      if(layout==='parallel'||layout==='metro'){
        const maxLane=Math.max(1,...events.map(x=>C(x.lane,0,3))),lane=C(e.lane,0,3);
        point.x=portrait?L(left+70,right-70,lane/maxLane):L(left+110,right,q);point.y=portrait?L(top,bottom,q):L(top+40,bottom-150,lane/maxLane);point.label=portrait?(lane>maxLane/2?'left':'right'):'below';
        if(layout==='metro'){point.x+=portrait?Math.sin(q*Math.PI*2)*35:0;point.y+=portrait?0:Math.sin(q*Math.PI*2)*35;}
      }
      if(layout==='gantt'){point.x=L(left+w*.19,right,q);point.y=L(top+40,bottom-15,j/Math.max(1,n-1));point.label='gantt';}
      if(layout==='ticker'){point.y=portrait?h*.64:h*.64;const phase=timelinePhase(project,time),focus=editor?(left+right)/2:L((events[phase.index]&&L(left,right,valueProgress(project,events[phase.index],displayIndex(phase.index),n)))||left,(events[phase.next]&&L(left,right,valueProgress(project,events[phase.next],displayIndex(phase.next),n)))||left,phase.fraction);point.x=L(left,right,q)+(editor?0:cx-focus);point.label='below';}
      if(layout==='countdown'){point.x=portrait?cx:L(left,right,j/Math.max(1,n-1));point.y=portrait?L(h*.57,h*.84,j/Math.max(1,n-1)):h*.78;point.label=portrait?'right':'below';}
      if(layout==='perspective'){
        const z=j/Math.max(1,n-1);point.x=L(w*.17,w*.84,z);point.y=L(h*.80,top+.03*h,z);point.scale=L(1.12,.56,z);point.label=j%2?'right':'left';
      }
      if(layout==='photo'||layout==='archive'){point.y=portrait?L(top,bottom,j/Math.max(1,n-1)):h*.67;if(portrait){point.x=w*.47;point.label=i%2?'right':'left';}else point.label='photo';}
      if(layout==='staircase'){point.x=L(left+40,right-40,j/Math.max(1,n-1));point.y=L(bottom,top,j/Math.max(1,n-1));point.label=portrait?'right':'above';}
      if(layout==='chapters'){const cols=portrait?1:Math.min(4,n),rows=Math.ceil(n/cols);point.x=L(left+120,right-120,cols>1?(j%cols)/(cols-1):.5);point.y=L(top+80,bottom-50,rows>1?Math.floor(j/cols)/(rows-1):.5);point.label='chapter';}
      point.x+=(+e.offsetX||0)*w/1920;point.y+=(+e.offsetY||0)*h/1080;
      return point;
    });
    return {...b,points,layout,gap};
  }
  function camera(project,time,g,editor) {
    const c=project.camera||{},duration=Math.max(1,+project.duration||18),p=ease(time/duration),strength=C(c.strength??.4),zoom=C(c.zoom??1,.5,3);
    let x=g.w/2,y=g.h/2,z=zoom;
    if(!editor){
      if(c.mode==='push')z*=L(1,1+strength*.36,p);
      if(c.mode==='pull')z*=L(1+strength*.36,1,p);
      if(c.mode==='drift'){x+=(p-.5)*g.w*.12*strength;y+=Math.sin(p*Math.PI)*g.h*.025*strength;}
      if(c.mode==='follow'&&g.points.length){const ph=timelinePhase(project,time),a=g.points[ph.index],b=g.points[ph.next]||a;const follow=.30+strength*.53;x=L(g.w/2,L(a.x,b.x,ph.fraction),follow);y=L(g.h/2,L(a.y,b.y,ph.fraction),follow);z*=1+strength*.60;}
      x+=(+c.panX||0)*g.w/1920;y+=(+c.panY||0)*g.h/1080;
    }else z=1;
    const angle=editor?0:(+c.rotation||0)*RAD,co=Math.cos(angle),si=Math.sin(angle);
    return{x,y,z,angle,co,si};
  }
  function transformPoint(point,c,g,width,height) {const dx=(point.x-c.x)*c.z,dy=(point.y-c.y)*c.z;return{x:(g.w/2+dx*c.co-dy*c.si)*width/g.w,y:(g.h/2+dx*c.si+dy*c.co)*height/g.h};}
  function positions(project,time,width,height,options={}) {const g=geometry(project,time,!!options.editor),c=camera(project,time,g,!!options.editor);return g.points.map(pt=>({...transformPoint(pt,c,g,width,height),id:pt.id,r:Math.max(12,(+project.style?.nodeSize||12)*width/g.w*2),scale:pt.scale*c.z}));}
  function baseTexture(g,s,seed) {
    const key=JSON.stringify([Math.round(g.w),Math.round(g.h),s.background,s.foreground,s.grid,s.texture,seed]);
    if(backgrounds.has(key))return backgrounds.get(key);
    const c=canvas(Math.min(1920,g.w),Math.min(1920,g.h)),ctx=c.getContext('2d'),sx=c.width/g.w,sy=c.height/g.h,random=rng(seed);
    ctx.scale(sx,sy);ctx.fillStyle=s.background;ctx.fillRect(0,0,g.w,g.h);
    const light=ctx.createRadialGradient(g.w*.44,g.h*.37,0,g.w*.5,g.h*.5,Math.max(g.w,g.h)*.8);light.addColorStop(0,'rgba(255,255,255,0.045)');light.addColorStop(1,'rgba(0,0,0,0.10)');ctx.fillStyle=light;ctx.fillRect(0,0,g.w,g.h);
    if(s.grid){ctx.save();ctx.strokeStyle=s.foreground;ctx.globalAlpha=.07;ctx.lineWidth=1;const cell=g.portrait?55:64;ctx.beginPath();for(let x=0;x<g.w;x+=cell){ctx.moveTo(x,0);ctx.lineTo(x,g.h);}for(let y=0;y<g.h;y+=cell){ctx.moveTo(0,y);ctx.lineTo(g.w,y);}ctx.stroke();ctx.restore();}
    const amount=C(s.texture);if(amount){ctx.save();ctx.fillStyle=s.foreground;ctx.globalAlpha=amount*.28;for(let i=0;i<12500;i++){const x=random()*g.w,y=random()*g.h;ctx.fillRect(x,y,random()*1.5+.4,random()*1.3+.3);}ctx.globalAlpha=amount*.12;ctx.strokeStyle=s.foreground;ctx.lineWidth=.5;for(let i=0;i<80;i++){const x=random()*g.w;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+random()*5,g.h);ctx.stroke();}ctx.restore();}
    return cache(backgrounds,key,c,6);
  }
  function illustration(event,project,w=400,h=260) {
    const key=[event.id,event.title,project.seed,project.style?.accent].join('|');if(art.has(key))return art.get(key);
    const c=canvas(w,h),ctx=c.getContext('2d'),random=rng(key),title=String(event.title||'').toLowerCase(),space=/space|orbit|moon|earth|sputnik|gagarin|apollo|station|webb|rocket|satellite|cosmos|planet|beyond/.test(title+' '+project.title);
    ctx.fillStyle=space?'#18252c':'#47514b';ctx.fillRect(0,0,w,h);
    const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,space?'#0c1c2b':'#b2b39c');grad.addColorStop(1,space?'#536065':'#4c5f58');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
    if(space){
      ctx.fillStyle='#eae5d7';for(let i=0;i<80;i++){ctx.globalAlpha=.25+random()*.65;const r=random()*1.2+.4;ctx.beginPath();ctx.arc(random()*w,random()*h,r,0,TAU);ctx.fill();}ctx.globalAlpha=1;
      const moon=/moon|apollo/.test(title),webb=/webb|telescope/.test(title),earth=/earth|orbit|gagarin/.test(title),station=/station/.test(title);
      if(moon){ctx.fillStyle='#c0bfae';ctx.beginPath();ctx.arc(w*.68,h*.47,h*.32,0,TAU);ctx.fill();ctx.fillStyle='#959b91';for(let i=0;i<14;i++){ctx.beginPath();ctx.arc(w*.68+(random()-.5)*h*.4,h*.47+(random()-.5)*h*.4,random()*12+3,0,TAU);ctx.fill();}ctx.fillStyle='#e5e0d3';ctx.fillRect(w*.2,h*.56,24,41);ctx.fillRect(w*.18,h*.72,13,30);ctx.fillRect(w*.25,h*.72,13,30);ctx.beginPath();ctx.arc(w*.23,h*.51,16,0,TAU);ctx.fill();ctx.fillStyle='#243e4a';ctx.fillRect(w*.205,h*.47,19,12);}
      else if(webb){ctx.save();ctx.translate(w*.51,h*.45);ctx.rotate(-.4);ctx.fillStyle='#c1a45d';for(let row=-1;row<=1;row++)for(let col=-1;col<=1;col++){const x=col*32+row%2*16,y=row*29;ctx.beginPath();for(let k=0;k<6;k++){const a=k*TAU/6;const px=x+18*Math.cos(a),py=y+18*Math.sin(a);k?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();}ctx.fillStyle='#d8d4c5';ctx.beginPath();ctx.moveTo(-90,72);ctx.lineTo(110,72);ctx.lineTo(58,105);ctx.lineTo(-120,92);ctx.closePath();ctx.fill();ctx.restore();}
      else if(station){ctx.save();ctx.translate(w*.51,h*.44);ctx.rotate(-.2);ctx.fillStyle='#cac9bc';ctx.fillRect(-65,-8,130,20);ctx.fillRect(-12,-45,22,85);ctx.fillStyle='#537d95';for(const x of [-122,55])for(const y of [-62,22])ctx.fillRect(x,y,65,34);ctx.strokeStyle='#c1c4b4';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-130,0);ctx.lineTo(130,0);ctx.stroke();ctx.restore();}
      else if(earth){ctx.fillStyle='#658998';ctx.beginPath();ctx.arc(w*.5,h*.6,h*.50,0,TAU);ctx.fill();ctx.save();ctx.beginPath();ctx.arc(w*.5,h*.6,h*.50,0,TAU);ctx.clip();ctx.fillStyle='#9baf99';for(let i=0;i<8;i++){ctx.beginPath();const x=random()*w,y=random()*h;ctx.moveTo(x,y);for(let j=0;j<8;j++)ctx.lineTo(x+(random()-.5)*90,y+(random()-.5)*90);ctx.closePath();ctx.fill();}ctx.strokeStyle='#e9e7d5';ctx.globalAlpha=.35;ctx.lineWidth=10;for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(w*.5,h*(.3+i*.17),w*.30,12,-.2,0,TAU);ctx.stroke();}ctx.restore();}
      else{ctx.save();ctx.translate(w*.53,h*.48);ctx.rotate(-.4);ctx.strokeStyle='#c9cbbe';ctx.lineWidth=3;for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*80,Math.sin(a)*80);ctx.stroke();}const gl=ctx.createRadialGradient(-10,-10,0,0,0,37);gl.addColorStop(0,'#e7e5d8');gl.addColorStop(1,'#636f70');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(0,0,35,0,TAU);ctx.fill();ctx.restore();}
      ctx.fillStyle='#183443';ctx.globalAlpha=.65;ctx.beginPath();ctx.ellipse(w*.4,h*1.12,w*.8,h*.34,-.1,0,TAU);ctx.fill();ctx.globalAlpha=1;
    }else{
      ctx.fillStyle='#697c6b';ctx.beginPath();ctx.moveTo(0,h*.65);for(let i=0;i<=12;i++)ctx.lineTo(i*w/12,h*(.42+random()*.28));ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
      ctx.fillStyle='#c1c1ad';ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(w*.72,h*.25,h*.13,0,TAU);ctx.fill();ctx.globalAlpha=1;
      ctx.fillStyle='#293f3a';for(let i=0;i<7;i++){const x=w*(.08+i*.13),hh=h*(.18+random()*.25);ctx.fillRect(x,h*.76-hh,w*.075,hh);ctx.fillStyle='#a4ae96';for(let j=0;j<4;j++)ctx.fillRect(x+5,h*.77-hh+j*12,8,3);ctx.fillStyle='#293f3a';}
      ctx.strokeStyle='#b9b6a0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,h*.85);ctx.lineTo(w,h*.82);ctx.stroke();
    }
    ctx.fillStyle='#efe8d2';ctx.globalAlpha=.035;for(let i=0;i<2000;i++)ctx.fillRect(random()*w,random()*h,1,1);ctx.globalAlpha=1;
    return cache(art,key,c,64);
  }
  function drawPhoto(ctx,project,event,x,y,w,h,s,rotation=0) {
    ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(rotation);ctx.translate(-w/2,-h/2);
    if(s.matte){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.restore();return;}
    const image=event.media&&images.get(event.media)?.image||illustration(event,project),iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
    ctx.fillStyle=s.foreground;ctx.globalAlpha*=.08;ctx.fillRect(5,8,w,h);ctx.globalAlpha/= .08;
    ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();const scale=Math.max(w/iw,h/ih);ctx.drawImage(image,(w-iw*scale)/2,(h-ih*scale)/2,iw*scale,ih*scale);ctx.restore();ctx.strokeStyle=s.foreground;ctx.globalAlpha*=.15;ctx.lineWidth=1;ctx.strokeRect(0,0,w,h);ctx.restore();
  }
  function eventProgress(project,event,time,editor) {
    if(editor)return 1;
    const start=+event.start||0,duration=Math.max(.05,+event.duration||1),raw=C((time-start)/duration);
    if(project.animation?.reveal==='none')return time>=start?1:0;
    return ease(raw,project.animation?.ease);
  }
  function node(ctx,x,y,r,event,s,progress=1,index=0) {
    const color=s.matte?'#fff':event.color||s.accent;
    ctx.save();ctx.translate(x,y);ctx.fillStyle=s.background;ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,+s.lineWidth||4);
    const shape=event.icon||'circle';
    if(shape==='diamond'){ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r,0);ctx.lineTo(0,r);ctx.lineTo(-r,0);ctx.closePath();ctx.fill();ctx.stroke();}
    else if(shape==='square'){ctx.fillRect(-r,-r,r*2,r*2);ctx.strokeRect(-r,-r,r*2,r*2);}
    else if(shape==='star'){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.5:r;i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();ctx.stroke();}
    else if(shape==='flag'){ctx.beginPath();ctx.moveTo(-r*.5,r);ctx.lineTo(-r*.5,-r);ctx.lineTo(r,-r*.65);ctx.lineTo(-r*.5,0);ctx.stroke();}
    else{ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,Math.max(2,r*.29),0,TAU);ctx.fill();}
    ctx.restore();
  }
  function revealPath(project,event,time,editor) {return editor?1:ease((time-(+event.start||0)+Math.max(.1,+project.animation?.drawDuration||1.2))/Math.max(.1,+project.animation?.drawDuration||1.2),project.animation?.ease);}
  function connectors(ctx,project,time,g,s,editor) {
    const pts=g.points,n=pts.length;if(!n)return;
    const width=Math.max(1,+s.lineWidth||4),base=s.foreground,accent=s.accent;
    const line=(list,e,dashed=false,color=accent)=>{if(!s.matte){ctx.save();ctx.globalAlpha=.19;stroke(ctx,list,base,width,1,dashed);ctx.restore();}stroke(ctx,list,color,width,revealPath(project,e,time,editor),dashed);};
    if(g.layout==='countdown'||g.layout==='chapters')return;
    if(g.layout==='gantt'){
      const min=Math.min(...project.events.map(e=>+e.value||0)),max=Math.max(...project.events.map(e=>Math.max(+e.value||0,+e.endValue||+e.value||0))),range=max-min||1,plotLeft=g.left+g.w*.19;
      for(let k=0;k<6;k++){const x=L(plotLeft,g.right,k/5);ctx.save();ctx.globalAlpha=s.matte?1:.12;stroke(ctx,[{x,y:g.top-20},{x,y:g.bottom+30}],base,1);ctx.restore();ctx.fillStyle=s.secondary;ctx.font=`18px ui-monospace, monospace`;ctx.textAlign='center';ctx.fillText(Math.round(L(min,max,k/5)),x,g.top-40);}
      for(const pt of pts){const e=project.events[pt.index],end=project.spacing==='proportional'?L(plotLeft,g.right,C(((+e.endValue||+e.value||0)-min)/range)):Math.min(g.right,pt.x+(g.right-plotLeft)*Math.max(.08,C(((+e.endValue||+e.value||0)-(+e.value||0))/range))),p=eventProgress(project,e,time,editor),barH=Math.min(40,(g.bottom-g.top)/Math.max(2,n)*.45);ctx.save();ctx.globalAlpha=p;ctx.fillStyle=s.matte?'#fff':e.color||s.accent;rr(ctx,pt.x,pt.y-barH/2,Math.max(12,(end-pt.x)*p),barH,3);ctx.fill();ctx.restore();}
      return;
    }
    if(g.layout==='circular'||g.layout==='spiral'){
      if(g.layout==='circular'){
        const r=pts[0].rad;ctx.save();ctx.strokeStyle=base;ctx.globalAlpha=s.matte?0:.16;ctx.lineWidth=width;ctx.beginPath();ctx.arc(g.cx,g.cy,r,0,TAU);ctx.stroke();ctx.restore();
      }
      for(let i=1;i<n;i++){const a=pts[i-1],b=pts[i],list=[];const count=30;for(let k=0;k<=count;k++){const p=k/count,ang=L(a.angle,b.angle,p),r=L(a.rad,b.rad,p);list.push({x:g.cx+Math.cos(ang)*r,y:g.cy+Math.sin(ang)*r});}line(list,project.events[i]);}
      return;
    }
    if(g.layout==='parallel'||g.layout==='metro'){
      const lanes=new Map();pts.forEach(pt=>{if(!lanes.has(pt.lane))lanes.set(pt.lane,[]);lanes.get(pt.lane).push(pt);});
      for(const [lane,list]of lanes){list.sort((a,b)=>a.p-b.p);const laneColor=s.matte?'#fff':[s.accent,s.secondary,s.foreground,s.accent][lane];if(list.length===1){const pt=list[0];line(g.portrait?[{x:pt.x,y:g.top-35},{x:pt.x,y:g.bottom+35}]:[{x:g.left+65,y:pt.y},{x:g.right+15,y:pt.y}],project.events[pt.index],false,laneColor);}else for(let i=1;i<list.length;i++){const a=list[i-1],b=list[i];const path=g.layout==='metro'?(g.portrait?[a,{x:a.x,y:L(a.y,b.y,.4)},{x:b.x,y:L(a.y,b.y,.6)},b]:[a,{x:L(a.x,b.x,.4),y:a.y},{x:L(a.x,b.x,.6),y:b.y},b]):[a,b];line(path,project.events[b.index],false,laneColor);}}
      return;
    }
    for(let i=1;i<n;i++){
      const pt=pts[i],prev=g.layout==='branching'?pts[pt.parent]:pts[i-1];if(!prev)continue;
      let path=[prev,pt];
      if(g.layout==='staircase')path=[prev,{x:pt.x,y:prev.y},pt];
      if(g.layout==='branching')path=g.portrait?[prev,{x:prev.x,y:L(prev.y,pt.y,.45)},{x:pt.x,y:L(prev.y,pt.y,.45)},pt]:[prev,{x:L(prev.x,pt.x,.45),y:prev.y},{x:L(prev.x,pt.x,.45),y:pt.y},pt];
      if(g.layout==='serpentine'&&pt.row!==prev.row){const side=prev.x>g.cx?1:-1,pathX=prev.x+side*(g.portrait?50:90);path=[prev,{x:pathX,y:prev.y},{x:pathX,y:pt.y},pt];}
      line(path,project.events[i],g.layout==='archive');
    }
    if(['horizontal','alternating','photo','archive','ticker','perspective'].includes(g.layout)&&!g.portrait){
      const ordered=pts.slice().sort((a,b)=>a.x-b.x);for(let i=1;i<ordered.length;i++){const a=ordered[i-1],b=ordered[i];for(let k=1;k<10;k++){const p=k/10,x=L(a.x,b.x,p),y=L(a.y,b.y,p);ctx.save();ctx.globalAlpha=s.matte?1:.25;stroke(ctx,[{x,y:y-4},{x,y:y+(k===5?13:7)}],base,k===5?2:1);ctx.restore();}}
    }
  }
  function labelMetrics(g,n,s) {
    const dense=Math.max(1,n/6),font=C(s.textScale??1,.55,2),portrait=g.portrait;
    return {title:34*font/Math.max(1,dense*.70),date:36*font/Math.max(1,dense*.65),body:22*font/Math.max(1,dense*.60),width:portrait?Math.min(350,g.w*.36):Math.min(300,(g.right-g.left)/Math.max(4,n)*.94),line:portrait?37:37};
  }
  function label(ctx,project,event,pt,g,s,progress,time) {
    const n=g.points.length,m=labelMetrics(g,n,s),color=s.matte?'#fff':event.color||s.accent,font=s.font||'Georgia',layout=g.layout;
    let width=m.width,align='center',x=pt.x,y=pt.y+55,maxTitle=2,maxBody=2;
    if(pt.label==='above')y=pt.y-(s.showDescriptions!==false?222:157)*C(s.textScale??1,.55,2);
    if(pt.label==='right'){x=pt.x+38;y=pt.y-37;align='left';width=Math.min(g.right-x,g.portrait?380:420);}
    if(pt.label==='left'){x=pt.x-38;y=pt.y-37;align='right';width=Math.min(x-g.left,g.portrait?380:420);}
    if(layout==='circular'||layout==='spiral'){
      const side=Math.cos(pt.angle)>=0?1:-1;
      x=pt.x+side*34;y=pt.y-21;align=side>0?'left':'right';width=Math.max(100,Math.min(g.w*.23,side>0?g.right-x:x-g.left));
      m.date=Math.min(m.date,26);m.title=Math.min(m.title,23);m.body=Math.min(m.body,17);maxTitle=2;maxBody=1;
    }
    if(layout==='perspective'){width=260;const side=pt.label==='left'?-1:1;x=pt.x+side*34;y=pt.y-40;align=side>0?'left':'right';}
    if(layout==='gantt'){
      x=g.left;y=pt.y-8;align='left';width=g.w*.17;ctx.fillStyle=s.foreground;ctx.font=`600 ${Math.min(m.title,24)}px ${font}`;wrap(ctx,event.title,x,y,width,25,2,align);
      if(s.showDates){ctx.fillStyle=color;ctx.font=`16px ui-monospace, monospace`;ctx.fillText(event.date||'',pt.x,pt.y+35,Math.max(90,g.right-pt.x));}return;
    }
    if(layout==='photo'||layout==='archive'){
      const imageW=Math.min(g.portrait?280:260,g.portrait?g.w*.29:(g.right-g.left)/Math.max(5,n)*.83),imageH=imageW*.66;
      if(g.portrait){const side=pt.label==='left'?-1:1;const px=side<0?pt.x-imageW-35:pt.x+35,py=pt.y-imageH/2;drawPhoto(ctx,project,event,px,py,imageW,imageH,s,layout==='archive'?(pt.index%2?-.035:.04):0);x=side<0?pt.x+35:pt.x-35;y=pt.y-46;align=side<0?'left':'right';width=Math.min(330,side<0?g.right-x:x-g.left);}
      else{
        const photoY=pt.y-imageH-75;
        if(layout==='archive'&&!s.matte){ctx.save();ctx.fillStyle='#ede7d7';ctx.translate(pt.x,photoY+imageH/2);ctx.rotate(pt.index%2?-.035:.035);ctx.fillRect(-imageW/2-9,-imageH/2-9,imageW+18,imageH+45);ctx.restore();}
        drawPhoto(ctx,project,event,pt.x-imageW/2,photoY,imageW,imageH,s,layout==='archive'?(pt.index%2?-.035:.035):0);
        ctx.save();ctx.globalAlpha*=.42;stroke(ctx,[{x:pt.x,y:pt.y-15},{x:pt.x,y:photoY+imageH+14}],s.foreground,1);ctx.restore();x=pt.x;y=pt.y+53;align='center';width=Math.min(260,(g.right-g.left)/Math.max(4,n)*.9);
      }
    }
    if(layout==='chapters'){
      const cardW=g.portrait?g.w*.76:Math.min(365,(g.right-g.left)/Math.min(4,n)*.85),cardH=g.portrait?Math.min(225,(g.bottom-g.top)/Math.max(1,n)*.85):250;
      ctx.save();if(!s.matte){ctx.fillStyle=s.foreground;ctx.globalAlpha*=.035;rr(ctx,pt.x-cardW/2,pt.y-cardH/2,cardW,cardH,3);ctx.fill();ctx.globalAlpha/=.035;ctx.strokeStyle=s.foreground;ctx.globalAlpha*=.2;ctx.stroke();ctx.globalAlpha/=.2;}else{ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(pt.x-cardW/2,pt.y-cardH/2,cardW,cardH);}ctx.restore();
      x=pt.x-cardW/2+22;y=pt.y-cardH/2+40;width=cardW-44;align='left';ctx.fillStyle=color;ctx.font=`16px ui-monospace, monospace`;ctx.fillText(`CHAPTER ${String(pt.index+1).padStart(2,'0')}`,x,y);y+=43;
    }
    width=Math.max(70,width);
    // The first and last captions must stay inside the same safe area as the title.
    // Ticker captions intentionally travel beyond the edge and are clipped by the stage.
    if(layout!=='ticker'){
      if(align==='center')x=C(x,g.left+width/2,g.right-width/2);
      else if(align==='left')x=C(x,g.left,g.right-width);
      else x=C(x,g.left+width,g.right);
    }
    // A high staircase/zigzag stop cannot put an above-caption into the fixed header.
    const contentTop=s.showHeader===false?24:(g.portrait?g.h*.085+71+68:g.h*.105+78+68);
    if(pt.label==='above'&&y<contentTop){y=pt.y+55;}
    if(layout==='ticker'){maxTitle=2;maxBody=1;}
    const card=s.cardStyle!=='plain'&&!['photo','archive','chapters','gantt'].includes(layout);
    if(card){const ch=34+(s.showDates!==false?m.date*1.14+7:0)+m.title*1.18*maxTitle+(s.showDescriptions!==false?m.body*1.35*maxBody+12:0);ctx.save();if(s.matte){ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(align==='left'?x-14:align==='right'?x-width-14:x-width/2-14,y-34,width+28,ch);}else{ctx.fillStyle=s.background;ctx.globalAlpha*=.92;rr(ctx,align==='left'?x-14:align==='right'?x-width-14:x-width/2-14,y-34,width+28,ch,s.cardStyle==='paper'?0:5);ctx.fill();ctx.globalAlpha/= .92;ctx.strokeStyle=s.foreground;ctx.globalAlpha*=.15;ctx.lineWidth=1;ctx.stroke();}ctx.restore();}
    const showDate=s.showDates!==false;
    ctx.textAlign=align;
    if(showDate){ctx.fillStyle=color;const size=fit(ctx,event.date||'',m.date,'ui-monospace, "Courier New", monospace',width,'600',12);ctx.fillText(event.date||'',x,y,width);y+=size*1.14+7;}
    let title=event.title||'';
    if(project.animation?.reveal==='typewriter'&&progress<1){const length=Math.max(0,Math.floor(String(title).length*progress));title=String(title).slice(0,length);}
    ctx.fillStyle=s.foreground;ctx.font=`600 ${Math.max(12,m.title)}px ${font}`;y+=wrap(ctx,title,x,y,width,Math.max(18,m.title*1.18),maxTitle,align);
    if(s.showDescriptions!==false&&event.description){ctx.save();ctx.globalAlpha*=s.matte?1:.7;ctx.fillStyle=s.foreground;ctx.font=`${Math.max(12,m.body)}px system-ui, -apple-system, "Segoe UI", sans-serif`;wrap(ctx,event.description,x,y+6,width,Math.max(17,m.body*1.35),maxBody,align);ctx.restore();}
  }
  function counter(ctx,project,time,g,s,editor) {
    const es=project.events||[];if(!es.length)return;
    const ph=timelinePhase(project,time),item=es[ph.index]||es[0],duration=Math.max(1,+project.duration||18),p=C(time/duration);
    const isCounter=g.layout==='countdown',first=+es[0].value||0,last=+es[es.length-1].value||0,isCountdown=isCounter&&last<first;
    const number=isCounter?(isCountdown?Math.ceil(L(first,last,ease(p,project.animation?.ease))):Math.round(L(first,last,ease(p,project.animation?.ease)))):Math.round(ph.value);
    const clockLabels=es.every(e=>/^\d{1,2}:\d{2}$/.test(String(e.date||'')));
    const display=clockLabels?`${String(Math.floor(Math.max(0,number)/60)).padStart(2,'0')}:${String(Math.max(0,number)%60).padStart(2,'0')}`:String(number);
    const y=g.portrait?g.h*.40:g.h*.43;
    ctx.fillStyle=s.accent;ctx.textAlign='center';fit(ctx,display,g.portrait?185:190,'ui-monospace, "Courier New", monospace',g.w*.72,'600',35);ctx.fillText(display,g.cx,y);
    ctx.fillStyle=s.foreground;ctx.font=`${g.portrait?28:25}px ${s.font}`;ctx.fillText(isCountdown?'THE NEXT MILESTONE':String(item.title||'').toUpperCase(),g.cx,y+55,g.w*.78);
    if(isCountdown){ctx.save();ctx.strokeStyle=s.accent;ctx.globalAlpha=s.matte?1:.18;ctx.lineWidth=6;ctx.beginPath();ctx.arc(g.cx,y-65,g.portrait?190:170,-Math.PI/2,TAU-Math.PI/2);ctx.stroke();ctx.globalAlpha=s.matte?1:.9;ctx.beginPath();ctx.arc(g.cx,y-65,g.portrait?190:170,-Math.PI/2,-Math.PI/2+TAU*p);ctx.stroke();ctx.restore();}
  }
  function furniture(ctx,project,time,g,s,editor) {
    const {w,h,left,right}=g;
    if(s.showHeader!==false){
      const y=g.portrait?h*.085:h*.105;ctx.fillStyle=s.accent;ctx.font=`600 ${g.portrait?18:17}px ui-monospace, "Courier New", monospace`;tracked(ctx,String(project.subtitle||'A CHRONOLOGY IN MOTION').toUpperCase().slice(0,110),left,y,g.portrait?1.1:1.7,right-left);
      const titleY=y+(g.portrait?71:78),title=project.title||project.name||'A moment in time',titleSize=fit(ctx,title,g.portrait?65:70,s.font||'Georgia',right-left,'normal',32);ctx.fillStyle=s.foreground;ctx.textAlign='left';ctx.fillText(title,left,titleY,right-left);
      ctx.save();ctx.globalAlpha=s.matte?1:.27;stroke(ctx,[{x:left,y:titleY+36},{x:right,y:titleY+36}],s.foreground,1);ctx.restore();ctx.fillStyle=s.accent;ctx.fillRect(left,titleY+34,(right-left)*.11,4);
    }
    if(s.showFooter!==false){
      const y=h*.925,n=(project.events||[]).length,completed=(project.events||[]).filter(e=>editor||time>=(+e.start||0)+(+e.duration||1)).length;
      ctx.fillStyle=s.secondary;ctx.textAlign='left';ctx.font=`${g.portrait?15:15}px ui-monospace, "Courier New", monospace`;ctx.fillText(`${String(completed).padStart(2,'0')} / ${String(n).padStart(2,'0')} MILESTONES`,left,y);
      ctx.textAlign='right';ctx.fillText(String(project.footer||'TIMELINE / '+String(project.layout||'horizontal').replace(/-/g,' ').toUpperCase()),right,y);
      ctx.save();ctx.globalAlpha=s.matte?1:.18;stroke(ctx,[{x:left,y:y-24},{x:right,y:y-24}],s.foreground,1);ctx.restore();stroke(ctx,[{x:left,y:y-24},{x:right,y:y-24}],s.accent,2,editor?1:C(time/Math.max(1,+project.duration||18)));
    }
  }
  function render(ctx,project,time=0,options={}) {
    const width=+options.width||ctx.canvas.width,height=+options.height||ctx.canvas.height,mode=options.mode||'composite',editor=!!options.editor,s=palette(project,mode),g=geometry(project,time,editor),c=camera(project,time,g,editor);
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.clearRect(0,0,width,height);
    if(mode==='green'||mode==='blue'||mode==='matte'){ctx.fillStyle=mode==='green'?'#00FF00':mode==='blue'?'#0000FF':'#000000';ctx.fillRect(0,0,width,height);}
    else if(mode==='composite')ctx.drawImage(baseTexture(g,s,project.seed??42),0,0,width,height);
    ctx.scale(width/g.w,height/g.h);ctx.textBaseline='alphabetic';
    // Header/footer stay in the title-safe composition while the story camera moves.
    furniture(ctx,project,time,g,s,editor);
    ctx.save();
    const contentTop=s.showHeader===false?0:(g.portrait?g.h*.085+71+49:g.h*.105+78+49),contentBottom=s.showFooter===false?g.h:g.h*.925-30;
    ctx.beginPath();ctx.rect(18,contentTop,g.w-36,Math.max(1,contentBottom-contentTop));ctx.clip();
    ctx.translate(g.w/2,g.h/2);ctx.rotate(c.angle);ctx.scale(c.z,c.z);ctx.translate(-c.x,-c.y);
    connectors(ctx,project,time,g,s,editor);
    if(g.layout==='ticker'||g.layout==='countdown')counter(ctx,project,time,g,s,editor);
    if(g.layout==='circular'){
      ctx.save();ctx.fillStyle=s.secondary;ctx.textAlign='center';ctx.font=`${g.portrait?20:18}px ui-monospace, monospace`;ctx.fillText('THE PASSAGE',g.cx,g.cy-10);ctx.fillText('OF TIME',g.cx,g.cy+20);ctx.restore();
    }
    if(g.layout==='parallel'||g.layout==='metro'){
      const lanes=[...new Set(g.points.map(pt=>pt.lane))];for(const lane of lanes){const pt=g.points.find(p=>p.lane===lane);ctx.save();ctx.fillStyle=s.secondary;ctx.font=`15px ui-monospace, monospace`;ctx.textAlign=g.portrait?'center':'left';ctx.fillText(`TRACK ${lane+1}`,g.portrait?pt.x:g.left,g.portrait?g.top-35:pt.y-30);ctx.restore();}
    }
    for(const pt of g.points){
      const event=project.events[pt.index],p=eventProgress(project,event,time,editor);if(p<=0)continue;
      ctx.save();ctx.globalAlpha=p;
      const reveal=project.animation?.reveal||'draw',sy=pt.scale||1,slide=reveal==='slide'?(1-p)*22:0,pop=['pop','scale'].includes(reveal)?(.58+.42*p+Math.sin(p*Math.PI)*.11):1;
      ctx.translate(pt.x,pt.y);ctx.scale(sy*pop,sy*pop);ctx.translate(-pt.x,-pt.y+slide);
      if(g.layout!=='gantt'&&g.layout!=='chapters')node(ctx,pt.x,pt.y,(+s.nodeSize||12)*(g.layout==='metro'?1.3:1),event,s,p,pt.index);
      label(ctx,project,event,pt,g,s,p,time);
      if(editor&&options.selected===event.id){ctx.save();ctx.strokeStyle='#f0b343';ctx.lineWidth=2;ctx.setLineDash([8,5]);ctx.beginPath();ctx.arc(pt.x,pt.y,(+s.nodeSize||12)+16,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#f0b343';ctx.font='14px system-ui, sans-serif';ctx.textAlign='center';ctx.fillText('DRAG TO MOVE',pt.x,pt.y-36);ctx.restore();}
      ctx.restore();
    }
    ctx.restore();ctx.restore();
  }
  async function prepare(project,time=0) {
    const promises=[];
    for(const event of project.events||[]){if(!event.media)continue;const entry=project.media?.[event.media],src=entry?.dataUrl||entry?.url;if(!src)continue;const old=images.get(event.media);if(old?.src===src){if(old.promise)promises.push(old.promise);continue;}
      const image=new Image(),record={src,image:null,promise:null,error:null};record.promise=new Promise(resolve=>{image.onload=()=>{record.image=image;record.promise=null;resolve();};image.onerror=()=>{record.error='Unable to decode image';record.promise=null;resolve();};});images.set(event.media,record);image.src=src;promises.push(record.promise);
    }
    await Promise.all(promises);
  }
  function clearCaches() {backgrounds.clear();art.clear();images.clear();}
  TL.renderer={render,prepare,clearCaches,positions,geometry,cameraAt:(project,time,editor=false)=>{const g=geometry(project,time,editor);return camera(project,time,g,editor);},cacheStats:()=>({backgrounds:backgrounds.size,illustrations:art.size,images:images.size})};
})();
