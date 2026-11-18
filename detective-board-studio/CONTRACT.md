# Detective Board Studio Pro — shared implementation contract

Build a complete offline animation editor. Global namespace `window.DB` (each file uses an IIFE). No imports at runtime. Load order: util.js, templates.js, renderer.js, exporter.js, app.js. Do not change another contributor's file.

## Data
Project: `{version:1,name,width:1920,height:1080,fps:30,duration:20,seed:42,board:{width:2400,height:1350,theme:'cork',color:'#473c31',lighting:0.35,vignette:0.32,grain:0.12,spotlight:0.3,showHeader:true,header:'THE HARBOUR FILES',subtitle:'CASE 024 / OPEN INVESTIGATION',frame:true},camera:{handheld:0,parallax:0.4,letterbox:0},nodes:[],edges:[],shots:[],media:{}}`.

Node `{id,type,x,y,w,h,rotation:0,color:'#e9dfc8',text,title,subtitle,body,media:null,mediaFit:'cover',mediaX:0.5,mediaY:0.5,mediaZoom:1,enter:0,exit:null,reveal:'pin',revealDuration:0.7,pin:true,tape:false,depth:1,opacity:1,locked:false}`. Coordinates are board-space CENTER. Types: photo, note, document, newspaper, map, fingerprint, folder, label, stamp, tape, circle, text, evidence, screen. Text is user-editable. `text` for caption/headline, `body` for paragraphs, `subtitle` for metadata. Reveal values pin, drop, fade, typewriter, slide, scale, none. No sound.

Edge `{id,from:nodeId,to:nodeId,color:'#b93534',width:3,style:'string',label:'',start:0,duration:1,sag:0.1}`. Styles string, line, dashed, arrow. Draw edges under nodes by default, always terminate in visible pins. Make edges progress deterministically along the path.

Shot `{id,name,duration:4,ease:'smooth',preset:'push',from:{x:1200,y:675,zoom:1,rotation:0,tilt:0},to:{x:1200,y:675,zoom:1.5,rotation:0,tilt:0}}`. Zoom 1 means entire board fits (letterbox allowed); positive x/y is center of camera. Tilt is degrees of board foreshortening (Canvas 2D simulated). Timeline is consecutive shot durations. Duration derives from shots if nonempty. Eases linear, smooth, cinematic, ease-in, ease-out. Camera presets apply editable from/to values; do not hide motion inside preset names. Node depths provide subtle parallax only. `rotation` and `tilt` in degrees.

## util.js (root agent owns)
`DB.util={clamp(v,a=0,b=1),lerp(a,b,p),ease(p,name),rng(seed),uid(prefix),clone(obj),canvas(w,h),escape(text)}`. Only effect rendering must be seeded; uid can use crypto. `DB.duration(project)` returns shot total.

## renderer.js (renderer agent owns ONE FILE src/core/renderer.js)
`DB.renderer.render(ctx,project,time,options={})` where options `{width,height,mode:'composite'|'green'|'blue'|'alpha'|'matte',editor:false,selected:null,view:null}`. `view` optional camera pose override. Honor ctx output size. Composite cached seeded texture, warm directional light, cinematic shadowed paper, pins, string fibers and readable metadata. No ctx.filter. Code-native fictional photo art fallback (harbour, building, silhouette, evidence) by node id, not generic blank boxes. Render all 15 node types. Media actual image via DB.renderer.prepare(project,t) async; cache images and video seek frame. Exports and preview same renderer. Editor mode draws selection outline but renders ALL clues fully revealed to make them editable (time-based camera still). `cameraAt(project,time)` pose. `projectPoint(project,time,x,y,width,height,view?)` returns screen {x,y}; `unprojectPoint` inverse; hit testing parent calls these. Helpers `clearCaches()` for import, `prepare(project,t,{preview:true})` must avoid blocking live preview. Expose media state via returned result if useful.

## templates.js (templates agent owns ONE FILE src/ui/templates.js)
`DB.themes` object of `{id,name,color,paper,accent}` entries: cork, noir, blueprint, archive, whiteboard, dossier at least.
`DB.cameraPresets` array `{id,name,description,apply(project,node?)=> shotsArray}` at least 12 (overview, push, pull, travel, orbit, follow, reveal, whip, macro, handheld, vertical, drift). Camera path continuity matters: from previous end pose or intentionally hold/start baseline. Templates shots should begin overview then cover clues and end in wide web.
`DB.templates` >=12 entries `{id,name,family,description,accent,make()}` complete project. >=6 families. Demo is fictional and labeled in subtitle. Layouts substantial and visually distinct, 7-14 nodes each with varied rotations, enough detail and all text editable. Shot visits must respect node enter times. `DB.makeProject(id)` returns fresh clone. `DB.nodeDefaults(type)` returns fresh object sans id (parent assigns id). `DB.elementTypes` [{id,name,description}].

## Performance and QA
Precompute textures; no random per frame; no giant per-frame pixel reads. Resolution independent at 480p preview and 1080p export. Cache media. Portrait 9:16 handled by composition dimensions. All templates serialize cleanly. No dependencies, CDN, fonts or assets fetched from network during use. All template text fictional (no real accusations).

Reference direction researched from AMC/Second Home true crime evidence board (close ups, oblique tracking shots, pinned polaroids, evidence bags, floating reveal), Making_Universes Investigation Board (polaroids, documents, magazines, newspapers), Videobolt Top Secret File Opener (red string, typewriter, brush highlight, editable colors), and digital board relationship tools.

Root agent owns full UI, media upload, timeline manipulation, export, build, server, test harness, docs. The root will visually review and test all your output.
