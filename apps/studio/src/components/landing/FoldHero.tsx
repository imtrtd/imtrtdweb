import { useEffect, useRef } from "react";
import { Crystal } from "./Crystal";
import { LeadForm } from "./LeadForm";
import { SphereShell } from "./SphereShell";
import "../../styles/fold.css";

export function FoldHero() {
	const stageRef = useRef<HTMLElement>(null);
	const foldRef = useRef(0);

	useEffect(() => {
		const stage = stageRef.current;
		if (!stage) return;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
		let frame = 0;
		const apply = () => {
			if (reduce.matches) {
				foldRef.current = 1;
				stage.style.setProperty("--fold", "1");
				stage.dataset.open = "1";
				return;
			}
			const total = stage.offsetHeight - window.innerHeight;
			const raw = total <= 0 ? 0 : -stage.getBoundingClientRect().top / total;
			const next = Math.min(1, Math.max(0, raw / 0.68));
			foldRef.current = next;
			stage.style.setProperty("--fold", next.toFixed(4));
			stage.dataset.open = next > 0.62 ? "1" : "0";
		};
		const onScroll = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(apply);
		};
		apply();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		reduce.addEventListener("change", onScroll);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
			reduce.removeEventListener("change", onScroll);
		};
	}, []);

	return (
		<section ref={stageRef} id="brief" className="pulse-stage" data-open="0">
			<div className="pulse-pin">
				<div className="pulse-copy">
					<p className="eyebrow">// NEW WORK</p>
					<h1>
						<span>DIGITAL</span>
						<span className="outline glitch" data-text="EXPERIENCES">
							EXPERIENCES
						</span>
						<span>WITH A PULSE.</span>
					</h1>
					<p>
						I design and build expressive websites, interfaces and digital systems
						for independent studios, artists and small brands that refuse to look
						generic.
					</p>
				</div>
				<a
					className="round-link sphere-atom pulse-disc"
					href="#work"
					aria-label="Explore selected work"
				>
					<SphereShell />
					<span>
						EXPLORE
						<br />
						WORK
					</span>
					<b>↓</b>
				</a>
				<div className="pulse-figure" aria-hidden="true">
					<Crystal foldRef={foldRef} />
				</div>
				<div className="brief-panel">
					<p className="eyebrow">// BRIEF</p>
					<h2>Start with the brief.</h2>
					<LeadForm />
				</div>
			</div>
		</section>
	);
}
