"use client";

import { useEffect, useRef, useState } from "react";

const BPM = 174;

export function PulseControl() {
  const [on, setOn] = useState(false);
  const engine = useRef<PulseEngine | null>(null);

  useEffect(() => {
    return () => {
      engine.current?.stop();
      document.body.classList.remove("pulse-on", "is-glitching");
    };
  }, []);

  const toggle = async () => {
    if (on) {
      engine.current?.stop();
      engine.current = null;
      document.body.classList.remove("pulse-on", "is-glitching");
      setOn(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = new PulseEngine();
    engine.current = next;
    await next.start();
    document.body.classList.add("pulse-on");
    setOn(true);
  };

  return (
    <button
      className={on ? "pulse-toggle is-on" : "pulse-toggle"}
      type="button"
      aria-pressed={on}
      aria-label={on ? "Mute pulse" : "Play drum and bass pulse"}
      onClick={toggle}
    >
      <i />
      {on ? "PULSE ON" : "PULSE"}
    </button>
  );
}

class PulseEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drums: GainNode | null = null;
  private bassBus: GainNode | null = null;
  private space: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer = 0;
  private next = 0;
  private step = 0;

  async start() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    if (ctx.state === "suspended") await ctx.resume();
    this.noise = this.makeNoise(ctx);

    const master = ctx.createGain();
    master.gain.value = 0.22;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 8;
    compressor.ratio.value = 4.2;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.16;

    const drums = ctx.createGain();
    drums.gain.value = 1;
    const bassBus = ctx.createGain();
    bassBus.gain.value = 0.2;
    const crush = this.makeShaper(ctx, 7);
    const space = ctx.createGain();
    space.gain.value = 0.28;

    const eighth = 60 / BPM / 2;
    const delayA = ctx.createDelay();
    delayA.delayTime.value = eighth;
    const delayAGain = ctx.createGain();
    delayAGain.gain.value = 0.22;
    const delayAFilter = ctx.createBiquadFilter();
    delayAFilter.type = "lowpass";
    delayAFilter.frequency.value = 2800;
    delayAFilter.Q.value = 0.7;

    const delayB = ctx.createDelay();
    delayB.delayTime.value = eighth * 1.5;
    const delayBGain = ctx.createGain();
    delayBGain.gain.value = 0.14;
    const delayBFilter = ctx.createBiquadFilter();
    delayBFilter.type = "highpass";
    delayBFilter.frequency.value = 420;

    drums.connect(compressor);
    bassBus.connect(crush).connect(compressor);
    space.connect(delayA).connect(delayAFilter).connect(delayAGain).connect(compressor);
    delayAGain.connect(delayB).connect(delayBFilter).connect(delayBGain).connect(compressor);
    compressor.connect(master);
    master.connect(ctx.destination);

    this.master = master;
    this.drums = drums;
    this.bassBus = bassBus;
    this.space = space;
    this.next = ctx.currentTime + 0.06;
    this.step = 0;
    this.timer = window.setInterval(() => this.schedule(), 20);
  }

  stop() {
    window.clearInterval(this.timer);
    const ctx = this.ctx;
    const master = this.master;
    if (ctx && master) {
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      } catch {
        /* already closing */
      }
      window.setTimeout(() => void ctx.close(), 100);
    }
    this.ctx = null;
    this.master = null;
    this.drums = null;
    this.bassBus = null;
    this.space = null;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.drums || !this.bassBus) return;
    const sixteenth = 60 / BPM / 4;
    const horizon = ctx.currentTime + 0.14;
    while (this.next < horizon) {
      const beat = this.step % 16;
      const bar = Math.floor(this.step / 16) % 4;
      const swing = beat % 2 === 1 ? sixteenth * 0.06 : 0;
      const t = this.next + swing;

      this.hat(t, beat % 2 === 0 ? 0.07 : 0.034, beat === 14);
      if (beat === 3 || beat === 11) this.hat(t, 0.09, false);

      if (beat === 0 || beat === 10) this.kick(t);
      if (beat === 6 && (bar === 1 || bar === 3)) this.kick(t, 0.72);

      if (beat === 4 || beat === 12) this.snare(t, 0.62);
      if (beat === 2 || beat === 6 || beat === 9 || beat === 14) this.snare(t, beat === 14 ? 0.16 : 0.09, true);
      if (beat === 7 && bar % 2 === 1) this.snare(t, 0.2, true);
      if (beat === 11 && bar === 3) this.snare(t, 0.14, true);

      if (beat === 0) this.bass(t, bar % 2 === 0 ? 55 : 41.2, 0.72);
      if (beat === 8) this.bass(t, bar === 3 ? 73.4 : 82.4, 0.32);
      if (beat === 12 && bar === 1) this.bass(t, 110, 0.18);

      if (beat === 14 && bar % 2 === 1) {
        this.glitch(t);
        this.flash();
      }

      this.next += sixteenth;
      this.step += 1;
    }
  }

  private flash() {
    document.body.classList.add("is-glitching");
    window.setTimeout(() => document.body.classList.remove("is-glitching"), 180);
  }

  private kick(time: number, volume = 1) {
    const ctx = this.ctx;
    const out = this.drums;
    const bass = this.bassBus;
    if (!ctx || !out) return;

    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = "sine";
    body.frequency.setValueAtTime(198, time);
    body.frequency.exponentialRampToValueAtTime(52, time + 0.046);
    body.frequency.exponentialRampToValueAtTime(34, time + 0.22);
    bodyGain.gain.setValueAtTime(1.15 * volume, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    body.connect(bodyGain).connect(out);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(78, time);
    sub.frequency.exponentialRampToValueAtTime(36, time + 0.24);
    subGain.gain.setValueAtTime(0.9 * volume, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
    sub.connect(subGain).connect(out);

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = "square";
    click.frequency.value = 1180;
    clickGain.gain.setValueAtTime(0.16 * volume, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.018);
    click.connect(clickGain).connect(out);

    if (this.noise) {
      const snap = ctx.createBufferSource();
      snap.buffer = this.noise;
      const snapFilter = ctx.createBiquadFilter();
      snapFilter.type = "highpass";
      snapFilter.frequency.value = 2400;
      const snapGain = ctx.createGain();
      snapGain.gain.setValueAtTime(0.22 * volume, time);
      snapGain.gain.exponentialRampToValueAtTime(0.001, time + 0.028);
      snap.connect(snapFilter).connect(snapGain).connect(out);
      snap.start(time);
      snap.stop(time + 0.04);
    }

    if (bass) {
      bass.gain.cancelScheduledValues(time);
      bass.gain.setValueAtTime(0.06, time);
      bass.gain.exponentialRampToValueAtTime(0.2, time + 0.14);
    }

    body.start(time);
    body.stop(time + 0.3);
    sub.start(time);
    sub.stop(time + 0.34);
    click.start(time);
    click.stop(time + 0.025);
  }

  private snare(time: number, volume: number, ghost = false) {
    const ctx = this.ctx;
    const out = this.drums;
    if (!ctx || !out || !this.noise) return;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = ghost ? 3200 : 2100;
    filter.Q.value = ghost ? 0.7 : 0.95;
    const gain = ctx.createGain();
    const decay = ghost ? 0.07 : 0.16;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
    noise.connect(filter).connect(gain).connect(out);
    if (this.space) gain.connect(this.space);

    const tone = ctx.createOscillator();
    const toneGain = ctx.createGain();
    tone.type = "triangle";
    tone.frequency.setValueAtTime(ghost ? 240 : 178, time);
    tone.frequency.exponentialRampToValueAtTime(ghost ? 160 : 118, time + 0.08);
    toneGain.gain.setValueAtTime(volume * (ghost ? 0.18 : 0.42), time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + (ghost ? 0.06 : 0.11));
    tone.connect(toneGain).connect(out);

    noise.start(time);
    noise.stop(time + decay + 0.02);
    tone.start(time);
    tone.stop(time + 0.14);
  }

  private hat(time: number, volume: number, open: boolean) {
    const ctx = this.ctx;
    const out = this.drums;
    if (!ctx || !out || !this.noise) return;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = open ? 6200 : 8200;
    const gain = ctx.createGain();
    const decay = open ? 0.12 : 0.032;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
    noise.connect(filter).connect(gain).connect(out);
    if (open && this.space) gain.connect(this.space);
    noise.start(time);
    noise.stop(time + decay + 0.01);
  }

  private bass(time: number, freq: number, length: number) {
    const ctx = this.ctx;
    const out = this.bassBus;
    if (!ctx || !out) return;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 11;
    filter.frequency.setValueAtTime(780, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.34, time + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, time + length);

    const voices: OscillatorNode[] = [];
    const ratios = [1, 1.007, 0.993, 0.5];
    const types: OscillatorType[] = ["sawtooth", "sawtooth", "sawtooth", "square"];
    ratios.forEach((ratio, index) => {
      const osc = ctx.createOscillator();
      osc.type = types[index];
      osc.frequency.value = freq * ratio;
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = index === 3 ? 0.22 : 0.28;
      osc.connect(voiceGain).connect(filter);
      voices.push(osc);
    });

    filter.connect(gain).connect(out);
    voices.forEach((osc) => {
      osc.start(time);
      osc.stop(time + length + 0.03);
    });
  }

  private glitch(time: number) {
    for (let i = 0; i < 7; i += 1) {
      const t = time + i * 0.018;
      this.hat(t, 0.11, i === 5);
      if (i % 2 === 0) this.snare(t, 0.14, true);
    }
  }

  private makeNoise(ctx: AudioContext) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.96 + white * 0.04;
      data[i] = white * 0.72 + last * 0.28;
    }
    return buffer;
  }

  private makeShaper(ctx: AudioContext, amount: number) {
    const curve = new Float32Array(256);
    for (let i = 0; i < curve.length; i += 1) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
    }
    const node = ctx.createWaveShaper();
    node.curve = curve;
    node.oversample = "2x";
    return node;
  }
}
