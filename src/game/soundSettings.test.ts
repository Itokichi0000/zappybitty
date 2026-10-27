import { describe, expect, it } from "vitest";
import { DEFAULT_SOUND, nextAutoSong, parseSound, SONGS } from "./soundSettings";

describe("sound settings", () => {
  it("falls back to the defaults for missing or unknown values", () => {
    expect(parseSound(null)).toEqual(DEFAULT_SOUND);
    expect(parseSound({ track: "metal", musicLevel: 9, sfxLevel: "2", flap: "honk" })).toEqual(DEFAULT_SOUND);
    expect(parseSound({ track: "chill", musicLevel: 1, sfxLevel: 3, flap: "none" })).toEqual({
      track: "chill",
      musicLevel: 1,
      sfxLevel: 3,
      flap: "none",
    });
  });

  it("auto never picks the song that is already playing, and can reach every other one", () => {
    for (const current of SONGS) {
      const seen = new Set<string>();
      for (let i = 0; i < 20; i++) seen.add(nextAutoSong(current, () => i / 20));
      expect(seen.has(current)).toBe(false);
      expect(seen.size).toBe(SONGS.length - 1);
    }
    expect(SONGS).toContain(nextAutoSong(null, () => 0.999));
  });
});
