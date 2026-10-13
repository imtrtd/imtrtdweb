import { useEffect, useRef } from "react";

type LocalSignal = { x: number; y: number; energy: number; yaw: number; pitch: number };
let signal: LocalSignal = { x: 0, y: 0.15, energy: 0.22, yaw: 0.35, pitch: 0.18 };
function getSignal() { return signal; }
function patchSignal(partial: Partial<LocalSignal>) { signal = { ...signal, ...partial }; }

const VERT = `
attribute vec2 a;
void main() {
  gl_Position = vec4(a, 0.0, 1.0);
}
`;

const FRAG = `
#extension GL_OES_standard_derivatives : enable
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_color;
uniform vec2 u_light;
uniform float u_yaw;
uniform float u_pitch;
uniform float u_energy;
uniform float u_fold;

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

vec3 ov(int i, float s) {
  if (i == 0) return vec3(s, 0.0, 0.0);
  if (i == 1) return vec3(-s, 0.0, 0.0);
  if (i == 2) return vec3(0.0, s, 0.0);
  if (i == 3) return vec3(0.0, -s, 0.0);
  if (i == 4) return vec3(0.0, 0.0, s);
  return vec3(0.0, 0.0, -s);
}

void edgeIds(int e, out int ia, out int ib) {
  if (e < 4) {
    ia = 0;
    ib = e + 2;
  } else if (e < 8) {
    ia = 1;
    ib = e - 2;
  } else if (e == 8) {
    ia = 2;
    ib = 4;
  } else if (e == 9) {
    ia = 2;
    ib = 5;
  } else if (e == 10) {
    ia = 3;
    ib = 4;
  } else {
    ia = 3;
    ib = 5;
  }
}

vec3 viewOf(vec3 p, float yaw, float pitch, float roll) {
  p.xz *= rot(yaw);
  p.yz *= rot(pitch);
  p.xy *= rot(roll);
  return p;
}

vec2 project(vec3 p) {
  return p.xy * 0.84 / (3.2 - p.z);
}

vec3 axisTint(vec3 n) {
  vec3 ink = vec3(0.22, 0.23, 0.18);
  if (abs(n.y) >= abs(n.x) && abs(n.y) >= abs(n.z)) {
    ink = n.y > 0.0 ? vec3(0.72, 0.9, 0.16) : vec3(0.34, 0.42, 0.12);
  } else if (abs(n.x) >= abs(n.z)) {
    ink = n.x > 0.0 ? vec3(0.92, 0.22, 0.58) : vec3(0.16, 0.74, 0.9);
  } else {
    ink = n.z > 0.0 ? vec3(0.52, 0.32, 0.96) : vec3(0.9, 0.88, 0.8);
  }
  return mix(ink, u_color, 0.1);
}

float cracks(vec3 p, float time) {
  float g = sin(p.x * 9.0 + time * 1.4) * sin(p.z * 8.0 - time);
  float h = sin(p.y * 11.0 + p.x * 4.0 - time * 0.7);
  return smoothstep(0.78, 0.98, g * g) * 0.65 + smoothstep(0.86, 0.995, abs(h)) * 0.35;
}

void stroke(inout vec3 col, inout float alpha, vec2 uv, vec2 p0, vec2 p1, vec3 tint, float gain, float travel) {
  vec2 pa = uv - p0;
  vec2 ba = p1 - p0;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  float d = length(pa - ba * h);
  float px = max(fwidth(d), 0.0012);
  float core = smoothstep(px * 1.65, px * 0.4, max(d - 0.0016, 0.0));
  float glow = exp(-pow(d / (px * 4.2), 2.0)) * 0.16;
  float glint = smoothstep(0.055, 0.0, abs(h - travel));
  vec3 ink = mix(tint, vec3(0.96, 0.95, 0.9), core * glint * 0.8);
  float cover = clamp((core + glow) * gain, 0.0, 1.0);
  col = col * (1.0 - cover) + ink * cover;
  alpha = max(alpha, cover);
}

void drawShell(inout vec3 col, inout float alpha, vec2 uv, float s, float spin, float gain, float yaw, float pitch, float roll, float time, vec3 tint) {
  for (int e = 0; e < 12; e++) {
    int ia;
    int ib;
    edgeIds(e, ia, ib);
    vec3 oa = ov(ia, s);
    vec3 ob = ov(ib, s);
    oa.xz *= rot(spin);
    ob.xz *= rot(spin);
    vec3 va = viewOf(oa, yaw, pitch, roll);
    vec3 vb = viewOf(ob, yaw, pitch, roll);
    float depth = clamp((va.z + vb.z) * 0.22 + 0.72, 0.4, 1.0);
    float travel = fract(time * 0.23 + float(e) * 0.083);
    vec3 edge = mix(axisTint(oa + ob), tint, 0.55);
    stroke(col, alpha, uv, project(va), project(vb), edge, gain * depth, travel);
  }
}

void shadeHit(inout vec3 col, inout float alpha, vec3 hit, vec3 rd, float gain, float time) {
  vec3 n = normalize(sign(hit) + vec3(0.001, 0.0013, 0.0008));
  vec3 tint = axisTint(n);
  vec3 L = normalize(vec3(-0.34 + u_light.x * 0.7, 0.76 - u_light.y * 0.4, 0.46));
  vec3 V = normalize(-rd);
  float wrap = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
  float spec = pow(clamp(dot(n, normalize(L + V)), 0.0, 1.0), 42.0);
  float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 2.1);
  float crack = cracks(hit, time);
  vec3 body = mix(tint * 0.45, tint, wrap * 0.85);
  body = mix(body, vec3(0.97, 0.96, 0.9), spec * 0.72);
  body += mix(tint, u_color, 0.7) * fres * 0.55;
  body += mix(tint, vec3(0.95, 0.92, 0.8), 0.3) * crack * 0.28;
  float span = abs(hit.x) + abs(hit.y) + abs(hit.z);
  vec3 an = abs(hit) / max(span, 0.001);
  float belly = smoothstep(0.2, 0.72, max(an.x, max(an.y, an.z)));
  body *= 0.62 + belly * 0.5;
  float cover = clamp(gain, 0.0, 0.58);
  col = col * (1.0 - cover) + min(body, vec3(1.0)) * cover;
  alpha = max(alpha, cover);
}

void drawFaces(inout vec3 col, inout float alpha, vec3 ro, vec3 rd, float s, float spin, float time, float gain) {
  vec3 o = ro;
  vec3 d = rd;
  o.xz *= rot(-spin);
  d.xz *= rot(-spin);
  float nearT = 80.0;
  float farT = 0.0;
  vec3 nearP = vec3(0.0);
  vec3 farP = vec3(0.0);
  for (int sx = 0; sx < 2; sx++) {
    for (int sy = 0; sy < 2; sy++) {
      for (int sz = 0; sz < 2; sz++) {
        vec3 n = vec3(sx == 0 ? 1.0 : -1.0, sy == 0 ? 1.0 : -1.0, sz == 0 ? 1.0 : -1.0);
        float denom = dot(n, d);
        float t = (s - dot(n, o)) / denom;
        if (abs(denom) > 1e-3 && t > 0.02 && t < 12.0) {
          vec3 p = o + d * t;
          float sum = abs(p.x) + abs(p.y) + abs(p.z);
          if (n.x * p.x > -0.02 && n.y * p.y > -0.02 && n.z * p.z > -0.02 && abs(sum - s) < 0.045) {
            if (t < nearT) {
              nearT = t;
              nearP = p;
            }
            if (t > farT) {
              farT = t;
              farP = p;
            }
          }
        }
      }
    }
  }
  if (nearT > 40.0) return;
  if (farT > nearT + 0.05) shadeHit(col, alpha, farP, d, gain * 0.4, time);
  shadeHit(col, alpha, nearP, d, gain, time);
}

void drawPoles(inout vec3 col, inout float alpha, vec2 uv, float s, float yaw, float pitch, float roll, float time) {
  for (int i = 0; i < 6; i++) {
    vec3 p = viewOf(ov(i, s), yaw, pitch, roll);
    vec2 q = project(p);
    float d = length(uv - q);
    float px = max(fwidth(d), 0.0012);
    float bead = smoothstep(px * 4.2, px * 0.7, d);
    float halo = exp(-pow(d / (px * 7.0), 2.0)) * 0.28;
    vec3 tint = i < 2 ? vec3(0.95, 0.24, 0.62) : i < 4 ? vec3(0.78, 0.96, 0.2) : vec3(0.22, 0.84, 0.98);
    tint = mix(tint, u_color, 0.28);
    float blink = 0.72 + 0.28 * sin(time * 1.7 + float(i) * 1.05);
    float cover = clamp((bead + halo) * blink, 0.0, 1.0);
    col = col * (1.0 - cover) + tint * cover;
    alpha = max(alpha, cover);
  }
}

void drawRing(inout vec3 col, inout float alpha, vec3 ro, vec3 rd, float radius, int axis, float spin, vec3 tint) {
  vec3 o = ro;
  vec3 d = rd;
  if (axis == 0) {
    o.yz *= rot(-spin);
    d.yz *= rot(-spin);
  } else if (axis == 2) {
    o.xy *= rot(-spin);
    d.xy *= rot(-spin);
  } else {
    o.xz *= rot(-spin);
    d.xz *= rot(-spin);
  }
  float t = 0.04;
  float mind = 2.0;
  vec3 nearP = o;
  for (int i = 0; i < 36; i++) {
    vec3 p = o + d * t;
    float radial = axis == 0 ? length(p.yz) : axis == 2 ? length(p.xy) : length(p.xz);
    float axial = axis == 0 ? p.x : axis == 2 ? p.z : p.y;
    float dist = length(vec2(radial - radius, axial));
    if (dist < mind) {
      mind = dist;
      nearP = p;
    }
    t += max(dist * 0.55, 0.012);
    if (t > 6.2) break;
  }
  float core = smoothstep(0.042, 0.008, mind);
  float glow = exp(-mind * mind * 70.0) * 0.2;
  vec3 jewelAt = axis == 0 ? vec3(0.0, radius, 0.0) : vec3(radius, 0.0, 0.0);
  float jewel = smoothstep(0.06, 0.014, length(nearP - jewelAt));
  vec3 ink = mix(tint, vec3(0.97, 0.96, 0.9), jewel * 0.75);
  float cover = clamp(core * 0.95 + glow + jewel, 0.0, 1.0);
  col = col * (1.0 - cover) + ink * cover;
  alpha = max(alpha, cover);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float time = u_time;
  float energy = clamp(u_energy, 0.0, 1.0);
  float fold = clamp(u_fold, 0.0, 1.0);
  float yaw = u_yaw + time * 0.46;
  float pitch = sin(time * 0.37) * 0.46 + u_pitch * 0.32;
  float roll = sin(time * 0.23 + 0.6) * 0.28;
  float s = (0.9 + sin(time * 0.72) * 0.02 + energy * 0.04) * mix(1.0, 0.78, fold);

  vec3 col = vec3(0.0);
  float alpha = 0.0;

  vec3 ro = vec3(u_light.x * 0.18, -u_light.y * 0.12, 3.2);
  vec3 rd = normalize(vec3(uv, -1.15));
  ro.xy *= rot(-roll);
  rd.xy *= rot(-roll);
  ro.yz *= rot(-pitch);
  rd.yz *= rot(-pitch);
  ro.xz *= rot(-yaw);
  rd.xz *= rot(-yaw);

  drawFaces(col, alpha, ro, rd, s, 0.0, time, 0.78);
  drawShell(col, alpha, uv, s, 0.0, 1.0, yaw, pitch, roll, time, vec3(0.9, 0.89, 0.82));
  drawShell(col, alpha, uv, s * 0.72, 0.85 + time * 0.16, 0.8, yaw, pitch, roll, time, vec3(0.58, 0.36, 0.98));
  drawShell(col, alpha, uv, s * 0.46, time * 0.62, 0.86, yaw, pitch, roll, time, vec3(0.2, 0.78, 0.92));
  drawShell(col, alpha, uv, s * 0.24, -time * 1.05, 0.9, yaw, pitch, roll, time, vec3(0.78, 0.96, 0.22));
  drawPoles(col, alpha, uv, s, yaw, pitch, roll, time);

  float orbit = (0.98 + sin(time * 0.5) * 0.03 + energy * 0.04) * mix(1.0, 0.42, fold);
  drawRing(col, alpha, ro, rd, orbit, 1, time * 0.55, mix(vec3(0.78, 0.96, 0.22), u_color, 0.25));
  drawRing(col, alpha, ro, rd, orbit * 0.8, 0, -time * 0.72, vec3(0.66, 0.38, 1.0));
  drawRing(col, alpha, ro, rd, orbit * 1.14, 2, time * 0.3, vec3(0.22, 0.82, 0.98));

  float edge = smoothstep(1.15, 0.9, length(uv));
  gl_FragColor = vec4(min(col, vec3(1.0)) * alpha * edge, alpha * edge);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const FALLBACK: Record<string, [number, number, number]> = {
  lime: [216 / 255, 1, 0],
  violet: [191 / 255, 0, 1],
  magenta: [1, 43 / 255, 214 / 255],
  cyan: [46 / 255, 233 / 255, 1],
};

function readSignal(): [number, number, number] {
  const accent = document.documentElement.dataset.accent;
  const fallback = FALLBACK[accent ?? "lime"] ?? FALLBACK.lime;
  const probe = document.createElement("span");
  probe.style.color = "var(--color-signal)";
  document.documentElement.appendChild(probe);
  const raw = getComputedStyle(probe).color;
  probe.remove();
  const nums = raw.match(/[\d.]+/g);
  if (!nums || nums.length < 3) return fallback;
  const channels = nums.slice(0, 3).map(Number);
  const scale = Math.max(...channels) > 1.5 ? 255 : 1;
  const color = channels.map((channel) => channel / scale) as [number, number, number];
  const max = Math.max(...color);
  const min = Math.min(...color);
  if (max - min < 0.18) return fallback;
  return color;
}

export function Crystal({ foldRef }: { foldRef?: { current: number } }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    if (!gl) {
      canvas.dataset.fallback = "1";
      return;
    }
    gl.getExtension("OES_standard_derivatives");

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      canvas.dataset.fallback = "1";
      return;
    }
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, "a");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      canvas.dataset.fallback = "1";
      return;
    }

    const buffer = gl.createBuffer();
    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uColor = gl.getUniformLocation(program, "u_color");
    const uLight = gl.getUniformLocation(program, "u_light");
    const uYaw = gl.getUniformLocation(program, "u_yaw");
    const uPitch = gl.getUniformLocation(program, "u_pitch");
    const uEnergy = gl.getUniformLocation(program, "u_energy");
    const uFold = gl.getUniformLocation(program, "u_fold");

    let color = readSignal();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let running = true;
    let raf = 0;
    let colorUntil = performance.now() + 400;
    const pose = { yaw: 0.35, pitch: 0.08 };
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const bind = () => {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, rect.width < 700 ? 2 : 2.5);
      const w = Math.max(2, Math.round(rect.width * dpr));
      const h = Math.max(2, Math.round(rect.height * dpr));
      if (canvas.width === w && canvas.height === h && gl.isProgram(program)) return;
      canvas.width = w;
      canvas.height = h;
      bind();
    };

    const draw = (now: number) => {
      if (!running) return;
      resize();
      if (canvas.width < 2 || canvas.height < 2) {
        raf = requestAnimationFrame(draw);
        return;
      }
      if (now < colorUntil) color = readSignal();
      const signal = getSignal();
      if (!dragging && !reduced.matches) {
        pose.yaw += (signal.x * 0.55 - pose.yaw) * 0.04;
        pose.pitch += (signal.y * 0.28 - pose.pitch) * 0.04;
      }

      bind();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, now * (reduced.matches ? 0.00035 : 0.001));
      gl.uniform3f(uColor, color[0], color[1], color[2]);
      gl.uniform2f(uLight, signal.x, signal.y);
      gl.uniform1f(uYaw, pose.yaw);
      gl.uniform1f(uPitch, pose.pitch);
      gl.uniform1f(uEnergy, reduced.matches ? 0.2 : Math.max(signal.energy, 0.22));
      gl.uniform1f(uFold, foldRef?.current ?? 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const alive = visible && document.visibilityState !== "hidden";
      if (alive) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    const onAccent = () => {
      color = readSignal();
      colorUntil = performance.now() + 520;
      patchSignal({ energy: 1 });
      start();
    };
    const observer = new MutationObserver(onAccent);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-accent", "style", "class"],
    });

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) start();
    });
    io.observe(canvas);

    const box = new ResizeObserver(() => start());
    box.observe(canvas);

    const onVis = () => {
      if (document.visibilityState === "visible") start();
    };
    const inside = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    };
    const onDown = (event: PointerEvent) => {
      if (!inside(event)) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      patchSignal({ energy: 1 });
      canvas.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) {
        if (inside(event)) patchSignal({ energy: Math.min(1, getSignal().energy + 0.015) });
        return;
      }
      pose.yaw += (event.clientX - lastX) * 0.008;
      pose.pitch += (event.clientY - lastY) * 0.006;
      pose.pitch = Math.max(-0.85, Math.min(0.85, pose.pitch));
      lastX = event.clientX;
      lastY = event.clientY;
      patchSignal({ yaw: pose.yaw, pitch: pose.pitch, energy: Math.min(1, getSignal().energy + 0.08) });
    };
    const onUp = () => {
      dragging = false;
    };

    document.addEventListener("visibilitychange", onVis);
    reduced.addEventListener("change", start);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    start();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      io.disconnect();
      box.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      reduced.removeEventListener("change", start);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pulse-shader absolute inset-0 h-full w-full touch-none"
      aria-hidden
    />
  );
}
