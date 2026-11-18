# Corrected scope after the user's feedback

User: “u completely mis understood about timeline animations, search on youtube that timeline animation after effects then u will get to see what exactly the time line animation look like and how we use them in any documentary type video”. Then: “search atleast 20 videos on youtube”.

26 distinct YouTube sources are in research/twenty/sources.json. Actual opening0–36s contact sheets and review notes, not titles alone, ground this scope. Do not describe infographic presets as the main solution. The new FIRST library tab is Documentary; original diagram layouts live under Diagrams as optional secondary tools.

## Primary effects observed

- Nitish-style lower-third year ruler over full-frame footage: many small ticks, readable year labels, a fixed pointer/date pill and rail moving beneath it; jumps settle on selected dates. Transparent element export for placement over real documentary footage is essential.
- Historical photo journey: a continuous LONG OFFSCREEN rail; large date-linked photos/cutouts above/below it; camera holds, moves to next year, then settles; occasional wide context reveal. Must not fit every event on screen by default.
- Vox photo/cutout chronology: large photo/portrait cards, dots, connectors, alternate-side image reveals, smooth camera travel.
- Dark luminous rail: active accent stroke draws along main rail and up/down branches into round/rectangular media, with years and large event labels; offscreen camera following the progression.
- Depth passage: oblique/2.5D camera along the long rail passing framed photos; configurable tilt/depth and controlled zoom.
- Date slider/rolling year: masked year/date strip showing fast passage to a held final date; usable as a lower-third/centered graphic, not an infographic row.

## Schema extensions (all original fields retained)

New layouts: doc-ruler, doc-archive, doc-cutout, doc-luminous, doc-perspective, doc-vertical, doc-counter, doc-date-card. Every doc layout renders a story world larger than the composition and a camera moving through it.

Project adds `documentary:{railY:0.78,spacing:900,mediaWidth:540,mediaHeight:340,mediaGap:80,tickStep:1,labelEvery:5,yearSize:40,headingSize:54,descriptionSize:26,cursor:true,cursorPosition:0.5,datePill:true,showMedia:true,mediaTreatment:'photo'|'cutout'|'circle'|'paper',railPosition:'bottom'|'middle',moveDuration:1.2,holdDuration:2.5,finalWide:false,wideDuration:2,depth:0.25,tilt:0.0,vignette:0.25,backgroundMedia:null,backgroundDim:0.25,showBigDate:true,cameraPath:'stops'|'continuous',counterAxis:'vertical'|'horizontal',tickDensity:1}`.

Events add `mediaFit:'cover'|'contain'|'cutout',mediaScale:1,mediaX:0.5,mediaY:0.5,captionSide:'auto'|'above'|'below',cameraZoom:1,cameraHold:2.5,month:'',source:''`. Existing `event.start` = ARRIVAL time in seconds, camera moves to an event during `moveDuration` immediately preceding arrival, then holds there until travel to next event. Event `duration` = entrance length. Calendar `event.value` and displayed `event.date` are separate. For doc-ruler/counter interpolate DATE VALUE (long year span), not equal event index; show real numeric in-between ticks; formatHH:MM ifalllabelsHH:MM. For docarchive spacing is equal or proportional, but world has minimum800/event spacing to allow proper scene photos. `camera.mode` still overview/follow/push/pull/drift: defaultFOLLOW; whole timeline overview is explicit. Arrange shows fit world overview with all events, hit positions matching it. Camera from fixed title/footer separate; defaultshowHeaderfalse/showFooterfalse in doc-ruler as overlay.

## New renderer worker owns ONLY src/core/documentary.js

Load AFTER templates.js, documentary-presets.js, original renderer.js, BEFORE exporter/app. Wrap TL.renderer.render/prepare/positions/clearCaches to dispatch /^doc-/ projects to your engine; preserve original engine for diagrams. Expose `TL.documentary={render,prepare,positions,cameraAt,clearCaches}` if helpful. No other source changes.

Same render contract options width,height,mode composite/green/blue/alpha/matte,editor,selected. True deterministic output. Exact key corners and alpha backgrounds. Matte is grayscale. Composite can show an imported IMAGE/VIDEO backdrop fromproject.media[documentary.backgroundMedia] and vignette. Alpha/key/matte exclude backdrop. For no backdrop, use themed cached texture; doc-ruler default background can show subtle original illustration/preview footage placeholder but label notpartofexport? better own styledbackground noartifnotmedia. Need originalproceduralimage fallback forphoto cards, use richer different space/architecture/machine original art (can copy codefromoriginalrenderer). ImportedtransparentPNG cutout must preserve full image aspect and alpha, not forcecover rectangle.

`prepare(p,t,options={preview:false,playing:false})` handlesimage/videocache. For exactexport seek backdrop video to clamp(t,0,duration-.05) and awaitseeked withboundedtimeout; no sound. Forpreviewplaying allowmutedplayandresync drift withoutblocking everyframe; previewprepare mayreturnearly. Renderer useslastdecoded frame. Cacheassets byid+src. Expose video/imageerror if useful. No runtimefetch except importeddataURLorCLIfileURL. Rootownsfileimport.

Camera must visibly TRAVEL then HOLD at each date, not driftconstantthroughdates. Smooth ease supportslinear. A jump from1969to1998 needs intermediateyear ticks visiblemoving underpointer. Datepillpositionskeptonscreen. Bigdate typography large(80–150px at1920) inruler ifenabled; lowerthird rail inbottom15–25% leavesfootagevisible. SourceCredit smalloptional. Different doc presets genuinelydistinctmotion/composition.

Photojourneygeometry eventx=index*spacing, worldy railY; camera clamps event targets so first/last framingattractive. Mediawidth~540means1–2largephotosvisible, offscreenotherones. Datefollowcurrentlargecaption. Per-eventzoom duringhold subtlepush. Optional endwide fitall only atfinalseconds. Perspective simulatesobliquecamera throughlayerperspective; honestly2.5D noopticalDOFclaim.

Important: positions(...,{editor:true}) must returnactual transformedanchor positions, so rootdrag offsetconversionworksnormalizeX1920/outputWidthY1080/outputHeight. Camera zoomaffectsdragonlyeditorfitlayout; return `offsetScaleX,offsetScaleY` ordocumentexact correction forroot to use. Rootcanavoidstage draggingin documentary ifendpointinspectorworks butmustnotwronglyclaimitworks.

## Root owns documentary-presets.js, UI extension, validation, docs, QA

>=16 documentary presets across theseeightfamilies and>=5originalnonfactualdemoevents. Defaultdoc-archivejourneywithactualimagesifavailableand editabletext; doc-ruleroverlaypresetshowsovervideo. Addphoto/cutout/backdrop controls, per-eventdate/arrival/hold/cameraZoom, cinematicshotscamera UI, editabletickspacing/size/media. ExportexactMP4WebMkeysalpha. PipelineidenticalAPI.
