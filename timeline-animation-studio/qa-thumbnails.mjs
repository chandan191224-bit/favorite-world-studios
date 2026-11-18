import fs from 'node:fs';import path from 'node:path';import {browser,here} from './tooling.mjs';
const b=await browser();
try{
const thumbs=await b.evaluate(`(async()=>{const out={};for(const t of TL.templates){const p=t.make(),c=TL.util.canvas(320,200),ctx=c.getContext('2d'),scale=Math.min(320/p.width,200/p.height),w=Math.round(p.width*scale),h=Math.round(p.height*scale),frame=TL.util.canvas(w,h);await TL.renderer.prepare(p,p.duration*.3);TL.renderer.render(frame.getContext('2d'),p,p.layout.startsWith('doc-')?p.duration*.3:p.duration*.96,{width:w,height:h});ctx.fillStyle='#11161d';ctx.fillRect(0,0,320,200);ctx.drawImage(frame,(320-w)/2,(200-h)/2);out[t.id]=c.toDataURL('image/jpeg',.86);}return out;})()`);
fs.writeFileSync(path.join(here,'src/ui/thumbnails.js'),'TL.thumbnails='+JSON.stringify(thumbs)+';\n');console.log('Pre-rendered '+Object.keys(thumbs).length+' offline preset thumbnails.');
}finally{await b.close();}
