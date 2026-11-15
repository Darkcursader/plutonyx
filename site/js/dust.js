/*
 * Drifting Martian dust over the hero, in raw WebGL (no library).
 * Near motes are larger and softer (shallow depth of field) and follow the
 * pointer slightly. Rendering stops whenever the hero is off screen or motion
 * is paused. If WebGL is unavailable the canvas simply stays empty.
 */
window.Dust = (() => {
  let canvas, gl, prog, buf, raf = 0, running = false, count = 0;
  let uT, uRes, uM, uDpr, t0 = performance.now();
  let mx = 0, my = 0, tx = 0, ty = 0, dpr = 1;

  const VS = `
    attribute vec4 a;            // x, y, depth, seed
    uniform float t; uniform vec2 res; uniform vec2 m; uniform float dpr;
    varying float vA; varying float vZ;
    void main() {
      float z = a.z;
      float speed = 0.004 + 0.018 * z;
      float x = fract(a.x + t * speed) * 2.3 - 1.15;
      float y = a.y + sin(t * (0.18 + 0.2 * a.w) + a.w * 6.283) * 0.035 * (0.4 + z);
      x += m.x * z * 0.045; y += m.y * z * 0.03;
      gl_Position = vec4(x, y, 0.0, 1.0);
      float size = mix(1.2, 9.0, z * z * z) * dpr * clamp(res.y / 900.0, 0.7, 1.4);
      gl_PointSize = size;
      float twinkle = 0.7 + 0.3 * sin(t * (0.6 + a.w) + a.w * 40.0);
      vA = mix(0.12, 0.42, z) * twinkle * (1.0 - smoothstep(0.75, 1.0, z) * 0.55);
      vZ = z;
    }`;
  const FS = `
    precision mediump float;
    varying float vA; varying float vZ;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float soft = mix(0.08, 0.48, vZ * vZ);
      float a = 1.0 - smoothstep(0.5 - soft, 0.5, d);
      vec3 col = mix(vec3(1.0, 0.82, 0.62), vec3(1.0, 0.93, 0.82), vZ);
      gl_FragColor = vec4(col * a * vA, a * vA);
    }`;

  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function init(el) {
    canvas = el;
    try {
      gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
      if (!gl) return false;
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
    } catch (e) { return false; }

    count = window.innerWidth < 900 ? 170 : 420;
    const data = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      data[i * 4] = Math.random();
      data[i * 4 + 1] = Math.random() * 2 - 1;
      data[i * 4 + 2] = Math.pow(Math.random(), 1.8);   // most motes far away
      data[i * 4 + 3] = Math.random();
    }
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0);
    uT = gl.getUniformLocation(prog, "t");
    uRes = gl.getUniformLocation(prog, "res");
    uM = gl.getUniformLocation(prog, "m");
    uDpr = gl.getUniformLocation(prog, "dpr");
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", (e) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = -((e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });
    return true;
  }

  function resize() {
    if (!gl) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (!running) frame(true);
  }

  function frame(once) {
    mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
    const t = (performance.now() - t0) / 1000;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uT, t);
    gl.uniform2f(uRes, canvas.width / dpr, canvas.height / dpr);
    gl.uniform2f(uM, mx, my);
    gl.uniform1f(uDpr, dpr);
    gl.drawArrays(gl.POINTS, 0, count);
    if (running && once !== true) raf = requestAnimationFrame(frame);
  }

  return {
    init,
    start() { if (!gl || running) return; running = true; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
})();
