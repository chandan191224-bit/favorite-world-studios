// Family: Combo looks — ready stacks of the other families, tuned to work together
// (order, colours, timing). One click = a full documentary atmosphere.
(() => {
  const U = VFX.util, X = VFX.fx, P = VFX.pars;
  const fx = id => VFX.fx.byId[id];

  // call a registered effect with a param object at (optionally shifted) time
  function call(g, id, p, E, dt = 0, ds = 0) {
    const e = fx(id);
    if (e) e.draw(g, p, Object.assign({}, E, { t: Math.max(0, E.t - dt), seed: (E.seed | 0) + ds }));
  }

  X.register({
    id: 'cb-war-city', name: 'War-torn city', fam: 'Combo looks',
    note: 'Black smoke columns over a ruined skyline, distant artillery flashes on the horizon, embers and falling ash — the default war establishing shot.',
    dur: 12, y: 0.9,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0.25), P.tint(null)],
    fields: [],
    draw(g, p, E) {
      const a = p.amount == null ? 1 : p.amount, s = p.size || 1, sp = p.speed || 1, w = p.wind || 0, tint = p.tint;
      const x1 = 0.24, x2 = 0.62, x3 = 0.85;
      call(g, 'ex-artillery', { x: 0.5, y: 0.66, amount: a * 0.7, size: s, speed: sp, wind: w, loop: 0 }, E, 0, 1);
      call(g, 'sm-war-black', { x: x1, y: 0.94, amount: a * 0.95, size: s * 1.1, speed: sp * 0.8, wind: w, soft: 0.65, loop: 0, tint }, E, 0, 11);
      call(g, 'sm-war-black', { x: x2, y: 0.96, amount: a, size: s * 1.5, speed: sp * 0.7, wind: w, soft: 0.6, loop: 0, tint }, E, 0.7, 23);
      call(g, 'sm-war-black', { x: x3, y: 0.92, amount: a * 0.8, size: s * 0.8, speed: sp * 0.9, wind: w, soft: 0.7, loop: 0, tint }, E, 1.6, 37);
      call(g, 'sm-battlefield-wall', { y: 0.72, amount: a * 0.55, size: s, speed: sp * 0.5, wind: w, soft: 0.75, loop: 0, tint }, E, 0, 53);
      call(g, 'fi-embers', { y: 0.9, amount: a * 0.7, size: s, speed: sp, wind: w, area: 'full', loop: 0 }, E, 0, 71);
      call(g, 'pa-ash-fall', { amount: a * 0.6, size: s, speed: sp * 0.7, wind: w * 1.2, tint: '#a9a49c', area: 'full', loop: 0 }, E, 0, 97);
    },
  });

  X.register({
    id: 'cb-partition-night', name: 'Partition night', fam: 'Combo looks',
    note: 'Night of a great fire — orange glow flickering on low smoke, embers rising, ash in the air. For 1947-style night shots.',
    dur: 12, x: 0.5, y: 0.95,
    params: [P.amount(1), P.size(1), P.speed(1), P.wind(0.2), P.tint(null)],
    fields: [],
    draw(g, p, E) {
      const a = p.amount == null ? 1 : p.amount, s = p.size || 1, sp = p.speed || 1, w = p.wind || 0;
      // warm glow pool
      const { fw, fh } = E;
      g.save();
      g.globalCompositeOperation = 'lighter';
      const flick = 0.7 + 0.3 * (U.noise2(E.t * 4.2, 9.3, E.seed | 0) * 0.5 + 0.5);
      const gr = g.createLinearGradient(0, fh, 0, fh * 0.25);
      gr.addColorStop(0, `rgba(255,120,30,${0.34 * flick * a})`);
      gr.addColorStop(0.5, `rgba(255,90,20,${0.12 * flick * a})`);
      gr.addColorStop(1, 'rgba(255,80,10,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, fw, fh);
      g.restore();
      call(g, 'fi-building', { x: 0.5, y: 1.02, amount: a * 0.8, size: s * 1.2, speed: sp * 0.85, wind: w, glow: 0.55, soft: 0.6, loop: 0 }, E, 0, 7);
      call(g, 'sm-war-black', { x: 0.35, y: 0.98, amount: a * 0.85, size: s * 1.6, speed: sp * 0.6, wind: w, soft: 0.7, loop: 0, tint: p.tint }, E, 0.4, 19);
      call(g, 'sm-war-black', { x: 0.72, y: 1, amount: a * 0.7, size: s * 1.3, speed: sp * 0.55, wind: w, soft: 0.7, loop: 0, tint: p.tint }, E, 1.1, 29);
      call(g, 'fi-embers', { y: 0.96, amount: a, size: s, speed: sp, wind: w, area: 'full', loop: 0 }, E, 0, 41);
      call(g, 'pa-ash-fall', { amount: a * 0.5, size: s, speed: sp * 0.5, wind: w, tint: '#9c938a', area: 'full', loop: 0 }, E, 0, 59);
    },
  });

  X.register({
    id: 'cb-storm-arrives', name: 'Storm arrives', fam: 'Combo looks',
    note: 'The weather turning: dark storm clouds racing in, heavy slanted rain, a lightning strike and wind gusts.',
    dur: 12,
    params: [P.amount(1), P.size(1), P.speed(1.2), P.wind(0.6), P.tint(null)],
    fields: [],
    draw(g, p, E) {
      const a = p.amount == null ? 1 : p.amount, s = p.size || 1, sp = p.speed || 1.2, w = p.wind == null ? 0.6 : p.wind;
      call(g, 'sk-storm-clouds', { amount: a, size: s * 1.1, speed: sp * 1.4, wind: w, soft: 0.75, glow: 0.4 }, E, 0, 3);
      call(g, 'sk-cloud-shadows', { amount: a * 0.8, size: s * 1.3, speed: sp * 1.6, wind: w, soft: 0.85 }, E, 0, 13);
      call(g, 'we-rain-angled', { amount: a, size: s, speed: sp, wind: w, tint: '#bccddb', area: 'full', loop: 0 }, E, 0.8, 27);
      call(g, 'we-lightning', { amount: a * 0.8, size: s, speed: sp, tint: null, area: 'full', loop: 0, sky: 0.55 }, E, 0, 43);
      call(g, 'sm-ground-fog', { y: 0.98, amount: a * 0.5, size: s, speed: sp * 0.8, wind: w, soft: 0.8, loop: 0, tint: null }, E, 0, 61);
    },
  });

  X.register({
    id: 'cb-dust-bowl', name: 'Dust bowl', fam: 'Combo looks',
    note: 'Drought and dust — a sandstorm wall rolling, grit streaks, blowing paper and a brown grade over everything.',
    dur: 12, y: 0.8,
    params: [P.amount(1), P.size(1), P.speed(1.2), P.wind(0.9), P.tint('#c8a86e')],
    fields: [],
    draw(g, p, E) {
      const a = p.amount == null ? 1 : p.amount, s = p.size || 1, sp = p.speed || 1.2, w = p.wind == null ? 0.9 : p.wind, tint = p.tint || '#c8a86e';
      call(g, 'we-dust-storm', { y: 0.8, amount: a, size: s * 1.2, speed: sp, wind: w, tint, soft: 0.75 }, E, 0, 5);
      call(g, 'sm-ground-fog', { y: 0.95, amount: a * 0.6, size: s * 1.3, speed: sp * 0.7, wind: w, soft: 0.8, loop: 0, tint }, E, 0.5, 17);
      call(g, 'pa-paper-fly', { amount: a * 0.5, size: s, speed: sp, wind: w, area: 'full', loop: 0 }, E, 0, 31);
      call(g, 'pa-debris-fall', { amount: a * 0.4, size: s, speed: sp * 0.8, wind: w * 0.5, tint: '#7a6647', area: 'full' }, E, 0, 47);
    },
  });

  X.register({
    id: 'cb-winter-front', name: 'Winter front', fam: 'Combo looks',
    note: 'A cold front moving in — gentle snow, ground mist, drifting cloud shadows and a cool blue grade.',
    dur: 12,
    params: [P.amount(1), P.size(1), P.speed(0.8), P.wind(0.3), P.tint(null)],
    fields: [],
    draw(g, p, E) {
      const a = p.amount == null ? 1 : p.amount, s = p.size || 1, sp = p.speed || 0.8, w = p.wind || 0.3;
      call(g, 'sk-cloud-shadows', { amount: a * 0.7, size: s * 1.2, speed: sp * 1.4, wind: w, soft: 0.85 }, E, 0, 3);
      call(g, 'we-snow-gentle', { amount: a, size: s, speed: sp, wind: w, tint: '#edf3f9', area: 'full', loop: 0 }, E, 0.3, 11);
      call(g, 'sm-ground-fog', { y: 0.97, amount: a * 0.8, size: s, speed: sp * 0.7, wind: w, soft: 0.85, loop: 0, tint: '#dfe8f2' }, E, 0, 23);
      // cool grade
      const { fw, fh } = E;
      g.save();
      g.globalCompositeOperation = 'soft-light';
      if (g.globalCompositeOperation !== 'soft-light') g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.16 * a;
      g.fillStyle = '#5a7ea6';
      g.fillRect(0, 0, fw, fh);
      g.restore();
    },
  });

  X.register({
    id: 'cb-burning-archive', name: 'Burning archive', fam: 'Combo looks',
    note: 'An old photo or document burning at the edges — glowing front eating inward, sparks, embers and smoke. Put it over your photo.',
    dur: 7,
    params: [P.amount(1), P.size(0.4), P.speed(1), P.wind(0.15), P.tint(null)],
    fields: [],
    draw(g, p, E) {
      const a = p.amount == null ? 1 : p.amount, s = p.size == null ? 0.4 : p.size, sp = p.speed || 1, w = p.wind || 0.15;
      call(g, 'fi-burn-edge', { amount: a, size: s, speed: sp, wind: w, glow: 0.9, tint: p.tint }, E, 0, 2);
      call(g, 'fi-sparks', { x: 0.5, y: 0.45, amount: a * 0.7, size: s, speed: sp, loop: 2.6 }, E, 0.4, 13);
      call(g, 'fi-embers', { y: 0.55, amount: a * 0.8, size: s, speed: sp, wind: w, area: 'full', loop: 0 }, E, 0.2, 29);
      call(g, 'pa-ash-fall', { amount: a * 0.5, size: s, speed: sp * 0.6, wind: w, tint: '#a89c8e', area: 'full', loop: 0 }, E, 0.6, 41);
    },
  });
})();
