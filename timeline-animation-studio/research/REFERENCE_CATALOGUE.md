# Documentary timeline animation research

User correction: “u completely mis understood about timeline animations, search on youtube that ‘timeline animation after effects’ then u will get to see what exactly the time line animation look like and how we use them in any documentary type video”. User then required at least20YouTubevideos.

## Search and inspection actually completed

Exact YouTube query: **timeline animation after effects**. Direct YouTube search returned40results; 26distinct relevant tutorials/demos were selected, excluding general editor timeline-panel/layer/duration instruction. **25opening video samples downloaded and visually inspected; one unavailable** (`h99HnzQmEss`, HTTP500). Samples cover at most0–36seconds; a short6-second demo was inspected in full. This is not a claim of watching26complete tutorials. Frames were sampled about every3seconds, so exact easing curves and motion-blur settings are not measured facts.

All26linked titles, creators and relevance are in [SEARCH_AUDIT.md](twenty/SEARCH_AUDIT.md), with structured metadata in [sources.json](twenty/sources.json). Actual per-video visual findings:

- [Sources1–10](twenty/REVIEW_01_10.md):10samples inspected.
- [Sources11–20](twenty/REVIEW_11_20.md):9samples inspected; source15unavailable.
- [Sources21–26](twenty/REVIEW_21_26.md):6samples inspected.

Contact sheets and exact sample statuses are inside `twenty/<video-id>/`. Source videos are research evidence only; YouTube frames and paid project assets are not included in the editor.

## What documentary timelines actually do

| Family | Actual visual evidence | Documentary use | Studio implementation |
|---|---|---|---|
| Lower-third year ruler | [Bijoy Dey](https://www.youtube.com/watch?v=uGAh2SHqpKo), [The Copy Unedited](https://www.youtube.com/watch?v=_mRyTYz7JNk), [Pixowl](https://www.youtube.com/watch?v=voJe4uhT_b0): fine ticks at the lower edge over speaker footage; years slide; the active date/pill stays readable. | Explain a historical jump while documentary footage remains visible. | Moving intermediate-year ticks, fixed pointer/date pill, imported silent video/image backdrop; alpha/key exports omit the backdrop. |
| Large historical photo journey | [Denys Zhylin history](https://www.youtube.com/watch?v=AW1oFLmNQ8Q), [Flat Pack FX](https://www.youtube.com/watch?v=-a6PTzq04p8): large archival photos on a long rail; camera moves past offscreen content; individual years and photos get attention. | Narrate a sequence of events with pauses at relevant dates. | Long world, large event photos, explicit camera arrivals, travel duration, holds and optional final wide context. |
| Alternating cutout chronology | [Denys Zhylin Vox](https://www.youtube.com/watch?v=wH_XU69mKOE): computers above/below a growing rail on a yellow grid; pan then pullback. [Nuclear Media](https://www.youtube.com/watch?v=IId0lGVP5SA): large portrait visits followed by a wide view. | Show people, inventions or objects changing across time. | Transparent PNG/SVG image support, alternating sides, original spacecraft cutout demo art, timed reveals and wide finish. |
| Luminous branch rail | [Flat Pack FX stylized](https://www.youtube.com/watch?v=9AtjrBHF560): illuminated horizontal rail, up/down connector branches, image-linked dates. | Emphasize a few causal or historical milestones on a dark visual field. | Bright active stroke, alternating branches, round/photo media, camera following event stops. |
| Perspective passage | [PremiumBeat/Evan Abrams](https://www.youtube.com/watch?v=k9aVeJOHjcA): continuous fine-tick date axis, oblique camera and large framed photos. [Joshua Esca](https://www.youtube.com/watch?v=j6f2FfJsPdA): camera passes media planes over an editing-timeline floor. | Travel through an archive, biography or historical sequence. | Canvas2D simulated oblique/depth camera and parallax. Not a full3D scene or optical-depth-of-field system. |
| Rolling year strip | [Smertimba](https://www.youtube.com/watch?v=mxdpl1u6fWY), [Stefan Video](https://www.youtube.com/watch?v=YBZ-hPuBfII), [Worldo Adobe](https://www.youtube.com/watch?v=aaLKwXjmaGc), [RobikFX](https://www.youtube.com/watch?v=ANcYLW9mfaw): years move through a masked horizontal/vertical window and settle. | A brief time-jump insert or overlay between narration sections. | Vertical wheel/horizontal strip, numeric intermediate years, travel/hold timing and transparent output. |
| Full-date slider / archival date insert | [MediaWorkbench Loki](https://www.youtube.com/watch?v=crFgP3pkUOc): date typography on an axis; [The Last Dance tutorial](https://www.youtube.com/watch?v=MIWf11QcarQ): archival footage with October1980 date overlay. Only a limited opening excerpt is visible for the latter. | Locate the viewer in a specific month/year without replacing footage with a diagram. | Month prefix, large date treatment, lower ruler and backdrop support. |
| Photo tunnel / vertical journey | [Motion Nations](https://www.youtube.com/watch?v=HDf5JHhuMmI): dark archival-photo passage, red dates and camera push/travel. | Biographical/historical photo-led sequences. | Photo passage, vertical camera journey and editable zoom/arrival timing. Full3D tunnel geometry is not claimed. |

The sampled Netflix-style source [byl](https://www.youtube.com/watch?v=9_5DuApWzMY) shows documentary footage with a lower ruler, month/year and an image leader. Its tutorial UI appears to be CapCut: it is a **visual reference**, not evidence of an inspected AfterEffects workflow. The circular cacao process graphic and corporate spinning-gallery demo are secondary comparisons, not the basis for the main documentary editor.

## Motion specification derived from the samples

The whole chronology is not fitted onto one screen by default. The camera sees one or two large events; future events remain offscreen. A stop means arrival, then a genuine hold for narration, then travel to the next stop. The date ruler shows intermediate calendar values during movement. A final wide reveal is optional. Event year and video arrival time are independent controls.

The studio provides16documentary presets across8renderer families. Travel/hold durations, date typography, ruler ticks, image sizing/treatment, camera framing and optional wide finish are editable. The36earlier infographic layouts are secondary under Diagrams, not the main answer to this request. Source camera/easing implementations are not copied; the deterministic Canvas implementation is original.

## Assets and sample chronology

Real demo photos come from NASA’s public image library, with exact image metadata and URLs in [NASA_DEMO_SOURCES.json](NASA_DEMO_SOURCES.json). They are labelled illustrative: a later ISS photo illustrates the station milestone, and a prelaunch Webb mirror photo illustrates the telescope. Cutout demo spacecraft are original vector drawings. No YouTube frames or paid AE assets are embedded.

Sample milestones: Apollo11(1969), first Shuttle flight(1981), Hubble launch(1990), first ISS module(1998), Webb launch(2021). Primary checks include [NASA STS-1](https://www.nasa.gov/mission/sts-1/) and [NASA Hubble history](https://science.nasa.gov/mission/hubble/overview/hubble-timeline/hubble-history-timeline-full-text/). Users must replace demonstration text and imagery with episode-specific sources before publishing.

## Local implementation references

Inspected the Clausd reference library: Paper Studio Pro, Paper Transition dark/amber panel styles, Map Animation Studio quality/performance handoff and Detective Board Studio renderer, cached backgrounds, self-contained build, silent export, phone launchers and pipeline patterns. Preview is screen-sized independently of export; preset thumbnails are pre-rendered; photographic source decoding is cached; preview and exact-export video decoders are separate.
