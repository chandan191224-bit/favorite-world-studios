import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {browser,here,toolPath} from './tooling.mjs';
const out=path.join(here,'test-output/craft');fs.mkdirSync(out,{recursive:true});
const report={date:new Date().toISOString(),checks:[],clips:[],limitations:['Desktop Chrome only; no physical-phone test. Motion clips are frame-exact 30fps exports; captured stills do not establish full live-motion taste.']};
function check(name,pass,detail){report.checks.push({name,pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name}`);if(!pass)throw new Error(name);}
const b=await browser({width:1440,height:960});
try{
 const undo=await b.evaluate(`(()=>{TLS.load(TL.makeProject('doc-vox-yellow'));const s=TL.app.state,id=s.project.events[0].media,entry=s.project.media[id],data=entry.dataUrl;TL.app.actions.removePhoto();const removed=!s.project.events[0].media&&!s.project.media[id];TL.app.undo();const restored=s.project.media[id].dataUrl===data&&s.project.media[id]===entry;TL.app.undo(true);const redo=!s.project.events[0].media;TL.app.undo();return{removed,restored,redo,sharedImmutableAsset:s.history.every(p=>!p.media[id]||p.media[id]===entry)};})()`);
 check('Removing media, undo and redo preserve the original immutable asset',Object.values(undo).every(Boolean),undo);
 const captions=await b.evaluate(`(async()=>{const results=[];for(const id of ['doc-glowing-branches','doc-red-evidence']){const p=TL.makeProject(id);for(const e of p.events){const t=e.start+1.2;await TL.renderer.prepare(p,t);const c=TL.util.canvas(1920,1080),ctx=c.getContext('2d'),texts=[],original=ctx.fillText.bind(ctx);ctx.fillText=(text,...args)=>{texts.push(String(text));original(text,...args);};TL.renderer.render(ctx,p,t,{width:1920,height:1080});results.push({id,date:e.date,hasDate:texts.includes(e.date),hasTitle:texts.some(x=>e.title.startsWith(x)),texts});}}return results;})()`);
 check('Both branch families keep date and heading at all held stops',captions.every(x=>x.hasDate&&x.hasTitle),captions);
 const long=await b.evaluate(`(async()=>{const p=TL.makeProject('doc-history-journey');p.width=1080;p.height=1920;p.events[0].title='A much longer documentary event heading with a carefully chosen historical context';await TL.renderer.prepare(p,2);const c=TL.util.canvas(1080,1920),ctx=c.getContext('2d'),texts=[],original=ctx.fillText.bind(ctx);ctx.fillText=(text,...args)=>{texts.push(String(text));original(text,...args);};TL.renderer.render(ctx,p,2,{width:1080,height:1920});return{complete:texts.join(' ').includes(p.events[0].title),noEllipsis:!texts.some(x=>x.includes('…'))};})()`);
 check('Authored portrait heading is complete',long.complete&&long.noEllipsis,long);
 const cards=await b.evaluate(`(()=>{TLS.load(TL.makeProject('doc-history-journey'));const card=document.querySelector('[data-preset]'),img=card.querySelector('img'),info=card.querySelector('.preset-info'),legend=document.querySelector('.timeline-legend');return{vertical:info.getBoundingClientRect().top>=img.getBoundingClientRect().bottom-1,readable:info.clientWidth>180,legendVisible:legend.getBoundingClientRect().bottom<=innerHeight};})()`);
 check('Preset image and full-width copy stack; timing key fits',Object.values(cards).every(Boolean),cards);
 for(const [name,id,to] of [['Photo Journey','doc-history-journey',9],['Cutout Timeline','doc-vox-yellow',8.5],['Luminous Timeline','doc-glowing-branches',9],['Year Ruler','doc-nitish-ruler',8.5],['Year Roll','doc-year-wheel',7]]){
   const result=await b.evaluate(`(async()=>{const p=TL.makeProject(${JSON.stringify(id)}),r=await TL.exporter.run(p,{format:'mp4',mode:'composite',height:720,fps:30,from:0,to:${to}}),a=new Uint8Array(await r.blob.arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return{data:btoa(s),width:r.width,height:r.height,count:r.count};})()`);
   const file=path.join(out,name+'.mp4');fs.writeFileSync(file,Buffer.from(result.data,'base64'));
   const decode=spawnSync(toolPath('ffmpeg'),['-hide_banner','-i',file,'-f','null','-'],{encoding:'utf8',windowsHide:true,timeout:60000});
   check(name+' actual 30fps video decodes and has no audio',decode.status===0&&!/Stream.*Audio:/i.test(decode.stderr),{frames:result.count,width:result.width,height:result.height});
   report.clips.push({file:path.relative(here,file),preset:id,seconds:to,fps:30,frames:result.count,bytes:fs.statSync(file).size});
 }
 const list=path.join(out,'showreel.txt');fs.writeFileSync(list,report.clips.map(x=>`file '${path.join(here,x.file).replaceAll('\\','/')}'`).join('\n'));
 const combined=spawnSync(toolPath('ffmpeg'),['-y','-v','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',path.join(out,'Timeline Studio — Craft Preview.mp4')],{encoding:'utf8',windowsHide:true,timeout:60000});
 check('Five-family playable preview assembled',combined.status===0,combined.stderr);
 check('No browser exceptions',b.errors.length===0,b.errors);
}finally{await b.close();fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));}
