import{a as e,n as t,o as n,r,s as i}from"./index-CB_dq7em.js";import{n as a,r as o,t as s}from"./studio-nav-CCJGcwsh.js";import{t as c}from"./work-list-37b4ST_T.js";var l=i(n(),1),u=e(),d=`
attribute vec2 a;
void main() {
  gl_Position = vec4(a, 0.0, 1.0);
}
`,f=`
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
  float band = smoothstep(0.008, 0.0, d);
  float a = band * 0.055 * (1.0 - alpha);
  col += tint * a;
  alpha += a;
}

void cover(inout vec3 col, inout float alpha, vec3 lit, float a) {
  col = col * (1.0 - a) + lit * a;
  alpha = alpha + (1.0 - alpha) * a;
}

vec3 onOrbit(float time, float radius, float speed, float phase, float incline) {
  float a = time * speed + phase;
  vec3 p = vec3(cos(a), 0.0, sin(a)) * radius;
  p.yz *= rot(incline);
  p.xy *= rot(1.2);
  return p;
}

vec3 orbitPlane(float incline) {
  vec3 n = vec3(0.0, cos(incline), sin(incline));
  n.xy *= rot(1.2);
  return normalize(n);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float time = u_time;
  float energy = clamp(u_energy, 0.0, 1.0);
  float fold = clamp(u_fold, 0.0, 1.0);
  float pulse = clamp(u_pulse, 0.0, 1.0);
  float yaw = u_yaw + time * 0.18;
  float pitch = 0.22 + sin(time * 0.22) * 0.08 + u_pitch * 0.15;
  vec3 ro = vec3(sin(yaw) * cos(pitch), sin(pitch) * 0.45, cos(yaw) * cos(pitch)) * 3.4;
  vec3 ww = normalize(vec3(0.0, 0.28, 0.0) - ro);
  vec3 uu = normalize(cross(vec3(0.0, 1.0, 0.0), ww));
  vec3 vv = cross(ww, uu);
  vec3 rd = normalize(uu * uv.x * 0.9 + vv * uv.y * 0.9 + ww * 1.18);

  float sc = mix(1.12, 0.64, fold);
  vec3 sunC = vec3(0.0);
  vec3 p1 = onOrbit(time, 0.38, 1.15, 0.2, 0.42) * sc;
  vec3 p2 = onOrbit(time, 0.54, 0.62, 1.8, 0.62) * sc;
  vec3 p3 = onOrbit(time, 0.7, 0.36, 3.6, 0.82) * sc;
  vec3 p4 = onOrbit(time, 0.88, 0.2, 5.1, 0.5) * sc;
  vec3 moon = p3 + onOrbit(time, 0.16, 2.2, 0.0, 1.35) * sc;

  vec3 amber = mix(vec3(0.95, 0.48, 0.22), u_color, 0.12);
  vec3 cyn = vec3(0.25, 0.74, 0.8);
  vec3 mag = vec3(0.78, 0.28, 0.55);
  vec3 vio = vec3(0.5, 0.32, 0.88);
  vec3 sand = vec3(0.82, 0.62, 0.38);
  float rs = (0.22 + pulse * 0.02) * sc;
  float r1 = 0.072 * sc;
  float r2 = 0.1 * sc;
  float r3 = 0.155 * sc;
  float r4 = 0.08 * sc;
  float rm = 0.04 * sc;

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float glow = exp(-dot(uv, uv) * 2.4) * (0.14 + energy * 0.08 + pulse * 0.08);
  col += amber * glow * 0.7;
  alpha = glow * 0.4;

  ring(col, alpha, ro, rd, sunC, orbitPlane(0.42), 0.38 * sc, cyn);
  ring(col, alpha, ro, rd, sunC, orbitPlane(0.62), 0.54 * sc, mag);
  ring(col, alpha, ro, rd, sunC, orbitPlane(0.82), 0.7 * sc, vio);
  ring(col, alpha, ro, rd, sunC, orbitPlane(0.5), 0.88 * sc, sand);

  float best = 80.0;
  vec3 bc = sunC;
  vec3 bt = amber;
  float star = 0.0;
  float tS = hitSphere(ro, rd, sunC, rs);
  float t1 = hitSphere(ro, rd, p1, r1);
  float t2 = hitSphere(ro, rd, p2, r2);
  float t3 = hitSphere(ro, rd, p3, r3);
  float t4 = hitSphere(ro, rd, p4, r4);
  float tM = hitSphere(ro, rd, moon, rm);
  if (tS > 0.0) { best = tS; bc = sunC; bt = amber; star = 1.0; }
  if (t1 > 0.0 && t1 < best) { best = t1; bc = p1; bt = cyn; star = 0.0; }
  if (t2 > 0.0 && t2 < best) { best = t2; bc = p2; bt = mag; star = 0.0; }
  if (t3 > 0.0 && t3 < best) { best = t3; bc = p3; bt = vio; star = 0.0; }
  if (t4 > 0.0 && t4 < best) { best = t4; bc = p4; bt = sand; star = 0.0; }
  if (tM > 0.0 && tM < best) { best = tM; bc = moon; bt = cyn; star = 0.0; }
  if (best < 40.0) {
    vec3 lit = shade(ro, rd, best, bc, bt, time, pulse);
    if (star > 0.5) lit = bt * (0.72 + pulse * 0.2) + vec3(1.0, 0.78, 0.45) * 0.18;
    cover(col, alpha, lit, 0.94);
  }

  float edge = smoothstep(1.55, 1.22, length(uv));
  gl_FragColor = vec4(min(col, vec3(0.92)) * alpha * edge, alpha * edge);
}
`;function p(e,t,n){let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.error(e.getShaderInfoLog(r)),e.deleteShader(r),null)):null}var m={lime:[216/255,1,0],violet:[191/255,0,1],magenta:[1,43/255,214/255],cyan:[46/255,233/255,1]};function h(){let e=m[document.documentElement.dataset.accent??`lime`]??m.lime,t=document.createElement(`span`);t.style.color=`var(--color-signal)`,document.documentElement.appendChild(t);let n=getComputedStyle(t).color;t.remove();let r=n.match(/[\d.]+/g);if(!r||r.length<3)return e;let i=r.slice(0,3).map(Number),a=Math.max(...i)>1.5?255:1,o=i.map(e=>e/a);return Math.max(...o)-Math.min(...o)<.18?e:o}function g({foldRef:e}){let t=(0,l.useRef)(null);return(0,l.useEffect)(()=>{let n=t.current;if(!n)return;let r=n.getContext(`webgl`,{alpha:!0,antialias:!1,premultipliedAlpha:!0,powerPreference:`high-performance`})||n.getContext(`webgl`,{alpha:!0,antialias:!1,premultipliedAlpha:!0});if(!r){n.dataset.fallback=`1`;return}r.getExtension(`OES_standard_derivatives`);let i=p(r,r.VERTEX_SHADER,d),s=p(r,r.FRAGMENT_SHADER,f);if(!i||!s){n.dataset.fallback=`1`;return}let c=r.createProgram();if(!c)return;if(r.attachShader(c,i),r.attachShader(c,s),r.bindAttribLocation(c,0,`a`),r.linkProgram(c),!r.getProgramParameter(c,r.LINK_STATUS)){console.error(r.getProgramInfoLog(c)),n.dataset.fallback=`1`;return}let l=r.createBuffer(),u=r.getUniformLocation(c,`u_res`),m=r.getUniformLocation(c,`u_time`),g=r.getUniformLocation(c,`u_color`),_=r.getUniformLocation(c,`u_light`),v=r.getUniformLocation(c,`u_yaw`),y=r.getUniformLocation(c,`u_pitch`),b=r.getUniformLocation(c,`u_energy`),x=r.getUniformLocation(c,`u_fold`),S=r.getUniformLocation(c,`u_pulse`),C=h(),w=window.matchMedia(`(prefers-reduced-motion: reduce)`),T=!0,E=!0,D=0,O=performance.now()+400,k={yaw:.35,pitch:.08},A=!1,j=0,M=0,N=()=>{r.useProgram(c),r.bindBuffer(r.ARRAY_BUFFER,l),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),r.STATIC_DRAW),r.enableVertexAttribArray(0),r.vertexAttribPointer(0,2,r.FLOAT,!1,0,0),r.enable(r.BLEND),r.blendFunc(r.ONE,r.ONE_MINUS_SRC_ALPHA),r.viewport(0,0,n.width,n.height)},P=!1,F=()=>{let e=n.getBoundingClientRect(),t=Math.min(window.devicePixelRatio||1,2),r=Math.max(2,Math.round(e.width*t)),i=Math.max(2,Math.round(e.height*t));P&&n.width===r&&n.height===i||(n.width=r,n.height=i,P=!0,N())},I=t=>{if(!E)return;if((n.width<2||n.height<2)&&F(),n.width<2||n.height<2){D=requestAnimationFrame(I);return}r.clearColor(0,0,0,0),r.clear(r.COLOR_BUFFER_BIT),t<O&&(C=h());let i=a();!A&&!w.matches&&(k.yaw+=(i.x*.35-k.yaw)*.035,k.pitch+=(i.y*.22-k.pitch)*.035),r.uniform2f(u,n.width,n.height),r.uniform1f(m,t*(w.matches?35e-5:.001)),r.uniform3f(g,C[0],C[1],C[2]),r.uniform2f(_,i.x,i.y),r.uniform1f(v,k.yaw),r.uniform1f(y,k.pitch),r.uniform1f(b,w.matches?.2:Math.max(i.energy,.22)),r.uniform1f(x,e?.current??0),r.uniform1f(S,i.pulse),r.drawArrays(r.TRIANGLES,0,3),T&&document.visibilityState!==`hidden`&&(D=requestAnimationFrame(I))},L=()=>{cancelAnimationFrame(D),D=requestAnimationFrame(I)},R=new MutationObserver(()=>{C=h(),O=performance.now()+520,o({energy:1}),L()});R.observe(document.documentElement,{attributes:!0,attributeFilter:[`data-accent`]});let z=new IntersectionObserver(([e])=>{T=e?.isIntersecting??!0,T&&L()});z.observe(n);let B=new ResizeObserver(()=>{F(),L()});B.observe(n);let V=()=>{document.visibilityState===`visible`&&L()},H=e=>{let t=n.getBoundingClientRect();return e.clientX>=t.left&&e.clientX<=t.right&&e.clientY>=t.top&&e.clientY<=t.bottom},U=e=>{H(e)&&(A=!0,j=e.clientX,M=e.clientY,o({energy:1}),n.setPointerCapture(e.pointerId))},W=e=>{A?(k.yaw+=(e.clientX-j)*.008,k.pitch+=(e.clientY-M)*.006,k.pitch=Math.max(-.85,Math.min(.85,k.pitch)),j=e.clientX,M=e.clientY,o({yaw:k.yaw,pitch:k.pitch,energy:Math.min(1,a().energy+.08)})):H(e)&&o({energy:Math.min(1,a().energy+.015)})},G=()=>{A=!1};return document.addEventListener(`visibilitychange`,V),w.addEventListener(`change`,L),n.addEventListener(`pointerdown`,U),window.addEventListener(`pointermove`,W),window.addEventListener(`pointerup`,G),window.addEventListener(`pointercancel`,G),F(),L(),()=>{E=!1,cancelAnimationFrame(D),R.disconnect(),z.disconnect(),B.disconnect(),document.removeEventListener(`visibilitychange`,V),w.removeEventListener(`change`,L),n.removeEventListener(`pointerdown`,U),window.removeEventListener(`pointermove`,W),window.removeEventListener(`pointerup`,G),window.removeEventListener(`pointercancel`,G),r.deleteProgram(c),r.deleteShader(i),r.deleteShader(s),r.deleteBuffer(l)}},[]),(0,u.jsx)(`canvas`,{ref:t,className:`pulse-shader absolute inset-0 h-full w-full touch-none`,"aria-hidden":!0})}var _=[`Website`,`Identity`,`Interface`,`Tool`,`Something else`];function v(){let e=(0,l.useRef)(null),n=(0,l.useRef)(0),[r,i]=(0,l.useState)(!1);return(0,l.useEffect)(()=>{let t=e.current;if(!t)return;let r=window.matchMedia(`(prefers-reduced-motion: reduce)`),i=0,a=()=>{if(r.matches){n.current=1,t.style.setProperty(`--fold`,`1`),t.dataset.open=`1`;return}let e=t.offsetHeight-window.innerHeight,i=e<=0?0:-t.getBoundingClientRect().top/e,a=Math.min(1,Math.max(0,i/.68));n.current=a,t.style.setProperty(`--fold`,a.toFixed(4)),t.dataset.open=a>.62?`1`:`0`},o=()=>{cancelAnimationFrame(i),i=requestAnimationFrame(a)};return a(),window.addEventListener(`scroll`,o,{passive:!0}),window.addEventListener(`resize`,o),r.addEventListener(`change`,o),()=>{cancelAnimationFrame(i),window.removeEventListener(`scroll`,o),window.removeEventListener(`resize`,o),r.removeEventListener(`change`,o)}},[]),(0,u.jsx)(`section`,{ref:e,id:`brief`,className:`pulse-stage`,"data-open":`0`,children:(0,u.jsxs)(`div`,{className:`pulse-pin`,children:[(0,u.jsxs)(`div`,{className:`pulse-copy min-w-0`,children:[(0,u.jsx)(`p`,{className:`label text-signal`,children:t.name}),(0,u.jsx)(`p`,{className:`label mt-2 text-mute`,children:`Available · Q4 2026 · Kyiv / Remote`}),(0,u.jsxs)(`h1`,{className:`hero-title mt-4 sm:mt-5`,children:[`DIGITAL`,(0,u.jsx)(`br`,{}),(0,u.jsx)(`span`,{className:`hero-glitch`,"data-text":`EXPERIENCES`,children:`EXPERIENCES`}),(0,u.jsx)(`br`,{}),`WITH A PULSE.`]}),(0,u.jsx)(`p`,{className:`mt-5 max-w-[38ch] text-base leading-relaxed text-paper/80`,children:`Websites, interfaces and systems for studios, artists and small brands that refuse a generic template.`}),(0,u.jsxs)(`a`,{href:`#work`,"data-fx":`explore`,className:`label mt-6 inline-flex h-11 items-center gap-3 text-paper`,children:[(0,u.jsx)(`span`,{className:`grid size-11 place-items-center rounded-full border border-signal text-signal`,children:`↓`}),`Explore work`]})]}),(0,u.jsx)(`div`,{className:`pulse-figure`,"aria-hidden":!0,children:(0,u.jsx)(g,{foldRef:n})}),(0,u.jsxs)(`div`,{className:`brief-panel`,children:[(0,u.jsx)(`p`,{className:`label text-signal`,children:`Brief`}),(0,u.jsx)(`h2`,{className:`mt-2 max-w-[14ch] font-display text-3xl font-semibold tracking-tight sm:text-4xl`,children:`Start with the brief.`}),r?(0,u.jsxs)(`p`,{className:`mt-4 max-w-[36ch] text-sm leading-relaxed text-paper/80`,children:[`The mail draft is open. If it stayed closed, write to `,t.email,`.`]}):(0,u.jsxs)(`form`,{onSubmit:e=>{e.preventDefault();let n=new FormData(e.currentTarget),r=String(n.get(`name`)??``).trim(),a=String(n.get(`contact`)??``).trim(),o=String(n.get(`task`)??``),s=String(n.get(`note`)??``).trim(),c=[`Name: ${r}`,`Contact: ${a}`,`Task: ${o}`,``,s].join(`
`);window.location.href=`mailto:${t.email}?subject=${encodeURIComponent(`Brief from ${r}`)}&body=${encodeURIComponent(c)}`,i(!0)},className:`mt-4 grid gap-3`,children:[(0,u.jsxs)(`div`,{className:`grid gap-3 sm:grid-cols-2`,children:[(0,u.jsxs)(`label`,{className:`grid gap-1`,children:[(0,u.jsx)(`span`,{className:`label text-mute`,children:`Name`}),(0,u.jsx)(`input`,{required:!0,name:`name`,autoComplete:`name`,className:`brief-field`})]}),(0,u.jsxs)(`label`,{className:`grid gap-1`,children:[(0,u.jsx)(`span`,{className:`label text-mute`,children:`Email or Telegram`}),(0,u.jsx)(`input`,{required:!0,name:`contact`,autoComplete:`email`,className:`brief-field`})]})]}),(0,u.jsxs)(`label`,{className:`grid gap-1`,children:[(0,u.jsx)(`span`,{className:`label text-mute`,children:`The job`}),(0,u.jsx)(`select`,{name:`task`,"data-fx":`job`,defaultValue:`Website`,className:`brief-field`,children:_.map(e=>(0,u.jsx)(`option`,{children:e},e))})]}),(0,u.jsxs)(`label`,{className:`grid gap-1`,children:[(0,u.jsx)(`span`,{className:`label text-mute`,children:`Note`}),(0,u.jsx)(`textarea`,{name:`note`,rows:2,className:`brief-field resize-none`})]}),(0,u.jsx)(`button`,{type:`submit`,"data-fx":`send`,className:`label h-11 bg-signal px-5 text-ink`,children:`Send the brief`})]})]})]})})}var y=[[`01`,`Web design`,`Visual systems, responsive interfaces and prototypes.`],[`02`,`Development`,`Fast builds with interactions that do a job.`],[`03`,`Identity`,`Marks and rules that survive a bad brief.`],[`04`,`Care`,`The site keeps moving after launch.`]],b=[[`Now`,`Live builds`,`The six sites open inside this studio. Same logo, same type, their own pages.`],[`20.08.26`,`Pulse`,`Form and energy. Colour switches between lime, violet, magenta and cyan.`],[`13.08.26`,`Identity`,`The mark stays. Arimo and Geist Mono stay. Nothing is recolored to match a trend.`]];function x(){return(0,u.jsxs)(s,{children:[(0,u.jsx)(v,{}),(0,u.jsxs)(`section`,{className:`grid gap-6 border-t border-hair px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-12 lg:px-8 xl:px-12`,children:[(0,u.jsx)(`p`,{className:`label text-signal lg:col-span-4`,children:`What I do`}),(0,u.jsxs)(`div`,{className:`lg:col-span-8`,children:[(0,u.jsxs)(`h2`,{className:`font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-6xl`,children:[`One person.`,(0,u.jsx)(`br`,{}),`Full system.`]}),(0,u.jsx)(`p`,{className:`mt-5 max-w-[46ch] text-base leading-relaxed text-paper/80`,children:`Strategy, interface, code and motion, from the first sketch to the deployed site. One continuous product, not three vendors.`})]})]}),(0,u.jsxs)(`section`,{id:`work`,className:`border-t border-hair`,children:[(0,u.jsxs)(`div`,{className:`flex flex-wrap items-baseline justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8 xl:px-12`,children:[(0,u.jsx)(`p`,{className:`label text-signal`,children:`Selected work`}),(0,u.jsxs)(`p`,{className:`label text-mute`,children:[r.length,` live builds`]})]}),(0,u.jsx)(c,{})]}),(0,u.jsxs)(`section`,{className:`grid gap-6 border-t border-hair px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-12 lg:px-8 xl:px-12`,children:[(0,u.jsx)(`p`,{className:`label text-signal lg:col-span-4`,children:`Capabilities`}),(0,u.jsxs)(`div`,{className:`lg:col-span-8`,children:[(0,u.jsxs)(`h2`,{className:`font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-6xl`,children:[`From idea`,(0,u.jsx)(`br`,{}),`to online.`]}),(0,u.jsx)(`ul`,{className:`mt-8 grid gap-6 sm:grid-cols-2`,children:y.map(([e,t,n])=>(0,u.jsxs)(`li`,{children:[(0,u.jsx)(`p`,{className:`label text-signal`,children:e}),(0,u.jsx)(`p`,{className:`mt-2 font-display text-2xl font-semibold`,children:t}),(0,u.jsx)(`p`,{className:`mt-2 text-sm leading-relaxed text-mute`,children:n})]},e))})]})]}),(0,u.jsxs)(`section`,{className:`border-t border-hair px-4 py-10 sm:px-6 sm:py-12 lg:px-8 xl:px-12`,children:[(0,u.jsx)(`p`,{className:`label text-signal`,children:`Build in public`}),(0,u.jsx)(`h2`,{className:`mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-6xl`,children:`Change log`}),(0,u.jsx)(`ol`,{className:`mt-8 max-w-3xl border-t border-hair`,children:b.map(([e,t,n])=>(0,u.jsxs)(`li`,{className:`grid gap-2 border-b border-hair py-5 md:grid-cols-[7rem_1fr]`,children:[(0,u.jsx)(`span`,{className:`label text-signal`,children:e}),(0,u.jsxs)(`span`,{children:[(0,u.jsx)(`span`,{className:`font-display text-2xl font-semibold`,children:t}),(0,u.jsx)(`span`,{className:`mt-2 block max-w-[52ch] text-sm leading-relaxed text-mute`,children:n})]})]},e))})]})]})}export{x as component};