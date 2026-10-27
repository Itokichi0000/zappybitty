/**
 * Procedural chiptune background music. Everything is synthesised with Web
 * Audio, so there are no audio assets and nothing to license.
 *
 * Four 16-bar songs (pop, chill, upbeat, space). The player picks one, or
 * "auto" rotates through them every couple of minutes so long sessions don't
 * hear the same loop over and over. Zones transpose the song and nudge the
 * tempo so the soundtrack changes with the scenery.
 */

import { AUTO_ROTATE_SEC, nextAutoSong, type MusicTrack, type SongId } from "./soundSettings";

type Wave = OscillatorType;

interface ZoneFlavour {
  /** Semitone transposition of the whole loop. */
  transpose: number;
  bpm: number;
  /** Melody wave. */
  lead: Wave;
}

const FLAVOURS: ZoneFlavour[] = [
  { transpose: 0, bpm: 124, lead: "square" }, // shibuya
  { transpose: 2, bpm: 120, lead: "triangle" }, // sakura
  { transpose: -2, bpm: 118, lead: "triangle" }, // tower sunset
  { transpose: 3, bpm: 122, lead: "square" }, // bay
  { transpose: 5, bpm: 128, lead: "square" }, // akiba
  { transpose: -5, bpm: 132, lead: "sawtooth" }, // storm
  { transpose: 7, bpm: 112, lead: "triangle" }, // moon
  { transpose: 1, bpm: 130, lead: "square" }, // wall street
  { transpose: -3, bpm: 116, lead: "triangle" }, // london fog
  { transpose: 6, bpm: 134, lead: "sawtooth" }, // hong kong night
  { transpose: -4, bpm: 128, lead: "sawtooth" }, // volcano
  { transpose: 4, bpm: 120, lead: "triangle" }, // fuji dawn
  { transpose: -6, bpm: 124, lead: "square" }, // mars
  { transpose: 9, bpm: 138, lead: "sawtooth" }, // galaxy
];

const MASTER = 0.16;
const BEATS_PER_BAR = 4;
const BARS = 16;
const STEPS_PER_BEAT = 2; // eighth notes
const STEPS_PER_BAR = BEATS_PER_BAR * STEPS_PER_BEAT;

/**
 * One song of the soundtrack. Melodies are two 8-bar phrases of eighth notes
 * (0 = rest), MIDI numbers with 60 = C4; zones transpose them.
 */
interface Song {
  /** Multiplies the zone tempo. */
  bpmScale: number;
  /** Melody wave; unset = the zone's. */
  lead?: Wave;
  leadVol: number;
  /** Melody note length in eighth notes. */
  noteLen: number;
  chords: number[][];
  bass: number[];
  bassStyle: "walk" | "half" | "pump" | "long";
  harmony: "offbeat" | "pad" | "shimmer";
  drums: "pop" | "chill" | "upbeat" | "space";
  phraseA: number[];
  phraseB: number[];
}

const C = [60, 64, 67];
const F = [60, 65, 69];
const G = [59, 62, 67];
const AM = [57, 60, 64];

