// Frame-exact export with WebCodecs (via the bundled Mediabunny muxer). Falls back to MediaRecorder.
PT.exporter = (() => {
  const U = PT.util;
  const MODES = [
    ['composite', 'Full video – your scenes + paper effects'],
    ['green', 'Green-screen element (paper on #00FF00)'],
    ['blue', 'Blue-screen element (paper on #0000FF)'],
    ['alpha', 'Transparent WebM (paper with alpha)'],
    ['matte', 'Black & white track matte'],
  ];

  function renderOpts(mode, firstShot) {
    if (mode === 'green') return { incoming: { type: 'key', color: '#00ff00' }, firstShot };
    if (mode === 'blue') return { incoming: { type: 'key', color: '#0000ff' }, firstShot };
    if (mode === 'alpha') return { incoming: { type: 'transparent' }, firstShot };
    if (mode === 'matte') return { matte: true };
    return {};
  }

  async function run(proj, o, onProgress = () => {}, isCancelled = () => false) {
    const [W, H] = (o.size || `${proj.width}x${proj.height}`).split('x').map(Number);
    const fps = +o.fps || proj.fps || 30, from = o.from || 0;
    const tl = PT.engine.timeline(proj), to = Math.min(o.to == null ? tl.total : o.to, tl.total);
    const n = Math.max(1, Math.round((to - from) * fps));
    const alpha = o.mode === 'alpha';
    const canvas = U.canvas(W, H), ctx = canvas.getContext('2d', { alpha });
    const ropt = Object.assign({ W, H, tl }, renderOpts(o.mode, o.firstShot));
    const withAudio = o.audio && o.mode !== 'matte' && o.mode !== 'alpha';
    const MB = window.Mediabunny;
    const base = (proj.name || 'paper').replace(/[^\wऀ-ॿ -]+/g, '').trim().replace(/\s+/g, '-') || 'paper';
    const tag = { composite: '', green: '_greenscreen', blue: '_bluescreen', alpha: '_alpha', matte: '_matte' }[o.mode] || '';

    const draw = async i => {
      const t = Math.min(to - 1e-4, from + i / fps);
      await PT.engine.prepare(proj, t, tl);
      PT.engine.render(ctx, proj, t, ropt);
      if (!alpha && o.mode !== 'matte') { ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
    };

    if (MB && window.VideoEncoder) {
      const webm = alpha;
      const codec = webm ? 'vp9' : await MB.getFirstEncodableVideoCodec(['avc', 'hevc', 'av1', 'vp9'], { width: W, height: H });
      if (codec) {
        const format = webm || codec === 'vp9' ? new MB.WebMOutputFormat() : new MB.Mp4OutputFormat({ fastStart: 'in-memory' });
        const output = new MB.Output({ format, target: new MB.BufferTarget() });
        const vs = new MB.CanvasSource(canvas, { codec, bitrate: Math.round(W * H * fps * 0.28), keyFrameInterval: 2, alpha: alpha ? 'keep' : 'discard' });
        output.addVideoTrack(vs, { frameRate: fps });
        let as = null;
        const isWebm = format instanceof MB.WebMOutputFormat;
        if (withAudio) {
          const ac = isWebm ? 'opus' : 'aac';
          if (await MB.canEncodeAudio(ac, { numberOfChannels: 2, sampleRate: 48000 })) { as = new MB.AudioBufferSource({ codec: ac, bitrate: 192000 }); output.addAudioTrack(as); }
        }
        await output.start();
        for (let i = 0; i < n; i++) {
          if (isCancelled()) { await output.cancel(); return null; }
          await draw(i);
          await vs.add(i / fps, 1 / fps);
          if (i % 3 === 0) onProgress(i / n);
        }
        if (as) {
          const mono = PT.audio.mix(proj, from, to), buf = new AudioBuffer({ length: mono.length, numberOfChannels: 2, sampleRate: 48000 });
          buf.copyToChannel(mono, 0); buf.copyToChannel(mono, 1);
          await as.add(buf);
        }
        await output.finalize();
        onProgress(1);
        const ext = isWebm ? 'webm' : 'mp4';
        return { blob: new Blob([output.target.buffer], { type: `video/${ext}` }), name: `${base}${tag}_${W}x${H}.${ext}`, audio: !!as };
      }
    }
    // fallback: real-time MediaRecorder (WebM)
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
    return { blob: new Blob(chunks, { type: mime || 'video/webm' }), name: `${base}${tag}_${W}x${H}.${ext}`, audio: false };
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  return { MODES, run, download, renderOpts };
})();
