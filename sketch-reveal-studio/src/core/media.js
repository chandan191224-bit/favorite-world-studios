// Media store + the built-in demo art. Everything demo is drawn procedurally (seeded,
// deterministic) so the studio starts with a playing project even with no user files —
// and so pipeline renders with demo media are reproducible.
SK.media = SK.media || {};
(() => {
  const U = SK.util;

  // ---------------- photo grade helpers (grain, vignette, sepia, scratches) ----------------
  function grade(g, W, H, seed, o = {}) {
    const grain = o.grain == null ? 0.5 : o.grain, vig = o.vig == null ? 0.55 : o.vig, sepia = o.sepia == null ? 0.5 : o.sepia;
    if (sepia > 0) {
      g.save();
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = `rgba(232,196,140,${sepia})`; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'screen';
      g.fillStyle = `rgba(120,84,40,${sepia * 0.55})`; g.fillRect(0, 0, W, H);
      g.restore();
    }
    if (grain > 0) {
      const n = Math.round(W * H / 260);
      g.save();
      g.globalAlpha = 0.06 * grain;
      for (let i = 0; i < n; i++) {
        const x = U.h1(i, seed) * W, y = U.h1(i, seed + 1) * H, l = U.h1(i, seed + 2) > 0.5;
        g.fillStyle = l ? '#fff' : '#000';
        g.fillRect(x, y, 1.4, 1.4);
      }
      g.restore();
    }
    if (vig > 0) {
      const rg = g.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.32, W / 2, H * 0.5, Math.hypot(W, H) * 0.62);
      rg.addColorStop(0, 'rgba(0,0,0,0)');
      rg.addColorStop(0.72, `rgba(20,10,0,${0.16 * vig})`);
      rg.addColorStop(1, `rgba(15,8,0,${0.62 * vig})`);
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    const sc = Math.round(1 + (o.scratches || 0) * 3);
    g.save();
    g.globalAlpha = 0.1;
    g.strokeStyle = '#fff'; g.lineWidth = 1;
    for (let i = 0; i < sc; i++) {
      const x = U.h1(i, seed + 31) * W;
      g.beginPath();
      g.moveTo(x, 0);
      for (let y = 0; y < H; y += 40) g.lineTo(x + (U.noise1(y / 60 + i, seed) * 6), y);
      g.stroke();
    }
    g.restore();
  }
  function softEllipse(g, x, y, rx, ry, fill, rot = 0, alpha = 1) {
    g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate(rot);
    g.fillStyle = fill;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill();
    g.restore();
  }
  function shadeSide(g, x, y, rx, ry, rot, strength) { // side light on a form
    g.save(); g.translate(x, y); g.rotate(rot);
    const gr = g.createLinearGradient(-rx, 0, rx, 0);
    gr.addColorStop(0, `rgba(60,32,16,${strength})`);
    gr.addColorStop(0.55, 'rgba(60,32,16,0)');
    gr.addColorStop(1, `rgba(255,236,200,${strength * 0.35})`);
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill();
    g.restore();
  }

  // ---------------- demo photos ----------------
  const demos = {};
  function mk(key, name, W, H, draw) {
    if (demos[key]) return demos[key];
    const c = U.canvas(W, H);
    draw(c.getContext('2d'), W, H);
    grade(c.getContext('2d'), W, H, 17, { sepia: 0.45, grain: 0.6, vig: 0.6, scratches: 0.5 });
    const m = { kind: 'image', name, el: c, demo: key };
    demos[key] = m;
    return m;
  }
  const LIST = [
    ['portrait', 'डेमो पोर्ट्रेट (demo portrait)'],
    ['scene', 'डेमो घटना (demo event scene)'],
    ['place', 'डेमो जगह (demo place)'],
    ['object', 'डेमो वस्तु (demo still life)'],
    ['doc', 'डेमो दस्तावेज़ (demo document)'],
    ['clip', 'डेमो वीडियो: भाप का इंजन (demo clip: steam train)'],
  ];

  function portrait() {
    return mk('portrait', LIST[0][1], 1280, 720, (g, W, H) => {
      // studio wall: soft light from the left, no hard stripes (fake edges confuse the tracer)
      const bg = g.createLinearGradient(0, 0, W * 0.6, H);
      bg.addColorStop(0, '#9a8a70'); bg.addColorStop(0.55, '#7d6c56'); bg.addColorStop(1, '#544738');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // mottled wall texture
      for (let i = 0; i < 130; i++) {
        const x = U.h1(i, 3) * W, y = U.h1(i, 5) * H, r = 20 + U.h1(i, 7) * 90;
        softEllipse(g, x, y, r, r * 0.7, U.h1(i, 9) > 0.5 ? 'rgba(255,240,214,.05)' : 'rgba(30,22,14,.05)', 0, 0.8);
      }
      const cx = W * 0.5, cy = H * 0.42;
      // coat + shoulders
      g.fillStyle = '#3c332c';
      g.beginPath();
      g.moveTo(cx - 430, H);
      g.bezierCurveTo(cx - 420, cy + 240, cx - 190, cy + 150, cx - 120, cy + 120);
      g.lineTo(cx + 120, cy + 120);
      g.bezierCurveTo(cx + 190, cy + 150, cx + 420, cy + 240, cx + 430, H);
      g.closePath(); g.fill();
      // coat shading
      softEllipse(g, cx - 190, cy + 260, 160, 120, 'rgba(0,0,0,.22)');
      softEllipse(g, cx + 200, cy + 250, 150, 110, 'rgba(255,240,210,.05)');
      // shirt collar + scarf
      g.fillStyle = '#b7a98c';
      g.beginPath(); g.moveTo(cx - 78, cy + 96); g.lineTo(cx, cy + 178); g.lineTo(cx + 78, cy + 96);
      g.lineTo(cx + 52, cy + 108); g.lineTo(cx, cy + 130); g.lineTo(cx - 52, cy + 108); g.closePath(); g.fill();
      softEllipse(g, cx, cy + 96, 150, 40, '#7a6a50');
      // neck
      g.fillStyle = '#b98d68';
      g.fillRect(cx - 58, cy + 60, 116, 90);
      softEllipse(g, cx, cy + 130, 60, 36, 'rgba(70,44,26,.35)'); // throat shadow
      // head + jaw
      softEllipse(g, cx, cy, 158, 200, '#c69c76');
      softEllipse(g, cx, cy + 92, 118, 96, '#c69c76');
      // ears
      softEllipse(g, cx - 156, cy + 18, 22, 36, '#b98d68');
      softEllipse(g, cx + 156, cy + 18, 22, 36, '#b98d68');
      softEllipse(g, cx - 156, cy + 18, 10, 18, 'rgba(80,50,30,.4)');
      softEllipse(g, cx + 156, cy + 18, 10, 18, 'rgba(80,50,30,.4)');
      // hair (layered soft masses, side part)
      softEllipse(g, cx - 92, cy - 118, 86, 66, 'rgba(46,38,32,.92)', -0.16);
      softEllipse(g, cx + 88, cy - 128, 72, 54, 'rgba(46,38,32,.95)', 0.1);
      g.fillStyle = '#2e2620';
      g.beginPath();
      g.moveTo(cx - 158, cy + 6);
      g.bezierCurveTo(cx - 170, cy - 200, cx + 90, cy - 224, cx + 148, cy - 120);
      g.bezierCurveTo(cx + 60, cy - 178, cx - 70, cy - 172, cx - 118, cy - 70);
      g.bezierCurveTo(cx - 132, cy - 30, cx - 146, cy - 8, cx - 158, cy + 6);
      g.closePath(); g.fill();
      // hair sheen
      softEllipse(g, cx - 60, cy - 150, 70, 24, 'rgba(120,100,80,.25)', -0.2);
      // forehead light + temples shade
      softEllipse(g, cx - 24, cy - 78, 84, 44, 'rgba(255,238,204,.16)');
      softEllipse(g, cx + 104, cy - 40, 34, 70, 'rgba(90,58,34,.18)');
      // brows
      g.fillStyle = '#3a2e22';
      g.beginPath(); g.ellipse(cx - 64, cy - 52, 34, 9, -0.1, 0, 7); g.fill();
      g.beginPath(); g.ellipse(cx + 64, cy - 52, 34, 9, 0.1, 0, 7); g.fill();
      // eye sockets
      softEllipse(g, cx - 64, cy - 32, 36, 18, 'rgba(120,78,48,.2)');
      softEllipse(g, cx + 64, cy - 32, 36, 18, 'rgba(120,78,48,.2)');
      // eyes
      softEllipse(g, cx - 64, cy - 26, 30, 13, '#e9e2d2');
      softEllipse(g, cx + 64, cy - 26, 30, 13, '#e9e2d2');
      softEllipse(g, cx - 61, cy - 25, 10.5, 10.5, '#4a3421');
      softEllipse(g, cx + 67, cy - 25, 10.5, 10.5, '#4a3421');
      softEllipse(g, cx - 61, cy - 25, 4.5, 4.5, '#100c08');
      softEllipse(g, cx + 67, cy - 25, 4.5, 4.5, '#100c08');
      softEllipse(g, cx - 58, cy - 28, 2.6, 2.6, '#fff', 0, 0.9);
      softEllipse(g, cx + 70, cy - 28, 2.6, 2.6, '#fff', 0, 0.9);
      // upper lids
      g.strokeStyle = '#5d4530'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.arc(cx - 64, cy - 24, 30, -2.75, -0.45); g.stroke();
      g.beginPath(); g.arc(cx + 64, cy - 24, 30, -2.75, -0.45); g.stroke();
      // under-eye
      g.strokeStyle = 'rgba(140,95,60,.4)'; g.lineWidth = 3;
      g.beginPath(); g.arc(cx - 64, cy - 16, 30, 0.5, 1.3); g.stroke();
      g.beginPath(); g.arc(cx + 64, cy - 16, 30, 1.85, 2.6); g.stroke();
      // nose
      g.strokeStyle = 'rgba(120,80,50,.55)'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(cx - 4, cy - 22); g.quadraticCurveTo(cx - 20, cy + 48, cx - 34, cy + 62); g.stroke();
      softEllipse(g, cx - 30, cy + 68, 11, 6.5, 'rgba(90,58,36,.7)');
      softEllipse(g, cx + 22, cy + 68, 11, 6.5, 'rgba(90,58,36,.7)');
      softEllipse(g, cx - 6, cy + 62, 26, 12, 'rgba(255,230,190,.25)');
      softEllipse(g, cx - 12, cy + 34, 14, 30, 'rgba(255,232,196,.12)'); // nose bridge light
      // moustache
      g.fillStyle = '#33281e';
      g.beginPath();
      g.moveTo(cx, cy + 96);
      g.bezierCurveTo(cx - 46, cy + 88, cx - 74, cy + 102, cx - 84, cy + 92);
      g.bezierCurveTo(cx - 60, cy + 116, cx - 20, cy + 108, cx, cy + 104);
      g.bezierCurveTo(cx + 20, cy + 108, cx + 60, cy + 116, cx + 84, cy + 92);
      g.bezierCurveTo(cx + 74, cy + 102, cx + 46, cy + 88, cx, cy + 96);
      g.closePath(); g.fill();
      // lips
      softEllipse(g, cx, cy + 128, 40, 12, '#a06a52');
      g.strokeStyle = 'rgba(70,40,28,.6)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(cx - 34, cy + 128); g.quadraticCurveTo(cx, cy + 134, cx + 34, cy + 128); g.stroke();
      // chin + cheek shading + jaw shadow
      softEllipse(g, cx, cy + 172, 40, 22, 'rgba(255,230,196,.16)');
      softEllipse(g, cx, cy + 148, 22, 10, 'rgba(90,55,34,.22)');
      shadeSide(g, cx, cy + 20, 158, 186, 0, 0.24);
      g.fillStyle = 'rgba(60,36,22,.25)';
      g.beginPath(); g.ellipse(cx - 92, cy + 44, 34, 16, 0.35, 0, 7); g.fill();
      g.beginPath(); g.ellipse(cx + 92, cy + 44, 34, 16, -0.35, 0, 7); g.fill();
      // light from the left (classic studio portrait)
      const lg = g.createLinearGradient(0, 0, W, 0);
      lg.addColorStop(0, 'rgba(255,240,214,.16)'); lg.addColorStop(0.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(20,10,0,.22)');
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
    });
  }
  function scene() {
    return mk('scene', LIST[1][1], 1280, 720, (g, W, H) => {
      const sky = g.createLinearGradient(0, 0, 0, H * 0.62);
      sky.addColorStop(0, '#c8b090'); sky.addColorStop(1, '#e2cba2');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // clouds
      for (let i = 0; i < 7; i++) {
        const x = U.h1(i, 51) * W, y = 40 + U.h1(i, 52) * 140, r = 40 + U.h1(i, 53) * 70;
        softEllipse(g, x, y, r * 1.7, r * 0.5, 'rgba(240,228,204,.8)', 0, 0.7);
        softEllipse(g, x + r, y - 8, r * 1.1, r * 0.42, 'rgba(240,228,204,.85)', 0, 0.6);
      }
      // the great gate (monument)
      const gx = W * 0.52, gy = H * 0.62;
      g.fillStyle = '#a89878';
      g.fillRect(gx - 250, gy - 300, 500, 300);            // main mass
      g.fillStyle = '#8f7f60';
      g.fillRect(gx - 270, gy - 330, 540, 36);             // cornice
      g.fillRect(gx - 214, gy - 384, 84, 58);              // small chhatri towers
      g.fillRect(gx + 130, gy - 384, 84, 58);
      for (let i = 0; i < 5; i++) g.fillRect(gx - 214 + i * 106, gy - 410, 54, 30);
      g.fillStyle = '#b3a384';
      g.fillRect(gx - 40, gy - 120, 80, 120);              // centre arch pier
      // the big arch (cut with sky colour)
      g.fillStyle = '#d8c4a0';
      g.beginPath();
      g.moveTo(gx - 170, gy);
      g.lineTo(gx - 170, gy - 130);
      g.quadraticCurveTo(gx, gy - 330, gx + 170, gy - 130);
      g.lineTo(gx + 170, gy);
      g.closePath(); g.fill();
      g.strokeStyle = '#7c6c50'; g.lineWidth = 6;
      g.beginPath();
      g.moveTo(gx - 178, gy); g.lineTo(gx - 178, gy - 132);
      g.quadraticCurveTo(gx, gy - 342, gx + 178, gy - 132);
      g.lineTo(gx + 178, gy);
      g.stroke();
      // dome behind
      softEllipse(g, gx + 8, gy - 348, 130, 92, '#9c8c6c');
      softEllipse(g, gx + 8, gy - 436, 14, 22, '#8f7f60');
      // windows on the flanks
      g.fillStyle = '#5f5138';
      for (let i = 0; i < 3; i++) {
        g.beginPath(); g.arc(gx - 208 + i * 40, gy - 210, 13, Math.PI, 0); g.lineTo(gx - 208 + i * 40 + 13, gy - 182); g.lineTo(gx - 208 + i * 40 - 13, gy - 182); g.closePath(); g.fill();
        g.beginPath(); g.arc(gx + 88 + i * 40, gy - 210, 13, Math.PI, 0); g.lineTo(gx + 88 + i * 40 + 13, gy - 182); g.lineTo(gx + 88 + i * 40 - 13, gy - 182); g.closePath(); g.fill();
      }
      // flags
      for (let i = 0; i < 4; i++) {
        const fx = gx - 300 + i * 200, fy = gy - 330 - U.h1(i, 61) * 90;
        g.strokeStyle = '#6a5a40'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy + 180); g.stroke();
        g.fillStyle = ['#a34a3a', '#c2973f', '#7a8a4a', '#a34a3a'][i];
        g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + 74, fy + 10 + U.h1(i, 62) * 8); g.lineTo(fx, fy + 30); g.closePath(); g.fill();
      }
      // crowd silhouettes
      g.fillStyle = '#3a3226';
      for (let i = 0; i < 46; i++) {
        const x = 30 + U.h1(i, 71) * (W - 60), y = H * 0.62 + 90 + U.h1(i, 72) * 130;
        const s = 0.7 + U.h1(i, 73) * 0.9;
        g.beginPath(); g.arc(x, y - 44 * s, 11 * s, 0, 7); g.fill();
        g.fillRect(x - 12 * s, y - 36 * s, 24 * s, 40 * s);
      }
      // ground
      const gr = g.createLinearGradient(0, H * 0.62, 0, H);
      gr.addColorStop(0, '#b3a17e'); gr.addColorStop(1, '#8a795c');
      g.fillStyle = gr; g.fillRect(0, H * 0.62, W, H * 0.38);
      // birds
      g.strokeStyle = '#4a4030'; g.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const x = W * 0.12 + U.h1(i, 81) * W * 0.3, y = 60 + U.h1(i, 82) * 100;
        g.beginPath(); g.arc(x - 7, y, 7, -2.6, -0.6); g.arc(x + 7, y, 7, -2.55, -0.55); g.stroke();
      }
    });
  }
  function place() {
    return mk('place', LIST[2][1], 1280, 720, (g, W, H) => {
      const sky = g.createLinearGradient(0, 0, 0, H * 0.5);
      sky.addColorStop(0, '#b8c4c0'); sky.addColorStop(1, '#e4ddc4');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      softEllipse(g, W * 0.78, H * 0.14, 70, 40, 'rgba(250,244,220,.9)', 0, 0.8);
      // hill layers
      const hill = (yBase, amp, col, seed) => {
        g.fillStyle = col;
        g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 16) g.lineTo(x, yBase + U.noise1(x / 180 + seed, seed) * amp);
        g.lineTo(W, H); g.closePath(); g.fill();
      };
      hill(H * 0.42, 60, '#8d9484', 3);
      hill(H * 0.5, 48, '#75795f', 9);
      hill(H * 0.58, 34, '#5d6248', 17);
      // river
      const rw = g.createLinearGradient(0, H * 0.66, 0, H);
      rw.addColorStop(0, '#9fb0a4'); rw.addColorStop(1, '#c3cbb8');
      g.fillStyle = rw;
      g.beginPath();
      g.moveTo(0, H * 0.7);
      g.bezierCurveTo(W * 0.3, H * 0.66, W * 0.55, H * 0.78, W, H * 0.7);
      g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
      // glints
      g.fillStyle = 'rgba(250,250,235,.5)';
      for (let i = 0; i < 14; i++) g.fillRect(U.h1(i, 91) * W, H * 0.72 + U.h1(i, 92) * H * 0.24, 26, 2.4);
      // old bridge
      g.fillStyle = '#7a6f58';
      g.fillRect(W * 0.08, H * 0.655, W * 0.42, 16);
      for (let i = 0; i < 5; i++) g.fillRect(W * 0.1 + i * W * 0.095, H * 0.655, 12, H * 0.16);
      g.fillStyle = '#8d8268';
      for (let i = 0; i < 5; i++) g.fillRect(W * 0.1 + i * W * 0.095 - 6, H * 0.635, 24, 22);
      // boat
      g.fillStyle = '#4c4436';
      g.beginPath();
      g.moveTo(W * 0.62, H * 0.78); g.quadraticCurveTo(W * 0.665, H * 0.815, W * 0.71, H * 0.78);
      g.lineTo(W * 0.7, H * 0.762); g.lineTo(W * 0.63, H * 0.762); g.closePath(); g.fill();
      g.fillRect(W * 0.664, H * 0.72, 3.4, 44);
      softEllipse(g, W * 0.662, H * 0.71, 30, 12, '#d8d2ba', 0, 0.9);
      // trees on the bank
      for (let i = 0; i < 9; i++) {
        const x = U.h1(i, 95) * W, y = H * 0.64 + U.h1(i, 96) * 30, s = 0.6 + U.h1(i, 97) * 0.8;
        g.fillStyle = '#3f4a34';
        g.fillRect(x - 3 * s, y - 30 * s, 6 * s, 34 * s);
        softEllipse(g, x, y - 48 * s, 26 * s, 30 * s, '#485440');
        softEllipse(g, x - 14 * s, y - 34 * s, 16 * s, 18 * s, '#3d4836');
        softEllipse(g, x + 14 * s, y - 36 * s, 15 * s, 17 * s, '#525f46');
      }
    });
  }
  function object() {
    return mk('object', LIST[3][1], 1280, 720, (g, W, H) => {
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#4c4234'); bg.addColorStop(1, '#2e2820');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // wooden table
      const wd = g.createLinearGradient(0, H * 0.6, 0, H);
      wd.addColorStop(0, '#6a4e32'); wd.addColorStop(1, '#4a3520');
      g.fillStyle = wd; g.fillRect(0, H * 0.6, W, H * 0.4);
      g.strokeStyle = 'rgba(30,20,10,.4)'; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, H * 0.62 + i * 34); g.bezierCurveTo(W * 0.3, H * 0.62 + i * 34 + 8, W * 0.7, H * 0.62 + i * 34 - 8, W, H * 0.62 + i * 34); g.stroke(); }
      const cx = W * 0.5, cy = H * 0.5;
      // chain
      g.strokeStyle = '#b9a26a'; g.lineWidth = 7; g.setLineDash([16, 13]);
      g.beginPath(); g.moveTo(cx - 250, cy + 120); g.quadraticCurveTo(cx - 160, cy + 60, cx - 92, cy - 8); g.stroke();
      g.setLineDash([]);
      // pocket watch
      softEllipse(g, cx, cy, 175, 175, '#c9b174');
      softEllipse(g, cx, cy, 158, 158, '#efe6cc');
      softEllipse(g, cx, cy, 140, 140, '#f7f1de');
      g.strokeStyle = '#6a5a34'; g.lineWidth = 5;
      g.beginPath(); g.arc(cx, cy, 148, 0, 7); g.stroke();
      // crown + bow
      g.fillStyle = '#c9b174';
      g.fillRect(cx - 12, cy - 208, 24, 26);
      g.beginPath(); g.arc(cx, cy - 224, 17, 0, 7); g.fill();
      g.strokeStyle = '#8f7a48'; g.lineWidth = 4;
      g.beginPath(); g.arc(cx, cy - 224, 10, 0, 7); g.stroke();
      // numerals
      g.fillStyle = '#3a3018'; g.font = '700 34px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2 - Math.PI / 2;
        g.fillText(String(i === 0 ? 12 : i), cx + Math.cos(a) * 118, cy + Math.sin(a) * 118);
      }
      // hands 10:09 (classic ad time)
      g.strokeStyle = '#2c2410'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(-Math.PI / 3) * 78, cy + Math.sin(-Math.PI / 3) * 78); g.stroke();
      g.lineWidth = 5;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(-0.5236 + 0.42) * 102, cy + Math.sin(-0.5236 + 0.42) * 102); g.stroke();
      softEllipse(g, cx, cy, 7, 7, '#2c2410');
      // inner shadow + light
      const sh = g.createRadialGradient(cx - 60, cy - 70, 20, cx, cy, 175);
      sh.addColorStop(0, 'rgba(255,250,230,.3)'); sh.addColorStop(0.8, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(30,20,5,.34)');
      g.fillStyle = sh; g.beginPath(); g.arc(cx, cy, 175, 0, 7); g.fill();
      // reflection streak
      g.save(); g.globalAlpha = 0.14; g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(cx - 52, cy - 60, 34, 88, -0.5, 0, 7); g.fill(); g.restore();
    });
  }
  function doc() {
    return mk('doc', LIST[4][1], 1280, 720, (g, W, H) => {
      g.fillStyle = '#5a5348'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#e9e0c8';
      g.fillRect(W * 0.12, H * 0.05, W * 0.76, H * 0.9);
      g.fillStyle = 'rgba(120,90,50,.1)'; g.fillRect(W * 0.12, H * 0.05, W * 0.76, H * 0.9);
      g.fillStyle = '#3c342a';
      g.font = '700 30px Georgia, serif'; g.textAlign = 'center';
      g.fillText('पुराना दस्तावेज़', W / 2, H * 0.14);
      g.font = '400 16px Georgia, serif';
      g.fillText('— १९४७ —', W / 2, H * 0.185);
      // paragraph lines (fake text)
      g.fillStyle = 'rgba(60,52,42,.8)';
      for (let ln = 0; ln < 16; ln++) {
        const y = H * 0.24 + ln * 26;
        let x = W * 0.17;
        const words = 8 + Math.floor(U.h1(ln, 5) * 5);
        for (let w = 0; w < words && x < W * 0.82; w++) {
          const wl = 18 + U.h1(ln * 31 + w, 6) * 40;
          g.fillRect(x, y, wl, 7);
          x += wl + 11;
        }
      }
      // signature scribble
      g.strokeStyle = '#28306e'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath();
      let sx = W * 0.58, sy = H * 0.78;
      g.moveTo(sx, sy);
      for (let i = 0; i < 22; i++) {
        sx += 7 + U.h1(i, 8) * 6;
        g.lineTo(sx, sy + (U.noise1(i * 0.7, 9) * 22));
      }
      g.stroke();
      // stamp
      g.strokeStyle = 'rgba(140,40,36,.75)'; g.lineWidth = 5;
      g.beginPath(); g.arc(W * 0.3, H * 0.78, 56, 0, 7); g.stroke();
      g.font = '700 15px Georgia, serif'; g.fillStyle = 'rgba(140,40,36,.8)';
      g.fillText('पुरालेख', W * 0.3, H * 0.775);
      // fold crease
      g.strokeStyle = 'rgba(90,70,40,.35)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(W * 0.5, H * 0.05); g.lineTo(W * 0.5, H * 0.95); g.stroke();
    });
  }

  // ---------------- demo video (procedural, deterministic) ----------------
  // A steam train crossing the frame — used by the rotoscope presets. Drawn at 12 steps
  // per second (the boil quantiser uses the same grid, so analysis cache always hits).
  const STEP = 1 / 12;
  const vcache = new Map();
  function clipAt(t) {
    const f = Math.max(0, Math.round(t / STEP));
    if (vcache.has(f)) return vcache.get(f);
    const W = 1280, H = 720, c = U.canvas(W, H), g = c.getContext('2d');
    const T = f * STEP, loop = 7;                  // one pass takes 7 s, then repeats
    const tt = T % loop;
    const x0 = -260 + (tt / loop) * (W + 520);      // train x position
    const gy = H * 0.78;                            // rail top
    // sky + hills
    const sky = g.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, '#c9c2ae'); sky.addColorStop(1, '#e7dcc2');
    g.fillStyle = sky; g.fillRect(0, 0, W, gy);
    g.fillStyle = '#a89d80';
    g.beginPath(); g.moveTo(0, gy);
    for (let x = 0; x <= W; x += 24) g.lineTo(x, gy - 120 - U.noise1(x / 260, 3) * 60);
    g.lineTo(W, gy); g.closePath(); g.fill();
    g.fillStyle = '#8f8468';
    g.beginPath(); g.moveTo(0, gy);
    for (let x = 0; x <= W; x += 24) g.lineTo(x, gy - 60 - U.noise1(x / 160 + 9, 7) * 40);
    g.lineTo(W, gy); g.closePath(); g.fill();
    // telegraph poles (parallax)
    for (let i = -1; i < 9; i++) {
      const px = ((i * 210 - tt * 40) % (W + 240) + W + 240) % (W + 240) - 120;
      g.strokeStyle = '#5d5138'; g.lineWidth = 9;
      g.beginPath(); g.moveTo(px, gy - 8); g.lineTo(px, gy - 210); g.stroke();
      g.lineWidth = 6;
      g.beginPath(); g.moveTo(px - 34, gy - 196); g.lineTo(px + 34, gy - 196); g.stroke();
      g.beginPath(); g.moveTo(px - 26, gy - 174); g.lineTo(px + 26, gy - 174); g.stroke();
    }
    // ground + rails
    g.fillStyle = '#6d6046'; g.fillRect(0, gy, W, H - gy);
    g.fillStyle = '#7c6f52'; g.fillRect(0, gy, W, 10);
    g.strokeStyle = '#4c4330'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(0, gy + 34); g.lineTo(W, gy + 34); g.stroke();
    g.beginPath(); g.moveTo(0, gy + 56); g.lineTo(W, gy + 56); g.stroke();
    g.fillStyle = '#57492f';
    for (let x = -20; x < W + 40; x += 46) g.fillRect(x + (tt * 90) % 46, gy + 30, 12, 30);
    // smoke puffs
    for (let i = 0; i < 9; i++) {
      const age = (tt * 1.6 + i * 0.55) % 3.2;
      const px = x0 + 130 - age * 66, py = gy - 240 - age * 44;
      softEllipse(g, px, py, 14 + age * 26, 12 + age * 22, 'rgba(230,226,214,.75)', 0, U.clamp(0.8 - age / 3.4));
    }
    // engine body
    g.fillStyle = '#2e2a26';
    g.fillRect(x0 + 60, gy - 150, 210, 108);                  // boiler
    g.beginPath(); g.ellipse(x0 + 270, gy - 118, 24, 54, 0, 0, 7); g.fill(); // smokebox front
    g.fillStyle = '#3c352d';
    g.fillRect(x0 + 280, gy - 210, 120, 170);                 // cab
    g.fillStyle = '#4a4034';
    g.fillRect(x0 + 292, gy - 196, 44, 54);                   // cab window
    g.fillStyle = '#7a2e24';
    g.fillRect(x0 + 56, gy - 166, 220, 18);                   // boiler band
    g.fillRect(x0 + 292, gy - 120, 96, 14);
    g.fillStyle = '#22201c';
    g.fillRect(x0 + 60, gy - 60, 380, 26);                    // chassis
    // funnel
    g.fillStyle = '#26221e';
    g.fillRect(x0 + 108, gy - 226, 34, 82);
    g.fillRect(x0 + 100, gy - 238, 50, 16);
    // dome
    softEllipse(g, x0 + 190, gy - 158, 26, 16, '#8a7a48');
    // wheels with spokes
    const wheels = [x0 + 108, x0 + 196, x0 + 300, x0 + 384];
    for (const wx of wheels) {
      const r = 44;
      g.fillStyle = '#26221e';
      g.beginPath(); g.arc(wx, gy - 14, r, 0, 7); g.fill();
      g.strokeStyle = '#8a7a48'; g.lineWidth = 7;
      g.beginPath(); g.arc(wx, gy - 14, r - 7, 0, 7); g.stroke();
      g.lineWidth = 5;
      for (let s = 0; s < 6; s++) {
        const a = (tt / loop) * 26 + s / 6 * Math.PI * 2;
        g.beginPath(); g.moveTo(wx, gy - 14); g.lineTo(wx + Math.cos(a) * (r - 9), gy - 14 + Math.sin(a) * (r - 9)); g.stroke();
      }
      g.fillStyle = '#c9b26a';
      g.beginPath(); g.arc(wx, gy - 14, 7, 0, 7); g.fill();
    }
    // tender (coal car)
    g.fillStyle = '#332e28';
    g.fillRect(x0 + 420, gy - 128, 150, 78);
    g.fillStyle = '#171512';
    for (let i = 0; i < 12; i++) softEllipse(g, x0 + 436 + U.h1(i, 21) * 120, gy - 128 - 6 - U.h1(i, 22) * 12, 12, 8, '#171512');
    // coupling
    g.strokeStyle = '#22201c'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(x0 + 404, gy - 44); g.lineTo(x0 + 420, gy - 44); g.stroke();
    // headlamp glow
    softEllipse(g, x0 + 292, gy - 118, 12, 12, '#e8cf8a');
    grade(g, W, H, 91, { sepia: 0.3, grain: 0.4, vig: 0.45, scratches: 0.2 });
    if (vcache.size > 200) vcache.clear();
    vcache.set(f, c);
    return c;
  }
  function clip() {
    return { kind: 'demovideo', name: LIST[5][1], draw: clipAt, duration: 14, demo: 'clip' };
  }

  // registry used by "+ Demo" and preset defaults
  function get(id) {
    if (id === 'portrait') return portrait();
    if (id === 'scene') return scene();
    if (id === 'place') return place();
    if (id === 'object') return object();
    if (id === 'doc') return doc();
    if (id === 'clip') return clip();
    return portrait();
  }

  SK.media.demo = get;
  SK.media.demoList = LIST;
  SK.media.grade = grade;
})();
