# Detective Board Studio Pro — reference and feature catalogue

Research and implementation catalogue, 30 October 2026.

The user's brief: detective board animation, research it broadly first, then make a studio covering the main detective animation types, editable templates, editable cinematic camera settings, and smooth laptop and phone previews. Communication is in English.

## What was actually studied

The team searched across evidence-board animation, documentary title sequences, investigation-board templates, digital relationship boards, surveillance presentations, and case-file styling. The primary sources below were opened and read. The root agent also visually inspected the AMC full-board JPEG saved as `research/amc-camera.jpg`.

The source videos were **not watched**, and this research does not establish an exhaustive catalogue of every detective animation ever made. Features described below as implementation choices are our original design decisions. They are not claims that a particular reference contains them.

### Primary references

| Source | Observed in the source | Relevance to this studio |
| --- | --- | --- |
| [Second Home Studios: AMC True Crime Evidence Board](https://www.secondhomestudios.com/portfolio/amc-true-crime-evidence-board/) | The production description documents close-ups, oblique camera angles, physical travelling shots, pinned polaroids, evidence bags, newspaper clippings, mugshots, and string connections converging on a logo. It describes combining motion-control photography with a matched digital camera. The inspected still shows varied paper rotations, white photo borders, red strings, small yellow notes, neutral backing, and darker edges. | Layered evidence materials; clue-to-clue travel; angled board views; a final view exposing the complete web. Our renderer simulates these ideas in Canvas 2D. |
| [Videobolt / motionsparrow: Top Secret File Opener](https://videobolt.net/author/motionsparrow/top-secret-file-opener) | The product description lists cork texture, pushpins, red string, typewriter text, brush highlights, photo prints, editable images/text, and colour variants. | Modular editable clues, animated connections, configurable text reveals, and colour themes. We do not copy its project, media, soundtrack, or exact sequence. |
| [VideoHive / Making_Universes: Investigation Board](https://videohive.net/item/investigation-board/19627055) | The creator describes an editable project containing polaroids, documents, magazines, and newspapers, with media and text placeholders. | Several evidence formats belong on one board; an editable board should support replacing both imagery and wording. We do not use the paid project or its assets. |

Digital crime-board research also suggested labelled relationships, separate confirmed/suspected connections, and distinct entities for people, places, records, and questions. These informed our original editing model, rather than being a claim about a specific licensed animation template.

## Original motion and material catalogue

The application combines a board composition with independent clue, connection, and camera timelines. The templates are complete editable project data, not flattened reference videos. All example cases, people, dates, records, amounts, and accusations are fictional demonstration content.

### Sixteen editable starting templates

| Family | Template | Intended use and composition |
| --- | --- | --- |
| Red string | The Harbour Files | Cork investigation wall; shipment photo, warehouse, witness, incident log, route map, print card, and newspaper clipping. |
| Red string | The Final Connection | Three separate leads converge on one sealed exhibit, ending in a complete-board reveal. |
| Noir | Midnight Witness | Surveillance, witness account, key evidence, dark board, and warm working notes. |
| Noir | Surveillance Room | Three camera screens, a coverage map, event log, and a missing-frame question. |
| Relationships | The Suspect Web | Radial fictional suspect network, alibi records, shared room, and an unresolved access question. |
| Relationships | The Connection Wall | Dense cross-board links between people, a blackout report, locations, and one shared reference code. |
| Maps | The Vanishing Route | Two schematic map regions, location photos, journey times, and an unexplained stop. |
| Timelines | The Missing Minutes | A left-to-right sequence of recorded events, missing footage, and competing clocks. |
| Timelines | The Pocket Case | Portrait 1080 × 1920 composition with an upward-to-downward clue trail for Shorts/Reels. |
| Dossiers | Classified Dossier | Intelligence desk with folder, field observation, relay station, contact, and a recovered fragment. |
| Dossiers | Follow the Paper Trail | Contract, fictional transfer, invoice, address, signatory, and a missing ledger entry. |
| Archives | The 1936 Archive | Aged newspaper, unposted letter, station photo, branch map, and duplicate archive register. |
| Archives | Behind the Headline | Two competing newspaper accounts, source document, archive building, and the original file. |
| Whiteboard | Open Case Workshop | Bright observation → theory → verification sequence for clear documentary explanation. |
| Whiteboard | Research Blueprint | Claim, data, context, process map, test, and follow-up question. |
| Forensics | Forensic Table | Scene photo, two fingerprint exhibits, sealed evidence, and a comparison report. |

Each template supplies eight to ten editable clues, five to eight connections, and a continuous sequence of five or six camera shots. Landscape templates use a 2400 × 1350 board. The portrait template uses a 1350 × 2400 board. Most template introductions establish the board before visiting the clues and then returning to a wide view. The data model allows substantially different user-created compositions and timings.

### Eight material themes

Classic cork, Midnight noir, Blueprint, Archive linen, Whiteboard, Classified desk, Crimson velvet, and Graphite wall. Themes establish a coordinated background, paper, and accent palette. Individual clue colours remain editable. Cinematic surface controls include directional lighting, spotlight amount, vignette, grain, frame, header, and subtitle.

### Fourteen evidence element types

| Element | Customisation purpose |
| --- | --- |
| Polaroid photo | Imported photo or silent video; caption and metadata. |
| Sticky note | Question, working theory, note colour, and supporting text. |
| Case document | Report title, metadata, paragraphs, and paper colour. |
| Newspaper clipping | Publication title, headline, body, and supporting media. |
| Location map | Procedural schematic map or imported map image, plus labels. |
| Fingerprint card | Illustrative procedural print and editable specimen record. |
| Case folder | File title, case number, and archive notes. |
| Evidence label | Name strip, time label, or short exhibit caption. |
| Rubber stamp | Editable status, verdict, or classified mark. |
| Tape strip | Paper tape annotation. |
| Marker circle | Drawn attention ring with optional text. |
| Board text | Large title, clue, question, or time. |
| Evidence bag | Illustrative bag, exhibit label, and custody notes. |
| Surveillance screen | Imported silent footage or illustrative camera view and timestamp. |

The source contract mentioned “15 types” in one sentence, but its actual enumerated list contains fourteen. The implementation and the counts here use that enumerated list.

Shared clue data includes board position, size, rotation, opacity, depth, pin/tape treatment, locked state, title/caption, subtitle, body text, optional media, media fit/crop/zoom, entrance time, optional exit, and reveal duration. Procedural demo images are original illustrations, not photographs of real evidence. A schematic map is not geographic data; a decorative print is not a usable forensic record.

### Seven entrance animation choices

Pin, drop, fade, typewriter, slide, scale, and none. Entrance time and duration are separate from camera timing. The renderer uses deterministic progress so the same project time can be reproduced during export. Editing mode can display every clue fully revealed while the animation preview respects the selected time.

### Connections

Four styles: string, line, dashed line, and arrow. Each connection refers to two clue IDs, with editable label, colour, line width, start time, duration, and sag. Connection drawing progresses over time. The same labels can express a question, a confirmed association, a route, an amount, or a chronological relationship; the software does not determine whether the relationship is factually established.

### Eighteen cinematic camera presets

| Preset | Camera behaviour |
| --- | --- |
| Full board | Return to a level view of the entire composition. |
| Slow push in | Move from the preceding camera endpoint toward a selected clue. |
| Pull back reveal | Begin on a clue and widen to the board. |
| Clue to clue | Travel through three meaningful exhibits. |
| Oblique arc | Simulate an angled arc with board foreshortening and roll. |
| Follow the string | Travel through the first connection endpoints. |
| The big reveal | Close-up reading beat followed by a wide network reveal. |
| Whip to evidence | Short camera travel, then a readable hold. |
| Macro detail | Tight framing on one exhibit. |
| Documentary drift | Continuous irregular three-point movement. |
| Vertical scan | A top-to-bottom board move. |
| Slow lateral drift | A restrained horizontal editorial pass. |
| Suspect lineup | Equal close-up time for photo exhibits. |
| Timeline sweep | Left-to-right travel through the evidence. |
| Spiral to the answer | An angled approach and counter-roll, settling level. |
| Cinematic establish | Angled opening that settles into a wide view. |
| Locked camera | A still reading/narration beat. |
| Detail to context | Widen from a detail to its neighbouring evidence. |

Presets create ordinary editable shot data: duration, easing, and start/end positions, zoom, roll, and tilt. They are starting camera setups, not opaque prerecorded motion. Easing choices are linear, smooth, cinematic, ease-in, and ease-out. Adjacent template shot endpoints were checked for exact continuity. Some standalone presets deliberately open at their own framing, such as a macro or pull-back setup; inserting them after another shot may require matching the previous endpoint.

## Local studio references and preview lessons

Reference root: `C:\Users\chand\Desktop\clausd`.

| Local source | Purpose studied |
| --- | --- |
| `paper-transition-studio/src/index.html` | Existing self-contained studio shell, library/stage/inspector arrangement, controls. |
| `paper-transition-studio/src/styles.css` | Dark visual language, amber accents, panel density, phone layout. |
| `paper-transition-studio/src/ui/app.js` | Working app source found at this nested location: dirty-frame drawing, `requestAnimationFrame`, reduced phone preview resolution, hover thumbnail rendering only while hovered, timeline controls, saving, and media handling. The shorthand `paper-transition-studio/src/app.js` is not the path read. |
| `map-animation-studio/app/styles.css` | Existing map studio layout and responsive treatment. |
| `map-animation-studio/app/Stage.tsx` | Preview stage and quality control reference. |
| `map-animation-studio/src/lib/quality.ts` | Preview-only pixel ratio, tilted-plane pixel budget, and optional base-map reuse. |
| `map-animation-studio/PERF_HANDOFF.md` | Honest performance measurements and unresolved bottlenecks. |

The Paper studio paints only while playing or dirty, reduces phone canvas resolution, and animates a library thumbnail only during hover. These are useful principles for an offline evidence-board editor. The map studio separates preview quality from export quality and caps the pixel count of tilted planes. Detective Board Studio follows the same separation: preview resolution can be reduced while final exports use their requested output dimensions. Cacheable board materials and media avoid repeating expensive setup work every frame.

The map handoff reports improvement from approximately 690 ms/frame to **369 ms/frame** in a particular headless Chrome test at 1366 × 768, default Delhi-to-Mumbai project, Auto preview. The handoff explicitly says this remains unsmooth. That unresolved map benchmark is **not** proof of smooth detective-board playback, nor was it repaired as part of this catalogue. Detective-board timings and layout/export checks must be measured separately by the root agent. No physical-phone performance claim follows from a responsive layout or an emulated viewport alone.

## Rendering and artistic limits

- This is a deterministic Canvas 2D composition, with simulated tilt/foreshortening, roll, zoom, and parallax. An oblique arc is not a free-moving physical 3D camera.
- There is no optical depth of field, physically modelled lens, volumetric lighting, ray-traced paper, or automatically solved camera tracking.
- “Macro” changes framing. “Detail to context” changes framing; it is not an optical rack-focus effect.
- Decorative textures, fingerprints, maps, and fallback photo art are illustrative. Users can replace them with their own appropriate media.
- Video preview and browser encoding depend on browser codecs and device capabilities. Performance/export claims belong in the measured QA report, including what was actually tested.
- Silent animation is the intended output; detective-board sound effects are not added to the editing pipeline.

The catalogue defines a broad practical set of detective-board animation building blocks. It does not promise every possible animation genre, an After Effects feature clone, or reference footage recreation with exact optical matching.
