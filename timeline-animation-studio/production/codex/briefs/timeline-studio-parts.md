# Timeline Studio implementation briefs

The shared exact data/drawing contract is ../../../CONTRACT.md (from the studio root: CONTRACT.md).

Renderer worker: read CONTRACT.md, research/REFERENCE_CATALOGUE.md when available and the existing Detective renderer for implementation patterns. Create only src/core/renderer.js. Deterministic Canvas2D; 18 geometries; five camera modes; bounded labels; seeded cached textures; real embedded photos; exact key/alpha/matte; positions must match drawing. No runtime network and no audio. Check syntax, then root visually reviews every preset.

Template worker: create only src/ui/templates.js. Cover every geometry, at least30presets, eight themes and five camera presets. Full JSON-serializable fresh project objects; unique ids; last entrances finish around90–95% of project duration. Original illustrative demo text or verified space dates. Root owns UI/export and integration.

Research worker: create only research/*. Download bounded video-only samples, extract time-labelled contact sheets and inspect them. Separate watched portions from text-only/unavailable sources. Catalogue geometry, timing, easing, reveals and camera behavior; link primary creators and factual sources. Do not ship source video imagery as editor assets.

Root review: syntax, all-template four-phase sheets, desktop/phone screenshots, real editing/drag/import/undo, portable saves, sustained preview timing, actual MP4/WebM decoding and decoded VP9 alpha. No claim of physical-phone testing.
