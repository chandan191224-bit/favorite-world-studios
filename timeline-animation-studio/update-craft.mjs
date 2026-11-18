// Update only owned studio files. Preserve user projects and make a byte-for-byte backup.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const source=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve('C:/Users/chand/Desktop/clausd');
const target=path.join(root,'timeline-animation-studio');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
if(!fs.existsSync(path.join(root,'AGENTS.md'))||!fs.existsSync(path.join(target,'Timeline Animation Studio Pro.html')))throw new Error('Expected installed studio not found.');
function checked(base,relative){const absolute=path.resolve(base,relative);if(!absolute.startsWith(base+path.sep))throw new Error('Path escapes the intended studio: '+relative);return absolute;}
for(const file of ['.impeccable/review/verification.json','test-output/craft/verification.json']){const report=JSON.parse(fs.readFileSync(path.join(source,file),'utf8'));if(!report.checks?.length||report.checks.some(x=>!x.pass))throw new Error('Verification failed: '+file);}
if(!fs.readFileSync(path.join(source,'research/CRAFT_VERDICT.md'),'utf8').includes('disposition: ship'))throw new Error('Craft verdict not complete.');
if(!fs.existsSync(path.join(source,'.impeccable/design.json')))throw new Error('Final design documentation missing.');
const files=new Set(['Timeline Animation Studio Pro.html','README.md','VERIFICATION.md','PRODUCT.md','DESIGN.md','build.mjs','project.mjs','render.mjs','tooling.mjs','qa-craft.mjs','qa-craft-finish.mjs','qa-installed-craft.mjs','qa-thumbnails.mjs','update-craft.mjs','.impeccable/design.json']);
function collect(relative){const folder=checked(source,relative);for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const name=path.join(relative,entry.name);if(entry.isDirectory())collect(name);else if(entry.isFile())files.add(name);}}
for(const folder of ['src','vendor','.impeccable/review','test-output/craft'])collect(folder);
for(const name of ['bellows-camera.png','slr-camera.png','mirrorless-camera.png','PROVENANCE.md','ALPHA_INSPECTION.json'])files.add('assets/cutouts/'+name);
for(const name of ['CRAFT_AUDIT.md','CRAFT_REVIEW_V2.md','CRAFT_VERDICT.md'])files.add('research/'+name);
const updates=[];
for(const relative of files){const from=checked(source,relative),to=checked(target,relative),bytes=fs.readFileSync(from),old=fs.existsSync(to)?fs.readFileSync(to):null;if(!old||hash(old)!==hash(bytes))updates.push({from,to,relative,bytes,before:old?hash(old):null,after:hash(bytes)});}
const marker='## Craft revision — 2026-10-31';
const productionText=fs.readFileSync(path.join(source,'production/TIMELINE_ANIMATION_STUDIO.md'),'utf8');
const appendix=productionText.slice(productionText.indexOf(marker));
const changeLog=`## 2026-10-31 — Documentary timeline craft correction
- User feedback: “everythings looks so unprofessional , u didnt worked professionally and u didnt work on detailing”. Rebuilt the documentary composition and editor details after the earlier wrong infographic interpretation was already corrected.
- Updated studio src/core/documentary.js, src/ui/documentary-ui.js, src/ui/app.js, craft.css, SVG icons, craft-parts/presets/assets, bundled fonts and generated illustrative camera cutouts. Substantial media, coordinated reveals, narration holds/travel, measured date/caption layout, actual-alpha callout attachment, separate ruler title bands, annual/quarter ticks, complete portrait titles. Preserved exact vs preview video caches and original project IDs.
- Full-width library cards, contextual controls, two timeline lanes and directly resizable holds; phone task priority and expanded/magnified/pannable preview. Undo shares immutable media rather than cloning large data URLs per edit. Preserves modified projects and browser storage; only untouched legacy stock autosaves may migrate to their revised stock preset.
- Final independent verdict scored eight material fixes resolved (research/CRAFT_VERDICT.md), scope limited to same captured fixes. qa-craft.mjs 18/18; qa-craft-finish.mjs 11/11; all 52 project schemas valid; five actual 720p/30fps silent MP4s decode, exact keys/matte/alpha ZIP and deterministic frames checked. Worst measured warm 960x540 p95 26.2 ms, not a device guarantee. Physical phone, long 4K and continuous-playback taste not certified. Optional detector unavailable (missing engine); not represented as passed.
- Exact generated-image prompts/origins and alpha inspection in assets/cutouts; NASA source manifest retained; Inter/Montserrat font licences bundled. Updated README/VERIFICATION/PRODUCT/DESIGN and design sidecar; appended production handoff. Existing episodes, user projects, .claude and copied Claude memory were not edited. Owned replaced files are backed up with hashes in timeline-animation-studio/.studio-update-backups; see the update manifest for exact file coverage.
`;
for(const [relative,heading,body]of [['production/TIMELINE_ANIMATION_STUDIO.md',marker,appendix],['production/codex-boss/CHANGELOG.md','## 2026-10-31 — Documentary timeline craft correction',changeLog]]){
 const to=checked(root,relative),old=fs.existsSync(to)?fs.readFileSync(to):Buffer.from('');
 if(!old.toString('utf8').includes(heading)){const bytes=Buffer.from(old.toString('utf8').trimEnd()+'\n\n'+body.trim()+'\n');updates.push({to,relative:path.relative(root,to),rootFile:true,bytes,before:hash(old),after:hash(bytes)});}
}
const plan={target,changedFiles:updates.length,bytes:updates.reduce((n,x)=>n+x.bytes.length,0),preserves:['projects/','browser IndexedDB','existing episodes','.claude/','copied Claude memory'],htmlSha256:hash(fs.readFileSync(path.join(source,'Timeline Animation Studio Pro.html')))};
if(!process.argv.includes('--apply')){console.log(JSON.stringify(plan,null,2));process.exit(0);}
const backup=checked(target,'.studio-update-backups/'+new Date().toISOString().replaceAll(':','-').replaceAll('.','-')+'-craft');
fs.mkdirSync(backup,{recursive:true});
// Every existing target is copied before the first replacement. No delete or move operation.
for(const item of updates){if(fs.existsSync(item.to)){const copy=checked(backup,(item.rootFile?'clausd/':'studio/')+item.relative);fs.mkdirSync(path.dirname(copy),{recursive:true});fs.copyFileSync(item.to,copy);if(hash(fs.readFileSync(copy))!==item.before)throw new Error('Backup mismatch: '+item.relative);}}
const manifest={...plan,backup,date:new Date().toISOString(),files:updates.map(({relative,rootFile,before,after})=>({relative,rootFile:!!rootFile,before,after}))};
fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(manifest,null,2));
for(const item of updates){fs.mkdirSync(path.dirname(item.to),{recursive:true});fs.writeFileSync(item.to,item.bytes);if(hash(fs.readFileSync(item.to))!==item.after)throw new Error('Update mismatch: '+item.relative);}
fs.writeFileSync(path.join(source,'test-output/craft/installed-update.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({...plan,backup,updated:true},null,2));
