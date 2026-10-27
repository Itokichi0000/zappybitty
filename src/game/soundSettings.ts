/**
 * Player-chosen sound settings: which music plays, how loud the music and the
 * effects are, and what a flap sounds like. Pure data and helpers, shared by the
 * synthesisers, the store and the settings panel.
 */

/** Songs of the procedural soundtrack, plus "auto" which rotates through them over time. */
export type MusicTrack = "auto" | "pop" | "chill" | "upbeat" | "space";
export type SongId = Exclude<MusicTrack, "auto">;
export const SONGS: SongId[] = ["pop", "chill", "upbeat", "space"];
export const MUSIC_TRACKS: MusicTrack[] = ["auto", ...SONGS];

/** What a flap sounds like ("none" keeps every other effect). */
export type FlapSound = "classic" | "soft" | "pop" | "wing" | "none";
export const FLAP_SOUNDS: FlapSound[] = ["classic", "soft", "pop", "wing", "none"];

/** Volume steps: 1 = low, 2 = mid, 3 = high. Off is the separate music / mute switch. */
export type Level = 1 | 2 | 3;
export const LEVELS: Level[] = [1, 2, 3];
export const LEVEL_GAIN: Record<Level, number> = { 1: 0.4, 2: 0.7, 3: 1 };

export interface SoundSettings {
  track: MusicTrack;
  musicLevel: Level;
  sfxLevel: Level;
  flap: FlapSound;
}

export const DEFAULT_SOUND: SoundSettings = { track: "auto", musicLevel: 2, sfxLevel: 2, flap: "classic" };

/** In "auto", the song changes after this much music (seconds), at the next bar. */
export const AUTO_ROTATE_SEC = 150;

/** Reads saved settings, falling back to the default for anything missing or unknown. */
export function parseSound(raw: unknown): SoundSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;
  return {
    track: pick(o.track, MUSIC_TRACKS, DEFAULT_SOUND.track),
    musicLevel: pick(o.musicLevel, LEVELS, DEFAULT_SOUND.musicLevel),
    sfxLevel: pick(o.sfxLevel, LEVELS, DEFAULT_SOUND.sfxLevel),
    flap: pick(o.flap, FLAP_SOUNDS, DEFAULT_SOUND.flap),
  };
}

/** The next song for "auto": any song but the current one. */
export function nextAutoSong(current: SongId | null, rand: () => number): SongId {
  const choices = SONGS.filter((s) => s !== current);
  return choices[Math.min(choices.length - 1, Math.floor(rand() * choices.length))];
}
