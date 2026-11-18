"""Favorite World additions to Paper Documentary Studio Pro (2026-11-15, from Gemini's Dhruv Rathee analysis, Part A3).

Adds, idempotently, to the in-project copies (the user's original in Downloads is never changed):
  1. Annotation style "invert" = Dhruv-style black highlight bar with white text: a straight bar wipes across each
     line of the phrase and turns the paper black and the ink white (difference + desaturate, so it works on any
     paper tone).
  2. A per-target "Source tag" (target.source): a small "SOURCE: ..." badge bottom-right of the frame while that
     highlight is on screen (fades in at the highlight, out after its hold). Stays above the cinema bars (band).

Usage:  python fw_patches.py            -> patches paper-animation-studio-pro.html + paper-studio-headless.html
make_headless.py calls apply() too, so a rebuild from the original keeps these additions.
Project JSON: {"style": "invert", "source": "IIC Japan"} on a target. Old projects are unaffected.
"""
import pathlib
import sys

TAG = "/* fw-patch:invert-source v1 */"

INVERT_OPTION = """<option value="invert" ${t.style === 'invert' ? 'selected' : ''}>⬛ Black Bar, White Text</option>"""

INVERT_BRANCH = """} else if (style === 'invert') {
      // Black bar + white text (Dhruv-style): invert the paper under a straight bar that wipes each line,
      // then strip the hue so any paper tone becomes black and the ink becomes white.
      for (const box of sched.lineBoxes) {
        if (progress <= box.startFrac) continue;
        const lineLocal = clamp01((progress - box.startFrac) / (box.endFrac - box.startFrac));
        const easedLine = easeOutQuart(lineLocal);
        const padX = 6;
        const padY = 3;
        const bx = box.x1 - padX;
        const by = box.y - padY;
        const bw = (box.width + padX * 2) * easedLine;
        const bh = box.h + padY * 1.6;
        if (bw <= 0.5) continue;
        targetCtx.globalCompositeOperation = 'difference';
        targetCtx.fillStyle = '#ffffff';
        targetCtx.fillRect(bx, by, bw, bh);
        targetCtx.globalCompositeOperation = 'saturation';
        targetCtx.fillStyle = '#808080';
        targetCtx.fillRect(bx, by, bw, bh);
      }
    } else if (style === 'underline') {"""

BADGE_FN = TAG + """
  // SOURCE badge (bottom-right) while a target with a source tag is highlighted. Screen space, above cinema bars.
  function fwDrawSourceBadge(W, H, t) {
    let best = null, bestA = 0;
    for (const sched of computedSchedule) {
      if (!sched || !sched.target || !sched.found) continue;
      const src = String(sched.target.source || '').trim();
      if (!src) continue;
      const t0 = sched.hlStart - 0.1, t1 = sched.holdEnd;
      if (t < t0 || t > t1 + 0.35) continue;
      const a = Math.min(1, Math.max(0, (t - t0) / 0.35)) * Math.min(1, Math.max(0, (t1 + 0.35 - t) / 0.35));
      if (a > bestA) { bestA = a; best = src; }
    }
    if (!best || bestA <= 0.01) return;
    const label = /^source\\s*:/i.test(best) ? best.toUpperCase() : ('SOURCE: ' + best.toUpperCase());
    const band = window.__BAND || 0;
    const size = Math.round(H * 0.0205);
    ctx.save();
    ctx.globalAlpha = bestA;
    ctx.font = `600 ${size}px "Instrument Sans", sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    const tw = ctx.measureText(label).width;
    const padX = size * 0.6, ph = size * 1.7;
    const x2 = W - Math.round(W * 0.022), cy = H - band - Math.round(H * 0.035) - ph / 2;
    ctx.fillStyle = 'rgba(8, 8, 10, 0.62)';
    ctx.fillRect(x2 - tw - padX * 2, cy - ph / 2, tw + padX * 2, ph);
    ctx.fillStyle = '#f4f2ec';
    ctx.fillText(label, x2 - padX, cy + 1);
    ctx.restore();
  }

  function drawAnnotationByStyle(targetCtx, sched, progress) {"""

SOURCE_INPUT = """placeholder="Paste phrase from any page..." />
        </div>
        <div>
          <label>Source tag (bottom-right while highlighted, e.g. IIC Japan)</label>
          <input type="text" data-field="source" value="${escapeHtml(t.source || '')}" placeholder="Optional - shows SOURCE: ... in the corner" />"""

PATCHES = [
    ("Redact Bar</option>", "Redact Bar</option>\n              " + INVERT_OPTION),
    ("} else if (style === 'underline') {", INVERT_BRANCH),
    ("if (['phrase', 'color', 'pageSelect', 'style', 'focusOverride'].includes(field)) {",
     "if (['phrase', 'color', 'pageSelect', 'style', 'focusOverride', 'source'].includes(field)) {"),
    ('placeholder="Paste phrase from any page..." />', SOURCE_INPUT),
    ("drawPostProcessEffects(W, H, t);", "drawPostProcessEffects(W, H, t);\n    fwDrawSourceBadge(W, H, t);"),
    ("  function drawAnnotationByStyle(targetCtx, sched, progress) {", "  " + BADGE_FN),
]


def apply(html: str) -> str:
    if TAG in html:
        return html  # already patched
    for old, new in PATCHES:
        if html.count(old) != 1:
            raise SystemExit(f"fw_patches: anchor not found once ({html.count(old)}x): {old[:70]!r} - tool changed?")
        html = html.replace(old, new, 1)
    return html


def main() -> None:
    here = pathlib.Path(__file__).parent
    for name in ("paper-animation-studio-pro.html", "paper-studio-headless.html"):
        f = here / name
        html = f.read_text(encoding="utf-8")
        out = apply(html)
        if out == html:
            print("already patched:", f.name)
        else:
            f.write_text(out, encoding="utf-8")
            print("patched:", f.name)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
