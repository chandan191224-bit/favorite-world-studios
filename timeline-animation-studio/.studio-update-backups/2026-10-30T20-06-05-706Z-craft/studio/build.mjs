import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
let html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
html=html.replace(/\/\* @inline:([^*]+) \*\//g,(_,file)=>fs.readFileSync(path.join(root,file.trim()),'utf8').replace(/<\/script/gi,'<\\/script'));
fs.writeFileSync(path.join(root,'Timeline Animation Studio Pro.html'),html);
console.log(`Built Timeline Animation Studio Pro.html — ${(Buffer.byteLength(html)/1048576).toFixed(2)} MB; offline.`);
