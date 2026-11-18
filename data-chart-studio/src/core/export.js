// Frame-exact export with WebCodecs (bundled Mediabunny muxer); MediaRecorder fallback. Always silent (user rule).
DC.exporter = (() => {
  const U = DC.util;
  const MODES = [
    ['composite', 'Full video – chart on its themed background'],
    ['green', 'Green-screen element (chart on #00FF00)'],
    ['blue', 'Blue-screen element (chart on #0000FF)'],
    ['alpha', 'Transparent WebM (chart with alpha)'],
    ['matte', 'Black & white track matte'],
  ];
  async function run(proj, o, onProgress = () => {}, isCancelled = () => false) {
    const [W, H] = (o.size || `${proj.width}x${proj.height}`).split('x').map(Number);
    const fps = +o.fps || proj.fps || 30, tl = DC.engine.timeline(proj);
    const from = Math.max(0, o.from || 0), to = Math.min(o.to == null ? tl.total : o.to, tl.total);
    const n = Math.max(1, Math.round((to - from) * fps)), alpha = o.mode === 'alpha';
    window.__DOMCANVAS = true; const canvas = U.canvas(W, H); window.__DOMCANVAS = false;
    const ctx = canvas.getContext('2d', { alpha });
    const base = (proj.name || 'chart').replace(/[^\wऀ-ॿ -]+/g, '').trim().replace(/\s+/g, '-') || 'chart';
    const tag = { composite: '', green: '_greenscreen', blue: '_bluescreen', alpha: '_alpha', matte: '_matte' }[o.mode] || '';
    const draw = i => { DC.engine.render(ctx, proj, Math.min(to - 1e-4, from + i / fps), { W, H, tl, mode: o.mode }); };
    const MB = window.Mediabunny;
    if (MB && window.VideoEncoder) {
      const codec = alpha ? 'vp9' : await MB.getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1'], { width: W, height: H });
      if (codec) {
        const webm = alpha || codec === 'vp9';
        const output = new MB.Output({ format: webm ? new MB.WebMOutputFormat() : new MB.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new MB.BufferTarget() });
        const vs = new MB.CanvasSource(canvas, { codec, bitrate: Math.round(W * H * fps * 0.22), keyFrameInterval: 2, alpha: alpha ? 'keep' : 'discard' });
        output.addVideoTrack(vs, { frameRate: fps });
        await output.start();
        for (let i = 0; i < n; i++) {
          if (isCancelled()) { await output.cancel(); return null; }
          draw(i); await vs.add(i / fps, 1 / fps);
          if (i % 3 === 0) onProgress(i / n);
        }
        await output.finalize(); onProgress(1);
        const ext = webm ? 'webm' : 'mp4';
        return { blob: new Blob([output.target.buffer], { type: `video/${ext}` }), name: `${base}${tag}_${W}x${H}.${ext}` };
      }
    }
    if (!canvas.captureStream || !window.MediaRecorder) throw new Error('This browser cannot export video. Please use Chrome or Edge.');
    const stream = canvas.captureStream(0), track = stream.getVideoTracks()[0];
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.round(W * H * fps * 0.2) });
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const stopped = new Promise(r => (rec.onstop = r)); rec.start();
    for (let i = 0; i < n; i++) {
      if (isCancelled()) { rec.stop(); return null; }
      const t0 = performance.now(); draw(i); track.requestFrame && track.requestFrame(); onProgress(i / n);
      await new Promise(r => setTimeout(r, Math.max(0, 1000 / fps - (performance.now() - t0))));
    }
    rec.stop(); await stopped;
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    return { blob: new Blob(chunks, { type: mime || 'video/webm' }), name: `${base}${tag}_${W}x${H}.${ext}` };
  }
  function still(proj, t, mode, size) {
    const [W, H] = (size || `${proj.width}x${proj.height}`).split('x').map(Number);
    window.__DOMCANVAS = true; const c = U.canvas(W, H); window.__DOMCANVAS = false;
    DC.engine.render(c.getContext('2d'), proj, t, { W, H, mode });
    return c.toDataURL('image/png');
  }
  function download(blob, name) {
    const a = document.createElement('a'); a.href = typeof blob === 'string' ? blob : URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    if (typeof blob !== 'string') setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  return { MODES, run, still, download };
})();
