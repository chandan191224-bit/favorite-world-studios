// Transitions between shots: dip to black, white flash, defocus cross-fade,
// zoom-through (into the detail), torn-paper sweep and slide. A and B are fully rendered
// shot frames (photo + atmosphere + grade) at the same size. Deterministic (seeded).
window.PP = window.PP || {};
PP.transitions = (() => {
  const U = PP.util;

  const LIST = [
    { id: 'dip', name: 'Dip to black', dur: 0.6 },
    { id: 'flash', name: 'White flash', dur: 0.35 },
    { id: 'defocus', name: 'Defocus cross-fade', dur: 0.7 },
    { id: 'zoom', name: 'Zoom through', dur: 0.8 },
    { id: 'tear', name: 'Torn-paper sweep', dur: 0.8 },
    { id: 'slide', name: 'Slide', dur: 0.55 },
    { id: 'fade', name: 'Soft cross-fade', dur: 0.6 },
  ];
  const byId = {};
  for (const t of LIST) byId[t.id] = t;

  function draw(g, fx, p, A, B, W, H, opts = {}) {
    const P = opts.params || {};
    switch (fx) {
      case 'dip': {
        const a = 1 - U.clamp(Math.abs(p - 0.5) * 2);
        if (p < 0.5) { g.drawImage(A, 0, 0); } else { g.drawImage(B, 0, 0); }
        if (a > 0) { g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(0, 0, W, H); }
        break;
      }
      case 'flash': {
        if (p < 0.45) g.drawImage(A, 0, 0); else g.drawImage(B, 0, 0);
        const a = Math.sin(U.clamp(p) * Math.PI) ** 1.5;
        g.fillStyle = `rgba(255,255,255,${a})`;
        g.fillRect(0, 0, W, H);
        break;
      }
      case 'fade': {
        g.drawImage(A, 0, 0);
        g.globalAlpha = U.clamp(p * 1.25);
        g.drawImage(B, 0, 0);
        g.globalAlpha = 1;
        break;
      }
      case 'defocus': {
        const k = Math.sin(U.clamp(p) * Math.PI);      // blur peaks mid-transition
        const ba = PP.inpaint.blurred(A, k * 0.5), bb = PP.inpaint.blurred(B, k * 0.5);
        if (p < 0.5) { g.drawImage(ba, 0, 0); g.globalAlpha = p * 2; g.drawImage(bb, 0, 0); }
        else { g.drawImage(bb, 0, 0); g.globalAlpha = (1 - p) * 2; g.drawImage(ba, 0, 0); }
        g.globalAlpha = 1;
        break;
      }
      case 'zoom': {
        const [fx, fy] = opts.focus || [0.5, 0.55];
        // A rushes into the focus point and dissolves; B blooms out of it
        const pa = U.ease.in(U.clamp(p / 0.8));
        const pb = U.ease.out(U.clamp((p - 0.25) / 0.75));
        g.save();
        g.translate(fx * W, fy * H);
        const za = 1 + pa * 2.6;
        g.scale(za, za); g.translate(-fx * W, -fy * H);
        g.drawImage(A, 0, 0);
        g.restore();
        if (pb > 0) {
          g.save();
          g.globalAlpha = U.clamp(pb * 1.4);
          g.translate(fx * W, fy * H);
          const zb = 1 / (1 + pb * 1.9);
          g.scale(0.42 + pb * 0.58, 0.42 + pb * 0.58);
          g.translate(-fx * W, -fy * H);
          g.drawImage(B, 0, 0);
          g.restore();
        }
        break;
      }
      case 'tear': {
        // torn edge sweeps across; ahead of it A, behind it B; rough paper edge + shadow
        const seed = (opts.seed || 5) * 131;
        const x = U.lerp(-0.12, 1.12, U.ease.inOut(p)) * W;
        g.drawImage(B, 0, 0);
        g.save();
        g.beginPath();
        g.rect(0, 0, x, H);
        g.clip();
        g.drawImage(A, 0, 0);
        g.restore();
        // torn edge strip
        const edge = [], seg = 26;
        for (let i = 0; i <= seg; i++) {
          const t = i / seg;
          edge.push([x + (U.noise2(t * 5.2, 0.7, seed) * 0.5 + U.noise2(t * 13.7, 2.1, seed) * 0.5) * W * 0.022, t * H]);
        }
        g.save();
        g.beginPath();
        g.moveTo(edge[0][0], edge[0][1]);
        for (const [ex, ey] of edge) g.lineTo(ex, ey);
        for (let i = edge.length - 1; i >= 0; i--) g.lineTo(edge[i][0] + W * 0.012, edge[i][1]);
        g.closePath();
        g.fillStyle = 'rgba(28,24,20,.9)';
        g.fill();
        g.strokeStyle = 'rgba(240,232,214,.65)';
        g.lineWidth = Math.max(1, W / 900);
        g.stroke();
        g.restore();
        break;
      }
      case 'slide': {
        const e = U.ease.inOut(p);
        g.drawImage(A, -e * W * 0.28, 0);
        g.drawImage(B, (1 - e) * W, 0);
        break;
      }
      default: g.drawImage(p < 0.5 ? A : B, 0, 0);
    }
  }

  return { LIST, byId, draw };
})();
