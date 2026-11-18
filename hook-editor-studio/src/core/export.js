// Video + mixed audio exporter using bundled Mediabunny (offline WebCodecs MP4/WebM).
HES.export = (() => {
  const U = HES.util, E = HES.engine, A = HES.audio;

  function pickCodec(ext) {
    return ext === 'webm' ? 'vp9' : 'avc';
  }

  async function run(proj, opts, onProgress) {
    const MB = window.Mediabunny;
    if (!MB) throw new Error('Mediabunny library missing in bundle.');
    await HES.text.ready();
    await E.ingestProjectMedia(proj);

    const tl = E.resolveTimeline(proj);
    const from = U.clamp(Number(opts.from) || 0, 0, tl.totalDur);
    const to = U.clamp(Number(opts.to) || tl.totalDur, from + 0.2, tl.totalDur);
    const dur = to - from;
    const fps = Number(opts.fps) || proj.fps || 30;
    const [W, H] = opts.size ? opts.size.split('x').map(Number) : [proj.w || 1920, proj.h || 1080];
    const mode = opts.mode || 'composite';
    const format = (opts.format === 'webm' || mode === 'alpha') ? 'webm' : 'mp4';
    const alpha = mode === 'alpha';
    const includeAudio = opts.includeAudio !== false && mode === 'composite';

    const c = U.canvas(W, H), ctx = c.getContext('2d');
    const totalFrames = Math.max(1, Math.round(dur * fps));

    const target = new MB.BufferTarget();
    const outFmt = format === 'webm' ? new MB.WebMOutputFormat() : new MB.Mp4OutputFormat({ fastStart: 'in-memory' });
    const output = new MB.Output({ format: outFmt, target });

    const vsrc = new MB.CanvasSource(c, {
      codec: pickCodec(format),
      bitrate: MB.QUALITY_HIGH,
      alpha: alpha ? 'keep' : 'discard',
    });
    output.addVideoTrack(vsrc, { frameRate: fps });

    let asrc = null, mixedBuf = null;
    if (includeAudio && MB.AudioBufferSource) {
      mixedBuf = await A.renderMixedAudioBuffer(proj, from, to);
      if (mixedBuf) {
        asrc = new MB.AudioBufferSource({ codec: format === 'webm' ? 'opus' : 'aac', bitrate: 192_000 });
        output.addAudioTrack(asrc);
      }
    }

    await output.start();
    const dt = 1 / fps;
    for (let f = 0; f < totalFrames; f++) {
      if (opts.signal && opts.signal.aborted) throw new Error('Export cancelled');
      const t = from + f * dt;
      await E.seekVideosForTime(proj, t);
      E.renderAt(ctx, proj, t, { W, H, mode, guides: false });
      await vsrc.add(f * dt, dt);
      if (onProgress && (f % 3 === 0 || f === totalFrames - 1)) {
        onProgress((f + 1) / totalFrames, `Encoding frame ${f + 1}/${totalFrames}`);
      }
    }
    if (asrc && mixedBuf) {
      if (onProgress) onProgress(0.98, 'Muxing BGM + Voiceover audio…');
      await asrc.add(mixedBuf);
    }
    await output.finalize();
    const buf = target.buffer;
    const mime = format === 'webm' ? 'video/webm' : 'video/mp4';
    const blob = new Blob([buf], { type: mime });
    const safeName = (proj.title || 'hook-edit').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'hook-edit';
    return { blob, filename: `${safeName}.${format}`, mime, bytes: blob.size };
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2500);
  }

  return { run, downloadBlob };
})();
