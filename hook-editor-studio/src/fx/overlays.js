// Customizable hook overlay layers analyzed from Dhruv Rathee, Nitish Rajput & The Deshbhakt.
// Safe inside cinema bars (y = 138..942 in 1920x1080), supports Hindi & English bundled fonts.
HES.overlays = (() => {
  const U = HES.util, T = HES.text;

  const PRESETS = [
    {
      id: 'ov-coming-up', name: 'COMING UP NEXT Badge', fam: 'Retention',
      desc: 'Nitish Rajput style top-left pulsing retention badge.',
      def: { text: 'COMING UP NEXT', sub: '', source: '', font: 'khand', color: '#ef4444', accent: '#ffffff', x: 0.06, y: 0.17, scale: 1.0, dur: 14.0, beatReact: 0.8 },
    },
    {
      id: 'ov-impact-title', name: '3D Impact Hook Title', fam: 'Typography',
      desc: 'Dhruv Rathee / Nitish giant extruded impact word with beat-pop entrance.',
      def: { text: 'THE HIDDEN TRUTH', sub: 'WHAT NOBODY TOLD YOU', source: '', font: 'bebas', color: '#ffffff', accent: '#e5a93c', x: 0.5, y: 0.52, scale: 1.0, dur: 3.5, beatReact: 1.0 },
    },
    {
      id: 'ov-doc-highlight', name: 'Black-Bar Doc Highlight', fam: 'Evidence',
      desc: 'Dhruv Rathee inverted black/amber highlight sweep over news headline + SOURCE tag.',
      def: { text: 'SECRET MEMO LEAKED', sub: 'MASSIVE SUDDEN SHIFT REPORTED IN 2026', source: 'SOURCE: ARCHIVE REPORT', font: 'khand', color: '#ffffff', accent: '#dc2626', x: 0.5, y: 0.52, scale: 1.0, dur: 4.5, beatReact: 0.5 },
    },
    {
      id: 'ov-callout', name: 'Neon Callout Reticle', fam: 'Evidence',
      desc: 'Nitish Rajput glowing HUD circle + spotlight ring + label.',
      def: { text: 'KEY EVIDENCE', sub: 'CHECK THIS DETAIL', source: '', font: 'khand', color: '#facc15', accent: '#22d3ee', x: 0.54, y: 0.50, scale: 1.0, dur: 3.8, beatReact: 1.0 },
    },
    {
      id: 'ov-lower-third', name: 'Lower Third Nameplate', fam: 'Typography',
      desc: 'Clean documentary lower third pill for names, places, or dates.',
      def: { text: '22 AUG 2026', sub: 'NEW DELHI • CLASSIFIED FILE', source: '', font: 'khand', color: '#ffffff', accent: '#e5a93c', x: 0.08, y: 0.78, scale: 1.0, dur: 4.0, beatReact: 0.6 },
    },
    {
      id: 'ov-banner', name: 'Tabloid Hook Banner', fam: 'Typography',
      desc: 'Deshbhakt skewed top-right bold banner headline.',
      def: { text: 'THE REAL GAME?!', sub: '', source: '', font: 'bebas', color: '#facc15', accent: '#dc2626', x: 0.92, y: 0.19, scale: 1.0, dur: 5.0, beatReact: 0.9 },
    },
    {
      id: 'ov-stat-pop', name: 'Counter / Stat Pop', fam: 'Data',
      desc: 'Dhruv-style animated number counter or shocking stat card.',
      def: { text: '38,000', sub: 'YEARS AGO • SUDDEN COLLAPSE', source: '', font: 'bebas', color: '#e5a93c', accent: '#ffffff', x: 0.5, y: 0.74, scale: 1.0, dur: 3.6, beatReact: 1.0 },
    },
    {
      id: 'ov-timeline-bar', name: 'Bottom Year Scrubber', fam: 'Data',
      desc: 'Nitish Rajput horizontal year ruler bar above the cinema mask.',
      def: { text: '1991 • 2008 • 2026', sub: 'TURNING POINT', source: '', font: 'khand', color: '#e5a93c', accent: '#ffffff', x: 0.5, y: 0.84, scale: 1.0, dur: 5.5, beatReact: 0.5 },
    },
  ];
  const byId = Object.fromEntries(PRESETS.map(p => [p.id, p]));

  function drawOverlay(ctx, ov, lt, dur, W, H, beat, syncStrength = 1) {
    if (!ov.on && ov.on !== undefined) return;
    const pr = byId[ov.type] || PRESETS[0];
    const d = pr.def;
    const S = Math.min(W, H) / 1080; // design-pixel scale
    const p = U.clamp(lt / Math.max(0.1, dur));
    const inE = U.ease.outBack(U.range(lt, 0, Math.min(0.45, dur * 0.25)));
    const outA = 1 - U.smooth(U.range(lt, Math.max(0, dur - 0.35), dur));
    const alpha = U.clamp(inE * outA);
    if (alpha <= 0.01) return;

    const text = ov.text != null ? ov.text : d.text;
    const sub = ov.sub != null ? ov.sub : d.sub;
    const source = ov.source != null ? ov.source : d.source;
    const fontId = ov.font || d.font;
    const color = ov.color || d.color;
    const accent = ov.accent || d.accent;
    const x = (ov.x != null ? ov.x : d.x) * W;
    const y = (ov.y != null ? ov.y : d.y) * H;
    const sc = (ov.scale != null ? ov.scale : 1) * S;
    const react = (ov.beatReact != null ? ov.beatReact : d.beatReact) * syncStrength;
    const beatBump = 1 + 0.045 * beat.beatPulse * react;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (ov.type === 'ov-coming-up') {
      ctx.translate(x, y);
      ctx.scale(sc, sc);
      const pulse = 0.55 + 0.45 * Math.max(beat.beatPulse, 0.5 + 0.5 * Math.sin(lt * 5));
      ctx.font = T.font(fontId, 26, 'bold');
      const tw = ctx.measureText(text).width;
      const bw = tw + 52, bh = 44;
      ctx.fillStyle = 'rgba(10,12,16,0.82)';
      U.rrect(ctx, 0, -bh / 2, bw, bh, 8); ctx.fill();
      ctx.strokeStyle = U.rgba(color, 0.7); ctx.lineWidth = 2; ctx.stroke();
      // pulsing live dot
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(20, 0, 6 * (0.85 + 0.25 * pulse), 0, U.TAU); ctx.fill();
      ctx.fillStyle = accent;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(text, 36, 1);
    } else if (ov.type === 'ov-impact-title') {
      ctx.translate(x, y);
      ctx.scale(sc * (0.86 + 0.14 * inE) * beatBump, sc * (0.86 + 0.14 * inE) * beatBump);
      const lay = T.wrapLines(text, { font: fontId, size: 118, maxW: 1500, upper: fontId === 'bebas' });
      ctx.font = lay.fontStr; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const totalH = lay.lines.length * lay.lh;
      lay.lines.forEach((ln, i) => {
        const ly = (i + 0.5) * lay.lh - totalH / 2;
        // 3D depth extrusion shadow
        for (let k = 8; k >= 1; k--) {
          ctx.fillStyle = k > 4 ? 'rgba(0,0,0,0.45)' : U.rgba(accent, 0.55);
          ctx.fillText(ln.text, k * 1.6, ly + k * 1.6);
        }
        ctx.fillStyle = color;
        ctx.fillText(ln.text, 0, ly);
      });
      if (sub) {
        ctx.font = T.font('khand', 34, 'bold');
        const sw = ctx.measureText(sub).width + 44;
        const sy = totalH / 2 + 34;
        ctx.fillStyle = accent;
        U.rrect(ctx, -sw / 2, sy - 20, sw, 40, 6); ctx.fill();
        ctx.fillStyle = '#0b0d11';
        ctx.fillText(sub, 0, sy + 1);
      }
    } else if (ov.type === 'ov-doc-highlight') {
      ctx.translate(x, y);
      ctx.scale(sc * (0.94 + 0.06 * inE), sc * (0.94 + 0.06 * inE));
      const cw = 1040, ch = sub ? 250 : 170;
      // Dark semi-transparent press card with crisp border
      ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 32;
      ctx.fillStyle = 'rgba(18, 20, 26, 0.92)';
      U.rrect(ctx, -cw / 2, -ch / 2, cw, ch, 12); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2; ctx.stroke();

      // Header pill
      ctx.fillStyle = '#ffffff';
      U.rrect(ctx, -cw / 2 + 36, -ch / 2 + 24, 190, 32, 4); ctx.fill();
      ctx.fillStyle = '#111'; ctx.font = T.font('khand', 20, 'bold');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('NEWS REPORT', -cw / 2 + 131, -ch / 2 + 41);

      // Headline + sweeping highlight bar with readable crisp white text
      ctx.textAlign = 'left';
      const lay = T.wrapLines(text, { font: fontId, size: 40, maxW: cw - 88, upper: fontId === 'bebas' });
      ctx.font = lay.fontStr;
      const wipe = U.ease.outQuart(U.range(lt, 0.15, Math.min(1.1, dur * 0.55)));
      const hlColor = U.rgba(accent, 0.92);
      lay.lines.slice(0, 2).forEach((ln, li) => {
        const hy = -ch / 2 + 96 + li * (lay.lh * 1.05);
        const tw = Math.min(cw - 84, ln.w + 18);
        ctx.fillStyle = hlColor;
        U.rrect(ctx, -cw / 2 + 34, hy - 23, Math.max(0, tw * wipe), 46, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ln.text, -cw / 2 + 42, hy + 1);
      });

      const hasExplicitSource = /^SOURCE:/i.test(sub);
      if (sub && !hasExplicitSource) {
        ctx.font = T.font('mukta', 26, 'normal');
        ctx.fillStyle = 'rgba(235,238,244,0.88)';
        ctx.fillText(sub, -cw / 2 + 42, ch / 2 - 26);
      }
      const badgeSrc = hasExplicitSource ? sub : source;
      if (badgeSrc) {
        ctx.font = T.font('khand', 20, 'bold');
        ctx.textAlign = 'right';
        ctx.fillStyle = '#e5a93c';
        ctx.fillText(badgeSrc, cw / 2 - 30, ch / 2 - 24);
      }
    } else if (ov.type === 'ov-callout') {
      // Spotlight ring + glowing HUD reticle
      const r = 135 * sc * beatBump;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(x, y, r, 0, U.TAU, true);
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fill('evenodd');
      ctx.restore();

      ctx.translate(x, y);
      const spin = lt * 1.4;
      ctx.shadowColor = color; ctx.shadowBlur = 18 + 12 * beat.beatPulse * react;
      ctx.strokeStyle = color; ctx.lineWidth = 4 * sc;
      ctx.beginPath(); ctx.arc(0, 0, r, spin, spin + Math.PI * 1.45); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 2.5 * sc;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.13, -spin * 1.3, -spin * 1.3 + Math.PI * 1.1); ctx.stroke();
      ctx.shadowBlur = 0;

      // Callout label pill above/right of circle
      if (text) {
        ctx.font = T.font(fontId, 34 * sc, 'bold');
        const tw = ctx.measureText(text).width + 32 * sc;
        const lx = r * 0.72, ly = -r * 0.75;
        ctx.strokeStyle = color; ctx.lineWidth = 2.5 * sc;
        ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.45); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.fillStyle = 'rgba(11,13,17,0.9)';
        U.rrect(ctx, lx, ly - 24 * sc, tw, 48 * sc, 8 * sc); ctx.fill();
        ctx.stroke();
        ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(text, lx + 16 * sc, ly + 1);
      }
    } else if (ov.type === 'ov-lower-third') {
      ctx.translate(x, y);
      ctx.scale(sc * beatBump, sc * beatBump);
      const slide = (1 - inE) * -60;
      ctx.translate(slide, 0);
      ctx.font = T.font(fontId, 46, 'bold');
      const w1 = ctx.measureText(text).width;
      ctx.font = T.font('mukta', 24, 'bold');
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const bw = Math.max(w1, w2) + 54;
      const bh = sub ? 94 : 62;
      ctx.fillStyle = 'rgba(12, 14, 20, 0.88)';
      U.rrect(ctx, 0, -bh / 2, bw, bh, 8); ctx.fill();
      ctx.fillStyle = accent;
      U.rrect(ctx, 0, -bh / 2, 9, bh, 4); ctx.fill();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = color; ctx.font = T.font(fontId, 44, 'bold');
      ctx.fillText(text, 24, sub ? -14 : 1);
      if (sub) {
        ctx.fillStyle = accent; ctx.font = T.font('mukta', 22, 'bold');
        ctx.fillText(sub, 24, 22);
      }
    } else if (ov.type === 'ov-banner') {
      ctx.translate(x, y);
      ctx.scale(sc * beatBump, sc * beatBump);
      ctx.transform(1, 0, -0.16, 1, 0, 0); // bold comic/tabloid skew
      ctx.font = T.font(fontId, 58, 'bold');
      const tw = ctx.measureText(text).width + 44;
      ctx.fillStyle = accent;
      U.rrect(ctx, -tw, -36, tw, 72, 6); ctx.fill();
      ctx.fillStyle = color;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(text, -20, 2);
    } else if (ov.type === 'ov-stat-pop') {
      ctx.translate(x, y);
      ctx.scale(sc * (0.75 + 0.25 * inE) * beatBump, sc * (0.75 + 0.25 * inE) * beatBump);
      ctx.fillStyle = 'rgba(10, 12, 18, 0.84)';
      ctx.font = T.font(fontId, 96, 'bold');
      const tw = Math.max(320, ctx.measureText(text).width + 90);
      U.rrect(ctx, -tw / 2, -78, tw, sub ? 156 : 116, 14); ctx.fill();
      ctx.strokeStyle = U.rgba(color, 0.7); ctx.lineWidth = 3; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, 0, sub ? -18 : 2);
      if (sub) {
        ctx.font = T.font('khand', 28, 'bold');
        ctx.fillStyle = accent;
        ctx.fillText(sub, 0, 44);
      }
    } else if (ov.type === 'ov-timeline-bar') {
      ctx.translate(x, y);
      ctx.scale(sc, sc);
      const bw = 1360;
      ctx.fillStyle = 'rgba(10, 12, 16, 0.72)';
      U.rrect(ctx, -bw / 2, -32, bw, 64, 10); ctx.fill();
      // ticks
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2;
      for (let i = -18; i <= 18; i++) {
        const tx = (i / 18) * (bw * 0.44);
        const h = i % 3 === 0 ? 18 : 9;
        ctx.beginPath(); ctx.moveTo(tx, 26); ctx.lineTo(tx, 26 - h); ctx.stroke();
      }
      // moving glow marker
      const mx = U.lerp(-bw * 0.36, bw * 0.36, U.ease.out(p));
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(mx, 14, 7 * beatBump, 0, U.TAU); ctx.fill();
      ctx.font = T.font(fontId, 28, 'bold');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = accent;
      ctx.fillText(text, 0, -10);
    }

    ctx.restore();
  }

  return { PRESETS, byId, drawOverlay };
})();
