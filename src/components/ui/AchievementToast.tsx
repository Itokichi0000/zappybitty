import { useEffect } from "react";
import { sfx } from "@/game/audio";
import { useGameStore } from "@/game/store";
import { useT } from "@/i18n/useT";
import { BittyAmount } from "./BittyCoin";
import styles from "./ui.module.css";

/** Shows the next unlocked achievement for a few seconds, then moves on. */
export default function AchievementToast() {
  const t = useT();
  const locale = useGameStore((s) => s.locale);
  const current = useGameStore((s) => s.achievementQueue[0]);
  const dismiss = useGameStore((s) => s.dismissAchievement);
  // The length is a dependency too: should the same achievement ever sit in the queue twice,
  // the timer still restarts after each dismiss instead of leaving the queue stuck.
  const queued = useGameStore((s) => s.achievementQueue.length);

  useEffect(() => {
    if (!current) return;
    sfx.newBest();
    const timer = window.setTimeout(dismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [current, queued, dismiss]);

  if (!current) return null;
  return (
    <div key={current.id} className={styles.toast} role="status">
      <span className={styles.toastLabel}>{t("achievementUnlocked")}</span>
      <strong className={styles.toastTitle}>{current.name[locale]}</strong>
      <span className={styles.toastReward}>
        <BittyAmount n={current.reward} plus />
      </span>
    </div>
  );
}
