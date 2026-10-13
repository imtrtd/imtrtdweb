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
	private root = 45;
	private noise: AudioBuffer | null = null;
	private readonly bassline = [0, -1, 0, 3, -1, 7, 0, -1, 0, 3, -1, 5, 7, -1, 3, 10];
	private running = false;
	private ducked = false;

	async start() {
		if (!this.ctx) {
			const ctx = new AudioContext();
			const master = ctx.createGain();
			master.gain.value = 0;
			const comp = ctx.createDynamicsCompressor();
			comp.threshold.value = -18;
			comp.ratio.value = 3;
			const filter = ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = 1600;
			filter.connect(comp);
			comp.connect(master);
			master.connect(ctx.destination);
			const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
			const data = noise.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
			this.noise = noise;
			this.ctx = ctx;
			this.master = master;
			this.filter = filter;
		}
		await this.ctx.resume();
		if (this.ctx.state !== "running") throw new Error("audio suspended");
		this.running = true;
		this.master!.gain.cancelScheduledValues(this.ctx.currentTime);
		this.master!.gain.linearRampToValueAtTime(this.ducked ? 0.0001 : 0.2, this.ctx.currentTime + 0.3);
		this.next = this.ctx.currentTime + 0.05;
		this.pump();
	}

	mute() {
		if (!this.ctx || !this.master) return;
		this.running = false;
		window.clearTimeout(this.timer);
		this.master.gain.cancelScheduledValues(this.ctx.currentTime);
		this.master.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.12);
	}

	duck(on: boolean) {
		this.ducked = on;
		if (!this.ctx || !this.master || !this.running) return;
		this.master.gain.cancelScheduledValues(this.ctx.currentTime);
		this.master.gain.linearRampToValueAtTime(on ? 0.0001 : 0.2, this.ctx.currentTime + 0.2);
	}

	private pump = () => {
		if (!this.ctx || !this.running) return;
		const step = 60 / 140 / 4;
		while (this.next < this.ctx.currentTime + 0.12) {
			const beat = this.step % 16;
			const time = this.next;
			if (beat % 4 === 0) {
				this.kick(time);
				window.dispatchEvent(new CustomEvent("imtrtd-pulse"));
			}
			if (beat % 2 === 1) this.burst(time, beat === 7 || beat === 15 ? 0.04 : 0.025, beat === 15 ? 0.07 : 0.028, 7200);
			if (beat === 4 || beat === 12) this.burst(time, 0.05, 0.08, 1200);
			const note = this.bassline[beat];
			if (note >= 0) this.tone(this.root + note, 0.1, "sawtooth", 0.04, time, true);
			if (beat === 0 && this.step % 32 === 0) {
				this.tone(this.root + 24, 0.16, "square", 0.028, time, true);
				this.tone(this.root + 27, 0.16, "square", 0.018, time, true);
			}
			this.step += 1;
			this.next += step;
		}
		this.timer = window.setTimeout(this.pump, 25);
	};

	private tone(note: number, dur: number, type: OscillatorType, level: number, time: number, filtered: boolean) {
		if (!this.ctx || !this.master) return;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = type;
		osc.frequency.value = midi(note);
		const start = Math.max(time, this.ctx.currentTime);
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(level, start + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
		osc.connect(gain);
		gain.connect(filtered && this.filter ? this.filter : this.master);
		osc.start(start);
		osc.stop(start + dur + 0.02);
	}

	private kick(time: number) {
		if (!this.ctx || !this.master) return;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(158, time);
		osc.frequency.exponentialRampToValueAtTime(44, time + 0.08);
		gain.gain.setValueAtTime(0.24, time);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
		osc.connect(gain);
		gain.connect(this.master);
		osc.start(time);
		osc.stop(time + 0.17);
	}

	private burst(time: number, level: number, dur: number, freq: number) {
		if (!this.ctx || !this.master || !this.noise) return;
		const src = this.ctx.createBufferSource();
		const filter = this.ctx.createBiquadFilter();
		const gain = this.ctx.createGain();
		src.buffer = this.noise;
		filter.type = "highpass";
		filter.frequency.value = freq;
		gain.gain.setValueAtTime(level, time);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
		src.connect(filter);
		filter.connect(gain);
		gain.connect(this.master);
		src.start(time);
		src.stop(time + dur + 0.02);
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
			{on ? "RAVE ON" : "RAVE"}
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
