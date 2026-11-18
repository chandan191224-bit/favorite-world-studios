// Ready-to-play demo templates inspired by studied Nitish / Dhruv / Deshbhakt / Hybrid hooks.
HES.templates = (() => {
  const U = HES.util;

  function svgData(title, c1, c2, shape = 'grid') {
    const pat = shape === 'arch'
      ? `<circle cx='960' cy='500' r='310' fill='none' stroke='${c2}' stroke-opacity='0.28' stroke-width='4'/><rect x='760' y='300' width='400' height='400' rx='18' fill='${c2}' fill-opacity='0.14' stroke='${c2}' stroke-opacity='0.5'/>`
      : shape === 'split'
      ? `<polygon points='0,0 1050,0 870,1080 0,1080' fill='${c2}' fill-opacity='0.2'/><circle cx='1340' cy='520' r='220' fill='${c1}' stroke='${c2}' stroke-width='3'/>`
      : `<path d='M0 780 Q 480 620 960 760 T 1920 680 L 1920 1080 L 0 1080 Z' fill='${c2}' fill-opacity='0.16'/><circle cx='480' cy='340' r='160' fill='${c2}' fill-opacity='0.16'/>`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080' viewBox='0 0 1920 1080'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='#0b0f17'/></linearGradient></defs><rect width='1920' height='1080' fill='url(#g)'/><g opacity='0.25' stroke='#ffffff' stroke-width='1'>${Array.from({length:12},(_,i)=>`<line x1='${i*160}' y1='0' x2='${i*160}' y2='1080'/>`).join('')}${Array.from({length:7},(_,i)=>`<line x1='0' y1='${i*160}' x2='1920' y2='${i*160}'/>`).join('')}</g>${pat}<text x='960' y='560' text-anchor='middle' fill='#ffffff' fill-opacity='0.2' font-family='sans-serif' font-weight='800' font-size='96'>${title}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function makeDemoMedia() {
    return {
      m1: { id: 'm1', kind: 'image', name: 'Cold Open Archive', w: 1920, h: 1080, dur: 4, dataUrl: svgData('SECRET ARCHIVE', '#1e293b', '#f0a93b', 'arch') },
      m2: { id: 'm2', kind: 'image', name: 'Classified File', w: 1920, h: 1080, dur: 4, dataUrl: svgData('CLASSIFIED FILE', '#281318', '#ef4444', 'split') },
      m3: { id: 'm3', kind: 'image', name: 'Power & Borders', w: 1920, h: 1080, dur: 4, dataUrl: svgData('GEOPOLITICAL SHIFT', '#0f2334', '#38bdf8', 'grid') },
      m4: { id: 'm4', kind: 'image', name: 'Shocking Evidence', w: 1920, h: 1080, dur: 4, dataUrl: svgData('EXPOSED REPORT', '#1c1917', '#f59e0b', 'arch') },
    };
  }

  const LIST = [
    {
      id: 'fw-hybrid',
      name: 'Favorite World Hybrid',
      desc: '105 BPM beat cuts, Coming Up badge, Red Highlighter + Crimson Climax',
      style: 'hybrid',
      pace: 'medium',
      bpm: 105,
      project: () => ({
        title: 'THE HIDDEN COST',
        w: 1920, h: 1080, fps: 30, bg: '#07090d',
        style: 'hybrid', pace: 'medium',
        cinemaBars: true, grain: 0.14, beatSync: 1.0,
        bgmDb: -22, bgmIdleDb: -12, duck: true,
        media: makeDemoMedia(),
        shots: [
          { id: 's1', mediaId: 'm1', label: '01 Cold Open Zoom', dur: 2.28, motion: 'pulse-zoom', trIn: 'cut', trDur: 0, tension: 0.45, zoom: 1.0, panX: 0, panY: 0, seed: 11 },
          { id: 's2', mediaId: 'm2', label: '02 Tension Push', dur: 2.28, motion: 'crimson-tension', trIn: 'whip-l', trDur: 0.28, tension: 0.72, zoom: 1.02, panX: 0, panY: 0, seed: 22 },
          { id: 's3', mediaId: 'm3', label: '03 Documentary Split', dur: 2.28, motion: 'torn-split', trIn: 'flash', trDur: 0.24, tension: 0.55, zoom: 1.0, panX: 0, panY: 0, seed: 33 },
          { id: 's4', mediaId: 'm4', label: '04 Film Burn Proof', dur: 2.28, motion: 'film-burn-leak', trIn: 'burn', trDur: 0.36, tension: 0.5, zoom: 1.0, panX: 0, panY: 0, seed: 44 },
          { id: 's5', mediaId: 'm1', label: '05 B&W Color Reveal', dur: 2.28, motion: 'bw-color-pop', trIn: 'zoom-in', trDur: 0.30, tension: 0.65, zoom: 1.0, panX: 0, panY: 0, seed: 55 },
          { id: 's6', mediaId: 'm2', label: '06 Climax Bass Shake', dur: 2.60, motion: 'bass-shake', trIn: 'whip-r', trDur: 0.26, tension: 0.85, zoom: 1.04, panX: 0, panY: 0, seed: 66 },
        ],
        overlays: [
          { id: 'o1', type: 'ov-coming-up', start: 0.2, dur: 5.0, text: 'COMING UP NEXT', sub: '', color: '#f0a93c', bg: '#090b10', font: 'bebas', size: 22, x: 0.055, y: 0.145, animIn: 0.35 },
          { id: 'o2', type: 'ov-impact-title', start: 1.2, dur: 3.1, text: 'THE HIDDEN TRUTH', sub: 'EXCLUSIVE INVESTIGATION', color: '#f0a93c', bg: '#090b10', font: 'khand', size: 80, x: 0.5, y: 0.5, animIn: 0.35 },
          { id: 'o3', type: 'ov-doc-highlight', start: 5.2, dur: 3.6, text: 'OFFICIAL REPORT REVEALS ₹21,000 CRORE ANOMALY IN 48 HOURS', sub: 'SOURCE: PUBLIC AUDIT', color: '#ef4444', bg: '#090b10', font: 'mukta', size: 42, x: 0.5, y: 0.54, animIn: 0.45 },
          { id: 'o4', type: 'ov-stat-pop', start: 9.8, dur: 3.2, text: '₹21,000 Cr+', sub: 'TOTAL IMPACT SCALE', color: '#f0a93c', bg: '#090b10', font: 'bebas', size: 92, x: 0.5, y: 0.52, animIn: 0.4 },
        ],
      }),
    },
    {
      id: 'nitish-thriller',
      name: 'Nitish Rajput Thriller',
      desc: 'Fast 1.9s cuts, crimson tension, torn split, COMING UP NEXT',
      style: 'nitish',
      pace: 'fast',
      bpm: 108,
      project: () => null,
    },
    {
      id: 'dhruv-mystery',
      name: 'Dhruv Rathee Mystery',
      desc: '84 BPM atmospheric suspense, meters, film burns & article highlights',
      style: 'dhruv',
      pace: 'medium',
      bpm: 84,
      project: () => null,
    },
    {
      id: 'deshbhakt-rapid',
      name: 'Deshbhakt Satire Desk',
      desc: 'Bright full-frame desk, Polaroids, whip-pans & bold tabloid banners',
      style: 'deshbhakt',
      pace: 'fast',
      bpm: 96,
      project: () => null,
    },
  ];

  function createProject(templateId) {
    const def = LIST.find(x => x.id === templateId) || LIST[0];
    const direct = def.project();
    if (direct) return direct;
    const base = LIST[0].project();
    base.title = def.name.toUpperCase();
    return HES.autoedit.generate(base, { style: def.style, pace: def.pace, seed: 77, keepOverlays: false });
  }

  return { LIST, createProject };
})();
