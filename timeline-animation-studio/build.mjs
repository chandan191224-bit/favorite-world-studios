import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const craftMedia={};
for(const [id,file]of [['craft-bellows','bellows-camera.png'],['craft-slr','slr-camera.png'],['craft-mirrorless','mirrorless-camera.png']]){const asset=path.join(root,'assets/cutouts',file);if(fs.existsSync(asset))craftMedia[id]={kind:'image',name:'Original illustrative camera study',dataUrl:'data:image/png;base64,'+fs.readFileSync(asset).toString('base64')};}
fs.writeFileSync(path.join(root,'src/ui/craft-assets.js'),'TL.craftMedia='+JSON.stringify(craftMedia)+';\n');
let html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
html=html.replace(/\/\* @inline:([^*]+) \*\//g,(_,file)=>fs.readFileSync(path.join(root,file.trim()),'utf8').replace(/<\/script/gi,'<\\/script'));
html=html.replace(/\/\* @base64:([^*]+) \*\//g,(_,file)=>fs.readFileSync(path.join(root,file.trim())).toString('base64'));
fs.writeFileSync(path.join(root,'Timeline Animation Studio Pro.html'),html);
console.log(`Built Timeline Animation Studio Pro.html — ${(Buffer.byteLength(html)/1048576).toFixed(2)} MB; offline.`);
