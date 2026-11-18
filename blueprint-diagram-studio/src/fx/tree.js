// FAMILY 6 — Trees & hierarchy: dynasty / family trees with portrait slots, names, years and
// marriage lines that grow; org charts (top post -> ministries -> departments); a camera that
// pans along a big tree and zooms to one person; a highlighted line of succession.
BD.fx.register({
  id: 'tree', name: 'Tree & hierarchy', fam: 'Trees & hierarchy',
  note: 'वंश वृक्ष — पीढ़ियाँ, नाम, साल, शादी की रेखाएँ; सरकारी/संगठन चार्ट; बड़े वृक्ष पर कैमरा पैन और ज़ूम; उत्तराधिकार की रेखा हाइलाइट। Family/dynasty trees with portraits and years, org charts, camera pan + zoom, succession highlight.',
  dur: 9,
  fields: [
    { k: 'title', label: 'Title', def: 'वंशावली' },
    { k: 'nodes', label: 'People (gen | नाम | साल | note)', multi: true, def: '1 | सम्राट प्रथम | 1526–1530 | संस्थापक\n2 | युवराज उत्तर | 1542–1555 |\n2 | शाहज़ादी रूप | 1545–1600 |\n3 | सम्राट द्वितीय | 1560–1605 | महान\n3 | सेनापति वीर | 1562–1620 |' },
    { k: 'marriages', label: 'Marriages (a-b, 1-based people)', multi: true, def: '1-2\n3-4' },
    { k: 'layerTimes', label: 'Layer timing (auto)', def: '' },
  ],
  params: [
    { k: 'theme', label: 'Theme', type: 'select', options: () => BD.themes.LIST, def: 'aged', sec: 'style' },
    { k: 'kind', label: 'Kind', type: 'select', options: () => [['dynasty', 'Dynasty / family tree'], ['org', 'Org / government chart'], ['bigtree', 'Big tree (pan + zoom)']], def: 'dynasty', sec: 'style' },
    { k: 'nodeStyle', label: 'Node style', type: 'select', options: () => [['card', 'Card'], ['lozenge', 'Lozenge'], ['circle', 'Circle portrait']], def: 'card', sec: 'style' },
    { k: 'portraitsOn', label: 'Portrait slots', type: 'check', def: true, sec: 'style' },
    { k: 'highlight', label: 'Succession highlight (people nos, e.g. 1,3)', type: 'text', def: '', sec: 'style' },
    { k: 'lineW', label: 'Line weight', type: 'range', min: 0.5, max: 2, step: 0.05, def: 1, sec: 'style' },
    { k: 'speed', label: 'Speed', type: 'range', min: 0.4, max: 2, step: 0.05, def: 1, sec: 'anim' },
    { k: 'hold', label: 'Hold at end (s)', type: 'range', min: 0, max: 4, step: 0.1, def: 2, sec: 'anim' },
    { k: 'labelSize', label: 'Name size', type: 'range', min: 18, max: 38, step: 1, def: 25, sec: 'labels' },
    { k: 'p1', label: 'Portrait 1', type: 'media', def: '', sec: 'media' },
    { k: 'p2', label: 'Portrait 2', type: 'media', def: '', sec: 'media' },
    { k: 'p3', label: 'Portrait 3', type: 'media', def: '', sec: 'media' },
    { k: 'p4', label: 'Portrait 4', type: 'media', def: '', sec: 'media' },
    { k: 'p5', label: 'Portrait 5', type: 'media', def: '', sec: 'media' },
    { k: 'p6', label: 'Portrait 6', type: 'media', def: '', sec: 'media' },
  ],
  _parse(f) {
    const nodes = BD.text.lines(f.nodes).map((s, i) => {
      const [gen, name, years, note] = s.split('|').map(x => (x || '').trim());
      return { i, gen: Math.max(1, parseInt(gen) || 1), name: name || '—', years: years || '', note: note || '' };
    });
    const mar = BD.text.lines(f.marriages).map(s => {
      const [a, b] = s.split('-').map(x => parseInt(x));
      return { a: (a || 1) - 1, b: (b || 1) - 1 };
    }).filter(m => m.a >= 0 && m.b >= 0 && m.a < nodes.length && m.b < nodes.length);
    return { nodes, mar };
  },
  layers(f, p, dur) {
    const end = BD.util.clamp((1 - (p.hold || 2) / dur) / (p.speed || 1), 0.3, 0.97);
    const { nodes } = this._parse(f);
    const gens = Math.max(1, ...nodes.map(nd => nd.gen));
    const sec = dur * end;
    return [{ name: 'Paper', start: 0, dur: 0.06 * sec }]
      .concat(Array.from({ length: gens }, (_, i) => ({ name: 'Generation ' + (i + 1), start: (0.1 + i * 0.7 / gens) * sec, dur: 0.6 * sec / gens + 0.12 * sec })))
      .concat([{ name: 'Highlight', start: 0.78 * sec, dur: 0.2 * sec }]);
  },
  // one person node: portrait slot + name + years (+note); prog 0..1
  _node(g, x, y, nd, prog, th, o = {}) {
    const U = BD.util, D = BD.draw;
    const fs = o.fs || 25;
    if (prog <= 0) return;
    const pop = U.ease.outBack(U.range(prog, 0, 0.55));
    g.save();
    g.globalAlpha *= U.range(prog, 0, 0.35);
    g.translate(x, y); g.scale(Math.max(0.02, pop), Math.max(0.02, pop));
    const w = o.w || 190, h = o.h || 74;
    if (o.style === 'circle') {
      const r = 46;
      // portrait circle with initials or photo
      const m = o.photo && o.photo.el && !o.photo.missing ? o.photo : null;
      g.beginPath(); g.arc(0, 0, r, 0, U.TAU);
      g.fillStyle = th.labelBg; g.fill(); g.lineWidth = 2.4 * (o.lineW || 1); g.strokeStyle = o.hl ? th.accent : th.ink; g.stroke();
      g.save(); g.beginPath(); g.arc(0, 0, r - 3, 0, U.TAU); g.clip();
      if (m) {
        const ew = m.el.naturalWidth || m.el.videoWidth || 100, eh = m.el.naturalHeight || m.el.videoHeight || 100;
        const k = Math.max((r * 2) / ew, (r * 2) / eh);
        g.drawImage(m.el, -ew * k / 2, -eh * k / 2, ew * k, eh * k);
      } else {
        g.fillStyle = 'rgba(128,128,140,.25)'; g.fillRect(-r, -r, r * 2, r * 2);
        D.text(g, 0, 0, nd.name.slice(0, 2), { font: th.fonts.label, fs: r * 0.8, color: th.ink, align: 'center', baseline: 'middle', weight: 'bold' });
      }
      g.restore();
      D.text(g, 0, r + 26, nd.name, { font: th.fonts.label, fs: fs * 0.8, color: o.hl ? th.accent : th.ink, weight: 'bold', align: 'center', prog: U.range(prog, 0.25, 0.8) });
      D.text(g, 0, r + 26 + fs * 0.8, nd.years, { font: th.fonts.mono, fs: fs * 0.55, color: th.ink2, align: 'center', alpha: 0.8, prog: U.range(prog, 0.35, 0.9) });
    } else {
      // card / lozenge
      if (o.style === 'lozenge') {
        g.beginPath();
        const k = h * 0.28;
        g.moveTo(-w / 2 + k, -h / 2); g.lineTo(w / 2 - k, -h / 2); g.lineTo(w / 2, 0); g.lineTo(w / 2 - k, h / 2); g.lineTo(-w / 2 + k, h / 2); g.lineTo(-w / 2, 0); g.closePath();
      } else U.rrect(g, -w / 2, -h / 2, w, h, 10);
      g.fillStyle = o.hl ? U.rgba('#e5a93c', 0.16) : th.labelBg; g.fill();
      g.lineWidth = 2.2 * (o.lineW || 1); g.strokeStyle = o.hl ? th.accent : th.ink; g.stroke();
      // portrait strip on the left
      if (o.portraits) {
        const pw = 54;
        g.save(); U.rrect(g, -w / 2 + 8, -h / 2 + 8, pw, h - 16, 8); g.clip();
        const m = o.photo && o.photo.el && !o.photo.missing ? o.photo : null;
        if (m) {
          const ew = m.el.naturalWidth || 100, eh = m.el.naturalHeight || 100;
          const kk = Math.max(pw / ew, (h - 16) / eh);
          g.drawImage(m.el, -w / 2 + 8 + (pw - ew * kk) / 2, -h / 2 + 8 + (h - 16 - eh * kk) / 2, ew * kk, eh * kk);
        } else {
          g.fillStyle = 'rgba(128,128,140,.25)'; g.fillRect(-w / 2 + 8, -h / 2 + 8, pw, h - 16);
          D.text(g, -w / 2 + 8 + pw / 2, 0, nd.name.slice(0, 1), { font: th.fonts.label, fs: 30, color: th.ink2, align: 'center', baseline: 'middle', weight: 'bold' });
        }
        g.restore();
      }
      const tx = o.portraits ? 16 : 0;
      D.text(g, tx, -h * 0.06, nd.name, { font: th.fonts.label, fs: fs * 0.82, color: o.hl ? th.accent : th.ink, weight: 'bold', align: 'center', prog: U.range(prog, 0.2, 0.75) });
      D.text(g, tx, h * 0.22, nd.years, { font: th.fonts.mono, fs: fs * 0.5, color: th.ink2, align: 'center', prog: U.range(prog, 0.3, 0.85) });
      if (nd.note) D.text(g, 0, h / 2 + 22, nd.note, { font: th.fonts.label, fs: fs * 0.5, color: th.ink2, align: 'center', alpha: U.range(prog, 0.5, 0.9) * 0.85, prog: U.range(prog, 0.55, 1) });
    }
    g.restore();
  },
  draw(g, o, lt, env) {
    const U = BD.util, D = BD.draw, T = BD.text;
    const { f, p } = o;
    const th = BD.themes.get(p.theme);
    const dur = env.dur;
    const end = U.clamp((1 - (p.hold || 2) / dur) / (p.speed || 1), 0.3, 0.97);
    const pr = U.clamp(lt / (dur * end));
    const fw = env.fw, fh = env.fh;
    const LW = p.lineW || 1;
    const fs = p.labelSize || 25;
    const { nodes, mar } = this._parse(f);
    if (!nodes.length) return;
    const gens = Math.max(1, ...nodes.map(nd => nd.gen));
    const hl = String(p.highlight || '').split(',').map(s => parseInt(s.trim())).filter(v => v >= 1).map(v => v - 1);

    g.save();
    g.globalAlpha *= U.clamp(pr * 12);

    // ---------- big tree: camera pans along a wide world, then pulls back ----------
    const elem = env.mode && env.mode !== 'composite'; // element export: ink only, no paper
    let zoomK = 1;
    const isBig = p.kind === 'bigtree';
    const worldW = isBig ? fw * 2.4 : fw;
    if (isBig) {
      const panP = U.range(pr, 0.08, 0.62);
      const back = U.range(pr, 0.78, 0.95);
      const panX = U.lerp(-worldW / 2 + fw * 0.55, worldW / 2 - fw * 0.55, U.ease.inOut(panP));
      // pull-back also re-centres the camera so the whole tree fits in the frame
      const cx = panX * (1 - U.ease.inOut(back));
      zoomK = U.lerp(1, 0.44, U.ease.inOut(back));
      g.save();
      // keep the camera aim point (cx, 0) at the frame centre: screen = T + z*world
      g.translate(-cx * zoomK, 0);
      g.scale(zoomK, zoomK);
      // paper + grid cover the whole VISIBLE world region at the widest zoom (constant size so the
      // cached paper texture is never rebuilt mid-zoom); at zoom 1 the extra is simply clipped
      const PW = fw / 0.42 + fw * 1.35, PH = fh / 0.42;
      if (!elem) {
      th.paper(g, -PW / 2, -PH / 2, PW, PH, env.seed);
      D.grid(g, -PW / 2, -PH / 2, PW, PH, { color: th.grid, majorColor: th.gridMajor, prog: U.range(pr, 0, 0.07), minor: 96, major: 480 });
      }
    } else {
      if (!elem) {
      th.paper(g, -fw / 2, -fh / 2, fw, fh, env.seed);
      D.grid(g, -fw / 2, -fh / 2, fw, fh, { color: th.grid, majorColor: th.gridMajor, prog: U.range(pr, 0, 0.07), minor: 96, major: 480 });
      }
    }

    // layout: generations in rows
    const rowH = Math.min(fh * 0.24, 240);
    const topY = -fh * 0.3 + rowH / 2 + (isBig ? 0 : fh * 0.05);
    const byGen = [];
    nodes.forEach(nd => { (byGen[nd.gen - 1] = byGen[nd.gen - 1] || []).push(nd); });
    const pos = new Map();
    byGen.forEach((row, gi) => {
      if (!row) return;
      const y = topY + gi * rowH;
      const wSeg = worldW / row.length;
      row.forEach((nd, j) => {
        const x = -worldW / 2 + wSeg * (j + 0.5);
        pos.set(nd.i, [x, y]);
      });
    });

    // connecting lines: each generation row drops from the row above's midpoints
    const drawProg = U.range(pr, 0.1, 0.7);
    byGen.forEach((row, gi) => {
      if (!row || gi === 0) return;
      const parentRow = byGen[gi - 1] || [];
      row.forEach((nd, j) => {
        const [x, y] = pos.get(nd.i);
        const pIdx = parentRow.length ? Math.min(parentRow.length - 1, Math.floor(j * parentRow.length / row.length)) : 0;
        const par = parentRow[pIdx];
        const [px, py] = pos.get(par.i);
        const sp = D.stagger(drawProg, j, row.length, 0.4);
        if (sp <= 0) return;
        // elbow: down from parent, across, down into child
        const midY = py + rowH * 0.5 - 14;
        const isHl = hl.includes(nd.i) && hl.includes(par.i);
        D.stroke(g, [[px, py + 40], [px, midY], [x, midY], [x, y - 44]], { w: (isHl ? 4 : 2.2) * LW, color: isHl ? th.accent : th.ink2, prog: sp, boil: th.wobble, seed: env.seed + nd.i, t: lt, alpha: isHl ? 1 : 0.85 });
      });
    });
    // marriage lines (double rule between two people of the same generation)
    const marP = U.range(pr, 0.22, 0.6);
    mar.forEach((m, i) => {
      const A = pos.get(m.a), B = pos.get(m.b);
      if (!A || !B) return;
      const sp = D.stagger(marP, i, Math.max(1, mar.length), 0.5);
      if (sp <= 0) return;
      const y = A[1] - 46;
      D.stroke(g, [[A[0] + 60, y], [B[0] - 60, y]], { w: 2 * LW, color: th.ink, prog: sp, boil: th.wobble, seed: env.seed + 60 + i, t: lt });
      D.stroke(g, [[A[0] + 60, y + 7], [B[0] - 60, y + 7]], { w: 1 * LW, color: th.ink, prog: sp, boil: th.wobble, seed: env.seed + 61 + i, t: lt });
      // hatch marks in the middle (union symbol)
      const mx = (A[0] + B[0]) / 2;
      for (let k = -1; k <= 1; k++) D.stroke(g, [[mx + k * 9, y - 6], [mx + k * 9 - 7, y + 13]], { w: 1.6 * LW, color: th.accent, prog: U.range(sp, 0.5, 1) });
    });

    // nodes pop per generation
    byGen.forEach((row, gi) => {
      if (!row) return;
      const gp = U.range(pr, 0.12 + gi * 0.55 / gens, 0.5 + gi * 0.42 / gens);
      row.forEach((nd, j) => {
        const sp = D.stagger(gp, j, row.length, 0.4);
        if (sp <= 0) return;
        const [x, y] = pos.get(nd.i);
        const photo = BD.media[p['p' + (j + 1 + gi * 3)] || ''] || null;
        this._node(g, x, y, nd, sp, th, {
          fs, style: p.nodeStyle || 'card', portraits: p.portraitsOn !== false && p.nodeStyle !== 'circle',
          photo, hl: hl.includes(nd.i), lineW: LW, w: isBig ? 170 : Math.min(190, (worldW / Math.max(2, row.length)) - 40),
        });
      });
    });
    if (isBig) g.restore(); // camera

    // title
    if (f.title) {
      const tp = U.range(pr, 0.6, 0.85);
      if (tp > 0) {
        D.text(g, -fw / 2 + 70, -fh / 2 + 84, f.title, { font: th.fonts.head, fs: 54, color: th.ink, weight: 'bold', alpha: tp, prog: U.range(tp, 0.1, 1) });
        D.line(g, -fw / 2 + 70, -fh / 2 + 104, -fw / 2 + 70 + 200 * U.range(tp, 0.4, 1), -fh / 2 + 104, { w: 4, color: th.accent });
      }
    }
    // generation / level labels on the left
    const gl = U.range(pr, 0.3, 0.6);
    if (gl > 0 && p.kind !== 'org') {
      byGen.forEach((row, gi) => {
        if (!row) return;
        D.text(g, -fw / 2 + 70, topY + gi * rowH + 8, env.lang === 'hi' ? 'पीढ़ी ' + (gi + 1) : 'GEN ' + (gi + 1), { font: th.fonts.mono, fs: 21, color: th.ink2, alpha: gl * 0.8, prog: U.range(gl, 0.2, 0.9) });
      });
    }
    if (gl > 0 && p.kind === 'org') {
      const L = env.lang === 'hi' ? ['शीर्ष पद', 'मंत्रालय', 'विभाग'] : ['TOP POST', 'MINISTRIES', 'DEPARTMENTS'];
      byGen.forEach((row, gi) => {
        if (!row) return;
        D.text(g, -fw / 2 + 70, topY + gi * rowH + 8, L[Math.min(gi, 2)] + (gi > 2 ? ' ' + (gi + 1) : ''), { font: th.fonts.mono, fs: 21, color: th.ink2, alpha: gl * 0.8, prog: U.range(gl, 0.2, 0.9) });
      });
    }
    g.restore();
  },
});
