import { useEffect, type ReactNode } from "react";
import { sfx } from "@/game/audio";
import { useGameStore } from "@/game/store";
import GameUI from "./GameUI";
import styles from "./GameShell.module.css";

/**
 * Full-screen frame: hydrates the store, wires audio unlocking and renders the
 * overlays on top of whatever canvas element is passed as children.
 */
export default function GameFrame({ children }: { children: ReactNode }) {
  const hydrate = useGameStore((s) => s.hydrate);
  const muted = useGameStore((s) => s.muted);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    sfx.muted = muted;
  }, [muted]);

  // Browsers only allow audio after a user gesture; resume the context on any input.
  useEffect(() => {
    const unlock = () => sfx.unlock();
    // iOS only counts some events as a user gesture for audio: listen to all of them.
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("touchend", unlock);
    window.addEventListener("click", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchend", unlock);
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return (
    <div className={styles.root}>
      {children}
      <GameUI />
    </div>
  );
}
