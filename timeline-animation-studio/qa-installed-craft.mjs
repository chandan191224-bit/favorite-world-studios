import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {browser,here} from './tooling.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const url='http://localhost:9852/';
const response=await fetch(url,{headers:{'Accept-Encoding':'identity'}});
if(!response.ok)throw new Error('Installed studio is not responding.');
const actual=sha(Buffer.from(await response.arrayBuffer()));
const expected=sha(fs.readFileSync(path.join(here,'Timeline Animation Studio Pro.html')));
if(actual!==expected)throw new Error('Installed HTTP studio differs from the verified build.');
const b=await browser({width:1440,height:960,url});
try{
 const result=await b.evaluate(`(()=>({version:TL.app.project.craftVersion,presets:TL.templates.length,documentary:TL.documentaryTemplates.length,inter:document.fonts.check('600 46px Inter'),display:document.fonts.check('650 82px Montserrat'),timingLanes:document.querySelectorAll('.timeline-row').length,defaultName:TL.app.project.name}))()`);
 if(result.version!==2||result.presets!==52||result.documentary!==16||!result.inter||!result.display||result.timingLanes!==2||b.errors.length)throw new Error('Installed browser smoke check failed: '+JSON.stringify({result,errors:b.errors}));
 const report={date:new Date().toISOString(),url,sourceAndHttpSha256:actual,pass:true,...result,browserErrors:b.errors};
 fs.writeFileSync(path.join(here,'test-output/craft/installed-smoke.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await b.close();}
