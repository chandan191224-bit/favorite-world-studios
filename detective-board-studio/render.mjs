// Frame-exact, silent renderer. Uses the same Canvas renderer as the offline UI.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {browser,toolPath,writeDataUrl} from './tooling.mjs';
const args=process.argv.slice(2),opt=(k,d)=>{const i=args.indexOf(k);return i>=0?args[i+1]:d;};
const [input,output]=args;if(!input||!output){console.log('node render.mjs project.detective.json out.mp4 [--fps 30] [--height 1080] [--mode composite|alpha|green|blue|matte] [--from 0] [--to 5] [--still 2]');process.exit(1);}
const project=JSON.parse(fs.readFileSync(input,'utf8'));for(const m of Object.values(project.media||{})){if(!m.path||m.dataUrl)continue;const file=path.resolve(path.dirname(path.resolve(input)),m.path);if(!fs.existsSync(file))throw new Error('Missing media: '+file);if(m.kind==='video')m.url=pathToFileURL(file).href;else{const ext=path.extname(file).slice(1).replace('jpg','jpeg');m.dataUrl=`data:image/${ext};base64,`+fs.readFileSync(file).toString('base64');}}
const mode=opt('--mode','composite'),height=+opt('--height','1080'),fps=+opt('--fps',project.fps||30),width=project.width>=project.height?Math.round(height*project.width/project.height/2)*2:height,outHeight=project.width>=project.height?height:Math.round(height*project.height/project.width/2)*2;
if(mode==='alpha'&&!output.toLowerCase().endsWith('.webm')&&opt('--still')==null)throw new Error('Transparent video output must use .webm (VP9 alpha).');
fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});const b=await browser();let encoder;
try{const info=await b.evaluate(`DBS.load(${JSON.stringify(project)})`);if(opt('--still')!=null){writeDataUrl(output,await b.evaluate(`DBS.frame(${+opt('--still')},${JSON.stringify(mode)},${width},${outHeight})`));console.log('Wrote still '+output);}
else{const start=Math.max(0,+opt('--from','0')),end=Math.min(info.duration,+opt('--to',info.duration));if(end<=start)throw new Error('End time must be after start time.');const count=Math.max(1,Math.round((end-start)*fps));const ffargs=['-y','-f','image2pipe','-framerate',String(fps),'-c:v','png','-i','-','-an'];if(mode==='alpha')ffargs.push('-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-crf','22','-b:v','0');else if(output.toLowerCase().endsWith('.webm'))ffargs.push('-c:v','libvpx-vp9','-pix_fmt','yuv420p','-crf','24','-b:v','0');else ffargs.push('-c:v','libx264','-pix_fmt','yuv420p','-crf','17','-preset','medium','-movflags','+faststart');ffargs.push(output);
encoder=spawn(toolPath('ffmpeg'),ffargs,{stdio:['pipe','ignore','pipe'],windowsHide:true});let logs='';encoder.stderr.on('data',d=>{logs=(logs+d.toString()).slice(-9000);});let encoderError;encoder.on('error',e=>encoderError=e);encoder.stdin.on('error',e=>encoderError=e);const done=new Promise(res=>encoder.on('close',res));
for(let i=0;i<count;i++){if(encoderError)throw encoderError;const data=await b.evaluate(`DBS.frame(${start+i/fps},${JSON.stringify(mode)},${width},${outHeight})`);if(!encoder.stdin.write(Buffer.from(data.split(',')[1],'base64')))await once(encoder.stdin,'drain');if(i%fps===0)console.log(`Frame ${i}/${count}`);}encoder.stdin.end();const code=await done;if(code!==0)throw new Error('ffmpeg failed: '+logs);console.log(`Wrote ${output}: ${count} frames, ${width}×${outHeight}, ${fps} fps, silent.`);}
if(b.errors.length)throw new Error('Browser errors: '+JSON.stringify(b.errors));
}finally{if(encoder&&encoder.exitCode===null)encoder.kill();await b.close();}
