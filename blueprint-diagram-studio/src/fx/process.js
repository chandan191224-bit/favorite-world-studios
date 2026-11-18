// FAMILY 5 — Process & flow: step boxes connected by arrows that draw on in sequence; pipelines
// with moving dots (money/goods/water flowing along the lines); cycles; cause->effect chains;
// funnels; step timelines; before->after mechanisms; decision trees / flowcharts with yes/no.
BD.fx.register({
  id: 'process', name: 'Process & flow', fam: 'Process & flow',
  note: 'कदम-दर-कदम बॉक्स और तीर जो क्रम से खिंचते हैं; पाइपलाइन में बहते हुए बिंदु; चक्र; कारण-परिणाम; फ़नल; टाइमलाइन; पहले-बाद; फ़्लोचार्ट। Steps, arrows, flowing pipelines, cycles, chains, funnels, timelines, before/after and decision trees.',
  dur: 7,
  fields: [
    { k: 'title', label: 'Title', def: 'कैसे काम करता है' },
    { k: 'items', label: 'Items (हिंदी | ENGLISH per line)', multi: true, def: 'कच्चा माल | RAW\nभंडारण | STORE\nउत्पादन | BUILD\nवितरण | DELIVER' },
    { k: 'sub', label: 'Sub note', def: 'PROCESS FLOW' },
  ],
  params: [
    { k: 'theme', label: 'Theme', type: 'select', options: () => BD.themes.LIST, def: 'clean', sec: 'style' },
    { k: 'kind', label: 'Diagram kind', type: 'select', options: () => [
      ['steps', 'Step boxes + arrows'], ['pipeline', 'Pipeline with flow'], ['cycle', 'Cycle / loop'], ['chain', 'Cause → effect chain'],
      ['funnel', 'Funnel'], ['timeline', 'Timeline of steps'], ['beforeafter', 'Before → after'], ['flow', 'Decision flowchart'],
    ], def: 'steps', sec: 'style' },
    { k: 'boxStyle', label: 'Box style', type: 'select', options: () => [['fill', 'Filled'], ['outline', 'Outline'], ['soft', 'Soft fill']], def: 'soft', sec: 'style' },
    { k: 'lineW', label: 'Line weight', type: 'range', min: 0.5, max: 2, step: 0.05, def: 1, sec: 'style' },
    { k: 'speed', label: 'Speed', type: 'range', min: 0.4, max: 2, step: 0.05, def: 1, sec: 'anim' },
    { k: 'hold', label: 'Hold at end (s)', type: 'range', min: 0, max: 4, step: 0.1, def: 1.6, sec: 'anim' },
    { k: 'dotSpeed', label: 'Flow speed (px/s)', type: 'range', min: 60, max: 420, step: 10, def: 200, sec: 'anim' },
    { k: 'labelsOn', label: 'Show text', type: 'check', def: true, sec: 'labels' },
    { k: 'labelSize', label: 'Text size', type: 'range', min: 18, max: 40, step: 1, def: 27, sec: 'labels' },
    { k: 'numbers', label: 'Number the steps', type: 'check', def: true, sec: 'labels' },
  ],
  layers(f, p, dur) {
    const end = BD.util.clamp((1 - (p.hold || 1.6) / dur) / (p.speed || 1), 0.3, 0.97);
    const n = Math.max(1, BD.text.lines(f.items).length);
    const sec = dur * end;
    return [{ name: 'Frame', start: 0, dur: 0.08 * sec }]
      .concat(Array.from({ length: n }, (_, i) => ({ name: 'Step ' + (i + 1), start: (0.1 + i * 0.8 / n) * sec, dur: 0.7 * sec / n + 0.1 * sec })))
      .concat([{ name: 'Title', start: 0.72 * sec, dur: 0.2 * sec }]);
  },
  // rounded box that draws + text that types in
  _box(g, x, y, w, h, txt, sub, prog, th, o = {}) {
    const U = BD.util, D = BD.draw, T = BD.text;
    const fs = o.fs || 27;
    const bp = U.clamp(prog);
    if (bp <= 0) return;
    const pop = o.pop === false ? 1 : U.ease.outBack(U.range(bp, 0, 0.5));
    g.save();
    g.globalAlpha *= U.range(bp, 0, 0.3);
    g.translate(x + w / 2, y + h / 2); g.scale(Math.max(0.02, pop), Math.max(0.02, pop)); g.translate(-x - w / 2, -y - h / 2);
    U.rrect(g, x, y, w, h, o.r == null ? 12 : o.r);
    const style = o.boxStyle || 'soft';
    if (style === 'fill') { g.fillStyle = o.accent ? th.accent : th.ink; g.fill(); }
    else if (style === 'soft') { g.fillStyle = th.labelBg; g.fill(); }
    g.lineWidth = (o.w || 2.4) * (o.lineW || 1);
    g.strokeStyle = o.accent ? th.accent : th.ink;
    g.stroke();
    const ink = style === 'fill' ? (th.dark ? '#101418' : '#fff') : th.ink;
    // fit the text
    let s = fs;
    const fontS = T.font(th.fonts.label, s, 'bold');
    const m = T.measure(txt, fontS);
    if (m.w > w * 0.84) s = s * (w * 0.84) / m.w;
    if (o.num != null) D.numbered(g, x + 26, y + h / 2, o.num, { r: Math.min(20, h * 0.22), prog: U.range(bp, 0.1, 0.5), color: th.accent, ink: th.dark ? '#101418' : '#fff', bg: 'rgba(0,0,0,.4)' });
    D.text(g, x + w / 2 + (o.num != null ? 12 : 0), y + h / 2 + (sub ? -6 : s * 0.36), txt, { font: th.fonts.label, fs: s, color: ink, weight: 'bold', align: 'center', prog: U.range(bp, 0.3, 0.85), alpha: 1 });
    if (sub) D.text(g, x + w / 2 + (o.num != null ? 12 : 0), y + h / 2 + s * 0.62, sub, { font: th.fonts.mono, fs: s * 0.6, color: ink, alpha: 0.65, align: 'center', prog: U.range(bp, 0.45, 0.95) });
    g.restore();
  },
  draw(g, o, lt, env) {
    const U = BD.util, D = BD.draw, T = BD.text;
    const { f, p } = o;
    const th = BD.themes.get(p.theme);
    const dur = env.dur;
    const end = U.clamp((1 - (p.hold || 1.6) / dur) / (p.speed || 1), 0.3, 0.97);
    const pr = U.clamp(lt / (dur * end));
    const fw = env.fw, fh = env.fh;
    const LW = p.lineW || 1;
    const items = T.lines(f.items).map(s => { const [t, sub] = s.split('|'); return { t: (t || '').trim(), sub: (sub || '').trim() }; });
    const n = Math.max(1, items.length);
    const fs = p.labelSize || 27;

    g.save();
    g.globalAlpha *= U.clamp(pr * 12);
    const elem = env.mode && env.mode !== 'composite'; // element export: ink only, no paper
    if (!elem) {
    th.paper(g, -fw / 2, -fh / 2, fw, fh, env.seed);
    if (p.kind !== 'pipeline') D.grid(g, -fw / 2, -fh / 2, fw, fh, { color: th.grid, majorColor: th.gridMajor, prog: U.range(pr, 0, 0.08), minor: 96, major: 480 });
    }
    const box = (...a) => this._box(g, ...a);
    const arrow = (x1, y1, x2, y2, prog, head) => D.arrow(g, x1, y1, x2, y2, { w: 3 * LW, color: th.ink, prog, head: head || 'arrow', headS: 15 * LW, glow: th.glow ? 0.5 : 0, trim: 16 });

    // title
    if (f.title) {
      const tp = U.range(pr, 0.62, 0.85);
      if (tp > 0) D.text(g, 0, -fh / 2 + 78, f.title, { font: th.fonts.head, fs: 52, color: th.ink, weight: 'bold', align: 'center', alpha: tp, prog: U.range(tp, 0.1, 1) });
    }

    if (p.kind === 'steps') {
      const cols = n <= 4 ? n : Math.ceil(n / 2);
      const rows = Math.ceil(n / cols);
      const bw = Math.min(fw * 0.8 / cols - 24, fw * 0.24), bh = Math.min(fh * 0.2, 130);
      const x0 = -((cols * (bw + 64) - 64) / 2), y0 = -fh * 0.06 - (rows * (bh + 90) - 90) / 2 + fh * 0.04;
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / cols), c = i % cols;
        const x = x0 + c * (bw + 64), y = y0 + r * (bh + 90);
        const sp = D.stagger(U.range(pr, 0.12, 0.85), i, n, 0.4);
        box(x, y, bw, bh, items[i].t, items[i].sub, sp, th, { fs, boxStyle: p.boxStyle, lineW: LW, num: p.numbers !== false ? i + 1 : null });
        if (c < cols - 1 && i + 1 < n) {
          const ap = D.stagger(U.range(pr, 0.16, 0.9), i, n, 0.4);
          arrow(x + bw + 8, y + bh / 2, x + bw + 56, y + bh / 2, U.range(ap, 0.4, 1));
        }
      }
    } else if (p.kind === 'pipeline') {
      // source -> pipe with stations -> sink, dots flow along it
      const y = fh * 0.08, x0 = -fw * 0.36, x1 = fw * 0.36;
      const line = U.range(pr, 0.08, 0.5);
      // pipe (double line)
      D.line(g, x0, y - 26, x1, y - 26, { w: 3.4 * LW, color: th.ink, prog: line, glow: th.glow ? 0.5 : 0 });
      D.line(g, x0, y + 26, x1, y + 26, { w: 3.4 * LW, color: th.ink, prog: U.range(pr, 0.12, 0.56) });
      // source + sink tanks
      box(x0 - 120, y - 46, 96, 92, items[0].t, items[0].sub, U.range(pr, 0.05, 0.2), th, { fs: fs * 0.8, boxStyle: p.boxStyle, lineW: LW, pop: true });
      const last = items[n - 1];
      box(x1 + 24, y - 46, 96, 92, last.t, last.sub, U.range(pr, 0.4, 0.62), th, { fs: fs * 0.8, boxStyle: p.boxStyle, lineW: LW, accent: true });
      // stations on the pipe
      const mid = items.slice(1, n - 1);
      const st = mid.length ? mid : [{ t: '', sub: '' }];
      const stn = st.length;
      st.forEach((it, i) => {
        const sx = U.lerp(x0 + 120, x1 - 120, stn === 1 ? 0.5 : i / (stn - 1));
        const sp = D.stagger(U.range(pr, 0.18, 0.66), i, stn, 0.5);
        if (sp <= 0) return;
        g.save(); g.globalAlpha *= U.range(sp, 0, 0.4);
        g.beginPath(); g.arc(sx, y, 34, 0, U.TAU);
        g.fillStyle = th.labelBg; g.fill(); g.lineWidth = 3 * LW; g.strokeStyle = th.ink; g.stroke();
        g.restore();
        // station label above/below
        const above = i % 2 === 0;
        D.leader(g, sx, y + (above ? -34 : 34), above ? sx : sx, above ? y - 96 : y + 96, {
          text: it.t, sub: it.sub, prog: U.range(sp, 0.3, 1), th, fs: fs * 0.85,
          side: above ? 'left' : 'left', color: th.ink2, marker: 'none', run: 40, seed: env.seed + i, t: lt,
        });
      });
      // flowing dots
      const dp = U.range(pr, 0.35, 0.55);
      if (dp > 0) D.dots(g, [[x0, y], [x1, y]], { speed: p.dotSpeed || 200, r: 9, color: th.accent, gap: 130, t: lt, prog: dp, glow: th.glow ? 0.9 : 0.4, pulse: true });
      // direction arrow at the end
      arrow(x1 - 60, y, x1 + 10, y, U.range(pr, 0.4, 0.6), 'arrow');
    } else if (p.kind === 'cycle') {
      const cx = 0, cy = fh * 0.04, R = Math.min(fw, fh) * 0.26;
      const ring = U.range(pr, 0.1, 0.5);
      // circular arrows between nodes
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * U.TAU - Math.PI / 2, a1 = ((i + 1) / n) * U.TAU - Math.PI / 2;
        const ap = D.stagger(U.range(pr, 0.14, 0.72), i, n, 0.5);
        if (ap <= 0) continue;
        const pts = [];
        for (let k = 0; k <= 22; k++) { const a = U.lerp(a0 + 0.14, a1 - 0.14, k / 22); pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
        D.arrowCurve(g, pts, { w: 3 * LW, color: th.ink, prog: ap, headS: 16 * LW, trim: 18, glow: th.glow ? 0.5 : 0 });
      }
      // nodes
      items.forEach((it, i) => {
        const sp = D.stagger(U.range(pr, 0.2, 0.85), i, n, 0.5);
        if (sp <= 0) return;
        const a = (i / n) * U.TAU - Math.PI / 2;
        const bx = cx + Math.cos(a) * R - 62, by = cy + Math.sin(a) * R - 34;
        box(bx, by, 124, 68, it.t, it.sub, sp, th, { fs: fs * 0.78, boxStyle: p.boxStyle, lineW: LW, num: p.numbers !== false ? i + 1 : null, r: 34 });
      });
      // centre label
      if (f.title) {
        const tp = U.range(pr, 0.55, 0.8);
        if (tp > 0) D.text(g, cx, cy, f.title, { font: th.fonts.head, fs: 44, color: th.ink, weight: 'bold', align: 'center', alpha: tp, prog: U.range(tp, 0.1, 1) });
      }
      // slow rotation hint during hold
      const rot = U.range(pr, 0.9, 1);
      if (rot > 0 && pr >= 1) {
        g.save(); g.globalAlpha *= 0.25;
        g.strokeStyle = th.ink2; g.lineWidth = 2 * LW; g.setLineDash([10, 16]); g.lineDashOffset = -(lt * 40) % 260;
        g.beginPath(); g.arc(cx, cy, R - 62, 0, U.TAU); g.stroke(); g.restore();
      }
    } else if (p.kind === 'chain') {
      const bh = Math.min(fh * 0.15, 110), bw = Math.min(fw * 0.5, 640);
      const y0 = -fh * 0.3;
      const gap = Math.min(fh * 0.11, 76);
      items.slice(0, 5).forEach((it, i) => {
        const sp = D.stagger(U.range(pr, 0.1, 0.85), i, n, 0.42);
        const y = y0 + i * (bh + gap);
        box(-bw / 2, y, bw, bh, it.t, it.sub, sp, th, { fs, boxStyle: i === n - 1 && p.boxStyle !== 'fill' ? 'fill' : p.boxStyle, lineW: LW, num: p.numbers !== false ? i + 1 : null, accent: i === n - 1 });
        if (i < n - 1 && i < 4) arrow(0, y + bh + 6, 0, y + bh + gap - 10, U.range(sp, 0.5, 1));
      });
    } else if (p.kind === 'funnel') {
      const cx = -fw * 0.08, top = -fh * 0.3;
      const w0 = fw * 0.5, hStep = Math.min(fh * 0.14, 92);
      items.slice(0, 5).forEach((it, i) => {
        const sp = D.stagger(U.range(pr, 0.12, 0.85), i, n, 0.42);
        if (sp <= 0) return;
        const w1 = w0 * (1 - i / (n + 1.2)), w2 = w0 * (1 - (i + 1) / (n + 1.2));
        const y = top + i * hStep;
        const poly = [[cx - w1 / 2, y], [cx + w1 / 2, y], [cx + w2 / 2, y + hStep - 12], [cx - w2 / 2, y + hStep - 12]];
        g.save();
        g.globalAlpha *= U.range(sp, 0, 0.3);
        const pop = U.ease.outBack(U.range(sp, 0, 0.55));
        g.translate(cx, y + hStep / 2); g.scale(pop, 1); g.translate(-cx, -(y + hStep / 2));
        g.beginPath(); poly.forEach((q, j) => j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
        g.fillStyle = th.labelBg; g.fill();
        g.lineWidth = 2.6 * LW; g.strokeStyle = th.ink; g.stroke();
        D.text(g, cx, y + hStep / 2 + fs * 0.3, it.t, { font: th.fonts.label, fs: fs * 0.85, color: th.ink, weight: 'bold', align: 'center', prog: U.range(sp, 0.35, 0.9) });
        g.restore();
        // value label on the right
        D.leader(g, cx + w2 / 2, y + hStep - 12, cx + w0 * 0.62, y + hStep - 12, {
          text: it.t, sub: it.sub, prog: U.range(sp, 0.5, 1), th, fs: fs * 0.8, side: 'right', color: th.ink2, marker: 'none', run: 30, seed: env.seed + i, t: lt,
        });
      });
      if (f.sub) D.text(g, cx, top - 40, f.sub, { font: th.fonts.mono, fs: 24, color: th.ink2, align: 'center', alpha: U.range(pr, 0.3, 0.5) });
    } else if (p.kind === 'timeline') {
      const y = fh * 0.1, x0 = -fw * 0.38, x1 = fw * 0.38;
      D.line(g, x0, y, x1, y, { w: 3.6 * LW, color: th.ink, prog: U.range(pr, 0.06, 0.5), glow: th.glow ? 0.5 : 0 });
      arrow(x1 - 70, y, x1 + 20, y, U.range(pr, 0.4, 0.55));
      items.forEach((it, i) => {
        const sp = D.stagger(U.range(pr, 0.15, 0.85), i, n, 0.4);
        if (sp <= 0) return;
        const x = U.lerp(x0 + 60, x1 - 90, n === 1 ? 0.5 : i / (n - 1));
        const above = i % 2 === 0;
        // tick
        D.line(g, x, y - 12, x, y + 12, { w: 3 * LW, color: th.accent, prog: U.range(sp, 0, 0.3) });
        // stem + card
        const stemL = above ? -fh * 0.16 : fh * 0.16;
        D.line(g, x, y + (above ? -12 : 12), x, y + stemL * 0.7, { w: 2 * LW, color: th.ink2, prog: U.range(sp, 0.1, 0.5), dash: [8, 6] });
        box(x - 88, y + stemL * 0.7 - 34, 176, 68, it.t, it.sub, U.range(sp, 0.4, 1), th, { fs: fs * 0.8, boxStyle: p.boxStyle, lineW: LW, num: p.numbers !== false ? i + 1 : null });
        if (p.numbers !== false) D.numbered(g, x, y, i + 1, { r: 20, prog: U.range(sp, 0, 0.3), color: th.accent, ink: th.dark ? '#101418' : '#fff', bg: 'rgba(0,0,0,.5)' });
      });
    } else if (p.kind === 'beforeafter') {
      const bw = fw * 0.36, bh = fh * 0.44, y = -fh * 0.16;
      // BEFORE panel
      const bl = D.stagger(U.range(pr, 0.08, 0.4), 0, 2, 0);
      box(-fw * 0.44, y, bw, bh, items[0].t, items[0].sub, bl, th, { fs: fs * 1.05, boxStyle: p.boxStyle, lineW: LW });
      D.text(g, -fw * 0.44 + bw / 2, y + bh + 56, env.lang === 'hi' ? 'पहले' : 'BEFORE', { font: th.fonts.head, fs: 34, color: th.ink2, weight: 'bold', align: 'center', alpha: U.range(bl, 0.4, 1), prog: U.range(bl, 0.5, 1) });
      // AFTER panel: wipes in
      const al = U.range(pr, 0.4, 0.75);
      if (al > 0) {
        g.save();
        g.beginPath(); g.rect(fw * 0.06, y - 20, (bw + 40) * U.ease.inOut(al), bh + 40); g.clip();
        box(fw * 0.06 + 20, y, bw, bh, items[Math.min(1, n - 1)].t, items[Math.min(1, n - 1)].sub, 1, th, { fs: fs * 1.05, boxStyle: p.boxStyle, lineW: LW, accent: true });
        g.restore();
        // wipe edge
        if (al < 1) { g.fillStyle = th.accent; g.fillRect(fw * 0.06 + (bw + 40) * U.ease.inOut(al) - 3, y - 20, 6, bh + 40); }
      }
      D.text(g, fw * 0.06 + 20 + bw / 2, y + bh + 56, env.lang === 'hi' ? 'बाद' : 'AFTER', { font: th.fonts.head, fs: 34, color: th.accent, weight: 'bold', align: 'center', alpha: U.range(al, 0.4, 1), prog: U.range(al, 0.5, 1) });
      // big arrow between
      arrow(-fw * 0.44 + bw + 20, y + bh / 2, fw * 0.06 - 6, y + bh / 2, U.range(pr, 0.32, 0.5), 'arrow');
      if (n > 2) {
        // change captions under each
        D.text(g, -fw * 0.44 + bw / 2, y - 26, items[2].t, { font: th.fonts.label, fs: fs * 0.8, color: th.ink, align: 'center', alpha: U.range(pr, 0.5, 0.65), prog: U.range(pr, 0.55, 0.8) });
        if (n > 3) D.text(g, fw * 0.06 + 20 + bw / 2, y - 26, items[3].t, { font: th.fonts.label, fs: fs * 0.8, color: th.accent, align: 'center', alpha: U.range(pr, 0.6, 0.75), prog: U.range(pr, 0.65, 0.9) });
      }
    } else if (p.kind === 'flow') {
      // start -> action -> decision -> yes (result) / no (loop back)
      const bw = fw * 0.2, bh = fh * 0.11;
      const cx = 0, y0 = -fh * 0.32;
      const lab = i => items[Math.min(i, n - 1)];
      // start
      const s0 = D.stagger(U.range(pr, 0.1, 0.8), 0, 5, 0.35);
      box(cx - bw / 2, y0, bw, bh, lab(0).t, lab(0).sub, s0, th, { fs: fs * 0.85, boxStyle: 'fill', lineW: LW });
      arrow(cx, y0 + bh + 8, cx, y0 + bh + 44, U.range(s0, 0.5, 1));
      // action
      const y1 = y0 + bh + 52;
      const s1 = D.stagger(U.range(pr, 0.1, 0.8), 1, 5, 0.35);
      box(cx - bw / 2, y1, bw, bh, lab(1).t, lab(1).sub, s1, th, { fs: fs * 0.85, boxStyle: p.boxStyle, lineW: LW, num: 1 });
      arrow(cx, y1 + bh + 8, cx, y1 + bh + 44, U.range(s1, 0.5, 1));
      // decision diamond
      const y2 = y1 + bh + 52, dw = fw * 0.19, dh = fh * 0.14;
      const s2 = D.stagger(U.range(pr, 0.1, 0.8), 2, 5, 0.35);
      if (s2 > 0) {
        g.save(); g.globalAlpha *= U.range(s2, 0, 0.3);
        const pop = U.ease.outBack(U.range(s2, 0, 0.5));
        g.translate(cx, y2 + dh / 2); g.scale(pop, pop); g.translate(-cx, -(y2 + dh / 2));
        const dia = [[cx, y2], [cx + dw / 2, y2 + dh / 2], [cx, y2 + dh], [cx - dw / 2, y2 + dh / 2]];
        g.beginPath(); dia.forEach((q, j) => j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
        g.fillStyle = th.labelBg; g.fill(); g.lineWidth = 2.6 * LW; g.strokeStyle = th.accent; g.stroke();
        D.text(g, cx, y2 + dh / 2 + 5, lab(2).t, { font: th.fonts.label, fs: fs * 0.72, color: th.ink, weight: 'bold', align: 'center', prog: U.range(s2, 0.3, 0.8) });
        g.restore();
      }
      // yes branch (right)
      const s3 = D.stagger(U.range(pr, 0.1, 0.8), 3, 5, 0.35);
      const y3 = y2 + dh + 40;
      D.arrowCurve(g, [[cx + dw / 2, y2 + dh / 2], [cx + fw * 0.16, y2 + dh / 2], [cx + fw * 0.16, y3 - 12]], { w: 3 * LW, color: th.ink, prog: U.range(s3, 0.2, 0.7), headS: 15 * LW, trim: 16 });
      D.text(g, cx + dw / 2 + 14, y2 + dh / 2 - 14, env.lang === 'hi' ? 'हाँ' : 'YES', { font: th.fonts.label, fs: fs * 0.7, color: th.ok || '#22c55e', weight: 'bold', alpha: U.range(s3, 0.1, 0.4) });
      box(cx + fw * 0.16 - bw / 2, y3, bw, bh, lab(3).t, lab(3).sub, s3, th, { fs: fs * 0.8, boxStyle: 'fill', lineW: LW, accent: true });
      // no branch loops back to the action box
      const s4 = D.stagger(U.range(pr, 0.1, 0.8), 4, 5, 0.35);
      if (s4 > 0) {
        const nx = cx - fw * 0.16;
        D.arrowCurve(g, [[cx - dw / 2, y2 + dh / 2], [nx, y2 + dh / 2], [nx, y1 + bh / 2], [cx - bw / 2 - 14, y1 + bh / 2]], { w: 3 * LW, color: th.ink, prog: U.range(s4, 0.2, 0.8), headS: 15 * LW, trim: 16, dash: [12, 8] });
        D.text(g, cx - dw / 2 - 14, y2 + dh / 2 - 14, env.lang === 'hi' ? 'नहीं' : 'NO', { font: th.fonts.label, fs: fs * 0.7, color: '#ef7a72', weight: 'bold', align: 'right', alpha: U.range(s4, 0.1, 0.4) });
        if (n > 4) box(nx - bw * 0.36, y2 + dh / 2 - 34, bw * 0.72, 68, lab(4).t, lab(4).sub, U.range(s4, 0.6, 1), th, { fs: fs * 0.68, boxStyle: 'soft', lineW: LW });
      }
    }
    g.restore();
  },
});
