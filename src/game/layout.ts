import { GAME_WIDTH, MAX_HEIGHT, MIN_HEIGHT } from "./constants";

export interface GameSize {
  width: number;
  height: number;
}

/**
 * Logical game size for a given viewport.
 * - Phones (portrait, taller than 9:16): fill the screen by growing the
 *   logical height, capped at MAX_HEIGHT.
 * - PC / landscape: a 9:16 portrait that Phaser letterboxes in the centre.
 */
export function computeGameSize(viewportWidth: number, viewportHeight: number): GameSize {
  const safeWidth = Math.max(1, viewportWidth);
  const safeHeight = Math.max(1, viewportHeight);
  const aspect = safeHeight / safeWidth;
  const height = Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, GAME_WIDTH * aspect)));
  return { width: GAME_WIDTH, height };
}
