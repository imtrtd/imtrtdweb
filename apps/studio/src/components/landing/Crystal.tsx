import { useEffect, useRef } from "react";

type LocalSignal = { x: number; y: number; energy: number; yaw: number; pitch: number; accent: number; pulse: number };
let state: LocalSignal = { x: 0, y: 0.15, energy: 0.22, yaw: 0.35, pitch: 0.18, accent: 0, pulse: 0 };
let touched = 0;
function getSignal() {
  const now = performance.now();
  const dt = touched === 0 ? 0 : Math.min(0.05, (now - touched) / 1000);
  touched = now;
  if (state.energy > 0.12) state = { ...state, energy: Math.max(0.12, state.energy * Math.exp(-dt * 1.35)) };
  if (state.pulse > 0.004) state = { ...state, pulse: state.pulse * Math.exp(-dt * 7.5) };
  return state;
}
function patchSignal(partial: Partial<LocalSignal>) {
  touched = performance.now();
  state = { ...state, ...partial };
}
if (typeof window !== "undefined") {
  window.addEventListener("imtrtd-pulse", () => patchSignal({ pulse: 1, energy: Math.min(1, state.energy + 0.35) }));
}

const VERT = `
attribute vec2 a;
void main() {
  gl_Position = vec4(a, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_color;
uniform vec2 u_light;
uniform float u_yaw;
uniform float u_pitch;
uniform float u_energy;
uniform float u_fold;
uniform float u_pulse;

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float hitSphere(vec3 ro, vec3 rd, vec3 c, float r) {
  vec3 oc = ro - c;
  float b = dot(oc, rd);
  float disc = b * b - dot(oc, oc) + r * r;
  if (disc < 0.0) return -1.0;
  float t = -b - sqrt(disc);
  return t > 0.02 ? t : -1.0;
}

float hitSpar(vec3 ro, vec3 rd, vec3 a, vec3 b, float r) {
  vec3 ba = b - a;
  vec3 oa = ro - a;
  float baba = dot(ba, ba);
  float bard = dot(ba, rd);
  float baoa = dot(ba, oa);
  float rdoa = dot(rd, oa);
  float oaoa = dot(oa, oa);
  float A = baba - bard * bard;
  float B = baba * rdoa - baoa * bard;
  float C = baba * oaoa - baoa * baoa - r * r * baba;
  float h = B * B - A * C;
  if (h < 0.0 || abs(A) < 0.0001) return -1.0;
  float t = (-B - sqrt(h)) / A;
  float y = baoa + t * bard;
  if (y > 0.0 && y < baba && t > 0.02) return t;
  return -1.0;
}

vec3 shade(vec3 ro, vec3 rd, float t, vec3 c, vec3 tint, float time, float pulse) {
  vec3 p = ro + rd * t;
  vec3 n = normalize(p - c);
  float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.5);
  float lat = abs(fract(n.y * 5.0 + time * 0.06) - 0.5);
  float line = smoothstep(0.06, 0.0, lat - 0.015);
  float scan = 0.65 + 0.35 * sin(p.y * 36.0 - time * 3.0);
  vec3 body = vec3(0.02, 0.025, 0.04);
  return body + tint * (0.12 + fres * (0.7 + pulse * 0.35)) + tint * line * 0.4 * scan;
}

void ring(inout vec3 col, inout float alpha, vec3 ro, vec3 rd, vec3 c, vec3 nrm, float radius, vec3 tint) {
  float denom = dot(rd, nrm);
  if (abs(denom) < 0.03) return;
  float t = dot(c - ro, nrm) / denom;
  if (t < 0.04) return;
  float d = abs(length(ro + rd * t - c) - radius);
  float band = smoothstep(0.028, 0.0, d);
  float a = band * 0.5 * (1.0 - alpha);
  col += tint * a;
  alpha += a;
}

void cover(inout vec3 col, inout float alpha, vec3 lit, float a) {
  col = col * (1.0 - a) + lit * a;
  alpha = alpha + (1.0 - alpha) * a;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float time = u_time;
  float energy = clamp(u_energy, 0.0, 1.0);
  float fold = clamp(u_fold, 0.0, 1.0);
  float pulse = clamp(u_pulse, 0.0, 1.0);
  float yaw = u_yaw + time * 0.28;
  float pitch = sin(time * 0.33) * 0.38 + u_pitch * 0.28;

  vec3 ro = vec3(u_light.x * 0.16, -u_light.y * 0.1, 2.7);
  vec3 rd = normalize(vec3(uv * 1.02, -1.22));
  float roll = sin(time * 0.19) * 0.18;
  ro.xy *= rot(-roll);
  rd.xy *= rot(-roll);
  ro.yz *= rot(-pitch);
  rd.yz *= rot(-pitch);
  ro.xz *= rot(-yaw);
  rd.xz *= rot(-yaw);

  float sc = mix(1.0, 0.58, fold);
  vec3 c0 = vec3(cos(time * 0.36), sin(time * 0.24) * 0.35, sin(time * 0.36) * 0.45) * 0.36 * sc;
  vec3 c1 = vec3(cos(time * 0.36 + 2.15), 0.16 + sin(time * 0.3) * 0.2, sin(time * 0.36 + 2.15) * 0.4) * 0.42 * sc;
  vec3 c2 = vec3(cos(time * 0.48 + 4.2) * 0.28, 0.46 + sin(time * 0.4) * 0.12, 0.16) * sc;

  vec3 mag = mix(vec3(0.72, 0.28, 0.58), u_color, 0.2);
  vec3 cyn = vec3(0.22, 0.7, 0.76);
  vec3 vio = vec3(0.5, 0.3, 0.86);
  float r0 = 0.34 * sc;
  float r1 = 0.25 * sc;
  float r2 = 0.15 * sc;

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float glow = exp(-dot(uv, uv) * 3.2) * (0.1 + energy * 0.05);
  col += cyn * glow * 0.45 + mag * glow * 0.25;
  alpha = glow * 0.35;

  ring(col, alpha, ro, rd, c0, normalize(vec3(0.15, 1.0, 0.08)), r0 + 0.16, mag);
  ring(col, alpha, ro, rd, c1, normalize(vec3(0.35, 0.25, 1.0)), r1 + 0.14, cyn);
  ring(col, alpha, ro, rd, c2, normalize(vec3(1.0, 0.15, 0.2)), r2 + 0.1, vio);

  float best = 80.0;
  vec3 bc = c0;
  vec3 bt = mag;
  float t0 = hitSphere(ro, rd, c0, r0);
  float t1 = hitSphere(ro, rd, c1, r1);
  float t2 = hitSphere(ro, rd, c2, r2);
  if (t0 > 0.0 && t0 < best) { best = t0; bc = c0; bt = mag; }
  if (t1 > 0.0 && t1 < best) { best = t1; bc = c1; bt = cyn; }
  if (t2 > 0.0 && t2 < best) { best = t2; bc = c2; bt = vio; }
  if (best < 40.0) cover(col, alpha, shade(ro, rd, best, bc, bt, time, pulse), 0.94);

  vec3 s0 = c0 + vec3(cos(time * 1.1), sin(time * 0.8) * 0.35, sin(time * 1.1)) * (r0 + 0.2);
  vec3 s1 = c1 + vec3(cos(time * -0.9 + 1.0), sin(time * 1.3) * 0.22, sin(time * -0.9)) * (r1 + 0.18);
  vec3 s2 = c2 + vec3(cos(time * 1.4 + 2.0) * 0.7, sin(time * 1.1), sin(time * 1.4) * 0.7) * (r2 + 0.14);
  vec3 s3 = mix(c0, c1, 0.5) + vec3(0.0, sin(time * 0.9) * 0.18, cos(time * 0.7) * 0.16);
  float q0 = hitSphere(ro, rd, s0, 0.07 * sc);
  float q1 = hitSphere(ro, rd, s1, 0.055 * sc);
  float q2 = hitSphere(ro, rd, s2, 0.046 * sc);
  float q3 = hitSphere(ro, rd, s3, 0.05 * sc);
  if (q0 > 0.0 && (best > 40.0 || q0 < best)) cover(col, alpha, shade(ro, rd, q0, s0, cyn, time, pulse), 0.95);
  if (q1 > 0.0 && (best > 40.0 || q1 < best)) cover(col, alpha, shade(ro, rd, q1, s1, mag, time, pulse), 0.95);
  if (q2 > 0.0 && (best > 40.0 || q2 < best)) cover(col, alpha, shade(ro, rd, q2, s2, vio, time, pulse), 0.95);
  if (q3 > 0.0 && (best > 40.0 || q3 < best)) cover(col, alpha, shade(ro, rd, q3, s3, mix(cyn, mag, 0.5), time, pulse), 0.95);

  vec3 a0 = c0 + vec3(sin(time * 0.6), 0.2, cos(time * 0.6)) * 0.2;
  vec3 b0 = a0 + vec3(0.16, 0.05, -0.04);
  float spar = hitSpar(ro, rd, a0, b0, 0.02);
  if (spar > 0.0 && (best > 40.0 || spar < best)) cover(col, alpha, cyn * (0.45 + pulse * 0.3), 0.8);
  vec3 a1 = c1 + vec3(-0.1, sin(time * 0.8) * 0.16, 0.12);
  vec3 b1 = a1 + vec3(0.05, 0.14, 0.08);
  float spar2 = hitSpar(ro, rd, a1, b1, 0.018);
  if (spar2 > 0.0 && (best > 40.0 || spar2 < best)) cover(col, alpha, vio * 0.55, 0.75);

  float edge = smoothstep(1.18, 0.92, length(uv));
  gl_FragColor = vec4(min(col, vec3(0.92)) * alpha * edge, alpha * edge);
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
    const gl =
      canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        powerPreference: "high-performance",
      }) || canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
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
    const uPulse = gl.getUniformLocation(program, "u_pulse");

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

    let sized = false;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(2, Math.round(rect.width * dpr));
      const h = Math.max(2, Math.round(rect.height * dpr));
      if (sized && canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      sized = true;
      bind();
    };

    const draw = (now: number) => {
      if (!running) return;
      if (canvas.width < 2 || canvas.height < 2) resize();
      if (canvas.width < 2 || canvas.height < 2) {
        raf = requestAnimationFrame(draw);
        return;
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (now < colorUntil) color = readSignal();
      const signal = getSignal();
      if (!dragging && !reduced.matches) {
        pose.yaw += (signal.x * 0.35 - pose.yaw) * 0.035;
        pose.pitch += (signal.y * 0.22 - pose.pitch) * 0.035;
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, now * (reduced.matches ? 0.00035 : 0.001));
      gl.uniform3f(uColor, color[0], color[1], color[2]);
      gl.uniform2f(uLight, signal.x, signal.y);
      gl.uniform1f(uYaw, pose.yaw);
      gl.uniform1f(uPitch, pose.pitch);
      gl.uniform1f(uEnergy, reduced.matches ? 0.2 : Math.max(signal.energy, 0.22));
      gl.uniform1f(uFold, foldRef?.current ?? 0);
      gl.uniform1f(uPulse, signal.pulse);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (visible && document.visibilityState !== "hidden") raf = requestAnimationFrame(draw);
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
      attributeFilter: ["data-accent"],
    });

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) start();
    });
    io.observe(canvas);

    const box = new ResizeObserver(() => {
      resize();
      start();
    });
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
    resize();
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
