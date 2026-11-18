const port=+(process.env.TIMELINE_PORT||9852);let info;
try{const r=await fetch(`http://127.0.0.1:${port}/api/info`,{signal:AbortSignal.timeout(1000)});if(r.ok)info=await r.json();}catch{}
if(info?.name==='Timeline Animation Studio Pro'&&info.lan){console.log('Timeline Animation Studio is already running.\nOpen on your phone (same Wi-Fi):\n'+info.urls.join('\n')+'\nThe existing server must stay running.');}
else if(info){console.log('Port '+port+' is already in use. Close its studio server or set TIMELINE_PORT to another port, then run again.');process.exitCode=1;}
else{process.argv.push('--lan');await import('./serve.mjs');}
