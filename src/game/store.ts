import { create } from "zustand";
import { gameConfig, type Locale } from "@/config/game";
import { COSMETICS, CONTINUE_PRICE, type CosmeticSlot, type ItemKind } from "@/config/economy";
import { EMPTY_STATS, mergeRunStats, newlyUnlocked, type AchievementDef, type PlayerStats, type RunStats } from "@/config/achievements";
import { bgm } from "./bgm";
import { sfx } from "./audio";
import { DEFAULT_SOUND, LEVEL_GAIN, type SoundSettings } from "./soundSettings";
import {
  detectLocale,
  loadBestScore,
  loadEquipped,
  loadJson,
  loadLocale,
  loadMusic,
  loadSound,
  loadMuted,
  loadOwned,
  loadReachedZone,
  loadSats,
  loadStringList,
  saveJson,
  saveMusic,
  saveSound,
  STORAGE_KEYS,
  saveBestScore,
  saveEquipped,
  saveLocale,
  saveMuted,
  saveOwned,
  saveReachedZone,
  saveSats,
  type Equipped,
} from "@/lib/storage";
import { ZONES } from "./zones";

/**
 * Game phases. Phaser drives most transitions; React overlays render per phase.
 *
 *  loading  – Phaser is booting / assets loading
 *  menu     – start screen (world idles behind the overlay)
 *  ready    – bird is placed, waiting for the first tap
 *  playing  – physics running
 *  paused   – tab was hidden mid-run; waiting for a tap to resume
 *  dying    – crash animation
 *  gameover – results overlay
 */
export type Phase = "loading" | "menu" | "ready" | "playing" | "paused" | "dying" | "gameover";

/** Where the Phaser canvas sits on the page, so DOM overlays can line up with it. */
export interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
  gameWidth: number;
  gameHeight: number;
  /** CSS pixels per logical game pixel. */
  scale: number;
}

/** Per-run counters folded into the lifetime stats at game over. */
export type { RunStats };

export interface GameState {
  phase: Phase;
  score: number;
  best: number;
  isNewBest: boolean;
  locale: Locale;
  muted: boolean;
  viewport: Viewport;
  hydrated: boolean;

  /** Zone the bird is currently flying through. */
  zoneIndex: number;
  /** Zone the current run started in (stage select); points count from 0 in every case. */
  runStartZone: number;
  /** Highest zone ever reached on this device (unlocks stage select). */
  reachedZone: number;
  /** Practice runs don't touch the best score and can't be submitted. */
  practice: boolean;
  /** Bumped whenever the "ZONE n" banner should play. */
  bannerSeq: number;

  /** In-game sats balance (never real bitcoin). */
  sats: number;
  /** Sats collected in the current run. */
  runSats: number;
  /** Item currently active in the run (for the HUD / shop previews). */
  activeItem: ItemKind | null;
  /** Cosmetic ids the player owns and what is equipped. */
  owned: string[];
  equipped: Equipped;

  /** The current run has already used its one continue. */
  continueUsed: boolean;
  /** Game over shows its result buttons, so Space/Enter may start the next run. */
  quickRetry: boolean;
  setQuickRetry: (on: boolean) => void;

  /** Background music on/off (independent of the sound-effect mute). */
  music: boolean;
  /** Song, volumes and flap sound chosen in the sound settings. */
  sound: SoundSettings;
  /** Lifetime statistics and unlocked achievement ids. */
  stats: PlayerStats;
  achievements: string[];
  /** Achievements waiting to be shown as toasts. */
  achievementQueue: AchievementDef[];