const SONG_DATA: Record<SongId, Song> = {
  // The original loop: bright I-V-vi-IV chiptune.
  pop: {
    bpmScale: 1,
    leadVol: 0.16,
    noteLen: 1.6,
    chords: [C, C, G, G, AM, AM, [57, 60, 65], [59, 62, 65]],
    bass: [48, 48, 43, 43, 45, 45, 41, 43],
    bassStyle: "walk",
    harmony: "offbeat",
    drums: "pop",
    phraseA: [
      72, 0, 74, 76, 0, 79, 76, 74, 72, 0, 0, 67, 69, 72, 0, 0, //
      71, 0, 74, 0, 79, 0, 74, 71, 72, 0, 69, 0, 67, 0, 0, 0, //
      69, 0, 72, 0, 76, 0, 72, 69, 67, 0, 69, 72, 0, 0, 74, 0, //
      65, 0, 69, 72, 0, 77, 76, 74, 72, 0, 74, 0, 71, 0, 0, 0,
    ],
    phraseB: [
      76, 0, 0, 79, 0, 0, 76, 74, 72, 74, 76, 0, 0, 0, 72, 0, //
      74, 0, 71, 0, 67, 0, 71, 74, 79, 0, 0, 0, 74, 0, 0, 0, //
      76, 72, 69, 0, 72, 76, 0, 0, 79, 0, 76, 0, 72, 0, 0, 0, //
      77, 0, 76, 0, 74, 0, 72, 0, 71, 0, 72, 0, 74, 0, 0, 0,
    ],
  },
  // Slow lo-fi: soft sine lead over seventh chords, laid-back drums.
  chill: {
    bpmScale: 0.72,
    lead: "sine",
    leadVol: 0.14,
    noteLen: 2.6,
    chords: [
      [53, 57, 60, 64],
      [53, 57, 60, 64],
      [52, 55, 59, 62],
      [52, 55, 59, 62],
      [50, 53, 57, 60],
      [50, 53, 57, 60],
      [48, 52, 55, 59],
      [43, 50, 53, 59],
    ],
    bass: [41, 41, 40, 40, 38, 38, 36, 43],
    bassStyle: "half",
    harmony: "pad",
    drums: "chill",
    phraseA: [
      76, 0, 0, 0, 74, 0, 72, 0, 0, 0, 69, 0, 0, 0, 0, 0, //
      74, 0, 0, 72, 0, 0, 71, 0, 67, 0, 0, 0, 0, 0, 0, 0, //
      72, 0, 0, 0, 69, 0, 65, 0, 0, 0, 67, 0, 69, 0, 0, 0, //
      71, 0, 0, 0, 72, 0, 74, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    phraseB: [
      81, 0, 0, 79, 0, 0, 76, 0, 0, 0, 77, 0, 76, 0, 0, 0, //
      74, 0, 0, 0, 76, 0, 79, 0, 0, 0, 0, 0, 0, 0, 0, 0, //
      77, 0, 0, 76, 0, 0, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0, //
      71, 0, 72, 0, 74, 0, 0, 0, 72, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  // Faster and bouncy: four-on-the-floor kick, pumping octave bass.
  upbeat: {
    bpmScale: 1.1,
    lead: "square",
    leadVol: 0.13,
    noteLen: 1.1,
    chords: [C, F, G, C, AM, F, G, G],
    bass: [48, 41, 43, 48, 45, 41, 43, 43],
    bassStyle: "pump",
    harmony: "offbeat",
    drums: "upbeat",
    phraseA: [
      72, 72, 79, 0, 76, 0, 72, 0, 77, 0, 76, 0, 74, 0, 72, 0, //
      74, 74, 79, 0, 74, 0, 71, 0, 72, 0, 0, 0, 67, 0, 0, 0, //
      69, 69, 72, 0, 76, 0, 72, 0, 77, 0, 81, 0, 79, 0, 77, 0, //
      76, 0, 74, 0, 72, 0, 71, 0, 74, 0, 0, 0, 79, 0, 0, 0,
    ],
    phraseB: [
      79, 0, 79, 81, 79, 0, 76, 0, 77, 0, 77, 79, 77, 0, 72, 0, //
      74, 0, 74, 76, 74, 0, 71, 0, 72, 0, 76, 0, 79, 0, 84, 0, //
      81, 0, 79, 0, 76, 0, 72, 0, 77, 0, 76, 0, 74, 0, 72, 0, //
      71, 0, 72, 0, 74, 0, 76, 0, 72, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  // Spacey and calm: long notes, a shimmering arpeggio, almost no drums.
  space: {
    bpmScale: 0.62,
    lead: "triangle",
    leadVol: 0.12,
    noteLen: 4,
    chords: [AM, [53, 57, 60], [55, 60, 64], [55, 59, 62], AM, [53, 57, 60], [52, 55, 59], [52, 56, 59]],
    bass: [45, 41, 48, 43, 45, 41, 40, 40],
    bassStyle: "long",
    harmony: "shimmer",
    drums: "space",
    phraseA: [
      76, 0, 0, 0, 0, 0, 0, 0, 72, 0, 0, 0, 77, 0, 0, 0, //
      79, 0, 0, 0, 0, 0, 76, 0, 74, 0, 0, 0, 0, 0, 0, 0, //
      72, 0, 0, 0, 76, 0, 0, 0, 77, 0, 0, 0, 0, 0, 81, 0, //
      79, 0, 0, 0, 76, 0, 0, 0, 80, 0, 0, 0, 0, 0, 0, 0,
    ],
    phraseB: [
      84, 0, 0, 0, 81, 0, 0, 0, 77, 0, 0, 0, 0, 0, 0, 0, //
      79, 0, 0, 0, 84, 0, 0, 0, 83, 0, 0, 0, 0, 0, 79, 0, //
      81, 0, 0, 0, 0, 0, 76, 0, 77, 0, 0, 0, 72, 0, 0, 0, //
      71, 0, 0, 0, 74, 0, 0, 0, 76, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
};

const midiToHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class Bgm {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: number | null = null;
  private nextStep = 0;
  private nextTime = 0;
  private flavour = FLAVOURS[0];
  private pendingFlavour: ZoneFlavour | null = null;
  private track: MusicTrack = "auto";
  private songId: SongId = nextAutoSong(null, Math.random);
  private pendingSong: SongId | null = null;
  /** Seconds of music scheduled since the current song started (auto rotation). */
  private songSeconds = 0;
  private volume = 1;
  private _enabled = true;
  private playing = false;

  /** Shares the (already unlocked) context with the sound effects. */
  attach(ctx: AudioContext): void {
    if (this.ctx === ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    // Silence in background tabs; the game itself pauses there too.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.fadeOut();
      else if (this.playing && this._enabled) this.startScheduler();
    });
    if (this.playing && this._enabled) this.startScheduler();
  }

  /** True while the scheduler is running (used by tests). */
  get isPlaying(): boolean {
    return this.timer !== null;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(on: boolean) {
    this._enabled = on;
    if (!on) this.fadeOut();
    else if (this.playing) this.startScheduler();
  }

  play(): void {
    this.playing = true;
    if (this._enabled) this.startScheduler();
  }

  /** The audio context came back (after an interruption): pick the music up again. */
  resume(): void {
    if (this.playing && this._enabled) this.startScheduler();
  }

  stop(): void {
    this.playing = false;
    this.fadeOut();
  }

  /** Currently playing song (tests and the settings panel). */
  get currentSong(): SongId {
    return this.songId;
  }

  /** A chosen song starts at the next bar; "auto" keeps the current one and rotates later. */
  setTrack(track: MusicTrack): void {
    this.track = track;
    if (track !== "auto" && track !== this.songId) this.pendingSong = track;
    if (track !== "auto" && track === this.songId) this.pendingSong = null;
  }

  /** Music volume multiplier (0..1). */
  setVolume(mul: number): void {
    this.volume = mul;
    if (this.ctx && this.master && this.timer !== null) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(MASTER * mul, this.ctx.currentTime, 0.2);
    }
  }

  /** Switch flavour at the next bar boundary. */
  setZone(index: number): void {
    const f = FLAVOURS[Math.min(index, FLAVOURS.length - 1)] ?? FLAVOURS[0];
    if (f !== this.flavour) this.pendingFlavour = f;
  }

  private startScheduler(): void {
    if (!this.ctx || !this.master || this.timer !== null) return;
    const ctx = this.ctx;
    if (ctx.state !== "running") return;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(MASTER * this.volume, ctx.currentTime, 0.4);
    this.nextTime = ctx.currentTime + 0.1;
    this.nextStep = 0;
    const tick = () => {
      const lookahead = 0.35;
      while (this.nextTime < ctx.currentTime + lookahead) {
        this.scheduleStep(this.nextStep, this.nextTime);
        const stepDur = this.stepDuration();
        this.nextTime += stepDur;
        this.songSeconds += stepDur;
        this.nextStep = (this.nextStep + 1) % (BARS * STEPS_PER_BAR);
        if (this.nextStep % STEPS_PER_BAR === 0) this.atBarLine();
      }
    };
    tick();
    this.timer = window.setInterval(tick, 120);
  }

  private get song(): Song {
    return SONG_DATA[this.songId];
  }

  private stepDuration(): number {
    return 60 / (this.flavour.bpm * this.song.bpmScale) / STEPS_PER_BEAT;
  }

  /** Bar line: apply a zone change, a chosen song, or the auto rotation. */
  private atBarLine(): void {
    if (this.pendingFlavour) {
      this.flavour = this.pendingFlavour;
      this.pendingFlavour = null;
    }
    if (!this.pendingSong && this.track === "auto" && this.songSeconds >= AUTO_ROTATE_SEC) {
      this.pendingSong = nextAutoSong(this.songId, Math.random);
    }
    if (this.pendingSong) {
      this.songId = this.pendingSong;
      this.pendingSong = null;
      this.songSeconds = 0;
      this.nextStep = 0;
    }
  }

  private fadeOut(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    }
  }

  private scheduleStep(step: number, t: number): void {
    if (!this.ctx || !this.master) return;
    const song = this.song;
    const bar = Math.floor(step / STEPS_PER_BAR);
    const inBar = step % STEPS_PER_BAR;
    const beat = Math.floor(inBar / STEPS_PER_BEAT);
    const stepDur = this.stepDuration();
    const tr = this.flavour.transpose;
    const chord = song.chords[bar % song.chords.length];
    const root = song.bass[bar % song.bass.length] + tr;

    // Melody: phrase A for bars 0-7, phrase B for bars 8-15.
    const phrase = bar < 8 ? song.phraseA : song.phraseB;
    const note = phrase[(bar % 8) * STEPS_PER_BAR + inBar];
    if (note) this.tone(song.lead ?? this.flavour.lead, midiToHz(note + tr), t, stepDur * song.noteLen, song.leadVol, 0.01);

    // Harmony, always quiet.
    if (song.harmony === "offbeat" && inBar % 2 === 1) {
      const n = chord[(inBar >> 1) % chord.length];
      this.tone("triangle", midiToHz(n + tr), t, stepDur * 1.2, 0.07, 0.02);
    } else if (song.harmony === "pad" && inBar === 0) {
      for (const n of chord) this.tone("sine", midiToHz(n + tr), t, stepDur * 7.5, 0.035, 0.3);
    } else if (song.harmony === "shimmer") {
      const n = chord[inBar % chord.length] + 12 * (Math.floor(inBar / chord.length) % 2);
      this.tone("triangle", midiToHz(n + tr + 12), t, stepDur * 1.5, 0.03, 0.02);
    }

    // Bass.
    if (song.bassStyle === "walk" && inBar % STEPS_PER_BEAT === 0) {
      const n = beat % 2 === 0 ? root : root + (bar % 4 === 3 ? 12 : 7);
      this.tone("triangle", midiToHz(n), t, stepDur * 1.8, 0.22, 0.01);
    } else if (song.bassStyle === "half" && (inBar === 0 || inBar === 4)) {
      this.tone("triangle", midiToHz(inBar === 0 ? root : root + 7), t, stepDur * 3.5, 0.2, 0.02);
    } else if (song.bassStyle === "pump") {
      this.tone("triangle", midiToHz(inBar % 2 === 0 ? root : root + 12), t, stepDur * 0.8, 0.17, 0.005);
    } else if (song.bassStyle === "long" && inBar === 0) {
      this.tone("triangle", midiToHz(root), t, stepDur * 7.5, 0.2, 0.08);
    }

    // Drums.
    if (song.drums === "pop") {
      if (inBar === 0 || inBar === 4) this.kick(t, 0.5);
      if (inBar === 2 || inBar === 6) this.snare(t, 0.18);
      this.hat(t, inBar % 2 === 0 ? 0.035 : 0.02);
    } else if (song.drums === "chill") {
      if (inBar === 0 || inBar === 3) this.kick(t, 0.38);
      if (inBar === 4) this.snare(t, 0.1);
      if (inBar % 2 === 0) this.hat(t, 0.015);
    } else if (song.drums === "upbeat") {
      if (inBar % 2 === 0) this.kick(t, 0.42);
      if (inBar === 2 || inBar === 6) this.snare(t, 0.16);
      this.hat(t, inBar % 2 === 1 ? 0.04 : 0.018);
    } else if (song.drums === "space" && inBar === 0 && bar % 2 === 0) {
      this.kick(t, 0.25);
    }
  }

  private tone(wave: Wave, freq: number, t: number, dur: number, vol: number, attack: number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private kick(t: number, vol: number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private noiseHit(t: number, dur: number, vol: number, cutoff: number, type: BiquadFilterType): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private snare(t: number, vol: number): void {
    this.noiseHit(t, 0.11, vol, 1800, "highpass");
  }

  private hat(t: number, vol: number): void {
    this.noiseHit(t, 0.04, vol, 7000, "highpass");
  }
}

export const bgm = new Bgm();
