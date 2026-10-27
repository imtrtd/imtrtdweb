import { useEffect, useRef } from "react";

type Star = { x: number; y: number; z: number; w: number; tint: number };

export function Cosmos() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const stars: Star[] = Array.from({ length: 180 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      w: 0.4 + Math.random() * 1.4,
      tint: Math.random(),
    }));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let running = true;
    let visible = true;
    let tabActive = document.visibilityState !== "hidden";
    let raf = 0;
    let last = 0;
    const FRAME = 1000 / 30;

    const draw = (now: number) => {
      if (!running) return;
      if (!visible || !tabActive) return;

      if (now - last < FRAME) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = now;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(2, Math.round(window.innerWidth * dpr));
      const height = Math.max(2, Math.round(window.innerHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.fillStyle = "#05040a";
      ctx.fillRect(0, 0, width, height);

      const t = reduced.matches ? 0 : now * 0.001;
      const sunX = width * (0.78 + Math.sin(t * 0.07) * 0.03);
      const sunY = height * (0.58 + Math.cos(t * 0.05) * 0.02);
      const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, width * 0.28);
      sun.addColorStop(0, "rgba(255, 64, 140, 0.28)");
      sun.addColorStop(0.35, "rgba(90, 30, 120, 0.12)");
      sun.addColorStop(1, "rgba(5, 4, 10, 0)");
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, width, height);

      const wash = ctx.createLinearGradient(0, height * 0.42, 0, height);
      wash.addColorStop(0, "rgba(20, 8, 28, 0)");
      wash.addColorStop(0.45, "rgba(40, 12, 48, 0.18)");
      wash.addColorStop(1, "rgba(8, 20, 32, 0.28)");
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, width, height);

      const horizon = height * (0.62 + Math.sin(t * 0.04) * 0.01);
      ctx.strokeStyle = "rgba(70, 210, 220, 0.09)";
      ctx.lineWidth = dpr;
      const shift = reduced.matches ? 0 : (t * 40) % 48;
      for (let i = 0; i < 9; i++) {
        const y = horizon + i * i * 3.2 * dpr + shift * (i / 8);
        ctx.globalAlpha = 0.35 + i * 0.05;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const vanishX = width * 0.5;
      for (let i = -6; i <= 6; i++) {
        ctx.strokeStyle = "rgba(210, 70, 150, 0.07)";
        ctx.beginPath();
        ctx.moveTo(vanishX, horizon);
        ctx.lineTo(vanishX + i * width * 0.16, height);
        ctx.stroke();
      }

      const speed = reduced.matches ? 0 : 0.0024;
      const cx = width * 0.5;
      const cy = height * 0.46;
      for (const star of stars) {
        if (!reduced.matches) {
          star.z -= speed;
          if (star.z < 0.02) {
            star.z = 1;
            star.x = Math.random();
            star.y = Math.random();
          }
        }
        const depth = 1 - star.z;
        const x = cx + (star.x - 0.5) * width * (0.2 + depth * 1.55);
        const y = cy + (star.y - 0.5) * height * (0.2 + depth * 1.45);
        const tint =
          star.tint > 0.82 ? "80, 220, 230" : star.tint > 0.64 ? "230, 80, 160" : "230, 226, 216";
        const alpha = depth * 0.75;
        if (!reduced.matches && depth > 0.62) {
          const dx = x - cx;
          const dy = y - cy;
          const mag = Math.hypot(dx, dy) || 1;
          const len = depth * depth * 28 * dpr;
          ctx.strokeStyle = `rgba(${tint}, ${alpha})`;
          ctx.lineWidth = Math.max(1, star.w * depth * dpr);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - (dx / mag) * len, y - (dy / mag) * len);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${tint}, ${alpha})`;
          const size = star.w * (0.5 + depth * 1.6) * dpr;
          ctx.fillRect(x, y, size, size);
        }
      }

      if (visible && tabActive && !reduced.matches) {
        raf = requestAnimationFrame(draw);
      }
    };

    const start = () => {
      cancelAnimationFrame(raf);
      if (visible && tabActive) {
        last = 0;
        raf = requestAnimationFrame(draw);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible) start();
        else cancelAnimationFrame(raf);
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    const onVis = () => {
      tabActive = document.visibilityState !== "hidden";
      if (tabActive) start();
      else cancelAnimationFrame(raf);
    };

    const onReduce = () => {
      cancelAnimationFrame(raf);
      if (!reduced.matches) start();
      else {
        last = 0;
        draw(performance.now());
      }
    };

    document.addEventListener("visibilitychange", onVis);
    reduced.addEventListener("change", onReduce);

    if (reduced.matches) {
      draw(0);
    } else {
      start();
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      reduced.removeEventListener("change", onReduce);
    };
  }, []);

  return <canvas ref={ref} className="cosmos-field" aria-hidden />;
}
