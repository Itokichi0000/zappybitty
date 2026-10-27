import { useEffect, useRef } from "react";
import styles from "./GameShell.module.css";

type PhaserGame = import("phaser").Game;

/** Mounts the Phaser game into a full-screen host element. */
export default function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let game: PhaserGame | undefined;

    (async () => {
      // The HUD renders text on a canvas, so the web font has to be ready first.
      const fontFamily = getComputedStyle(document.body).fontFamily;
      try {
        await document.fonts.load(`16px ${fontFamily}`);
      } catch {
        /* fall back to whatever the browser has */
      }
      const { createGame } = await import("@/game/createGame");
      if (disposed) return;
      game = createGame(host, fontFamily);
    })();

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);

  return <div ref={hostRef} className={styles.host} />;
}