  hydrate: () => void;
  setPhase: (phase: Phase) => void;
  setScore: (score: number) => void;
  /**
   * Ends a run: persists the best score and banks the bitty. `runSats` is the run's total shown
   * to the player; `reportSats` is what is banked now (after a continue, only the part earned since).
   */
  finishRun: (score: number, runSats: number, runStats?: RunStats, reportSats?: number) => void;
  setRunSats: (runSats: number) => void;
  setActiveItem: (item: ItemKind | null) => void;
  /** Spends in-game sats on a cosmetic. Returns false when the balance is too low. */
  buy: (id: string, price: number) => boolean;
  equip: (slot: CosmeticSlot, id: string | null) => void;
  equipSkin: (skin: string) => void;
  toggleMusic: () => void;
  setMusic: (on: boolean) => void;
  setMuted: (muted: boolean) => void;
  setSound: (patch: Partial<SoundSettings>) => void;
  /** Re-evaluates achievements against the current stats (after a run, a purchase, a zone). */
  evaluateAchievements: () => void;
  dismissAchievement: () => void;
  /** Spends bitty on the run's one continue. Returns false when the balance is too low. */
  payContinue: () => boolean;
  /** Continue: back to playing with the same score. */
  continueRun: () => void;
  setLocale: (locale: Locale) => void;
  toggleMuted: () => void;
  setViewport: (viewport: Viewport) => void;
  /** Called when the bird is placed for a new run. */
  beginRun: (startZone: number) => void;
  setZone: (index: number, banner: boolean) => void;
  markReached: (index: number) => void;
}

const defaultViewport: Viewport = {
  left: 0,
  top: 0,
  width: 360,
  height: 640,
  gameWidth: 360,
  gameHeight: 640,
  scale: 1,
};

