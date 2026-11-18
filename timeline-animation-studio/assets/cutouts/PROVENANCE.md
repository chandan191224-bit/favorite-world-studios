# Camera cutout demo artwork

Created for the documentary timeline studio craft rebuild using the built-in **image_gen.imagegen** tool, with `transparent_background: true` in three separate calls. No API key, paid API, CLI fallback, third-party stock download or raster-editing script was used. The PNGs were copied unchanged from the native generation output into this project.

These are **original AI-generated illustrative product images**, not archival photographs or claims about particular historical models, brands or exact dates. Use an unobtrusive “Illustrative camera study” disclosure in the demo/project metadata. Replace them with sourced episode-specific material when factual historical precision is required.

## Files and inspection

| Project asset | Native output source | Inspection |
|---|---|---|
| `bellows-camera.png` | `C:/Users/chand/.codex/generated_images/01a18d1b-f71c-79c0-9773-00a6b0ab408f/exec-e83694d8-204c-4a31-8c8e-6e53e55bbdeb.png` | RGBA, 1382×1138; alpha extrema 0–255; corner alpha 0. Complete folding camera, leather/bellows/brass detail, full object visible. |
| `slr-camera.png` | `C:/Users/chand/.codex/generated_images/01a18d1b-f71c-79c0-9773-00a6b0ab408f/exec-0bef616f-73c6-4169-bcc7-b1b5a474ea4f.png` | RGBA, 1536×1024; alpha extrema 0–254; corner and tested margin pixels alpha 0; subject alpha about 253–254. Detailed black/chrome SLR, glass reflections and mechanical dials. |
| `mirrorless-camera.png` | `C:/Users/chand/.codex/generated_images/01a18d1b-f71c-79c0-9773-00a6b0ab408f/exec-524d50d7-4337-4267-a110-dbde11c1e94b.png` | RGBA, 1536×1024; alpha extrema 0–254; corner alpha 0. Detailed matte black mirrorless-style body and large glass lens, complete object visible. |

The native tool outputs were visually inspected as generated. Pillow was used only to read PNG mode, dimensions and alpha-channel statistics; no image pixels were edited. Two outputs use near-opaque subject alpha (253–254 rather than 255); their exterior is genuinely transparent. Preserve the supplied alpha when embedding and rendering.

## Alpha cleanup inspection

The initial standalone image previews appeared to show grey haze around the SLR and mirrorless bodies. Pixel inspection distinguishes hidden RGB from visible alpha: the original SLR's exterior at `(100,100)`, `(120,500)`, `(700,10)`, `(1200,60)`, `(1480,500)` and `(700,1000)` all has **alpha 0**, even where hidden RGB is grey. Those pixels are invisible under correct Canvas alpha compositing. A nonzero hidden RGB value is not by itself evidence of a composited halo. The studio should retain normal alpha compositing and must not threshold away real edge detail based on RGB brightness.

One non-destructive native cleanup edit was made before this distinction was established:

- Project sibling: `slr-camera-clean.png`.
- Native source: `C:/Users/chand/.codex/generated_images/01a18d1b-f71c-79c0-9773-00a6b0ab408f/exec-21d88767-9b45-4a93-9db9-6115194e135a.png`.
- Tool: built-in `image_gen.imagegen`, target `assets/cutouts/slr-camera.png`, `transparent_background: true`.
- Exterior alpha at the six probes listed above remains 0. The original is preserved. The edit may slightly reinterpret surface detail, so use the original when fidelity to the first generated subject is preferred.
- Further mirrorless cleanup generation was stopped at the parent's request; no `mirrorless-camera-clean.png` is claimed or required. Judge the original in an actual light/dark Canvas composite.

### Exact prompt — non-destructive SLR cleanup

> Edit target: the supplied local PNG of the black-and-chrome SLR camera. Preserve the camera itself exactly: silhouette, proportions, mechanical parts, leather, chrome, lens glass, all highlights and details. This is precise background extraction only. Remove ALL diffuse grey haze, bloom, halo and backdrop pixels around the camera. Every pixel not belonging to the physical camera must have alpha zero, including the grey glow above the prism, around both sides and below the lens/body. Preserve clean anti-aliased natural edges and the tiny gaps/holes in strap rings; do not erode real camera parts. The result is a crisp photographic product cutout on a genuinely transparent alpha background, suitable for compositing over black, white or saturated yellow without any cloudy surrounding patch. No added shadows, glow, floor, replacement background, checkerboard, text or new object. Keep resolution and framing consistent with the target.

## Exact prompt — bellows camera

> Use case: product-mockup. Create one exceptionally detailed photorealistic editorial product cutout: an early-twentieth-century unbranded black leather folding bellows camera, brass lens housing, mechanically credible folding rails, fine leather grain and aged metal. Front three-quarter view, camera facing slightly left, complete object visible with 15 percent transparent margin, centered, sober neutral monochrome materials with restrained warm brass, soft directional studio light from upper left. Genuine transparent alpha background; no floor, pedestal, cast-ground shadow, room, backdrop or checkerboard. Crisp delicate natural object edges, dimensional museum-quality product photography. No typography, numbers, labels, watermark, logos or identifiable brand. No vector/cartoon/toy/pictogram appearance. Original illustrative historical camera art for a documentary timeline, not a claim about a specific historical camera model.

## Exact prompt — SLR camera

> Use case: product-mockup. Create one exceptionally detailed photorealistic editorial product cutout: a mid-century unbranded black-and-chrome 35mm SLR photographic camera with a mechanically credible glass lens, precise knurled metal dials, shutter button, winding lever, fine black leatherette grain, restrained realistic wear. Front three-quarter view, lens facing slightly left, complete camera body and lens visible, centered with 15 percent transparent margin. Same sober museum-quality product photography aesthetic as a premium historical collection: soft directional studio light from upper left, neutral black/silver materials, fine machining visible. Genuine transparent alpha background. No floor, pedestal, cast-ground shadow, room, backdrop or checkerboard. Crisp delicate natural object edges. No typography, numbers, labels, watermark, logos or identifiable brand. No vector/cartoon/toy/pictogram appearance. Original illustrative camera art for a documentary timeline, not a claim about a specific historical camera model.

## Exact prompt — mirrorless camera

> Use case: product-mockup. Create one exceptionally detailed photorealistic editorial product cutout: a modern unbranded black digital mirrorless photographic camera with a precision glass lens, credible controls and knurled adjustment dials, textured matte body, delicate realistic highlights along engineered edges, visible clean lens reflections. Front three-quarter view with lens facing slightly left, full object visible, centered with generous 15 percent transparent margin. Consistent museum-quality product photography for a camera-history collection, soft directional light from upper left, sober neutral black materials. Genuine transparent alpha background with clean natural edges. No floor, pedestal, cast-ground shadow, room, backdrop, haze or checkerboard. No typography, numbers, labels, watermark, logos or identifiable brand. No vector, cartoon, toy or pictogram appearance. Original illustrative camera art for a documentary timeline, not a claim about a particular product model.
