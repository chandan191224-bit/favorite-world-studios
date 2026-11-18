// Frame-exact export with WebCodecs (bundled Mediabunny muxer), MediaRecorder fallback.
// ALWAYS SILENT — the user never uses sound effects from this studio (rule 2026-10-29).
SM.exporter = (() => {
  const U = SM.util, ENG = SM.engine;
  const MODES = [
    ['composite', 'Full video (background + device + screen)'],
    ['green', 'Green-screen element — device on #00FF00'],
    ['blue', 'Blue-screen element — device on #0000FF'],
    ['alpha', 'Transparent WebM (VP9 with alpha)'],
    ['matte', 'B/W matte (white element on black)'],
    ['screenkey', 'Screen keyed green #00FF00 (key any clip in later)'],
    ['screenmatte', 'Screen matte (white screen area, black device)'],
  ];

  async function run(proj, o, onProgress = () => {}, isCancelled = () => false) {
    const [W, H] = (o.size || `${proj.width}x${proj.height}`).split('x').map(Number);
    const fps = +o.fps || proj.fps || 30, from = o.from || 0;
    const tl = ENG.timeline(proj), to = Math.min(o.to == null ? tl.total : o.to, tl.total);
    const n = Math.max(1, Math.round((to - from) * fps));
    const alpha = o.mode === 'alpha';
    const canvas = U.canvas(W, H), ctx = canvas.getContext('2d', { alpha: true });
    const ropt = { W, H, tl, mode: o.mode, quality: 1 };
    const MB = window.Mediabunny;
    const base = (proj.name || 'screen-mockup').replace(/[^\wऀ-ॿ -]+/g, '').trim().replace(/\s+/g, '-') || 'screen-mockup';
    const tag = { composite: '', green: '_greenscreen', blue: '_bluescreen', alpha: '_alpha', matte: '_matte', screenkey: '_screenkey', screenmatte: '_screenmatte' }[o.mode] || '';

    const draw = async i => {
      const t = Math.min(to - 1e-4, from + i / fps);
      await ENG.prepare(proj, t, tl);
      ENG.render(ctx, proj, t, ropt);
      if (!alpha) { ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
    };

    if (MB && window.VideoEncoder) {
      const webm = alpha;
      let codec = webm ? 'vp9' : null;
      if (!webm) {
        try { codec = await MB.getFirstEncodableVideoCodec(['avc', 'hevc', 'av1', 'vp9'], { width: W, height: H }); } catch (e) { codec = null; }
      }
      if (webm) {
        try { if (!await MB.canEncodeVideo('vp9', { width: W, height: H, alpha: 'keep' })) codec = null; } catch (e) { codec = null; }
      }
      if (codec) {
        const format = (webm || codec === 'vp9') ? new MB.WebMOutputFormat() : new MB.Mp4OutputFormat({ fastStart: 'in-memory' });
        const output = new MB.Output({ format, target: new MB.BufferTarget() });
        const vs = new MB.CanvasSource(canvas, { codec, bitrate: Math.round(W * H * fps * 0.3), keyFrameInterval: 2 * fps, alpha: alpha ? 'keep' : 'discard' });
        output.addVideoTrack(vs, { frameRate: fps });
        await output.start();
        for (let i = 0; i < n; i++) {
          if (isCancelled()) { try { await output.cancel(); } catch (e) {} return null; }
          await draw(i);
          await vs.add(i / fps, 1 / fps);
          if (i % 3 === 0) onProgress(i / n);
        }
        await output.finalize();
        onProgress(1);
        const ext = (webm || codec === 'vp9') ? 'webm' : 'mp4';
        return { blob: new Blob([output.target.buffer], { type: `video/${ext}` }), name: `${base}${tag}_${W}x${H}.${ext}`, alpha: true };
      }
    }
    // fallback: real-time MediaRecorder (WebM; Chrome cannot keep alpha here)
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
    return { blob: new Blob(chunks, { type: mime || 'video/webm' }), name: `${base}${tag}_${W}x${H}.${ext}`, alpha: false, fallback: true };
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  return { MODES, run, download };
})();
