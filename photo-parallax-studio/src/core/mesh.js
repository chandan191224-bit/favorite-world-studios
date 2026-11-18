// Displacement-mesh renderer: the photo is a 3D surface displaced by the depth field, and a real
// perspective camera moves through it (WebGL — used because true depth displacement needs it).
// Falls back automatically: if WebGL is missing, the engine uses the layered cut-out renderer.
window.PP = window.PP || {};
PP.mesh = (() => {
  const U = PP.util;
  let gl = null, canvas = null, prog = null, buf = null, tex = null, gridW = 0, gridH = 0, ready = false;

  const VS = [
    'attribute vec2 aPos;      // 0..1 grid position',
    'attribute float aDepth;   // 0 far .. 1 near',
    'uniform vec2 uSize;       // canvas size in world units (x, y)',
    'uniform float uDepthZ;    // depth displacement scale',
    'uniform vec3 uEye;        // camera position (world)',
    'uniform vec3 uTarget;',
    'uniform float uFov;       // vertical fov radians',
    'uniform vec2 uRes;        // output resolution',
    'varying vec2 vUv;',
    'mat4 lookAt(vec3 eye, vec3 at, vec3 up){',
    '  vec3 z = normalize(eye - at); vec3 x = normalize(cross(up, z)); vec3 y = cross(z, x);',
    '  return mat4(x.x, y.x, z.x, 0.0, x.y, y.y, z.y, 0.0, x.z, y.z, z.z, 0.0,',
    '    -dot(x,eye), -dot(y,eye), -dot(z,eye), 1.0);',
    '}',
    'void main(){',
    '  vec3 p = vec3((aPos.x - 0.5) * uSize.x, (0.5 - aPos.y) * uSize.y, (aDepth - 0.5) * uDepthZ);',
    '  vUv = vec2(aPos.x, aPos.y);',
    '  float n = 0.1, f = 100.0;',
    '  float t = 1.0 / tan(uFov * 0.5);',
    '  float aspect = uRes.x / uRes.y;',
    '  mat4 P = mat4(t / aspect, 0.0, 0.0, 0.0,  0.0, t, 0.0, 0.0,  0.0, 0.0, (f + n) / (n - f), -1.0,  0.0, 0.0, 2.0 * f * n / (n - f), 0.0);',
    '  gl_Position = P * lookAt(uEye, uTarget, vec3(0.0, 1.0, 0.0)) * vec4(p, 1.0);',
    '}',
  ].join('\n');

  const FS = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform float uTexScale;  // >1 samples a wider photo region than the plane (overscan so edges never tear)',
    'void main(){',
    '  vec2 uv = (vUv - 0.5) * uTexScale + 0.5;',
    '  vec3 c = texture2D(uTex, uv).rgb;',
    '  gl_FragColor = vec4(c, 1.0);',
    '}',
  ].join('\n');

  function init() {
    if (ready || gl) return ready;
    try {
      canvas = U.canvas(16, 16);
      gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: true, alpha: false }) ||
           canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
      if (!gl) { gl = null; return false; }
      const mk = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      prog = gl.createProgram();
      gl.attachShader(prog, mk(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      buf = gl.createBuffer();
      tex = gl.createTexture();
      ready = true;
    } catch (e) { gl = null; ready = false; }
    return ready;
  }

  function available() { return init(); }

  // grid vertices from a depth field
  let lastKey = '';
  function buildGrid(field, key) {
    const gw = Math.min(128, Math.max(48, field.w)), gh = Math.max(32, Math.round(gw * field.h / field.w));
    const n = gw * gh;
    const data = new Float32Array(n * 3);
    let p = 0;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const u = i / (gw - 1), v = j / (gh - 1);
      data[p++] = u; data[p++] = v;
      // sample depth bilinear-ish (nearest is fine at grid density)
      const fx = Math.min(field.w - 1, Math.round(u * (field.w - 1)));
      const fy = Math.min(field.h - 1, Math.round(v * (field.h - 1)));
      data[p++] = field.d[fy * field.w + fx];
    }
    const idx = [];
    for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++) {
      const a = j * gw + i, b = a + 1, c = a + gw, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    gridW = gw; gridH = gh; lastKey = key;
    return { data, idx: new Uint16Array(idx), n };
  }
  let grid = null, ibo = null;
  function ensureGrid(field, key) {
    if (!grid || key !== lastKey) { grid = buildGrid(field, key); if (ibo) { gl.deleteBuffer(ibo); ibo = null; } }
    return grid;
  }

  let texKey = '';
  function ensureTexture(photo, key) {
    if (texKey === key) return;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, photo);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    texKey = key;
  }

  // cam: { zoom, x, y, rot, vertigo } — the same camera state the cut-out renderer uses.
  // depthZ: displacement scale (0.5..2), focus: [fx, fy] the pivot in the frame.
  function render(photo, field, cam, opts) {
    if (!init()) return null;
    const W = opts.W, H = opts.H;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const gk = opts.gridKey || '';
    const g = ensureGrid(field, gk);
    ensureTexture(photo, opts.texKey || '');

    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    const worldH = 2, worldW = 2 * (W / H);
    const depthZ = (opts.depthZ == null ? 1.1 : opts.depthZ) * worldH * 0.5;   // full z range (± depthZ/2)
    const Zhalf = depthZ / 2;
    const fov = (opts.fov == null ? 0.9 : opts.fov);
    const D0 = (worldH / 2) / Math.tan(fov / 2);      // distance where the plane at z=0 fills the frame
    const D = D0 / Math.max(0.05, cam.zoom);          // camera distance under zoom
    // overscan: enlarge the plane so the FARTHEST displaced geometry still covers the frame
    // edges (near geometry only flies outward, which is safe). q relaxes as the camera zooms in.
    const ovs = opts.overscan == null ? 0.22 : opts.overscan;
    const q = Math.max(1, 1 / Math.max(0.05, cam.zoom) + (Zhalf * (1 + ovs * 0.55)) / D0 + 2.0 * (Math.abs(cam.x) + Math.abs(cam.y)));
    const sizeW = worldW * q, sizeH = worldH * q;
    // eye offset from lateral/vertical shift (frame fractions, distance-compensated)
    const k = opts.shiftScale == null ? 0.62 : opts.shiftScale;
    const ex = -cam.x * worldW * (D / D0) * k, ey = cam.y * worldH * (D / D0) * k;
    const [fx, fy] = opts.focus || [0.5, 0.5];
    const tx = (fx - 0.5) * worldW * 0.15, ty = (0.5 - fy) * worldH * 0.15;
    const eye = [ex, ey, -D];
    const target = [tx, ty, 0];

    const u = n => gl.getUniformLocation(prog, n);
    gl.uniform2f(u('uSize'), sizeW, sizeH);
    gl.uniform1f(u('uDepthZ'), depthZ);
    gl.uniform3f(u('uEye'), eye[0], eye[1], eye[2]);
    gl.uniform3f(u('uTarget'), target[0], target[1], target[2]);
    gl.uniform1f(u('uFov'), fov);
    gl.uniform2f(u('uRes'), W, H);
    gl.uniform1f(u('uTexScale'), q);

    const aPos = gl.getAttribLocation(prog, 'aPos');
    const aDepth = gl.getAttribLocation(prog, 'aDepth');
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, g.data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 12, 0);
    gl.enableVertexAttribArray(aDepth);
    gl.vertexAttribPointer(aDepth, 1, gl.FLOAT, false, 12, 8);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const uTex = gl.getUniformLocation(prog, 'uTex');
    gl.uniform1i(uTex, 0);

    // index buffer
    if (!ibo) ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW);
    // rotation (dutch roll) around the view axis: fold into a pre-multiplied uv rotation? — apply as canvas 2D later
    gl.drawElements(gl.TRIANGLES, g.idx.length, gl.UNSIGNED_SHORT, 0);
    gl.flush();
    return canvas;
  }

  // draw with a 2D roll (dutch tilt) — the mesh itself has no roll; the engine can rotate the result
  return { available, render, canvas: () => canvas };
})();
