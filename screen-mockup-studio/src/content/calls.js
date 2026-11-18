// Video-call grid: a generic meeting app look (no brand). Deterministic: driven only by t + seed.
// People are lines "Name | ok" or "Name | muted". Tiles 1-4 can take your photos/videos (camera on);
// everyone else shows a dark "camera off" tile. A speaking tile gets a pulsing ring.
(() => {
  const { register, P } = SM.content, U = SM.util, F = SM.font, C = SM.chrome;

  function peopleOf(p) {
    const out = [];
    for (const row of String(p.people || '').split('\n')) {
      const s = row.trim();
      if (!s) continue;
      const [name = 'Guest', mic = 'ok'] = s.split('|').map(x => x.trim());
      out.push({ name: name || 'Guest', muted: /^muted?|off|1$/i.test(mic || '') });
    }
    return out.slice(0, 9);
  }

  function callLayout(env) {
    const { W, H, tall } = env, n = Math.max(2, peopleOf(env.P).length);
    const pad = Math.max(10, W * (tall ? 0.035 : 0.026));
    const topH = tall ? H * 0.062 : H * 0.075;
    const botH = env.P.controls === false ? 0 : H * (tall ? 0.075 : 0.09);
    const area = { x: pad, y: topH + pad, w: W - pad * 2, h: H - topH - botH - pad * (botH ? 1.6 : 1) };
    const spot = env.P.layout === 'spotlight';
    let tiles = [];
    if (spot) {
      const big = { x: area.x, y: area.y, w: area.w, h: area.h * (tall ? 0.62 : 1), i: 0 };
      const rest = { x: area.x, y: big.y + big.h + pad, w: area.w, h: area.h - big.h - pad };
      const m = n - 1;
      const cols = tall ? Math.min(3, m) : Math.min(4, Math.max(1, m));
      const rows = Math.max(1, Math.ceil(m / cols));
      tiles.push(big);
      const tw = (rest.w - pad * (cols - 1)) / cols, th = (rest.h - pad * (rows - 1)) / rows;
      for (let k = 1; k < n; k++) {
        tiles.push({ x: rest.x + (k - 1) % cols * (tw + pad), y: rest.y + Math.floor((k - 1) / cols) * (th + pad), w: tw, h: th, i: k });
      }
    } else {
      const cols = tall ? 2 : (n <= 2 ? 2 : n <= 4 ? 2 : n <= 6 ? 3 : 3);
      const rows = Math.ceil(n / cols);
      const tw = (area.w - pad * (cols - 1)) / cols, th = (area.h - pad * (rows - 1)) / rows;
      for (let k = 0; k < n; k++) tiles.push({ x: area.x + k % cols * (tw + pad), y: area.y + Math.floor(k / cols) * (th + pad), w: tw, h: th, i: k });
    }
    return { n, pad, topH, botH, area, tiles, spot };
  }

  function micIcon(g, x, y, r, muted, color) {
    g.save();
    g.fillStyle = muted ? 'rgba(210,45,45,.92)' : U.rgba(color, .92);
    U.rr(g, x - r, y - r * 0.86, r * 2, r * 1.72, r); g.fill();
    g.beginPath(); g.arc(x, y + r * 0.5, r * 0.72, -0.15 * Math.PI, 1.15 * Math.PI);
    g.lineWidth = Math.max(1.4, r * 0.28); g.strokeStyle = g.fillStyle; g.stroke();
    g.beginPath(); g.moveTo(x - r * 0.95, y + r * 0.1); g.quadraticCurveTo(x, y + r * 1.15, x + r * 0.95, y + r * 0.1); g.stroke();
    if (muted) { g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.6, r * 0.3); g.beginPath(); g.moveTo(x - r * 1.05, y - r * 1.05); g.lineTo(x + r * 1.05, y + r * 1.05); g.stroke(); }
    g.restore();
  }

  register({
    id: 'call', name: 'Video call grid', family: 'screens', icon: '▦',
    params: [
      P.text('title', 'Call title', 'Team briefing'),
      P.textarea('people', 'People: Name | mic (ok / muted)', 'Asha | ok\nVikram | muted\nMeera | ok\nFarhan | ok\nDivya | muted\nRavi | ok'),
      P.media('media', 'Tile 1 video (usually you)'), P.media('media2', 'Tile 2 video'), P.media('media3', 'Tile 3 video'), P.media('media4', 'Tile 4 video'),
      P.select('layout', 'Layout', { grid: 'Grid (everyone equal)', spotlight: 'Spotlight (one big tile)' }, 'grid'),
      P.range('speaking', 'Speaking tile # (0 = none)', 0, 9, 1, 2),
      P.text('timer', 'Meeting timer start', '00:12:30'),
      P.bool('controls', 'Bottom control bar', true),
    ],
    focus(env) {
      const L = callLayout(env), k = Math.max(0, +env.P.speaking || 0) - 1;
      const t = (k >= 0 && L.tiles[k]) ? L.tiles[k] : L.tiles[0];
      return t ? { x: t.x, y: t.y, w: t.w, h: t.h } : { x: env.W * 0.3, y: env.H * 0.3, w: env.W * 0.4, h: env.H * 0.3 };
    },
    draw(g, env) {
      const { W, H, tall, P: p } = env, T = C.theme(true);
      const people = peopleOf(p), L = callLayout(env);
      const s = Math.min(W / 1200, H / 800) * (tall ? 1.7 : 1);
      g.fillStyle = '#0c0f14'; g.fillRect(0, 0, W, H);
      // top bar
      g.fillStyle = '#11151c'; g.fillRect(0, 0, W, L.topH);
      g.textBaseline = 'middle'; g.textAlign = 'left';
      g.font = F(700, Math.max(13, 17 * s)); g.fillStyle = T.text;
      g.fillText(p.title, 18 * s, L.topH * 0.42, W * 0.5);
      g.font = F(400, Math.max(10, 12 * s)); g.fillStyle = T.sub;
      g.fillText(L.n + ' people', 18 * s, L.topH * 0.78, W * 0.5);
      const timer = U.clock(p.timer, env.t);
      g.textAlign = 'right';
      g.fillStyle = T.panel; U.rr(g, W - 150 * s, L.topH * 0.24, 72 * s, L.topH * 0.52, 8 * s); g.fill();
      g.fillStyle = T.text; g.font = F(600, Math.max(10, 13 * s), 'mono');
      g.fillText(timer.slice(3), W - 114 * s, L.topH * 0.5);
      g.fillStyle = '#d23d3d'; U.rr(g, W - 70 * s, L.topH * 0.24, 54 * s, L.topH * 0.52, 8 * s); g.fill();
      g.fillStyle = '#fff'; g.font = F(700, Math.max(9, 11 * s)); g.fillText('Leave', W - 43 * s, L.topH * 0.5);
      g.textAlign = 'left';
      // tiles
      const speaking = Math.max(0, +p.speaking || 0);
      L.tiles.forEach((t, k) => {
        const person = people[k] || people[people.length - 1] || { name: 'Guest', muted: false };
        const isSpeak = speaking === k + 1;
        const r = Math.min(t.w, t.h) * 0.05;
        g.save();
        U.rr(g, t.x, t.y, t.w, t.h, r);
        g.clip();
        const slot = k < 4 ? ['media', 'media2', 'media3', 'media4'][k] : null;
        const m = slot ? env.media(slot) : null;
        if (m) {
          C.drawCover(g, m, t.x, t.y, t.w, t.h, { seed: env.seed + k * 13, fx: 0.5, fy: 0.42, label: false });
          g.fillStyle = 'rgba(6,9,14,.14)'; g.fillRect(t.x, t.y, t.w, t.h);
        } else {
          const gr = g.createLinearGradient(t.x, t.y, t.x, t.y + t.h);
          gr.addColorStop(0, '#1b2331'); gr.addColorStop(1, '#10141c');
          g.fillStyle = gr; g.fillRect(t.x, t.y, t.w, t.h);
          C.avatar(g, t.x + t.w / 2, t.y + t.h * 0.42, Math.min(t.w, t.h) * 0.16, person.name, env.seed + k);
          g.fillStyle = T.sub; g.font = F(600, Math.max(11, 13 * s)); g.textAlign = 'center';
          g.fillText(person.name, t.x + t.w / 2, t.y + t.h * 0.62, t.w * 0.9); g.textAlign = 'left';
        }
        g.restore();
        // speaking ring
        if (isSpeak) {
          const pulse = 0.55 + 0.45 * Math.pow(Math.sin(env.t * 5), 2);
          g.strokeStyle = U.rgba('#e5a93c', pulse); g.lineWidth = Math.max(2.5, 3.5 * s);
          U.rr(g, t.x + 1, t.y + 1, t.w - 2, t.h - 2, r); g.stroke();
        }
        // name pill + mic state
        const pillH = Math.max(18, 26 * s), pillW = Math.min(t.w * 0.8, g.measureText(person.name).width * 0.62 + 76 * s + pillH);
        const px = t.x + 8 * s, py = t.y + t.h - pillH - 8 * s;
        g.fillStyle = 'rgba(4,7,12,.6)'; U.rr(g, px, py, pillW, pillH, pillH / 2); g.fill();
        C.avatar(g, px + pillH * 0.62, py + pillH / 2, pillH * 0.34, person.name, env.seed + k);
        g.fillStyle = isSpeak ? '#ffe9c2' : '#eef0f4'; g.font = F(600, Math.max(10, 12.5 * s)); g.textBaseline = 'middle';
        g.fillText((k === 0 ? 'You · ' : '') + person.name, px + pillH * 1.1, py + pillH / 2, pillW - pillH * 1.6);
        if (person.muted) micIcon(g, px + pillW - pillH * 0.55, py + pillH / 2, pillH * 0.3, true, '#e5a93c');
        g.textBaseline = 'alphabetic';
      });
      // bottom control bar
      if (p.controls !== false) {
        const by = H - L.botH * 0.5;
        const icons = [
          ['mic', true, '#eef0f4'], ['cam', false, '#eef0f4'], ['share', false, '#eef0f4'],
        ];
        const bw = 46 * s, total = icons.length * bw + 62 * s + (icons.length + 1) * 10 * s;
        let x = (W - total) / 2;
        g.save(); g.textBaseline = 'middle';
        icons.forEach(([ic, , col]) => {
          g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(x + bw / 2, by, bw / 2, 0, Math.PI * 2); g.fill();
          g.strokeStyle = col; g.lineWidth = Math.max(1.6, 2 * s);
          if (ic === 'mic') { g.beginPath(); g.arc(x + bw / 2, by + 5 * s, 6 * s, -0.15 * Math.PI, 1.15 * Math.PI); g.stroke(); g.beginPath(); g.moveTo(x + bw / 2 - 9 * s, by + 2 * s); g.quadraticCurveTo(x + bw / 2, by + 12 * s, x + bw / 2 + 9 * s, by + 2 * s); g.stroke(); g.fillStyle = col; U.rr(g, x + bw / 2 - 4 * s, by - 12 * s, 8 * s, 13 * s, 4 * s); g.fill(); }
          if (ic === 'cam') { g.strokeRect(x + bw / 2 - 12 * s, by - 8 * s, 16 * s, 12 * s); g.beginPath(); g.moveTo(x + bw / 2 + 4 * s, by - 4 * s); g.lineTo(x + bw / 2 + 12 * s, by - 8 * s); g.lineTo(x + bw / 2 + 12 * s, by + 4 * s); g.lineTo(x + bw / 2 + 4 * s, by); g.closePath(); g.fillStyle = col; g.fill(); }
          if (ic === 'share') { g.beginPath(); g.arc(x + bw / 2, by - 7 * s, 5 * s, Math.PI, 0); g.stroke(); g.strokeRect(x + bw / 2 - 10 * s, by - 2 * s, 20 * s, 11 * s); g.beginPath(); g.moveTo(x + bw / 2, by + 9 * s); g.lineTo(x + bw / 2, by + 14 * s); g.stroke(); }
          x += bw + 10 * s;
        });
        g.fillStyle = '#d23d3d'; g.beginPath(); g.arc(x + 31 * s, by, 31 * s, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, 2.4 * s);
        g.beginPath(); g.moveTo(x + 22 * s, by); g.lineTo(x + 40 * s, by); g.stroke();
        g.beginPath(); g.arc(x + 31 * s, by, 10 * s, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
    },
  });
})();
