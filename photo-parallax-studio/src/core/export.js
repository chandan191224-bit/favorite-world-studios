// Export via WebCodecs + Mediabunny: MP4 (H.264), green-screen #00FF00 / blue-screen element,
// transparent WebM (VP9 alpha) and a black/white matte. MediaRecorder fallback.
// ALWAYS SILENT — the user never uses sound effects from studios in editing.
PP.exporter = (() => {
  const U = PP.util;

  const MODES = [
    ['composite', 'Full video (MP4, silent)'],
    ['green', 'Green-screen element (#00FF00)'],
    ['blue', 'Blue-screen element (#0000FF)'],
    ['alpha', 'Transparent WebM (VP9 alpha)'],
    ['matte', 'Black & white matte'],
  ];

  // wrap a rendered frame as a "card" element over a key colour / transparency
  function elementize(src, mode, W, H, card) {
    const out = U.canvas(W, H), g = out.getContext('2d', { alpha: mode === 'alpha' });
    if (mode === 'green') { g.fillStyle = '#00ff00'; g.fillRect(0, 0, W, H); }
    else if (mode === 'blue') { g.fillStyle = '#0000ff'; g.fillRect(0, 0, W, H); }
    else if (mode === 'matte') { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
    const m = card && card.margin != null ? card.margin : 0.12;
    if (m <= 0.0001) {
      g.drawImage(src, 0, 0, W, H);
      if (mode === 'matte') { g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
      return out;
    }
    const x = m * W, y = m * H, w = W - 2 * m * W, h = H - 2 * m * H;
    const r = (card && card.round ? card.round : 0.035) * Math.min(w, h);
    if (mode === 'alpha') {
      // soft shadow behind the card
      g.save();
      g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = Math.min(w, h) * 0.06; g.shadowOffsetY = Math.min(w, h) * 0.02;
      g.fillStyle = 'rgba(255,255,255,.001)';
      roundRect(g, x, y, w, h, r); g.fill();
      g.restore();
    }
    g.save();
    roundRect(g, x, y, w, h, r);
    g.clip();
    g.drawImage(src, x, y, w, h);
    if (mode === 'matte') { g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(x, y, w, h); }
    g.restore();
    // hairline border on the card for key modes (helps the edge survive keying)
    if (mode === 'green' || mode === 'blue') {
      g.strokeStyle = 'rgba(0,0,0,.35)';
      g.lineWidth = Math.max(1, Math.min(w, h) / 500);
      roundRect(g, x, y, w, h, r); g.stroke();
    }
    return out;
  }
  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  async function run(proj, o, onProgress = () => {}, isCancelled = () => false) {
    const [W, H] = (o.size || `${proj.width}x${proj.height}`).split('x').map(Number);
    const fps = +o.fps || proj.fps || 30, from = o.from || 0;
    const tl = PP.engine.timeline(proj), to = Math.min(o.to == null ? tl.total : o.to, tl.total);
    const n = Math.max(1, Math.round((to - from) * fps));
    const alpha = o.mode === 'alpha';
    const keyModes = ['green', 'blue', 'alpha', 'matte'];
    const card = { margin: o.card === false || keyModes.indexOf(o.mode) < 0 ? 0 : (o.margin == null ? 0.12 : +o.margin), round: o.round == null ? 0.035 : +o.round };
    const base = (proj.name || 'parallax').replace(/[^\wऀ-ॿ -]+/g, '').trim().replace(/\s+/g, '-') || 'parallax';
    const tag = { composite: '', green: '_greenscreen', blue: '_bluescreen', alpha: '_alpha', matte: '_matte' }[o.mode] || '';

    const frameCv = U.canvas(W, H), frameG = frameCv.getContext('2d');
    const draw = async i => {
      const t = Math.min(to - 1e-4, from + i / fps);
      await PP.engine.prepare(proj, t);
      PP.engine.render(frameG, proj, t, { W, H, tl });
      if (keyModes.indexOf(o.mode) >= 0) return elementize(frameCv, o.mode, W, H, card);
      // opaque video: ensure black under any transparency
      frameG.globalCompositeOperation = 'destination-over';
      frameG.fillStyle = '#000'; frameG.fillRect(0, 0, W, H);
      frameG.globalCompositeOperation = 'source-over';
      return frameCv;
    };

    const MB = window.Mediabunny;
    if (MB && window.VideoEncoder) {
      let codec = null;
      if (alpha) codec = await MB.getFirstEncodableVideoCodec(['vp9'], { width: W, height: H }) ? 'vp9' : null;
      else codec = await MB.getFirstEncodableVideoCodec(['avc', 'hevc', 'av1', 'vp9'], { width: W, height: H });
      if (codec) {
        const webm = alpha || codec === 'vp9' || codec === 'av1' || codec === 'vp8';
        const format = webm ? new MB.WebMOutputFormat() : new MB.Mp4OutputFormat({ fastStart: 'in-memory' });
        const output = new MB.Output({ format, target: new MB.BufferTarget() });
        const vs = new MB.CanvasSource(frameCv, { codec, bitrate: Math.round(W * H * fps * 0.24), keyFrameInterval: 2, alpha: alpha ? 'keep' : 'discard' });
        output.addVideoTrack(vs, { frameRate: fps });
        await output.start();
        for (let i = 0; i < n; i++) {
          if (isCancelled()) { await output.cancel(); return null; }
          const cv = await draw(i);
          if (cv !== frameCv) frameG.getContext('2d').drawImage(cv, 0, 0);  // elementized frames go back into the source canvas
          await vs.add(i / fps, 1 / fps);
          if (i % 3 === 0) onProgress(i / n);
        }
        await output.finalize();
        onProgress(1);
        const ext = webm ? 'webm' : 'mp4';
        return { blob: new Blob([output.target.buffer], { type: `video/${ext}` }), name: `${base}${tag}_${W}x${H}.${ext}` };
      }
    }
    // fallback: real-time MediaRecorder
    if (!frameCv.captureStream || !window.MediaRecorder) throw new Error('This browser cannot export video. Please use Chrome or Edge.');
    const stream = frameCv.captureStream(0), track = stream.getVideoTracks()[0];
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.round(W * H * fps * 0.22) });
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const stopped = new Promise(r => (rec.onstop = r));
    rec.start();
    for (let i = 0; i < n; i++) {
      if (isCancelled()) { rec.stop(); return null; }
      const t0 = performance.now();
      const cv = await draw(i);
      if (cv !== frameCv) frameG.getContext('2d').drawImage(cv, 0, 0);
      track.requestFrame && track.requestFrame();
      onProgress(i / n);
      await new Promise(r => setTimeout(r, Math.max(0, 1000 / fps - (performance.now() - t0))));
    }
    rec.stop(); await stopped;
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    return { blob: new Blob(chunks, { type: mime || 'video/webm' }), name: `${base}${tag}_${W}x${H}.${ext}` };
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }

  return { MODES, run, download, elementize };
})();
