# Hook Editor Studio Pro (Favorite World)

Offline-first YouTube Documentary Hook Editor & Beat-Sync Auto-Editor built in the exact Map Animation Studio Pro family.
Studied from 33 real viral Hindi documentary hooks (Dhruv Rathee, Nitish Rajput, The Deshbhakt) saved in `production/style/hook-references/`.

## Open it
- **PC (offline double-click):** `Start Hook Studio.cmd` or open `Hook Editor Studio Pro.html` directly.
- **Phone (same Wi-Fi):** run `Open On Phone.cmd` (`node serve.mjs --lan`, port `7412`) and open the printed `http://<PC-IP>:7412` URL.

## Core workflow
1. **Upload Visuals & Audio:** Drag/drop photos or Flow clips (`.jpg`, `.png`, `.mp4`), plus your BGM music and Voiceover (`.mp3`/`.wav`).
2. **One-Click Auto-Edit Hook (`⚡ Auto-Edit Hook`):**
   - Automatically detects BGM BPM, beat grid, downbeats, bass/kick transients & voiceover pauses.
   - Snaps shot cuts, beat-pulse zooms, camera shakes, light-leaks, and transitions directly to BGM beats & pauses.
   - Auto-ducks BGM to `-22 dB` under voiceover speech and swells to `-12 dB` in pauses / cold opens.
   - Chooses non-repeating motions & transitions in 4 tuned profiles: `Favorite World Hybrid`, `Nitish Thriller`, `Dhruv Mystery`, `Deshbhakt Rapid`.
3. **100% Manual Customizability:**
   - Every shot duration, assigned visual, motion preset (12 presets), transition (9 transitions), zoom/pan/tension, overlay (8 types: `COMING UP NEXT`, Impact Title, Highlighter Doc Card, Stat Pop, Callout, Lower Third, Skewed Banner, Timeline Bar), font (`Bebas Neue`, `Khand Hindi`, `Mukta Hindi`, `Kalam Handwritten`), position (drag right on canvas!), and audio mix dB is editable.
4. **Offline Export:** Export full composite MP4 (with mixed BGM + Voiceover audio via WebCodecs + Mediabunny) OR transparent `.webm` / green / blue screen overlays for CapCut layers.

## CLI / `/make-video` pipeline
See `production/HOOK_EDITOR_STUDIO.md` and `python production/pipeline/hook_fx.py --help`.

## Rebuild HTML
```
node studios/hook-editor-studio/build.mjs
```
