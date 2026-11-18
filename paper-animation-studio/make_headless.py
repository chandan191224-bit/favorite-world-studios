"""Copy the user's Paper Documentary Studio Pro and add a small window.__paper hook
so projects can be loaded and rendered frame-exactly (the original file is never changed).
Usage: python make_headless.py [path-to-paper-animation-studio-pro.html]"""
import sys, pathlib
src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\chand\Downloads\CONTENTS\TOOLS\paper-animation-studio-pro.html")
html = src.read_text(encoding="utf-8")
# Favorite World additions (black-bar highlight + SOURCE tag, 2026-11-15) go into both in-project copies
import fw_patches
html = fw_patches.apply(html)
# keep an in-project copy of the user's tool (with the additions; the original file itself is never changed)
(pathlib.Path(__file__).parent / "paper-animation-studio-pro.html").write_text(html, encoding="utf-8")
HOOK = r"""
  // ---- headless hook (added by studios/paper-animation-studio/make_headless.py) ----
  window.__paper = {
    async load(data) {
      pausePlayback();
      window.__BAND = data.band || 0;  // px hidden by cinema bars top+bottom: fit the page inside
      const settings = data.settings || {};
      for (const [id, val] of Object.entries(settings)) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.type === 'checkbox') el.checked = !!val; else el.value = String(val);
        el.dispatchEvent(new Event('change'));
      }
      pages = data.pages.map(p => ({ ...p, canvas: null, words: [], customPhotoImg: null }));
      for (let i = 0; i < data.pages.length; i++) {
        const src = data.pages[i].photoDataUrl;
        if (src) {
          const img = new Image();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
          pages[i].customPhotoImg = img;
          pages[i].photoType = 'custom';
        }
      }
      initialStackOrder = Array.isArray(data.initialStackOrder) ? data.initialStackOrder : pages.map((_, i) => i);
      targets = data.targets;
      activeEditPageIndex = 0;
      renderPageTabsDOM(); renderStackArrangerDOM(); loadActivePageIntoInputs(); renderTargetCardsDOM();
      await document.fonts.ready;
      syncLabelsAndRender(true);
      pausePlayback();
      return { duration: totalSequenceDuration, w: stageCanvas.width, h: stageCanvas.height,
               missing: computedSchedule.map((s, i) => (s && s.found === false) ? targets[i].phrase : null).filter(Boolean) };
    },
    duration() { return totalSequenceDuration; },
    frame(t, q) { currentTime = t; renderFrameAtTime(t); return stageCanvas.toDataURL('image/jpeg', q || 0.93); },
    schedule() { return computedSchedule; }
  };
"""
marker = "  // Initialize Studio"
assert marker in html, "marker not found - tool changed?"
html = html.replace(marker, HOOK + marker, 1)
# letterbox-aware framing: with data.band set, the whole page fits between the cinema bars (headless copy only)
FIT = "const fitDim = Math.min(W * 1.15, H * 0.94);"
assert html.count(FIT) == 2, "fitDim lines changed - tool changed?"
html = html.replace(FIT, "const fitDim = Math.min(W * 1.15, (H - 2 * (window.__BAND || 0)) * 0.94);")
# never start the audio engine / autoplay in headless runs
html = html.replace("    syncLabelsAndRender(true);\n    startPlayback();", "    syncLabelsAndRender(true);\n    if (!window.__HEADLESS) startPlayback();")
out = pathlib.Path(__file__).parent / "paper-studio-headless.html"
out.write_text(html, encoding="utf-8")
print("wrote", out)
