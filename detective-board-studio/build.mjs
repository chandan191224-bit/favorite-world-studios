import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
let html=fs.readFileSync(path.join(here,'src/index.html'),'utf8');
html=html.replace(/\/\* @inline:([^*]+) \*\//g,(_,file)=>fs.readFileSync(path.join(here,file.trim()),'utf8').replace(/<\/script/gi,'<\\/script'));
const out=path.join(here,'Detective Board Studio Pro.html');
fs.writeFileSync(out,html);console.log('Built '+out+' ('+(Buffer.byteLength(html)/1024/1024).toFixed(2)+' MB, self-contained)');
