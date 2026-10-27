import type { Locale } from "@/config/game";
import { parseSound, type SoundSettings } from "@/game/soundSettings";

/** localStorage keys, namespaced so other apps on the same origin never collide. */
export const STORAGE_KEYS = {
  bestScore: "bitty.bestScore",
  locale: "bitty.locale",
  muted: "bitty.muted",
  reachedZone: "bitty.reachedZone",
  sats: "bitty.sats",
  owned: "bitty.owned",
  equipped: "bitty.equipped",
  stats: "bitty.stats",
  achievements: "bitty.achievements",
  music: "bitty.music",
  sound: "bitty.sound",
  introSeen: "bitty.introSeen",
} as const;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / quota – ignore */
  }
}

export function loadBestScore(): number {
  const raw = safeGet(STORAGE_KEYS.bestScore);
  const n = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function saveBestScore(score: number): void {
  safeSet(STORAGE_KEYS.bestScore, String(Math.max(0, Math.floor(score))));
}

export function loadLocale(): Locale | null {
  const raw = safeGet(STORAGE_KEYS.locale);
  return raw === "ja" || raw === "en" ? raw : null;
}

export function saveLocale(locale: Locale): void {
  safeSet(STORAGE_KEYS.locale, locale);
}

export function loadMuted(): boolean {
  return safeGet(STORAGE_KEYS.muted) === "1";
}

export function saveMuted(muted: boolean): void {
  safeSet(STORAGE_KEYS.muted, muted ? "1" : "0");
}

/** Picks ja/en from the browser language, falling back to the given locale. */
export function detectLocale(fallback: Locale): Locale {
  if (typeof navigator === "undefined") return fallback;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    if (!lang) continue;
    if (lang.toLowerCase().startsWith("ja")) return "ja";
    if (lang.toLowerCase().startsWith("en")) return "en";
  }
  return fallback;
}

export function loadReachedZone(): number {
  const raw = safeGet(STORAGE_KEYS.reachedZone);
  const n = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function saveReachedZone(index: number): void {
  safeSet(STORAGE_KEYS.reachedZone, String(Math.max(0, Math.floor(index))));
}

function loadNonNegativeInt(key: string): number {
  const raw = safeGet(key);
  const n = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** In-game sats balance (not real bitcoin). */
export function loadSats(): number {
  return loadNonNegativeInt(STORAGE_KEYS.sats);
}

export function saveSats(sats: number): void {
  safeSet(STORAGE_KEYS.sats, String(Math.max(0, Math.floor(sats))));
}

export function loadOwned(): string[] {
  try {
    const parsed: unknown = JSON.parse(safeGet(STORAGE_KEYS.owned) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function saveOwned(ids: string[]): void {
  safeSet(STORAGE_KEYS.owned, JSON.stringify(ids));
}

export interface Equipped {
  skin: string;
  hat: string | null;
  face: string | null;
  neck: string | null;
  trail: string | null;
}

const HAT_IDS = ["beanie", "cap", "straw", "crown", "party", "headband", "catears", "tophat", "helmet"];
const FACE_IDS = ["sunglasses", "glasses", "monocle", "mask", "laser"];

export const DEFAULT_EQUIPPED: Equipped = { skin: "default", hat: null, face: null, neck: null, trail: null };

export function loadEquipped(): Equipped {
  try {
    const parsed = JSON.parse(safeGet(STORAGE_KEYS.equipped) ?? "{}") as Partial<Equipped> & { accessory?: string | null };
    const str = (v: unknown) => (typeof v === "string" ? v : null);
    const equipped: Equipped = {
      skin: str(parsed.skin) ?? "default",
      hat: str(parsed.hat),
      face: str(parsed.face),
      neck: str(parsed.neck),
      trail: str(parsed.trail),
    };
    // Migrate the single "accessory" slot from earlier builds.
    const legacy = str(parsed.accessory);
    if (legacy) {
      if (HAT_IDS.includes(legacy)) equipped.hat ??= legacy;
      else if (FACE_IDS.includes(legacy)) equipped.face ??= legacy;
      else equipped.neck ??= legacy;
    }
    return equipped;
  } catch {
    return { ...DEFAULT_EQUIPPED };
  }
}

export function saveEquipped(equipped: Equipped): void {
  safeSet(STORAGE_KEYS.equipped, JSON.stringify(equipped));
}

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = safeGet(key);
    return raw === null ? fallback : { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  safeSet(key, JSON.stringify(value));
}

export function loadStringList(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(safeGet(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function loadSound(): SoundSettings {
  try {
    return parseSound(JSON.parse(safeGet(STORAGE_KEYS.sound) ?? "{}"));
  } catch {
    return parseSound({});
  }
}

export function saveSound(sound: SoundSettings): void {
  safeSet(STORAGE_KEYS.sound, JSON.stringify(sound));
}

export function loadMusic(): boolean {
  return safeGet(STORAGE_KEYS.music) !== "0";
}

export function saveMusic(on: boolean): void {
  safeSet(STORAGE_KEYS.music, on ? "1" : "0");
}

/** Whether this browser has already seen the first-visit intro. */
export function loadIntroSeen(): boolean {
  return safeGet(STORAGE_KEYS.introSeen) === "1";
}

export function saveIntroSeen(): void {
  safeSet(STORAGE_KEYS.introSeen, "1");
}
