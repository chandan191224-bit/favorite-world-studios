if(process.argv.includes('--all')) { await import('./qa.mjs'); process.exit(0); }
if(process.argv.includes('--advanced')) { await import('./qa-advanced.mjs'); process.exit(0); }
if(process.argv.includes('--thumbs')) { await import('./qa-thumbnails.mjs'); process.exit(0); }
if(process.argv.includes('--profile')) { await import('./qa-profile.mjs'); process.exit(0); }
if(process.argv.includes('--finish')) { await import('./qa-finish.mjs'); process.exit(0); }
import {browser,here} from './tooling.mjs';
import path from 'node:path';
const b=await browser();
try{console.log(await b.evaluate('({ready:!!DB.app,templates:DB.templates.length,cameras:DB.cameraPresets.length,project:DB.app.project.name,width:document.documentElement.scrollWidth,viewport:innerWidth})'));await b.screenshot(path.join(here,'test-output','laptop-first.png'));console.log('Errors:',JSON.stringify(b.errors));}finally{await b.close();}
