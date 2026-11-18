// Frame-exact export with WebCodecs (bundled Mediabunny muxer), MediaRecorder fallback.
// Modes: composite (picture + all looks), screen (light elements on black for Screen/Add),
// alpha (transparent overlay WebM), green/blue (overlay on a key colour for chroma key),
// matte (black & white track matte), source (untouched picture). Exports are always SILENT —
// the user never uses sound effects from this studio. Grades can also go out as a .cube LUT
// (see engine.cubeFor / FL.exporter.cube()).
FL.exporter = (() => {
  const U = FL.util, ENG = FL.engine;

  const MODES = [
    ['composite', 'Full video — your picture with all looks'],
    ['screen', 'Light elements on black (blend Screen/Add in your editor)'],
    ['alpha', 'Transparent overlay (WebM with real alpha)'],
    ['green', 'Overlay on green #00FF00 (chroma key in CapCut)'],
    ['blue', 'Overlay on blue #0000FF (for footage that contains green)'],
    ['matte', 'Black & white matte (white = look, use as a track matte)'],
    ['source', 'Untouched picture (no look — for before/after)'],
  ];

  const engineMode = m => (m === 'green' || m === 'blue' || m === 'matte') ? 'alpha' : m;

  async function run(proj, o, onProgress = () => {}, isCancelled = () => false) {
    const [W, H] = (o.size || `${proj.width}x${proj.height}`).split('x').map(Number);
    const fps = +o.fps || proj.fps || 30, from = o.from || 0;
    const total = +proj.duration || 8, to = Math.min(o.to == null ? total : o.to, total);
    const n = Math.max(1, Math.round((to - from) * fps));
    const mode = o.mode || 'composite';
    const alpha = mode === 'alpha';
    const canvas = U.canvas(W, H), ctx = canvas.getContext('2d', { alpha: true });
    const MB = window.Mediabunny;
    const base = (proj.name || 'film-look').replace(/[^\wऀ-ॿ -]+/g, '').trim().replace(/\s+/g, '-') || 'film-look';
    const tag = { composite: '', screen: '_screen', alpha: '_alpha', green: '_greenscreen', blue: '_bluescreen', matte: '_matte', source: '_clean' }[mode] || '';

    const draw = async i => {
      const t = Math.min(to - 1e-4, from + i / fps);
      await ENG.prepare(proj, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      ENG.render(ctx, proj, t, { W, H, mode: engineMode(mode) });
      if (mode === 'green' || mode === 'blue') {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = mode === 'green' ? '#00ff00' : '#0000ff';
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      } else if (mode === 'matte') {
        // white where the overlay has any alpha, black elsewhere (opaque for H.264)
        const m = U.tmp('exMatte', W, H), mg = U.ctx2(m);
        mg.fillStyle = '#fff'; mg.fillRect(0, 0, W, H);
        mg.globalCompositeOperation = 'source-in';
        mg.drawImage(canvas, 0, 0);
        mg.globalCompositeOperation = 'destination-over';
        mg.fillStyle = '#000'; mg.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(m, 0, 0);
      } else if (!alpha) {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
    };

    if (MB && window.VideoEncoder) {
      const webm = alpha;
      const codec = webm ? 'vp9' : await MB.getFirstEncodableVideoCodec(['avc', 'hevc', 'av1', 'vp9'], { width: W, height: H });
      if (codec) {
        const format = webm || codec === 'vp9' ? new MB.WebMOutputFormat() : new MB.Mp4OutputFormat({ fastStart: 'in-memory' });
        const output = new MB.Output({ format, target: new MB.BufferTarget() });
        const vs = new MB.CanvasSource(canvas, { codec, bitrate: Math.round(W * H * fps * 0.28), keyFrameInterval: 2, alpha: alpha ? 'keep' : 'discard' });
        output.addVideoTrack(vs, { frameRate: fps });
        await output.start();
        for (let i = 0; i < n; i++) {
          if (isCancelled()) { await output.cancel(); return null; }
          await draw(i);
          await vs.add(i / fps, 1 / fps);
          if (i % 3 === 0) onProgress(i / n);
        }
        await output.finalize();
        onProgress(1);
        const isWebm = format instanceof MB.WebMOutputFormat;
        const ext = isWebm ? 'webm' : 'mp4';
        return { blob: new Blob([output.target.buffer], { type: `video/${ext}` }), name: `${base}${tag}_${W}x${H}.${ext}`, silent: true };
      }
    }
    // fallback: real-time MediaRecorder (WebM) — silent
    if (!canvas.captureStream || !window.MediaRecorder) throw new Error('This browser cannot export video. Please use Chrome or Edge.');
    const stream = canvas.captureStream(0), track = stream.getVideoTracks()[0];
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.round(W * H * fps * 0.25) });
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const stopped = new Promise(r => (rec.onstop = r));
    rec.start();
    for (let i = 0; i < n; i++) {
      if (isCancelled()) { rec.stop(); return null; }
      const t0 = performance.now();
      await draw(i);
      track.requestFrame && track.requestFrame();
      onProgress(i / n);
      await new Promise(r => setTimeout(r, Math.max(0, 1000 / fps - (performance.now() - t0))));
    }
    rec.stop(); await stopped;
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    return { blob: new Blob(chunks, { type: mime || 'video/webm' }), name: `${base}${tag}_${W}x${H}.${ext}`, silent: true };
  }

  // .cube LUT text of a project's grade layers (null when there are none)
  function cube(proj, layers, title) {
    return ENG.cubeFor(proj, layers || null, title || (proj && proj.name) || 'Film Look');
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  return { MODES, run, cube, download, engineMode };
})();
