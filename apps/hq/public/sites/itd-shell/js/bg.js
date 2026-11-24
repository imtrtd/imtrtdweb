/* Background shader — PERFORMANCE REWRITE
  Reduced: 2 fbm calls (2 octaves each), no stars in nebula mode.
  Full-resolution animation is capped at 60fps with no dynamic downscaling.
*/
(() => {
  'use strict';

  const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform float uHue;
uniform float uEnergy;
uniform vec2  uPointer;
uniform float uPhase;
uniform float uBeamX;
uniform float uMode;
uniform float uSat;
uniform float uTint;
uniform float uBeam;

float hash(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 2; i++){
    v += a * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p;
    a *= 0.5;
  }
  return v;
}

vec3 hue2rgb(float h){
  vec3 c = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return mix(vec3(0.62), c, uSat);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float aspect = uRes.x / uRes.y;
  float bx = (uBeamX - 0.5) * aspect;
  vec2 p = uv * 2.4 + uPointer * 0.06;
  float t = uTime * 0.024;
  float drift = uPhase * 0.09;

  vec3 base = hue2rgb(fract((uHue + uTint) / 360.0));
  vec3 cool = hue2rgb(fract((uHue + uTint + 40.0) / 360.0));
  vec3 warm = hue2rgb(fract((uHue + uTint - 55.0) / 360.0));
  vec3 col = vec3(0.004, 0.006, 0.017);

  if (uMode < 0.5) {
    // Nebula — 2 fbm calls instead of 5
    vec2 q = vec2(fbm(p + vec2(0.0, drift) + t), fbm(p + vec2(3.2, 1.7 - drift) - t));
    float f = fbm(p + 2.0 * q);
    col = mix(col, base * 0.40, pow(clamp((f - 0.36) * 2.1, 0.0, 1.0), 1.55));
    col += cool * pow(clamp(q.x - 0.32, 0.0, 1.0), 2.4) * 0.35;
    col += warm * pow(clamp(q.y - 0.34, 0.0, 1.0), 2.3) * 0.30;
  } else if (uMode < 1.5) {
    vec2 delta = uv - vec2(bx, 0.0);
    col += base * (0.09 / (1.0 + dot(delta, delta) * 12.0));
  } else if (uMode < 2.5) {
    float horizon = 0.30;
    float yy = horizon - uv.y;
    if (yy > 0.001) {
      float z = 0.55 / yy;
      float gx = (uv.x - bx) * z;
      float gz = z + uTime * 0.35 + uPhase * 0.6;
      float lx = smoothstep(0.055, 0.0, abs(fract(gx * 0.5) - 0.5) - 0.47);
      float lz = smoothstep(0.055, 0.0, abs(fract(gz * 0.25) - 0.5) - 0.47);
      float fade = exp(-z * 0.10);
      col += base * (lx + lz) * fade * 0.55;
    }
    col += base * exp(-abs(uv.y - horizon) * 7.0) * 0.10;
  } else if (uMode < 3.5) {
    float curtain = fbm(vec2(uv.x * 2.2 + t * 1.6, uv.y * 0.5 - t * 0.9));
    float band = smoothstep(0.30, 0.80, curtain) * smoothstep(0.95, -0.35, uv.y);
    col += mix(base, cool, curtain) * band * 0.85;
    col += warm * band * band * 0.30;
  } else if (uMode < 4.5) {
    float waveA = sin((uv.y + noise(vec2(uv.x * 3.0, t))) * 18.0 + uv.x * 8.0 - uTime * 0.55);
    float waveB = sin((uv.y - noise(vec2(uv.x * 2.0 + 4.0, -t))) * 27.0 - uv.x * 5.0 + uTime * 0.38);
    float contourA = smoothstep(0.93, 1.0, abs(waveA));
    float contourB = smoothstep(0.95, 1.0, abs(waveB));
    float field = fbm(p * 1.35 + vec2(t, -t));
    col += base * contourA * (0.10 + field * 0.42);
    col += cool * contourB * (0.08 + (1.0 - field) * 0.28);
    col += mix(base, warm, field) * pow(field, 3.0) * 0.12;
  } else if (uMode < 5.5) {
    // Diamonds — the imtrtd ornament, counter-rotating rings
    vec2 c = uv - vec2(bx, 0.0);
    float glow = 0.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float ang = uTime * 0.045 * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0) * (1.0 + fi * 0.22) + fi * 0.4;
      float cs = cos(ang), sn = sin(ang);
      vec2 q = vec2(cs * c.x - sn * c.y, sn * c.x + cs * c.y);
      float dd = abs(abs(q.x) + abs(q.y) - (0.16 + fi * 0.17));
      glow += smoothstep(0.004, 0.0, dd) * (0.75 - fi * 0.11);
      glow += 0.0016 / (dd + 0.012) * (1.0 - fi * 0.14);
    }
    col += mix(base, cool, clamp(length(c), 0.0, 1.0)) * glow * 0.55;
    col += base * 0.05 * fbm(p * 0.8 + t);
  } else if (uMode < 6.5) {
    // Flow — horizontal signal strokes
    float rows = 30.0;
    float y = uv.y * rows;
    float id = floor(y);
    float fy = fract(y) - 0.5;
    float h1 = hash(vec2(id, 3.0));
    float dir = hash(vec2(id, 7.0)) > 0.5 ? 1.0 : -1.0;
    float x = uv.x * 1.3 + uTime * (0.05 + h1 * 0.22) * dir + hash(vec2(id, 1.0)) * 10.0;
    float seg = smoothstep(0.62, 0.95, noise(vec2(x * 1.6, id * 1.7)));
    float line = smoothstep(0.10, 0.0, abs(fy));
    col += mix(base, cool, hash(vec2(id, 5.0))) * seg * line * (0.25 + h1 * 0.55);
    col += warm * seg * smoothstep(0.5, 0.0, abs(fy)) * 0.04;
  } else if (uMode < 7.5) {
    // Stars — three drifting layers of points
    col += base * 0.07 * fbm(p * 0.9 + vec2(t, -t));
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 g = uv * (7.0 + fi * 9.0) + vec2(uTime * 0.008 * (fi + 1.0), fi * 3.1);
      vec2 id = floor(g);
      vec2 f = fract(g) - 0.5;
      float h = hash(id + fi * 17.0);
      vec2 o = (vec2(hash(id + 1.3), hash(id + 2.7)) - 0.5) * 0.7;
      float tw = 0.55 + 0.45 * sin(uTime * (0.8 + h * 2.4) + h * 40.0);
      float star = smoothstep(0.012 + 0.05 * h, 0.0, length(f - o)) * step(0.70, h);
      col += mix(vec3(0.9), mix(base, cool, h), 0.55) * star * tw * (0.9 - fi * 0.2);
    }
  } else {
    // Ink — a still ground with one soft pool of the accent
    vec2 c = uv - vec2(bx, 0.12);
    col += base * (0.075 / (1.0 + dot(c, c) * 3.2));
    col += cool * 0.02 * smoothstep(0.9, -0.4, uv.y);
  }

  // Light beam
  float d = abs(uv.x - bx);
  float flick = 0.96 + 0.04 * sin(uTime * 6.0);
  float vert = 0.30 + 0.70 * smoothstep(0.68, 0.16, abs(uv.y));
  float d2 = d * d;
  float core = smoothstep(0.005, 0.0, d);
  float inner = 1.0 / (1.0 + d2 * 2800.0);
  float haze = 1.0 / (1.0 + d2 * 105.0);
  float gain = (0.80 + uEnergy * 0.55) * flick * vert * uBeam;

  col += vec3(1.0) * core * gain * 1.5;
  col += base * inner * gain * 0.85;
  col += mix(base, cool, 0.5) * haze * gain * 0.30;

  vec2 haloDelta = vec2((uv.x - bx) * 1.5, uv.y);
  col += base * ((0.09 + uEnergy * 0.18) / (1.0 + dot(haloDelta, haloDelta) * 13.0)) * uBeam;

  // Vignette + inexpensive ordered grain
  vec2 vignetteUv = uv * vec2(0.78, 1.0);
  col *= (1.0 - smoothstep(0.18, 1.45, dot(vignetteUv, vignetteUv))) * 0.94;
  float grain = fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)) + uTime * 0.07) - 0.5;
  col += grain * 0.018;
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}`;

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('shader:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  function create(canvas) {
    let gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' })
      || canvas.getContext('experimental-webgl');
    if (!gl) return null;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const highp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const fragmentSource = highp && highp.precision > 0
      ? FRAG
      : FRAG.replace('precision highp float;', 'precision mediump float;');
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('link:', gl.getProgramInfoLog(prog));
      return null;
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const names = ['uRes', 'uTime', 'uHue', 'uEnergy', 'uPointer', 'uPhase', 'uBeamX', 'uMode', 'uSat', 'uTint', 'uBeam'];
    const u = {};
    for (let i = 0; i < names.length; i++) u[names[i]] = gl.getUniformLocation(prog, names[i]);
    return { gl, u };
  }

  const state = {
    hue: 284, energy: 0, phase: 0, px: 0, py: 0,
    beamX: 0.5, mode: 0, sat: 1, tint: 0, beam: 1, speed: 1, fps: 30,
    quality: 1, ceiling: 1, running: true, auto: false
  };

  let ctx = null, canvas = null, raf = 0, t0 = performance.now();
  let acc = 0, frames = 0;
  let lastDraw = 0;
  let clock = 0;
  let hidden = document.hidden;
  let contextLost = false;
  let resizeTimer = 0;
  let lastW = 0, lastH = 0;
  let lastRenderCost = 0;
  let fpsFrames = 0;
  let fpsStartedAt = performance.now();
  let measuredFps = 0;

  function doResize() {
    if (!ctx || !canvas) return;
    // DPR-cap: retina/4K monitors render at up to 1.25× DPR (not 2×) for shader.
    // Halves GPU pixel work on high-DPI screens with imperceptible visual change.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const w = Math.max(1, Math.floor(innerWidth * state.quality * dpr));
    const h = Math.max(1, Math.floor(innerHeight * state.quality * dpr));
    if (w !== lastW || h !== lastH) {
      lastW = w;
      lastH = h;
      canvas.width = w;
      canvas.height = h;
      ctx.gl.viewport(0, 0, w, h);
    }
  }

  function autoQuality(renderCost) {
    if (!state.auto) return;
    acc += renderCost;
    frames++;
    if (frames < 120) return;
    const avg = acc / frames;
    acc = 0;
    frames = 0;
    lastRenderCost = avg;
    if (avg > 10 && state.quality > 0.25) {
      state.quality = Math.max(0.25, state.quality - 0.08);
      doResize();
    } else if (avg < 4 && state.quality < state.ceiling) {
      state.quality = Math.min(state.ceiling, state.quality + 0.05);
      doResize();
    }
  }

  function frame(now) {
    raf = 0;
    if (!ctx || !state.running || hidden) return;
    const targetFps = state.fps === 30 ? 30 : 60;
    const interval = 1000 / targetFps;
    if (now - lastDraw < interval - 2) {
      raf = requestAnimationFrame(frame);
      return;
    }
    clock += Math.min(250, lastDraw ? now - lastDraw : 16) / 1000 * state.speed;
    lastDraw = now;
    doResize();

    const { gl, u } = ctx;
    const renderStart = performance.now();
    gl.uniform2f(u.uRes, lastW, lastH);
    gl.uniform1f(u.uTime, clock);
    gl.uniform1f(u.uHue, state.hue);
    gl.uniform1f(u.uEnergy, state.energy);
    gl.uniform1f(u.uPhase, state.phase);
    gl.uniform1f(u.uBeamX, state.beamX);
    gl.uniform1f(u.uMode, state.mode);
    gl.uniform1f(u.uSat, state.sat);
    gl.uniform1f(u.uTint, state.tint);
    gl.uniform1f(u.uBeam, state.mode > 0.5 && state.mode < 1.5 ? 1 : state.beam);
    gl.uniform2f(u.uPointer, state.px, state.py);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    fpsFrames++;
    if (now - fpsStartedAt >= 1000) {
      measuredFps = fpsFrames * 1000 / (now - fpsStartedAt);
      fpsFrames = 0;
      fpsStartedAt = now;
    }
    autoQuality(performance.now() - renderStart);
    raf = requestAnimationFrame(frame);
  }

  function onContextLost(e) {
    e.preventDefault();
    contextLost = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function onContextRestored() {
    if (!canvas) return;
    ctx = create(canvas);
    contextLost = false;
    if (ctx) {
      doResize();
      lastDraw = 0;
      if (state.running && !hidden) raf = requestAnimationFrame(frame);
    }
  }

  window.ITD_BG = {
    init(el) {
      canvas = el;
      ctx = create(el);
      if (!ctx) {
        document.body.classList.add('no-webgl');
        return false;
      }
      el.addEventListener('webglcontextlost', onContextLost, false);
      el.addEventListener('webglcontextrestored', onContextRestored, false);

      doResize();
      addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(doResize, 100);
      });
      document.addEventListener('visibilitychange', () => {
        hidden = document.hidden;
        if (!hidden && state.running && !raf) {
          raf = requestAnimationFrame(frame);
        }
      });
      raf = requestAnimationFrame(frame);
      return true;
    },
    set(patch) {
      const wasRunning = state.running;
      Object.assign(state, patch);
      if (wasRunning && !state.running && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if ((!wasRunning || !raf) && state.running && ctx && !hidden && !contextLost) {
        lastDraw = 0;
        raf = requestAnimationFrame(frame);
      }
    },
    quality(q) {
      state.ceiling = Math.max(0.20, Math.min(1, q));
      state.quality = state.ceiling;
      lastW = 0; lastH = 0;
      doResize();
    },
    get current() { return state; },
    get active() { return !!ctx && !contextLost; },
    get diagnostics() {
      return {
        backend: ctx ? 'webgl' : 'css-fallback',
        contextLost,
        running: state.running,
        hidden,
        quality: state.quality,
        fps: Math.round(measuredFps * 10) / 10,
        renderCost: lastRenderCost,
        width: lastW,
        height: lastH
      };
    }
  };
})();
