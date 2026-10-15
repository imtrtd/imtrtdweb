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
	private root = 33;
	private noise: AudioBuffer | null = null;
	private readonly bassline = [-1, -1, 0, -1, -1, -1, 0, -1, -1, -1, 3, -1, -1, -1, -2, -1];
	private running = false;
	private ducked = false;
	private sleep = 0;

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
			filter.frequency.value = 480;
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
		window.clearTimeout(this.sleep);
		await this.ctx.resume();
		if (this.ctx.state !== "running") throw new Error("audio suspended");
		if (this.running) return;
		this.running = true;
		this.ducked = document.body.classList.contains("pulse-on");
		const gain = this.master!.gain;
		gain.cancelScheduledValues(this.ctx.currentTime);
		gain.setValueAtTime(Math.max(gain.value, 0.0001), this.ctx.currentTime);
		gain.linearRampToValueAtTime(this.ducked ? 0.0001 : 0.2, this.ctx.currentTime + 0.3);
		this.next = this.ctx.currentTime + 0.05;
		this.pump();
	}

	mute() {
		if (!this.ctx || !this.master) return;
		this.running = false;
		window.clearTimeout(this.timer);
		this.master.gain.cancelScheduledValues(this.ctx.currentTime);
		this.master.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.12);
		const ctx = this.ctx;
		window.clearTimeout(this.sleep);
		this.sleep = window.setTimeout(() => {
			if (!this.running && ctx.state === "running") void ctx.suspend();
		}, 200);
	}

	duck(on: boolean) {
		this.ducked = on;
		if (!this.ctx || !this.master || !this.running) return;
		this.master.gain.cancelScheduledValues(this.ctx.currentTime);
		this.master.gain.linearRampToValueAtTime(on ? 0.0001 : 0.2, this.ctx.currentTime + 0.2);
	}

	private pump = () => {
		if (!this.ctx || !this.running) return;
		const step = 60 / 138 / 4;
		if (this.next < this.ctx.currentTime - 0.04) this.next = this.ctx.currentTime + 0.03;
		try {
			let guard = 0;
			while (this.next < this.ctx.currentTime + 0.16 && guard < 8) {
				const beat = this.step % 16;
				const time = Math.max(this.next, this.ctx.currentTime + 0.008);
				if (beat % 4 === 0) {
					this.kick(time);
					window.dispatchEvent(new CustomEvent("imtrtd-pulse"));
				}
				if (beat === 4 || beat === 12) this.burst(time + 0.012, 0.032, 0.1, 1800);
				if (beat === 2 || beat === 6 || beat === 10 || beat === 14) {
					this.burst(time, beat === 14 ? 0.02 : 0.012, beat === 14 ? 0.08 : 0.03, 6500);
				}
				const note = this.bassline[beat];
				if (note !== -1) this.tone(this.root + note, 0.22, "sawtooth", 0.07, time, true);
				if (beat === 0 && this.step % 64 === 0) {
					this.tone(this.root + 24, 0.28, "triangle", 0.02, time, false);
					this.tone(this.root + 27, 0.28, "triangle", 0.014, time, false);
				}
				this.step += 1;
				this.next += step;
				guard += 1;
			}
		} catch {
			this.next = this.ctx.currentTime + step;
		}
		this.timer = window.setTimeout(this.pump, 40);
	};

	private tone(note: number, dur: number, type: OscillatorType, level: number, time: number, filtered: boolean) {
		if (!this.ctx || !this.master) return;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = type;
		osc.frequency.value = midi(note);
		const start = Math.max(time, this.ctx.currentTime + 0.005);
		const attack = Math.min(0.012, dur * 0.3);
		const end = start + Math.max(dur, attack + 0.03);
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(level, start + attack);
		gain.gain.exponentialRampToValueAtTime(0.0001, end);
		osc.connect(gain);
		gain.connect(filtered && this.filter ? this.filter : this.master);
		osc.start(start);
		osc.stop(end + 0.02);
	}

	private kick(time: number) {
		if (!this.ctx || !this.master) return;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = "sine";
		const start = Math.max(time, this.ctx.currentTime + 0.005);
		osc.frequency.setValueAtTime(148, start);
		osc.frequency.exponentialRampToValueAtTime(41, start + 0.08);
		gain.gain.setValueAtTime(0.28, start);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
		osc.connect(gain);
		gain.connect(this.master);
		osc.start(start);
		osc.stop(start + 0.2);
	}

	private burst(time: number, level: number, dur: number, freq: number) {
		if (!this.ctx || !this.master || !this.noise) return;
		const src = this.ctx.createBufferSource();
		const filter = this.ctx.createBiquadFilter();
		const gain = this.ctx.createGain();
		src.buffer = this.noise;
		filter.type = "highpass";
		filter.frequency.value = freq;
		const start = Math.max(time, this.ctx.currentTime + 0.005);
		gain.gain.setValueAtTime(level, start);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
		src.connect(filter);
		filter.connect(gain);
		gain.connect(this.master);
		src.start(start);
		src.stop(start + dur + 0.02);
	}
}

const score = new Score();
let live = false;
let muted = (() => {
	try {
		return sessionStorage.getItem("imtrtd-drift-muted") === "1";
	} catch {
		return false;
	}
})();
const listeners = new Set<(on: boolean) => void>();

function setLive(on: boolean) {
	live = on;
	listeners.forEach((listener) => listener(on));
}

function setMuted(on: boolean) {
	muted = on;
	try {
		if (on) sessionStorage.setItem("imtrtd-drift-muted", "1");
		else sessionStorage.removeItem("imtrtd-drift-muted");
	} catch {
		// storage unavailable
	}
}

export async function playDrift(user = true) {
	if (user) setMuted(false);
	await score.start();
	if (muted) {
		score.mute();
		setLive(false);
		return;
	}
	setLive(true);
}

export function stopDrift(user = true) {
	if (user) setMuted(true);
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
			if (reduced || muted || document.body.classList.contains("pulse-on")) return;
			if (live) {
				window.removeEventListener("pointerdown", arm);
				return;
			}
			void playDrift(false)
				.then(() => window.removeEventListener("pointerdown", arm))
				.catch(() => setLive(false));
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
