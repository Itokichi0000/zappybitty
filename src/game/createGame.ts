import Phaser from "phaser";
import { computeGameSize } from "./layout";
import { useGameStore } from "./store";
import { bgm } from "./bgm";
import { BootScene } from "./scenes/BootScene";
import { PlayScene } from "./scenes/PlayScene";

/**
 * Boots Phaser inside `parent` and keeps the logical game size in sync with
 * the viewport (full screen on phones, 9:16 letterbox on PC).
 *
 * Only ever import this module from the browser (it touches `window`).
 */
export function createGame(parent: HTMLElement, fontFamily: string): Phaser.Game {
  const size = computeGameSize(window.innerWidth, window.innerHeight);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: size.width,
    height: size.height,
    backgroundColor: "#3f8fe0",
    pixelArt: true,
    roundPixels: true,
    fps: { target: 60, smoothStep: true },
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: size.width,
      height: size.height,
    },
    input: { keyboard: true, mouse: true, touch: true },
    disableContextMenu: true,
    // Sound effects are synthesised with our own Web Audio graph (see audio.ts).
    audio: { noAudio: true },
    scene: [BootScene, PlayScene],
    callbacks: {
      preBoot: (g) => g.registry.set("fontFamily", fontFamily),
    },
  });

  const publishViewport = () => {
    const bounds = game.scale.canvasBounds;
    const gameWidth = game.scale.width;
    const gameHeight = game.scale.height;
    useGameStore.getState().setViewport({
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
      gameWidth,
      gameHeight,
      scale: gameWidth > 0 ? bounds.width / gameWidth : 1,
    });
  };

  const onWindowResize = () => {
    const next = computeGameSize(window.innerWidth, window.innerHeight);
    if (next.width !== game.scale.width || next.height !== game.scale.height) {
      game.scale.resize(next.width, next.height);
    } else {
      game.scale.refresh();
    }
    publishViewport();
  };

  game.scale.on(Phaser.Scale.Events.RESIZE, publishViewport);
  game.events.once(Phaser.Core.Events.READY, publishViewport);
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("orientationchange", onWindowResize);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    window.removeEventListener("resize", onWindowResize);
    window.removeEventListener("orientationchange", onWindowResize);
  });

  // `?debug=1` exposes the game and store for e2e tests and manual poking.
  if (new URLSearchParams(window.location.search).has("debug")) {
    const w = window as unknown as { __bittyGame?: Phaser.Game; __bittyStore?: typeof useGameStore; __bittyBgm?: typeof bgm };
    w.__bittyGame = game;
    w.__bittyStore = useGameStore;
    w.__bittyBgm = bgm;
  }

  return game;
}
