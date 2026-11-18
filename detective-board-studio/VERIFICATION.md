# Verification — Detective Board Studio Pro

Verified 30 October 2026 using the installed headless Chrome and local FFmpeg. No paid API or hosted render service used.

## Functional checks

35 primary checks and 11 advanced checks passed. Evidence is in test-output/qa-report.json and qa-advanced.json. Covered all 16 templates, all 18 camera presets, data consistency, precise camera inverse projection, deterministic frames, laptop layout, editing, undo/redo, direct clue drag, embedded image import, JSON roundtrip, IndexedDB custom templates, camera endpoint edits and matching, export cancellation, phone tabs, touch drag/pinch and 390px/360px overflow. No browser console errors in those tests.

Video imports were decoded and advanced at different timestamps. One video reused in two clues retained independent in-points (0.6s versus 1.1s). A failed media load preserved the current project.

## Sustained playback

Two-second playback sample on the Connection Wall template, Auto preview. These are scheduled playback measurements, separate from Canvas command submission benchmarks.

| Test | Preview pixels | Measured playback | Mean draw submission |
| --- | --- | --- | --- |
| Laptop Auto | 775 × 436 | 30.4 fps | 0.82 ms |
| Phone Auto with 4x CPU | 370 × 208 | 29.6 fps | 5.34 ms |

The phone test uses a 390 × 844 viewport and Chrome 4× CPU throttling. It is not a physical-phone measurement. Rates vary with hardware, board complexity, source videos and background load. Initial cache construction may briefly take longer than a warm frame.

Warm render benchmarks also cover every template at 960 × 540 and 480 × 270 / 4× CPU. They measure Canvas command submission, not end-to-end display FPS. Do not substitute them for sustained playback.

Found and fixed during testing: synchronous thumbnail generation stalled phone playback; pre-rendered library previews removed this work. The original frame cap discarded timing remainder; preserving the remainder prevents cadence drift. Cached paper shadows, pins, tape, titles, labels and atmosphere reduce per-frame native canvas work.

## Visual review

Viewed the AMC full-board reference still; opened primary reference descriptions. Visually reviewed all template and camera contact sheets at 25%, 45%, 65%, 85%, desktop and phone screenshots, every element on a 1080p sheet, a cinematic close-up and a portrait frame. Corrected portrait camera targets to keep the featured clue in frame. All templates use fictional text and original procedural demo artwork. Source videos were not claimed watched.

## Export evidence

- Browser H.264 MP4 and VP9/VP8 WebM sample files: 12 frames each at 960 × 540 / 24 fps; decoded successfully.
- PNG alpha canvas has genuinely transparent background pixels. Green/blue backgrounds are exact #00FF00 / #0000FF; matte pixels are grayscale.
- PNG sequence ZIP CRC validated with Python zipfile; four PNG frames plus README.
- PC VP9 alpha WebM: six frames at 640 × 360 / 24 fps. Decoding with libvpx-vp9 recovered 146131 fully transparent pixels and 70552 opaque pixels in the first frame.
- PC demo MP4: eight seconds, 240 frames at 1280 × 720 / 30 fps, silent; all frames decoded. See test-output/Detective Board Demo.mp4.
- LAN server serves the self-contained app and rejects parent-path access. Its served app boots without console errors.

## Limits not claimed tested

A real handset, Safari/iOS video encoders, long 4K exports, very large media-heavy boards, and this laptop's interactive visible browser session were not physically tested. The user can open the app to check their exact hardware. Browser alpha video is routed to PNG/ZIP or the PC renderer. Camera tilt is 2D foreshortening; there is no full 3D scene, optical depth-of-field or arbitrary camera-curve editor. Custom camera paths use consecutive editable shots.
