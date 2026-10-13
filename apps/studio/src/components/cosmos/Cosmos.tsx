import { useEffect, useRef } from "react";

type Star = { x: number; y: number; z: number; w: number };

export function Cosmos() {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const stars: Star[] = Array.from({ length: 140 }, () => ({
			x: Math.random(),
			y: Math.random(),
			z: Math.random(),
			w: 0.4 + Math.random() * 1.1,
		}));
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
		let running = true;
		let raf = 0;
		const draw = () => {
			if (!running) return;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const width = Math.max(2, Math.round(window.innerWidth * dpr));
			const height = Math.max(2, Math.round(window.innerHeight * dpr));
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
			}
			ctx.fillStyle = "#05060a";
			ctx.fillRect(0, 0, width, height);
			const drift = reduced.matches ? 0 : 0.00055;
			for (const star of stars) {
				star.z -= drift;
				if (star.z < 0.04) {
					star.z = 1;
					star.x = Math.random();
					star.y = Math.random();
				}
				const depth = 1 - star.z;
				const x = width * 0.5 + (star.x - 0.5) * width * (0.35 + depth * 1.15);
				const y = height * 0.5 + (star.y - 0.5) * height * (0.35 + depth * 1.15);
				ctx.fillStyle = `rgba(236, 232, 224, ${depth * 0.55})`;
				ctx.fillRect(x, y, star.w * (0.6 + depth * 1.6) * dpr, star.w * (0.6 + depth * 1.6) * dpr);
			}
			raf = requestAnimationFrame(draw);
		};
		reduced.addEventListener("change", () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(draw);
		});
		raf = requestAnimationFrame(draw);
		return () => {
			running = false;
			cancelAnimationFrame(raf);
		};
	}, []);

	return <canvas ref={ref} className="cosmos-field" aria-hidden />;
}
