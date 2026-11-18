// Core screen contents by Claude: your photo/video, search typing -> results, encyclopedia article scroll with highlight,
// video player, news broadcast frame, phone notifications. Generic looks only; every name is editable.
(() => {
  const { register, P } = SM.content, U = SM.util, F = SM.font, C = SM.chrome;
  const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);

  // ---------- photo / video ----------
  register({
    id: 'media', name: 'Your photo / video', family: 'device', icon: '🖼',
    params: [P.media('media', 'Photo or video'), P.select('fit', 'Fit', { cover: 'Fill screen', contain: 'Fit inside' }, 'cover'), P.range('kb', 'Slow zoom (Ken Burns)', 0, 0.3, 0.01, 0.06), P.bool('statusBar', 'Phone status bar', false)],
    statusBar: false,
    draw(g, e) {
      g.fillStyle = '#000'; g.fillRect(0, 0, e.W, e.H);
      C.drawCover(g, e.media('media'), 0, 0, e.W, e.H, { fit: e.P.fit, zoom: e.P.kb * e.p, seed: e.seed });
    },
  });

  // ---------- search: typing + suggestions -> results ----------
  const searchTimes = (e) => {
    const q = e.P.query, n = U.glen(q), d = e.dur;
    const tType0 = 0.5, tType1 = Math.min(d * 0.48, tType0 + n * (0.09 / (e.P.speed || 1)));
    const tClick = Math.min(d * 0.62, tType1 + 0.55), tRes = tClick + 0.25;
    return { tType0, tType1, tClick, tRes, n };
  };
  function searchLayout(e) {
    const tall = e.tall, W = e.W, H = e.H;
    const bw = tall ? W - 36 : Math.min(760, W * 0.56), bh = tall ? 50 : 54;
    return { tall, bw, bh, bx: (W - bw) / 2, by: tall ? H * 0.3 : H * 0.36, logoY: tall ? H * 0.22 : H * 0.27 };
  }
  register({
    id: 'search', name: 'Search typing → results', family: 'web', icon: '🔍', browser: 'search.example/',
    params: [P.text('query', 'Search text', 'India China border dispute'), P.textarea('suggest', 'Suggestions (one per line)', 'india china border dispute explained\nindia china border dispute map\nindia china border dispute 2026\nindia china border history'),
      P.text('brand', 'Search engine name', 'Search'), P.textarea('results', 'Results: Title | site | snippet', 'India–China border dispute — overview | encyclopedia.example | The border between the two countries is about 3,488 km long and has never been fully agreed...\nWhat is the Line of Actual Control? | news.example | A plain-language guide to the de facto border, its three sectors and why talks keep stalling.\nTimeline of talks since 1962 | archive.example | Every round of talks, agreement and stand-off, in order.'),
      P.range('pick', 'Highlight result #', 0, 3, 1, 1), P.range('speed', 'Typing speed', 0.5, 2.5, 0.1, 1), P.bool('dark', 'Dark mode', false), P.bool('showResults', 'Go to results page', true), P.bool('cursor', 'Mouse cursor', true)],
    lightStatus: true,
    focus(e) {
      const L = searchLayout(e), T = searchTimes(e);
      if (e.P.showResults && e.t >= 0) { const top = e.tall ? 120 : 150, rh = e.tall ? 150 : 128, i = Math.max(1, e.P.pick || 1) - 1; return { x: e.tall ? 10 : 150, y: top + i * rh - 16, w: e.tall ? e.W - 20 : Math.min(820, e.W - 220), h: rh - 6 }; }
      return { x: L.bx - 10, y: L.by - 10, w: L.bw + 20, h: L.bh + 20 };
    },
    draw(g, e) {
      const P0 = e.P, T = C.theme(P0.dark), L = searchLayout(e), tm = searchTimes(e), t = e.t;
      g.fillStyle = T.bg; g.fillRect(0, 0, e.W, e.H);
      const results = P0.showResults && t >= tm.tRes, q = P0.query;
      const fadeR = U.ease.out(U.clamp((t - tm.tRes) / 0.45));
      if (!results || fadeR < 1) {
        g.save(); g.globalAlpha = 1 - fadeR;
        // logo (generic multi-colour wordmark)
        const cols = ['#e5a93c', '#d9534f', '#3fb68b', '#5b8def'];
        g.font = F(800, L.tall ? 44 : 64); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        const word = U.graphemes(P0.brand || 'Search'); let wx = e.W / 2 - g.measureText(P0.brand || 'Search').width / 2;
        word.forEach((ch, i) => { g.fillStyle = cols[i % 4]; g.fillText(ch, wx, L.logoY); wx += g.measureText(ch).width; });
        // box
        const typedN = U.clamp((t - tm.tType0) / Math.max(0.01, tm.tType1 - tm.tType0)) * tm.n;
        const txt = U.typed(q, typedN), sug = lines(P0.suggest).slice(0, L.tall ? 5 : 6);
        const showSug = typedN >= Math.min(3, tm.n) && sug.length;
        const sugK = showSug ? U.ease.out(U.clamp((typedN - 3) / 3)) : 0, rowH = L.tall ? 44 : 42;
        const listH = showSug ? (sug.length * rowH + 14) * sugK : 0;
        g.shadowColor = 'rgba(0,0,0,.18)'; g.shadowBlur = 18; g.shadowOffsetY = 4;
        g.fillStyle = P0.dark ? '#22262f' : '#fff'; U.rr(g, L.bx, L.by, L.bw, L.bh + listH, L.bh / 2 > 24 && !listH ? L.bh / 2 : 24); g.fill();
        g.shadowColor = 'transparent'; g.strokeStyle = T.line; g.lineWidth = 1; g.stroke();
        // magnifier
        g.strokeStyle = T.sub; g.lineWidth = 2.2; g.beginPath(); g.arc(L.bx + 28, L.by + L.bh / 2 - 2, 8, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(L.bx + 34, L.by + L.bh / 2 + 4); g.lineTo(L.bx + 40, L.by + L.bh / 2 + 10); g.stroke();
        g.fillStyle = T.text; g.font = F(400, L.tall ? 18 : 20); g.textBaseline = 'middle';
        g.fillText(txt, L.bx + 56, L.by + L.bh / 2 + 1, L.bw - 90);
        if (Math.floor(t * 2.2) % 2 === 0 || (t > tm.tType0 && t < tm.tType1)) { const cw = g.measureText(txt).width; g.fillStyle = T.accent; g.fillRect(L.bx + 58 + Math.min(cw, L.bw - 92), L.by + L.bh / 2 - 12, 2, 24); }
        if (listH > 2) {
          g.save(); U.rr(g, L.bx, L.by, L.bw, L.bh + listH, 24); g.clip();
          g.strokeStyle = T.line; g.beginPath(); g.moveTo(L.bx + 20, L.by + L.bh); g.lineTo(L.bx + L.bw - 20, L.by + L.bh); g.stroke();
          const hov = t > tm.tType1 + 0.15 ? 0 : -1;
          sug.forEach((s, i) => {
            const y = L.by + L.bh + 7 + i * rowH;
            if (i === hov) { g.fillStyle = P0.dark ? '#2c313c' : '#f1f3f6'; g.fillRect(L.bx, y, L.bw, rowH); }
            g.strokeStyle = T.faint; g.lineWidth = 1.6; g.beginPath(); g.arc(L.bx + 28, y + rowH / 2 - 1, 6, 0, Math.PI * 2); g.stroke();
            const pre = U.typed(s, U.glen(txt));
            g.font = F(400, L.tall ? 16 : 17); g.fillStyle = T.text; g.textBaseline = 'middle'; g.fillText(pre, L.bx + 56, y + rowH / 2);
            const pw = g.measureText(pre).width; g.font = F(800, L.tall ? 16 : 17); g.fillText(s.slice(pre.length), L.bx + 56 + pw, y + rowH / 2, L.bw - 80 - pw);
          });
          g.restore();
        }
        if (!showSug && !L.tall) { // buttons under the box
          g.font = F(600, 15); g.textAlign = 'center';
          [[P0.brand + ' search', -96], ['Feeling curious', 96]].forEach(([s, dx]) => { g.fillStyle = T.panel; U.rr(g, e.W / 2 + dx - 82, L.by + L.bh + 36, 164, 38, 8); g.fill(); g.fillStyle = T.text; g.fillText(s, e.W / 2 + dx, L.by + L.bh + 56); });
        }
        if (P0.cursor) {
          const sx = L.bx + L.bw * 0.4, sy = L.by + L.bh + 7 + rowH / 2;
          C.cursor(g, [{ t: 0, x: e.W * 0.78, y: e.H * 0.82 }, { t: 0.45, x: L.bx + L.bw * 0.3, y: L.by + L.bh / 2, click: true }, { t: tm.tType1, x: L.bx + L.bw * 0.34, y: L.by + L.bh * 1.6 }, { t: tm.tClick, x: sx, y: sy, click: true }], t, { scale: L.tall ? 1.1 : 1.15 });
        }
        g.restore();
      }
      if (results) {
        g.save(); g.globalAlpha = fadeR; g.translate(0, (1 - fadeR) * 30);
        const res = lines(P0.results).map(l => l.split('|').map(x => x.trim()));
        const lx = L.tall ? 18 : 150, top = L.tall ? 120 : 150, rh = L.tall ? 150 : 128, w = L.tall ? e.W - 36 : Math.min(820, e.W - 220);
        // header bar with query
        g.fillStyle = T.bg; g.fillRect(0, 0, e.W, top - 40);
        g.font = F(800, L.tall ? 24 : 30); g.fillStyle = '#5b8def'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(P0.brand || 'Search', L.tall ? 18 : 40, 46);
        const hx = L.tall ? 18 : 170, hw = L.tall ? e.W - 36 : Math.min(700, e.W - 340), hy = L.tall ? 70 : 24;
        g.fillStyle = P0.dark ? '#22262f' : '#fff'; g.strokeStyle = T.line; U.rr(g, hx, hy, hw, 44, 22); g.fill(); g.stroke();
        g.fillStyle = T.text; g.font = F(400, 17); g.fillText(q, hx + 22, hy + 23, hw - 40);
        g.strokeStyle = T.line; g.beginPath(); g.moveTo(0, top - 30); g.lineTo(e.W, top - 30); g.stroke();
        g.fillStyle = T.faint; g.font = F(400, 13); g.fillText('About 1,24,00,000 results (0.41 seconds)', lx, top - 12);
        res.slice(0, L.tall ? 5 : 6).forEach((r, i) => {
          const y = top + 18 + i * rh, k = U.ease.out(U.clamp((t - tm.tRes - 0.15 - i * 0.12) / 0.4));
          g.save(); g.globalAlpha = fadeR * k; g.translate(0, (1 - k) * 18);
          const hl = (P0.pick || 0) === i + 1 && t > tm.tRes + 0.9;
          if (hl) { g.fillStyle = U.rgba('#e5a93c', 0.14 * U.clamp((t - tm.tRes - 0.9) / 0.4)); U.rr(g, lx - 14, y - 26, w + 28, rh - 8, 12); g.fill(); g.strokeStyle = U.rgba('#e5a93c', 0.7 * U.clamp((t - tm.tRes - 0.9) / 0.4)); g.lineWidth = 2; g.stroke(); }
          g.fillStyle = T.panel; g.beginPath(); g.arc(lx + 12, y - 4, 12, 0, Math.PI * 2); g.fill();
          g.fillStyle = T.sub; g.font = F(600, 11); g.textAlign = 'center'; g.fillText((r[1] || 'site')[0].toUpperCase(), lx + 12, y - 4); g.textAlign = 'left';
          g.fillStyle = T.text; g.font = F(400, 13); g.fillText(r[1] || '', lx + 32, y - 10, w - 40);
          g.fillStyle = T.faint; g.font = F(400, 12); g.fillText('https://' + (r[1] || '') + ' › …', lx + 32, y + 6, w - 40);
          g.fillStyle = T.link; g.font = F(600, L.tall ? 19 : 21); g.fillText(r[0] || '', lx, y + 34, w);
          C.para(g, r[2] || '', lx, y + 62, w, { size: L.tall ? 14 : 15, color: T.sub, maxLines: 2 });
          g.restore();
        });
        g.restore();
      }
    },
  });

  // ---------- encyclopedia article: scroll, highlight, zoom-to-line ----------
  function articleLayout(g, e) {
    const tall = e.tall, pad = tall ? 18 : 70, side = tall ? 0 : 230, ibW = tall ? 0 : 300;
    const colX = pad + side, colW = e.W - colX - pad - (ibW ? ibW + 30 : 0);
    const items = [];
    let y = tall ? 70 : 110;
    items.push({ k: 'title', y }); y += tall ? 30 : 30;
    items.push({ k: 'rule', y }); y += 18;
    items.push({ k: 'from', y }); y += tall ? 30 : 34;
    if (tall) { items.push({ k: 'photo', y, h: e.W * 0.62 }); y += e.W * 0.62 + 44; }
    g.font = F(400, tall ? 17 : 19, 'serif');
    const lh = (tall ? 17 : 19) * 1.62;
    let hl = null, n = 0;
    lines(e.P.body).forEach((para, pi) => {
      if (para.startsWith('## ')) { y += 16; items.push({ k: 'h2', y, text: para.slice(3) }); y += 40; return; }
      const ws = U.wrap(g, para, colW);
      ws.forEach(l => { n++; items.push({ k: 'line', y, text: l, n }); if (n === (+e.P.hl || 0)) hl = { x: colX - 6, y: y - lh * 0.72, w: Math.min(colW + 12, g.measureText(l).width + 12), h: lh }; y += lh; });
      y += lh * 0.5;
    });
    return { tall, pad, side, ibW, colX, colW, items, total: y + 80, hl, lh };
  }
  const MEAS = () => (MEAS.c || (MEAS.c = U.canvas(4, 4).getContext('2d')));
  register({
    id: 'article', name: 'Encyclopedia article scroll', family: 'web', icon: '📖', browser: 'encyclopedia.example/wiki/Article',
    params: [P.text('title', 'Article title', 'Line of Actual Control'), P.text('site', 'Site name', 'The Free Encyclopedia'), P.media('media', 'Infobox photo'), P.text('caption', 'Photo caption', 'A border post in the eastern sector'),
      P.textarea('body', 'Text (## = heading)', 'The Line of Actual Control (LAC) is the de facto border between India and China. It is not a legally agreed line: it is simply the line each side actually controls on the ground.\nThe LAC is about 3,488 km long and is divided into three sectors: western, middle and eastern.\n## History\nAfter the 1962 war, both armies stayed roughly where the fighting stopped. Several agreements since 1993 tried to keep the peace without settling where the line really is.\nBecause the two sides see the line differently, patrols often meet in areas both consider their own. This is why stand-offs keep happening.\n## Why it matters\nThe dispute affects trade, roads, water and the lives of the people who live in the border villages.'),
      P.range('hl', 'Highlight line #', 0, 12, 1, 4), P.range('scroll', 'Scroll amount', 0, 1, 0.05, 0.45), P.range('hlAt', 'Highlight starts at', 0, 1, 0.05, 0.55), P.select('hlColor', 'Highlighter', { '#ffe066': 'Yellow', '#e5a93c': 'Amber', '#7ee2a8': 'Green', '#ff9eb5': 'Pink' }, '#ffe066'), P.bool('dark', 'Dark mode', false)],
    lightStatus: true,
    focus(e) { const L = articleLayout(MEAS(), e); const sc = this._scroll(e, L); return L.hl ? { x: L.hl.x, y: L.hl.y - sc, w: L.hl.w, h: L.hl.h } : { x: L.colX, y: e.H * 0.3, w: L.colW, h: e.H * 0.2 }; },
    _scroll(e, L) { const max = Math.max(0, L.total - e.H); const want = L.hl ? U.clamp(L.hl.y - e.H * 0.4, 0, max) : max * e.P.scroll; return want * Math.min(1, e.P.scroll * 2.2) * U.ease.inOut(U.clamp(e.p / Math.max(0.05, e.P.hlAt))); },
    draw(g, e) {
      const T = C.theme(e.P.dark), L = articleLayout(g, e), sc = this._scroll(e, L);
      g.fillStyle = T.bg; g.fillRect(0, 0, e.W, e.H);
      g.save(); g.translate(0, -sc);
      if (!L.tall) {
        // left sidebar with a generic globe logo and links
        g.fillStyle = T.text; g.strokeStyle = T.sub; g.lineWidth = 1.5; g.beginPath(); g.arc(L.pad + 70, 70, 34, 0, Math.PI * 2); g.stroke();
        for (const r of [0.45, 0.85]) { g.beginPath(); g.ellipse(L.pad + 70, 70, 34 * r, 34, 0, 0, Math.PI * 2); g.stroke(); }
        g.beginPath(); g.moveTo(L.pad + 36, 70); g.lineTo(L.pad + 104, 70); g.stroke();
        g.font = F(700, 15, 'serif'); g.textAlign = 'center'; g.fillText('ENCYCLOPEDIA', L.pad + 70, 128); g.font = F(400, 12, 'serif'); g.fillText(e.P.site, L.pad + 70, 146);
        g.textAlign = 'left'; g.font = F(400, 14); g.fillStyle = T.link;
        ['Main page', 'Contents', 'Current events', 'Random article', 'About', 'Contact'].forEach((s, i) => g.fillText(s, L.pad + 10, 200 + i * 28));
      }
      for (const it of L.items) {
        if (it.k === 'title') { g.fillStyle = T.text; g.font = F(400, L.tall ? 28 : 36, 'serif'); g.textAlign = 'left'; g.fillText(e.P.title, L.colX, it.y); }
        if (it.k === 'rule') { g.fillStyle = T.line; g.fillRect(L.colX, it.y, e.W - L.colX - L.pad, 1); }
        if (it.k === 'from') { g.fillStyle = T.sub; g.font = F(400, 14); g.fillText('From ' + e.P.site, L.colX, it.y); }
        if (it.k === 'photo') { C.drawCover(g, e.media('media'), L.colX, it.y, L.colW, it.h, { seed: e.seed }); g.fillStyle = T.sub; g.font = F(400, 13); g.fillText(e.P.caption, L.colX, it.y + it.h + 22, L.colW); }
        if (it.k === 'h2') { g.fillStyle = T.text; g.font = F(400, L.tall ? 22 : 26, 'serif'); g.fillText(it.text, L.colX, it.y); g.fillStyle = T.line; g.fillRect(L.colX, it.y + 10, L.colW, 1); }
        if (it.k === 'line') {
          if (it.n === +e.P.hl && L.hl) {
            const k = U.ease.inOut(U.clamp((e.p - e.P.hlAt) / 0.18));
            if (k > 0) { g.fillStyle = U.rgba(e.P.hlColor, e.P.dark ? 0.45 : 0.75); g.fillRect(L.hl.x, L.hl.y + 3, L.hl.w * k, L.hl.h - 2); }
          }
          g.fillStyle = T.text; g.font = F(400, L.tall ? 17 : 19, 'serif'); g.fillText(it.text, L.colX, it.y);
        }
      }
      if (!L.tall) { // infobox
        const x = e.W - L.pad - L.ibW, y = 140;
        g.fillStyle = T.panel; g.strokeStyle = T.line; g.fillRect(x, y, L.ibW, 520); g.strokeRect(x + 0.5, y + 0.5, L.ibW - 1, 519);
        g.fillStyle = T.text; g.font = F(700, 17, 'serif'); g.textAlign = 'center'; g.fillText(e.P.title, x + L.ibW / 2, y + 30, L.ibW - 20);
        C.drawCover(g, e.media('media'), x + 12, y + 46, L.ibW - 24, 220, { seed: e.seed });
        g.fillStyle = T.sub; g.font = F(400, 12); g.fillText(e.P.caption, x + L.ibW / 2, y + 286, L.ibW - 20); g.textAlign = 'left';
        [['Type', 'De facto border'], ['Length', '3,488 km'], ['Sectors', 'Western, Middle, Eastern'], ['Since', '1962']].forEach(([a, b], i) => {
          const yy = y + 330 + i * 40; g.fillStyle = T.line; g.fillRect(x + 12, yy - 24, L.ibW - 24, 1);
          g.fillStyle = T.text; g.font = F(700, 13); g.fillText(a, x + 16, yy); g.font = F(400, 13); g.fillText(b, x + 110, yy, L.ibW - 120);
        });
      }
      g.restore();
    },
  });

  // ---------- video player ----------
  register({
    id: 'player', name: 'Video player', family: 'web', icon: '▶', browser: 'video.example/watch',
    params: [P.media('media', 'Video / photo'), P.text('title', 'Video title', 'The full story of the border, explained'), P.text('channel', 'Channel name', 'Favorite World'), P.text('views', 'Views line', '12 lakh views · 2 days ago'),
      P.text('total', 'Video length', '18:42'), P.range('start', 'Progress at start', 0, 1, 0.01, 0.18), P.range('end', 'Progress at end', 0, 1, 0.01, 0.34), P.bool('dark', 'Dark mode', true), P.bool('hover', 'Show controls', true)],
    focus(e) { const v = this._v(e); return { x: v.x, y: v.y, w: v.w, h: v.h }; },
    _v(e) { const tall = e.tall, x = tall ? 0 : 60, w = tall ? e.W : Math.min(e.W - 120 - 380, (e.H - 230) * 16 / 9); return { x, y: tall ? 0 : 24, w, h: w * 9 / 16 }; },
    draw(g, e) {
      const T = C.theme(e.P.dark), v = this._v(e), P0 = e.P;
      g.fillStyle = T.bg; g.fillRect(0, 0, e.W, e.H);
      g.fillStyle = '#000'; U.rr(g, v.x, v.y, v.w, v.h, e.tall ? 0 : 14); g.fill();
      g.save(); U.rr(g, v.x, v.y, v.w, v.h, e.tall ? 0 : 14); g.clip(); C.drawCover(g, e.media('media'), v.x, v.y, v.w, v.h, { seed: e.seed, zoom: 0.03 * e.p });
      const prog = U.lerp(P0.start, P0.end, e.p);
      if (P0.hover) {
        const gr = g.createLinearGradient(0, v.y + v.h - 90, 0, v.y + v.h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.7)'); g.fillStyle = gr; g.fillRect(v.x, v.y + v.h - 90, v.w, 90);
        const by = v.y + v.h - 44, bx = v.x + 16, bw = v.w - 32;
        g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(bx, by, bw, 4); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(bx, by, bw * Math.min(1, prog + 0.12), 4);
        g.fillStyle = '#e5a93c'; g.fillRect(bx, by, bw * prog, 4); g.beginPath(); g.arc(bx + bw * prog, by + 2, 7, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(bx + 4, by + 16); g.lineTo(bx + 4, by + 34); g.lineTo(bx + 18, by + 25); g.closePath(); g.fill();
        const tot = String(P0.total).split(':').reduce((a, b) => a * 60 + (+b || 0), 0);
        g.font = F(600, 14); g.textBaseline = 'middle'; g.fillText(`${U.mmss(Math.floor(tot * prog))} / ${P0.total}`, bx + 34, by + 25);
        g.textAlign = 'right'; g.fillText('HD  ⚙  ⛶', bx + bw, by + 25); g.textAlign = 'left';
      }
      g.restore();
      // info
      const ix = e.tall ? 14 : v.x, iy = v.y + v.h + (e.tall ? 30 : 40), iw = e.tall ? e.W - 28 : v.w;
      g.fillStyle = T.text; g.font = F(700, e.tall ? 18 : 22); g.textBaseline = 'alphabetic'; C.para(g, P0.title, ix, iy, iw, { size: e.tall ? 18 : 22, w: 700, color: T.text, maxLines: 2 });
      const ay = iy + (e.tall ? 58 : 50);
      C.avatar(g, ix + 20, ay + 8, 20, P0.channel, 3);
      g.fillStyle = T.text; g.font = F(700, 16); g.fillText(P0.channel, ix + 50, ay + 4); g.fillStyle = T.sub; g.font = F(400, 13); g.fillText('8.4 lakh subscribers', ix + 50, ay + 24);
      g.fillStyle = T.text; U.rr(g, ix + (e.tall ? iw - 110 : 300), ay - 10, 110, 36, 18); g.fill(); g.fillStyle = T.bg; g.font = F(700, 14); g.textAlign = 'center'; g.fillText('Subscribe', ix + (e.tall ? iw - 55 : 355), ay + 13); g.textAlign = 'left';
      g.fillStyle = T.panel; U.rr(g, ix, ay + 44, iw, e.tall ? 70 : 80, 12); g.fill(); g.fillStyle = T.text; g.font = F(700, 14); g.fillText(P0.views, ix + 14, ay + 70, iw - 28);
      if (!e.tall) { // up-next list
        const lx = v.x + v.w + 28, lw = e.W - lx - 40;
        for (let i = 0; i < 6; i++) {
          const y = v.y + i * 118; g.fillStyle = T.card; U.rr(g, lx, y, 180, 101, 10); g.fill();
          C.placeholder(g, lx, y, 180, 101, { seed: e.seed + 11 + i, label: false });
          g.fillStyle = T.line; U.rr(g, lx + 194, y + 6, lw - 200, 14, 7); g.fill(); U.rr(g, lx + 194, y + 28, (lw - 200) * 0.7, 14, 7); g.fill(); g.fillStyle = T.panel; U.rr(g, lx + 194, y + 56, (lw - 200) * 0.5, 11, 5); g.fill();
        }
      }
    },
  });

  // ---------- news broadcast frame ----------
  register({
    id: 'news', name: 'News broadcast frame', family: 'broadcast', icon: '📡',
    params: [P.media('media', 'Main video / photo'), P.media('media2', 'Anchor / second box'), P.text('channel', 'Channel name', 'FW NEWS'), P.text('headline', 'Headline', 'सीमा पर बड़ी बातचीत'), P.text('sub', 'Sub-headline', 'Talks resume after four months — what changes now'),
      P.text('ticker', 'Ticker text', 'Talks resume at the border  •  Trade figures out today  •  Monsoon reaches the north  •  '), P.text('tag', 'Red tag', 'BREAKING'), P.select('layout', 'Layout', { full: 'Full picture', split: 'Two boxes (anchor + report)' }, 'split'),
      P.text('clock', 'Clock start', '21:30:00'), P.color('color', 'Channel colour', '#c8202b'), P.bool('live', 'LIVE badge', true)],
    statusBar: false,
    focus(e) { return { x: 0, y: e.H * 0.72, w: e.W * 0.8, h: e.H * 0.18 }; },
    draw(g, e) {
      const W = e.W, H = e.H, P0 = e.P, col = P0.color || '#c8202b', k = U.ease.out(U.clamp(e.t / 0.7)), s = Math.min(W / 1600, H / 900) * (e.tall ? 1.6 : 1);
      g.fillStyle = '#0c1220'; g.fillRect(0, 0, W, H);
      if (P0.layout === 'split' && !e.tall) {
        const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0d1b33'); bg.addColorStop(1, '#16253f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(120,170,255,.08)'; for (let x = 0; x < W; x += 60) { g.beginPath(); g.moveTo(x + (e.t * 10) % 60, 0); g.lineTo(x + (e.t * 10) % 60 - 200, H); g.stroke(); }
        const bw = W * 0.455, bh = bw * 9 / 16, by = H * 0.1;
        [[W * 0.03, 'media2', 'STUDIO'], [W * 0.515, 'media', 'REPORT']].forEach(([x, key, lab], i) => {
          const kk = U.ease.out(U.clamp((e.t - 0.15 * i) / 0.6));
          g.save(); g.globalAlpha = kk; g.translate((1 - kk) * (i ? 60 : -60), 0);
          g.fillStyle = '#000'; g.fillRect(x - 4, by - 4, bw + 8, bh + 8); C.drawCover(g, e.media(key), x, by, bw, bh, { seed: e.seed + i * 4, label: i ? 'Report footage' : 'Anchor' });
          g.fillStyle = col; g.fillRect(x, by + bh, 120 * s, 30 * s); g.fillStyle = '#fff'; g.font = F(800, 15 * s); g.textBaseline = 'middle'; g.fillText(lab, x + 12 * s, by + bh + 15 * s);
          g.restore();
        });
      } else C.drawCover(g, e.media('media'), 0, 0, W, H, { seed: e.seed, zoom: 0.04 * e.p });
      // bug (top-left) + LIVE + clock
      g.save(); g.globalAlpha = k;
      g.fillStyle = col; U.rr(g, 36 * s, 30 * s, 190 * s, 54 * s, 6 * s); g.fill(); g.fillStyle = '#fff'; g.font = F(800, 26 * s); g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(P0.channel, 131 * s, 58 * s, 170 * s);
      if (P0.live) { g.fillStyle = Math.floor(e.t * 1.6) % 2 ? '#ff2d2d' : '#d61f1f'; U.rr(g, W - 160 * s, 34 * s, 120 * s, 44 * s, 6 * s); g.fill(); g.fillStyle = '#fff'; g.font = F(800, 22 * s); g.fillText('● LIVE', W - 100 * s, 57 * s); }
      g.fillStyle = 'rgba(0,0,0,.55)'; U.rr(g, W - 160 * s, 84 * s, 120 * s, 32 * s, 6 * s); g.fill(); g.fillStyle = '#fff'; g.font = F(700, 17 * s, 'mono'); g.fillText(U.clock(P0.clock, e.t).slice(0, 5) + ' IST', W - 100 * s, 101 * s);
      g.restore();
      // lower third
      const lt = U.ease.expo(U.clamp((e.t - 0.35) / 0.7)), ly = H - 230 * s, lw = W * (e.tall ? 1 : 0.86);
      g.save(); g.beginPath(); g.rect(0, 0, lw * lt + 1, H); g.clip();
      g.fillStyle = col; g.fillRect(0, ly, 200 * s, 48 * s); g.fillStyle = '#fff'; g.font = F(800, 22 * s); g.textAlign = 'center'; g.fillText(P0.tag, 100 * s, ly + 25 * s, 190 * s);
      const gr = g.createLinearGradient(0, ly + 48 * s, 0, ly + 140 * s); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e6e8ee');
      g.fillStyle = gr; g.fillRect(0, ly + 48 * s, lw, 92 * s); g.fillStyle = '#0d1b33'; g.fillRect(0, ly + 140 * s, lw, 40 * s);
      g.textAlign = 'left'; g.fillStyle = '#0b0f19'; g.font = F(800, 46 * s); g.fillText(P0.headline, 36 * s, ly + 96 * s, lw - 72 * s);
      g.fillStyle = '#e8ecf5'; g.font = F(600, 21 * s); g.fillText(P0.sub, 36 * s, ly + 161 * s, lw - 72 * s);
      g.restore();
      // ticker
      const ty = H - 50 * s;
      g.fillStyle = '#0a0a0a'; g.fillRect(0, ty, W, 50 * s); g.fillStyle = col; g.fillRect(0, ty, 150 * s, 50 * s);
      g.fillStyle = '#fff'; g.font = F(800, 19 * s); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(P0.channel, 75 * s, ty + 25 * s, 140 * s);
      g.save(); g.beginPath(); g.rect(150 * s, ty, W, 50 * s); g.clip(); g.textAlign = 'left'; g.font = F(600, 21 * s);
      const tw = Math.max(200, g.measureText(P0.ticker).width), off = (e.t * 140 * s) % tw;
      for (let x = 170 * s - off; x < W; x += tw) g.fillText(P0.ticker, x, ty + 26 * s);
      g.restore();
    },
  });

  // ---------- phone notifications stacking ----------
  register({
    id: 'notify', name: 'Notifications stacking', family: 'screens', icon: '🔔', statusBar: true,
    params: [P.textarea('items', 'Notifications: App | Title | Text | time', 'News | Border talks resume | Both sides agree to meet again next week | now\nBank | ₹2,40,000 debited | From your account ending 4471 | 2m ago\nMessages | Rahul | Did you see the news? | 5m ago\nWeather | Heavy rain alert | Orange alert for 3 districts tonight | 9m ago\nMail | Your ticket is confirmed | Delhi → Lucknow, Sat 7 Nov | 14m ago'),
      P.media('media', 'Wallpaper photo'), P.text('time', 'Lock-screen time', '9:41'), P.text('date', 'Date line', 'Saturday, 7 November'), P.range('gap', 'Seconds between', 0.2, 2, 0.05, 0.7), P.bool('lock', 'Lock screen (big clock)', true)],
    focus(e) { return { x: 10, y: e.H * 0.3, w: e.W - 20, h: 110 }; },
    draw(g, e) {
      const W = e.W, H = e.H, P0 = e.P, s = e.tall ? 1 : Math.min(1.5, W / 900);
      if (e.media('media')) { C.drawCover(g, e.media('media'), 0, 0, W, H); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H); }
      else { const gr = g.createLinearGradient(0, 0, W * 0.4, H); gr.addColorStop(0, '#1b2a4a'); gr.addColorStop(0.55, '#3a2a55'); gr.addColorStop(1, '#a8582e'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
      g.textAlign = 'center'; g.fillStyle = '#fff';
      if (P0.lock) { g.font = F(600, 20 * s); g.fillText(P0.date, W / 2, H * 0.1); g.font = F(800, 92 * s); g.fillText(P0.time, W / 2, H * 0.1 + 100 * s); }
      g.textAlign = 'left';
      const items = lines(P0.items).map(l => l.split('|').map(x => x.trim()));
      const cw = Math.min(W - 24, 520 * s), cx = (W - cw) / 2, ch = 92 * s, top = P0.lock ? H * 0.1 + 150 * s : 30;
      const cols = ['#d9534f', '#3fb68b', '#5b8def', '#e5a93c', '#9b6bd6', '#2fa4b8'];
      const shown = items.map((it, i) => ({ it, i, k: U.clamp((e.t - 0.3 - i * P0.gap) / 0.5) })).filter(o => o.k > 0);
      // newest on top; older ones pushed down
      const n = shown.length;
      shown.forEach(o => {
        const order = n - 1 - o.i, kk = U.ease.back(o.k);
        const slot = order - (1 - U.ease.out(U.clamp((e.t - 0.3 - (n - 1) * P0.gap) / 0.5))) * (o.i < n - 1 ? 1 : 0);
        const y = top + slot * (ch + 10 * s) - (1 - kk) * 60 * s;
        g.save(); g.globalAlpha = U.clamp(o.k * 2) * (order > 3 ? 0.5 : 1);
        g.translate(cx + cw / 2, y + ch / 2); g.scale(0.92 + 0.08 * kk, 0.92 + 0.08 * kk); g.translate(-cx - cw / 2, -y - ch / 2);
        g.fillStyle = 'rgba(245,246,250,.86)'; g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 16 * s; U.rr(g, cx, y, cw, ch, 20 * s); g.fill(); g.shadowColor = 'transparent';
        C.appIcon(g, cx + 14 * s, y + 18 * s, 38 * s, cols[o.i % cols.length], (o.it[0] || '?')[0]);
        g.fillStyle = '#111'; g.font = F(700, 16 * s); g.fillText(o.it[1] || '', cx + 64 * s, y + 36 * s, cw - 150 * s);
        g.fillStyle = '#333'; g.font = F(400, 15 * s); g.fillText(o.it[2] || '', cx + 64 * s, y + 60 * s, cw - 80 * s);
        g.fillStyle = '#777'; g.font = F(400, 12 * s); g.textAlign = 'right'; g.fillText(o.it[3] || '', cx + cw - 16 * s, y + 32 * s); g.fillText((o.it[0] || '').toUpperCase(), cx + cw - 16 * s, y + 80 * s); g.textAlign = 'left';
        g.restore();
      });
    },
  });
})();
