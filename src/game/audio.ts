import { bgm } from "./bgm";
import type { FlapSound } from "./soundSettings";

/**
 * Minimal sfxr-style sound synthesiser on top of Web Audio.
 * Every effect is generated procedurally, so there are no audio assets to license.
 */

type Wave = OscillatorType;

interface ToneSpec {
  wave: Wave;
  /** Start frequency (Hz). */
  freq: number;
  /** End frequency (Hz); the tone glides there over the duration. */
  freqEnd?: number;
  /** Total duration in seconds. */
  duration: number;
  /** Peak gain 0..1. */
  volume?: number;
  /** Attack time in seconds. */
  attack?: number;
  /** Start offset in seconds. */
  delay?: number;
}

interface NoiseSpec {
  duration: number;
  volume?: number;
  /** Low-pass cutoff (Hz). */
  cutoff?: number;
  delay?: number;
}

const MASTER_GAIN = 0.35;

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private volume = 1;
  muted = false;
  /** What a flap sounds like (settings). */
  flapStyle: FlapSound = "classic";

  /** Effects volume multiplier (0..1). */
  setVolume(mul: number): void {
    this.volume = mul;
    if (this.master) this.master.gain.value = MASTER_GAIN * mul;
  }

  /** Must be called from a user gesture (pointerdown / keydown) once. */
  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_GAIN * this.volume;
      this.master.connect(this.ctx.destination);
    }
    const ctx = this.ctx;
    // iOS reports "interrupted" (not "suspended") after switching apps or a call: resume
    // from any non-running state, then restart the music that was playing before.
    if (ctx.state !== "running") {
      void ctx
        .resume()
        .then(() => {
          bgm.attach(ctx);
          bgm.resume();
        })
        .catch(() => {
          /* still not allowed: the next gesture tries again */
        });
    } else {
      bgm.attach(ctx);
    }
  }

  private get ready(): boolean {
    return !this.muted && !!this.ctx && !!this.master && this.ctx.state === "running";
  }

  private tone(spec: ToneSpec): void {
    if (!this.ready || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + (spec.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.wave;
    osc.frequency.setValueAtTime(spec.freq, t0);
    if (spec.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, spec.freqEnd), t0 + spec.duration);
    }
    const peak = spec.volume ?? 0.5;
    const attack = spec.attack ?? 0.005;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + spec.duration + 0.02);
  }

  private noise(spec: NoiseSpec): void {
    if (!this.ready || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    if (!this.noiseBuffer) {
      const length = ctx.sampleRate;
      this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime + (spec.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = spec.cutoff ?? 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(spec.volume ?? 0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + spec.duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
    src.stop(t0 + spec.duration + 0.02);
  }

  /**
   * The flap, in the chosen style. Every flap is pitched slightly differently
   * (about ±5 %), so hundreds of them in a row don't sound like one sound on repeat.
   */
  flap(): void {
    const v = 1 + (Math.random() - 0.5) * 0.1;
    switch (this.flapStyle) {
      case "none":
        return;
      case "soft": // ふわっ
        this.tone({ wave: "triangle", freq: 300 * v, freqEnd: 540 * v, duration: 0.09, volume: 0.3, attack: 0.015 });
        return;
      case "pop": // ぽっ
        this.tone({ wave: "sine", freq: 760 * v, freqEnd: 380 * v, duration: 0.07, volume: 0.42 });
        return;
      case "wing": // ぱたっ
        this.noise({ duration: 0.06, volume: 0.32, cutoff: 2200 * v });
        return;
      default: // ぴょん
        this.tone({ wave: "square", freq: 420 * v, freqEnd: 880 * v, duration: 0.09, volume: 0.35 });
    }
  }

  /** Two-note "coin" blip. */
  score(): void {
    this.tone({ wave: "square", freq: 1046, duration: 0.07, volume: 0.3 });
    this.tone({ wave: "square", freq: 1568, duration: 0.16, volume: 0.3, delay: 0.07 });
  }

  /** Crash: noise burst plus a falling saw. */
  hit(): void {
    this.noise({ duration: 0.25, volume: 0.6, cutoff: 900 });
    this.tone({ wave: "sawtooth", freq: 260, freqEnd: 40, duration: 0.35, volume: 0.45 });
  }

  /** UI click. */
  click(): void {
    this.tone({ wave: "square", freq: 740, freqEnd: 620, duration: 0.05, volume: 0.25 });
  }

  /** Short rising arpeggio when a new zone starts. */
  zone(): void {
    [523, 659, 784, 1047].forEach((freq, i) =>
      this.tone({ wave: "square", freq, duration: 0.14, volume: 0.28, delay: i * 0.08 }),
    );
  }

  /** Two quick beeps: something dangerous is about to appear. */
  warning(): void {
    this.tone({ wave: "square", freq: 880, duration: 0.06, volume: 0.25 });
    this.tone({ wave: "square", freq: 880, duration: 0.06, volume: 0.25, delay: 0.13 });
  }

  /** Wind gust whoosh. */
  gust(): void {
    this.noise({ duration: 0.4, volume: 0.35, cutoff: 700 });
  }

  /** Coin pickup blip. */
  coin(): void {
    this.tone({ wave: "square", freq: 1318, duration: 0.05, volume: 0.22 });
    this.tone({ wave: "square", freq: 1760, duration: 0.09, volume: 0.22, delay: 0.05 });
  }

  /** Item pickup chime. */
  item(): void {
    [660, 880, 1320].forEach((freq, i) =>
      this.tone({ wave: "triangle", freq, duration: 0.12, volume: 0.3, delay: i * 0.06 }),
    );
  }

  /** The HODL shield absorbed a hit. */
  shieldBreak(): void {
    this.noise({ duration: 0.18, volume: 0.4, cutoff: 2400 });
    this.tone({ wave: "triangle", freq: 520, freqEnd: 180, duration: 0.25, volume: 0.3 });
  }

  /** Rocket ignition. */
  rocket(): void {
    this.noise({ duration: 0.6, volume: 0.35, cutoff: 1500 });
    this.tone({ wave: "sawtooth", freq: 120, freqEnd: 420, duration: 0.5, volume: 0.25 });
  }

  /** Fanfare for a new best score. */
  newBest(): void {
    const notes = [784, 988, 1175, 1568];
    notes.forEach((freq, i) =>
      this.tone({ wave: "triangle", freq, duration: 0.18, volume: 0.35, delay: i * 0.09 }),
    );
  }
}

export const sfx = new Sfx();
