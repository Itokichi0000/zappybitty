import { gameBridge } from "@/game/bridge";
import { useT } from "@/i18n/useT";
import styles from "./ui.module.css";

export default function PauseScreen() {
  const t = useT();
  return (
    <button type="button" className={styles.pause} onClick={() => gameBridge.emit("resume")}>
      <span className={styles.pauseTitle}>{t("paused")}</span>
      <span className={styles.pauseHint}>{t("tapToResume")}</span>
    </button>
  );
}