/** Pushes the sound settings to the music and effect synthesisers. */
function applySound(sound: SoundSettings): void {
  bgm.setTrack(sound.track);
  bgm.setVolume(LEVEL_GAIN[sound.musicLevel]);
  sfx.setVolume(LEVEL_GAIN[sound.sfxLevel]);
  sfx.flapStyle = sound.flap;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "loading",
  score: 0,
  best: 0,
  isNewBest: false,
  locale: gameConfig.fallbackLocale,
  muted: false,
  viewport: defaultViewport,
  hydrated: false,
  zoneIndex: 0,
  runStartZone: 0,
  reachedZone: 0,
  practice: false,
  bannerSeq: 0,
  sats: 0,
  runSats: 0,
  activeItem: null,
  owned: [],
  equipped: { skin: "default", hat: null, face: null, neck: null, trail: null },
  music: true,
  sound: DEFAULT_SOUND,
  stats: EMPTY_STATS,
  achievements: [],
  achievementQueue: [],
  continueUsed: false,
  quickRetry: false,

  hydrate: () => {
    if (get().hydrated) return;
    const locale = loadLocale() ?? detectLocale(gameConfig.fallbackLocale);
    document.documentElement.lang = locale;
    set({
      best: loadBestScore(),
      locale,
      muted: loadMuted(),
      reachedZone: Math.min(loadReachedZone(), ZONES.length - 1),
      sats: loadSats(),
      owned: loadOwned(),
      equipped: loadEquipped(),
      music: loadMusic(),
      sound: loadSound(),
      stats: loadJson<PlayerStats>(STORAGE_KEYS.stats, EMPTY_STATS),
      achievements: loadStringList(STORAGE_KEYS.achievements),
      hydrated: true,
    });
    bgm.enabled = loadMusic();
    applySound(get().sound);
  },

  setPhase: (phase) => set({ phase }),

  setScore: (score) => set({ score }),

  finishRun: (score, runSats, runStats, reportSats) => {
    const { practice, stats: prev, zoneIndex, owned } = get();
    const prevBest = get().best;
    const isNewBest = !practice && score > prevBest;
    const best = isNewBest ? score : prevBest;
    const earned = practice ? 0 : Math.max(0, reportSats ?? runSats);
    const stats = mergeRunStats(prev, { score, runSats: earned, zone: zoneIndex, practice, cosmeticsOwned: owned.length, ...runStats });
    const sats = get().sats + earned;
    saveSats(sats);
    if (isNewBest) saveBestScore(best);
    saveJson(STORAGE_KEYS.stats, stats);
    set({ score, runSats, sats, best, isNewBest, activeItem: null, stats, phase: "gameover", quickRetry: false });
    get().evaluateAchievements();
  },

  evaluateAchievements: () => {
    const { stats, achievements, sats, owned } = get();
    const current = { ...stats, cosmeticsOwned: owned.length };
    const fresh = newlyUnlocked(current, achievements);
    if (fresh.length === 0) return;
    const reward = fresh.reduce((sum, a) => sum + a.reward, 0);
    const ids = [...achievements, ...fresh.map((a) => a.id)];
    saveJson(STORAGE_KEYS.achievements, ids);
    saveSats(sats + reward);
    saveJson(STORAGE_KEYS.stats, current);
    set((s) => ({ achievements: ids, sats: sats + reward, stats: current, achievementQueue: [...s.achievementQueue, ...fresh] }));
  },

  dismissAchievement: () => set((s) => ({ achievementQueue: s.achievementQueue.slice(1) })),

  toggleMusic: () => get().setMusic(!get().music),

  setMusic: (music) => {
    saveMusic(music);
    bgm.enabled = music;
    set({ music });
  },

  setMuted: (muted) => {
    saveMuted(muted);
    set({ muted });
  },

  setSound: (patch) => {
    const sound = { ...get().sound, ...patch };
    saveSound(sound);
    applySound(sound);
    set({ sound });
  },

  setRunSats: (runSats) => set({ runSats }),

  setActiveItem: (activeItem) => set({ activeItem }),

  buy: (id, price) => {
    const { sats, owned } = get();
    if (owned.includes(id)) return true;
    if (sats < price) return false;
    const nextOwned = [...owned, id];
    saveOwned(nextOwned);
    saveSats(sats - price);
    set({ owned: nextOwned, sats: sats - price });
    get().evaluateAchievements();
    return true;
  },

  equip: (slot, id) => {
    const equipped = { ...get().equipped, [slot]: slot === "skin" ? (id ?? "default") : id };
    saveEquipped(equipped);
    set({ equipped });
  },

  equipSkin: (skin) => {
    const equipped = { ...get().equipped, skin };
    saveEquipped(equipped);
    set({ equipped });
  },

  payContinue: () => {
    const { sats, continueUsed, practice } = get();
    if (continueUsed || practice || sats < CONTINUE_PRICE) return false;
    saveSats(sats - CONTINUE_PRICE);
    set({ sats: sats - CONTINUE_PRICE });
    return true;
  },

  // The run's bitty total carries over a continue (the scene keeps counting from it).
  continueRun: () => set({ phase: "playing", continueUsed: true, quickRetry: false }),

  setQuickRetry: (quickRetry) => set({ quickRetry }),

  setLocale: (locale) => {
    saveLocale(locale);
    document.documentElement.lang = locale;
    set({ locale });
  },

  toggleMuted: () => get().setMuted(!get().muted),

  setViewport: (viewport) => set({ viewport }),

  beginRun: (startZone) => {
    const index = Math.min(Math.max(0, startZone), ZONES.length - 1);
    set({
      runStartZone: index,
      practice: false,
      zoneIndex: index,
      score: 0,
      isNewBest: false,
      continueUsed: false,
    });
  },

  setZone: (index, banner) =>
    set((s) => ({ zoneIndex: index, bannerSeq: banner ? s.bannerSeq + 1 : s.bannerSeq })),

  markReached: (index) => {
    if (index <= get().reachedZone) return;
    saveReachedZone(index);
    // Progress-unlocked cosmetics (e.g. the space helmet on reaching the moon).
    const unlocked = COSMETICS.filter((a) => a.unlockZone !== undefined && a.unlockZone <= index).map((a) => a.id);
    const owned = Array.from(new Set([...get().owned, ...unlocked]));
    if (owned.length !== get().owned.length) saveOwned(owned);
    set({ reachedZone: index, owned });
  },
}));
