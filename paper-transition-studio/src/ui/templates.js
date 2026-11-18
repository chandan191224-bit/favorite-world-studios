// Ready-made projects modelled on the reference playlist's packs.
PT.templates = (() => {
  const E = PT.engine;
  const paper = (material, extra = {}) => Object.assign({ type: 'paper', material, crumple: 0.55, seed: Math.floor(Math.random() * 999) + 1 }, extra);
  const key = (color = '#00ff00') => ({ type: 'key', color });
  const tr = (presetId, dur) => {
    const pr = PT.fx.presets.find(p => p.id === presetId);
    if (!pr || !PT.fx.byId[pr.fx]) return E.newTransition('peel', {}, dur || 1.2);
    return E.newTransition(pr.fx, pr.params, dur || pr.dur);
  };
  const build = (name, shots) => {
    const p = E.defaultProject();
    p.name = name;
    p.shots = shots.map(([src, hold, tran]) => { const s = E.newShot(src, hold); if (tran) s.transition = tran; return s; });
    return p;
  };
  // paper tears away to green, hold, cut, next paper… exactly like the stock packs
  function pack(name, presets, sheet, keyColor = '#00ff00') {
    const shots = [];
    presets.forEach((id, i) => {
      shots.push([typeof sheet === 'function' ? sheet(i) : sheet, 0.8, null]);
      shots.push([key(keyColor), 0.7, tr(id)]);
    });
    return build(name, shots);
  }
  const LIST = [
    { id: 'gs-pack', name: 'Green-screen paper pack', note: '12 classic tears on white crumpled paper → green. Export as a green-screen element for CapCut.',
      make: () => pack('Green-screen paper pack', ['hole', 'peel-diag', 'spear', 'curtain', 'roll-left', 'crumple-toss', 'v-notch', 'strip-pull', 'strips-h', 'mountain', 'page-curl', 'shards'], () => paper('white', { crumple: 0.75 })) },
    { id: 'news-pack', name: 'Newspaper tear pack', note: 'Newspaper pages ripped, peeled and crumpled off the screen.',
      make: () => pack('Newspaper tear pack', ['peel-bites', 'hole-keyhole', 'crumple-shrink', 'rip-two', 'shards', 'peel-diag'], i => paper('newspaper', { lang: i % 2 ? 'en' : 'hi', crumple: 0.5 })) },
    { id: 'colour', name: 'Coloured paper series', note: 'Yellow, red, teal and charcoal papers tearing into each other (the vignette colour packs).',
      make: () => {
        const C = ['#f0c43c', '#b8283a', '#2dd4c8', '#383838', '#e8742c', '#7a4fd8'];
        const ids = ['hole', 'spear', 'peel-diag', 'curtain', 'v-notch', 'roll-up'];
        return build('Coloured paper series', C.map((c, i) => [paper('color', { color: c, crumple: 0.35 }), 1.0, i ? tr(ids[i - 1]) : null]));
      } },
    { id: 'story', name: 'News story (your photos)', note: 'Headline page → photo → photo → title card. Drop in your own photos on the Photo shots.',
      make: () => build('News story', [
        [paper('newspaper', { lang: 'hi', headline: 'यहां अपनी हेडलाइन लिखें', crumple: 0.45 }), 2.2, null],
        [{ type: 'image', media: null, zoom: 0.08, print: 0.35 }, 2.5, tr('hole')],
        [{ type: 'image', media: null, zoom: 0.08 }, 2.5, tr('peel-diag')],
        [paper('white', { crumple: 0.7, title: 'आगे क्या हुआ?', subtitle: 'Favorite World', font: 'serif' }), 2, tr('crumple-toss')],
      ]) },
    { id: 'school', name: 'School notebook', note: 'Ruled notebook pages with a swinging notebook swipe and torn strips.',
      make: () => build('School notebook', [
        [paper('notebook', { crumple: 0.25, text: 'Chapter 1 — Introduction' }), 1.6, null],
        [paper('graph', { crumple: 0.3, title: 'Science Facts', font: 'hand', textColor: '#1f3d8a' }), 1.6, tr('sweep-notebook')],
        [paper('notebook', { crumple: 0.25, text: 'Chapter 2 — Experiments' }), 1.6, tr('strips-v')],
        [key(), 0.8, tr('crumple-fall')],
      ]) },
    { id: 'festive', name: 'Festival gift wrap', note: 'Gift-wrap pattern wipes between scenes (Diwali / Christmas look).',
      make: () => build('Festival gift wrap', [
        [paper('color', { color: '#7b1e2b', title: 'Happy Diwali', font: 'serif', textColor: '#f4d35e' }), 1.6, null],
        [paper('giftwrap', { pattern: 'stars', crumple: 0.3 }), 1.2, tr('sweep-gift')],
        [paper('color', { color: '#1f3c6e', title: 'शुभ दीपावली', font: 'sans', textColor: '#f4d35e' }), 1.6, Object.assign(tr('sweep-gift'), { params: { material: 'giftwrap', pattern: 'gifts', angle: '180', band: 1.1 } })],
      ]) },
    { id: 'burn', name: 'Burn reveal', note: 'Old paper burns away to reveal the next scene (needs the burn effect).',
      make: () => build('Burn reveal', [
        [paper('parchment', { crumple: 0.45, title: '1947', subtitle: 'The story begins', font: 'serif', textColor: '#3a2410' }), 1.5, null],
        [paper('newspaper', { lang: 'en', crumple: 0.5 }), 1.8, tr('burn-center', 3)],
        [key(), 1, tr('burn-bottom', 3)],
      ]) },
    { id: 'vintage', name: 'Vintage history', note: 'Parchment, tea stains and a dry-brush reveal for history segments.',
      make: () => build('Vintage history', [
        [paper('parchment', { crumple: 0.4, title: 'इतिहास', subtitle: 'History', font: 'serif', textColor: '#3a2410' }), 1.6, null],
        [{ type: 'image', media: null, zoom: 0.06, print: 0.3 }, 2.4, tr('ink-brush', 2.4)],
        [paper('kraft', { crumple: 0.6, title: 'The End', font: 'serif' }), 1.6, tr('fold')],
      ]) },
    { id: 'blank', name: 'Blank project', note: 'One white sheet. Build your own sequence.', make: () => build('Untitled paper video', [[paper('white', { crumple: 0.6 }), 2, null]]) },
  ];
  return { LIST };
})();
