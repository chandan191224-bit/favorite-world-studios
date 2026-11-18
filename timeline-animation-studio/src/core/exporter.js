(() => {
  'use strict';
  const U=TL.util;
  const sizes=(p,h)=>{const landscape=p.width>=p.height;return landscape?{width:Math.round(h*p.width/p.height/2)*2,height:h}:{width:h,height:Math.round(h*p.height/p.width/2)*2};};
  const canvasBlob=(canvas,type='image/png')=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not create frame.')),type));
  // Store-only ZIP: original PNG bytes, UTF-8 names, CRC-32; no dependencies.
  const table=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[i]=c>>>0;}
  const crc=bytes=>{let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
  async function zipFiles(files){const local=[],central=[];let offset=0;for(const f of files){const name=new TextEncoder().encode(f.name),bytes=new Uint8Array(await f.blob.arrayBuffer()),sum=crc(bytes);const a=new Uint8Array(30+name.length),d=new DataView(a.buffer);d.setUint32(0,0x04034b50,true);d.setUint16(4,20,true);d.setUint16(6,0x800,true);d.setUint32(14,sum,true);d.setUint32(18,bytes.length,true);d.setUint32(22,bytes.length,true);d.setUint16(26,name.length,true);a.set(name,30);local.push(a,bytes);const b=new Uint8Array(46+name.length),e=new DataView(b.buffer);e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x800,true);e.setUint32(16,sum,true);e.setUint32(20,bytes.length,true);e.setUint32(24,bytes.length,true);e.setUint16(28,name.length,true);e.setUint32(42,offset,true);b.set(name,46);central.push(b);offset+=a.length+bytes.length;}
    const end=new Uint8Array(22),v=new DataView(end.buffer),length=central.reduce((s,b)=>s+b.length,0);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,length,true);v.setUint32(16,offset,true);return new Blob([...local,...central,end],{type:'application/zip'});}
  async function run(p,o={},onProgress=()=>{},cancelled=()=>false){
    const fps=U.clamp(+o.fps||30,1,60),{width,height}=o.width?o:sizes(p,+o.height||1080),mode=o.mode||'composite',format=o.format||'mp4',from=U.clamp(+o.from||0,0,TL.duration(p)),to=U.clamp(o.to==null?TL.duration(p):+o.to,from,TL.duration(p));
    if(to<=from&&format!=='png')throw new Error('The end time must be after the start time.');
    if(mode==='alpha'&&!['png','sequence'].includes(format))throw new Error('For reliable transparency, export a PNG still or PNG sequence, or use render.mjs on your PC for transparent VP9 WebM.');
    const count=format==='png'?1:Math.max(1,Math.round((to-from)*fps)),canvas=U.canvas(width,height),ctx=canvas.getContext('2d',{alpha:mode==='alpha'}),base=U.slug(p.name),tag=mode==='composite'?'':'-'+mode;
    const draw=async i=>{if(cancelled())throw new DOMException('Export cancelled','AbortError');const t=format==='png'?(o.time??from):from+i/fps;await TL.renderer.prepare(p,t);TL.renderer.render(ctx,p,t,{width,height,mode});};
    if(format==='png'){await draw(0);onProgress(1);return{blob:await canvasBlob(canvas),name:base+tag+'.png',width,height,count:1};}
    if(format==='sequence'){if(count>65500)throw new Error('Choose a shorter range (maximum 65,500 PNG frames per ZIP).');const files=[];for(let i=0;i<count;i++){await draw(i);files.push({name:`frames/frame-${String(i).padStart(6,'0')}.png`,blob:await canvasBlob(canvas)});onProgress((i+1)/count*.97);if(i%2===0)await U.tick();}files.push({name:'README.txt',blob:new Blob([`${p.name}\n${width} x ${height}; ${fps} fps; ${count} frames; silent; mode ${mode}.\nFrame 000000 starts at project time ${from}.\nImport as an image sequence in your video editor.\n`])});const blob=await zipFiles(files);onProgress(1);return{blob,name:base+tag+'-frames.zip',width,height,count};}
    const MB=window.Mediabunny;
    if(MB&&window.VideoEncoder){
      const codecs=format==='mp4'?['avc']:['vp9','vp8'];const codec=await MB.getFirstEncodableVideoCodec(codecs,{width,height});
      if(codec){const output=new MB.Output({format:format==='mp4'?new MB.Mp4OutputFormat({fastStart:'in-memory'}):new MB.WebMOutputFormat(),target:new MB.BufferTarget()});const source=new MB.CanvasSource(canvas,{codec,bitrate:Math.round(width*height*fps*.22),keyFrameInterval:2});output.addVideoTrack(source,{frameRate:fps});
        try{await output.start();for(let i=0;i<count;i++){await draw(i);await source.add(i/fps,1/fps);onProgress((i+1)/count*.99);if(i%3===0)await U.tick();}await output.finalize();onProgress(1);return{blob:new Blob([output.target.buffer],{type:'video/'+format}),name:base+tag+'.'+format,width,height,count};}catch(e){try{await output.cancel();}catch{}throw e;}
      }
      if(format==='mp4')throw new Error('H.264 encoding is unavailable at this resolution in this browser. Try 720p, export WebM, or use the included PC renderer.');
    } else if(format==='mp4')throw new Error('This browser does not provide WebCodecs H.264. Open in Chrome/Edge, export WebM, or use the included PC renderer.');
    if(!window.MediaRecorder||!canvas.captureStream)throw new Error('Video export is unavailable in this browser. Export PNG frames or use Chrome/Edge.');
    const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime)throw new Error('This browser cannot encode WebM.');
    const stream=canvas.captureStream(fps),chunks=[],rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:width*height*fps*.2});let failed;const stopped=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=e=>{failed=e.error||new Error('Video recording failed');reject(failed);};});rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    try{await draw(0);rec.start();for(let i=0;i<count;i++){const start=performance.now();await draw(i);onProgress((i+1)/count*.99);await new Promise(r=>setTimeout(r,Math.max(0,1000/fps-(performance.now()-start))));}rec.stop();await stopped;if(failed)throw failed;onProgress(1);return{blob:new Blob(chunks,{type:mime}),name:base+tag+'.webm',width,height,count,realtime:true};}finally{if(rec.state!=='inactive')rec.stop();stream.getTracks().forEach(t=>t.stop());}
  }
  TL.exporter={run,sizes,zipFiles};
})();
