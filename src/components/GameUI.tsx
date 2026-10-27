import type { CSSProperties } from "react";
import { useGameStore } from "@/game/store";
import styles from "./GameShell.module.css";
import LoadingScreen from "./ui/LoadingScreen";
import StartScreen from "./ui/StartScreen";
import ReadyHint from "./ui/ReadyHint";
import PauseScreen from "./ui/PauseScreen";
import GameOverScreen from "./ui/GameOverScreen";
import ZoneBanner from "./ui/ZoneBanner";
import AchievementToast from "./ui/AchievementToast";

/** Renders the overlay that matches the current game phase. */
export default function GameUI() {
  const phase = useGameStore((s) => s.phase);
  const viewport = useGameStore((s) => s.viewport);

  const style: CSSProperties = {
    left: viewport.left,
    top: viewport.top,
    width: viewport.gameWidth,
    height: viewport.gameHeight,
    transform: `scale(${viewport.scale})`,
  };

  return (
    <div className={styles.overlay} style={style}>
      {phase === "loading" && <LoadingScreen />}
      {phase === "menu" && <StartScreen />}
      {phase === "ready" && <ReadyHint />}
      {phase === "paused" && <PauseScreen />}
      {phase === "gameover" && <GameOverScreen />}
      <ZoneBanner />
      <AchievementToast />
    </div>
  );
}
