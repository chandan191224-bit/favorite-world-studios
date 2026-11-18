import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {browser,here,toolPath,writeDataUrl} from './tooling.mjs';
const out=path.join(here,'test-output'),b=await browser();let project;
try{
project=await b.evaluate(`TL.makeProject('space-age')`);fs.writeFileSync(path.join(here,'projects/space-age.timeline.json'),JSON.stringify(project,null,2));
const extra=[];
for(const id of ['space-age','year-slider','festival-clock','year-counter','forking-paths','portrait-history','portrait-zigzag','portrait-ascent']){
const data=await b.evaluate(`(async()=>{TLS.load(TL.makeProject(${JSON.stringify(id)}));const p=TLS.project,w=p.width<p.height?540:1280,h=Math.round(w*p.height/p.width);return TLS.frame(p.duration*.96,'composite',w,h);})()`);writeDataUrl(path.join(out,id+'-final.png'),data);extra.push(id);
}
const familySheet=await b.evaluate(`(async()=>{const c=TL.util.canvas(1600,1800),ctx=c.getContext('2d'),ids=['space-age','orbit-cycle','production-bands','photo-memories','forking-paths','documentary-chapters'];ctx.fillStyle='#11161d';ctx.fillRect(0,0,c.width,c.height);for(let i=0;i<ids.length;i++){const p=TL.makeProject(ids[i]),frame=TL.util.canvas(800,450);TL.renderer.render(frame.getContext('2d'),p,p.duration*.96,{width:800,height:450});ctx.drawImage(frame,i%2*800,Math.floor(i/2)*600+50);ctx.fillStyle='#eee';ctx.font='20px Arial';ctx.fillText(ids[i],i%2*800+25,Math.floor(i/2)*600+35);}return c.toDataURL('image/jpeg',.93);})()`);writeDataUrl(path.join(out,'Studio Preview.jpg'),familySheet);
// Empty project and every layout in portrait must render without exceptions.
const layoutCheck=await b.evaluate(`(()=>{const errors=[];for(const l of TL.layouts){const p=TL.makeProject('space-age');p.layout=l.id;p.width=1080;p.height=1920;const c=TL.util.canvas(270,480);try{TL.renderer.render(c.getContext('2d'),p,17,{width:270,height:480});}catch(e){errors.push(l.id+': '+e.message);}}const p=TL.makeProject('space-age');p.events=[];const c=TL.util.canvas(640,360);TL.renderer.render(c.getContext('2d'),p,0,{width:640,height:360});return errors;})()`);
if(layoutCheck.length)throw new Error(layoutCheck.join(';'));
fs.writeFileSync(path.join(out,'qa-finish.json'),JSON.stringify({extraFrames:extra,portraitLayouts:18,emptyProject:true,browserErrors:b.errors},null,2));
}finally{await b.close();}
function run(args){const r=spawnSync(process.execPath,args,{cwd:here,windowsHide:true,encoding:'utf8',timeout:180000});if(r.status!==0)throw new Error(r.stderr||r.stdout);console.log(r.stdout.trim());}
run(['render.mjs','projects/space-age.timeline.json','test-output/pc-alpha.webm','--mode','alpha','--height','540','--fps','24','--from','9','--to','9.25']);
run(['render.mjs','projects/space-age.timeline.json','test-output/Timeline Demo.mp4','--height','720','--fps','30','--from','0','--to','18']);
const reports=[];
for(const file of ['browser-mp4.mp4','browser-webm.webm','pc-alpha.webm','Timeline Demo.mp4']){
const r=spawnSync(toolPath('ffmpeg'),['-hide_banner','-i',path.join(out,file),'-map','0:v:0','-f','null','-'],{windowsHide:true,encoding:'utf8',timeout:120000});if(r.status!==0)throw new Error(file+' decode: '+r.stderr);if(/Audio:/.test(r.stderr))throw new Error(file+' unexpectedly contains audio');reports.push({file,decoded:true,silent:true,stream:r.stderr.split('\n').filter(x=>/Stream.*Video:|Duration:/.test(x)).map(x=>x.trim())});}
const alpha=spawnSync(toolPath('ffmpeg'),['-v','error','-c:v','libvpx-vp9','-i',path.join(out,'pc-alpha.webm'),'-frames:v','1','-vf','alphaextract','-f','rawvideo','-pix_fmt','gray','-'],{windowsHide:true,maxBuffer:10*1048576});if(alpha.status!==0)throw new Error(alpha.stderr.toString());const bytes=alpha.stdout;if(!bytes.length||bytes[0]!==0||!bytes.some(x=>x>0))throw new Error('Decoded VP9 alpha mask invalid');reports.push({file:'pc-alpha.webm',alphaDecoded:true,corner:bytes[0],maximum:255});
fs.writeFileSync(path.join(out,'export-decode.json'),JSON.stringify(reports,null,2));console.log('Real export decodes and VP9 alpha verified.');
