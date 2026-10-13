import { useEffect, useState } from "react";

function midi(note: number) {
	return 440 * 2 ** ((note - 69) / 12);
}

class Score {
	private ctx: AudioContext | null = null;
	private master: GainNode | null = null;
	private filter: BiquadFilterNode | null = null;
	private timer = 0;
	private next = 0;
	private step = 0;
	private root = 62;
	private readonly phrase = [0, 3, 7, 10, 7, 5, 3, 0, 0, 5, 7, 12, 10, 7, 5, 3];
	private running = false;
	private ducked = false;

	async start() {
		if (!this.ctx) {
			const ctx = new AudioContext();
			const master = ctx.createGain();
			master.gain.value = 0;
			const filter = ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = 900;
			filter.connect(master);
			master.connect(ctx.destination);
			this.ctx = ctx;
			this.master = master;
			this.filter = filter;
		}
		await this.ctx.resume();
		if (this.ctx.state !== "running") throw new Error("audio suspended");
		this.running = true;
		this.master!.gain.cancelScheduledValues(this.ctx.currentTime);
		this.master!.gain.linearRampToValueAtTime(this.ducked ? 0.0001 : 0.2, this.ctx.currentTime + 1.1);
		this.next = this.ctx.currentTime + 0.08;
		this.pump();
	}

	mute() {
		if (!this.ctx || !this.master) return;
		this.running = false;
		window.clearTimeout(this.timer);
		this.master.gain.cancelScheduledValues(this.ctx.currentTime);
		this.master.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);
	}

	duck(on: boolean) {
		this.ducked = on;
		if (!this.ctx || !this.master || !this.running) return;
		this.master.gain.cancelScheduledValues(this.ctx.currentTime);
		this.master.gain.linearRampToValueAtTime(on ? 0.0001 : 0.2, this.ctx.currentTime + 0.3);
	}

	private pump = () => {
		if (!this.ctx || !this.running) return;
		const step = 60 / 52;
		while (this.next < this.ctx.currentTime + 0.45) {
			const note = this.root + this.phrase[this.step % 16];
			this.tone(note, 2.6, "triangle", 0.045, this.next, true);
			if (this.step % 8 === 0) {
				this.tone(this.root - 24, 7.5, "sine", 0.05, this.next, false);
				window.dispatchEvent(new CustomEvent("imtrtd-pulse"));
			}
			if (this.step % 16 === 4 || this.step % 16 === 12) this.tone(note + 12, 3.4, "sine", 0.018, this.next, true);
			this.step += 1;
			this.next += step;
		}
		this.timer = window.setTimeout(this.pump, 80);
	};

	private tone(note: number, dur: number, type: OscillatorType, level: number, time: number, filtered: boolean) {
		if (!this.ctx || !this.master) return;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = type;
		osc.frequency.value = midi(note);
		const start = Math.max(time, this.ctx.currentTime);
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(level, start + 0.08);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
		osc.connect(gain);
		gain.connect(filtered && this.filter ? this.filter : this.master);
		osc.start(start);
		osc.stop(start + dur + 0.05);
	}
}

const score = new Score();
let live = false;
const listeners = new Set<(on: boolean) => void>();

function setLive(on: boolean) {
	live = on;
	listeners.forEach((listener) => listener(on));
}

export async function playDrift() {
	await score.start();
	setLive(true);
}

export function stopDrift() {
	score.mute();
	setLive(false);
}

export function DriftToggle() {
	const [on, setOn] = useState(live);
	useEffect(() => {
		const listen = (value: boolean) => setOn(value);
		listeners.add(listen);
		return () => {
			listeners.delete(listen);
		};
	}, []);
	return (
		<button
			className={on ? "drift-toggle is-on" : "drift-toggle"}
			type="button"
			data-drift
			aria-pressed={on}
			onClick={() => {
				if (live) stopDrift();
				else void playDrift().catch(() => setLive(false));
			}}
		>
			{on ? "DRIFT ON" : "DRIFT"}
		</button>
	);
}

export function DriftBed() {
	useEffect(() => {
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const arm = (event: PointerEvent) => {
			const target = event.target as HTMLElement | null;
			if (target?.closest?.("[data-drift], .pulse-toggle")) return;
			if (reduced || live || document.body.classList.contains("pulse-on")) return;
			void playDrift().catch(() => setLive(false));
		};
		const watch = new MutationObserver(() => {
			score.duck(document.body.classList.contains("pulse-on"));
		});
		watch.observe(document.body, { attributes: true, attributeFilter: ["class"] });
		window.addEventListener("pointerdown", arm);
		return () => {
			window.removeEventListener("pointerdown", arm);
			watch.disconnect();
		};
	}, []);
	return null;
}
