import { ACHIEVEMENTS } from "@/config/achievements";
import { useGameStore } from "@/game/store";
import { useT } from "@/i18n/useT";
import ModalHeader from "./ModalHeader";
import PixelButton from "./PixelButton";
import { BittyAmount } from "./BittyCoin";
import styles from "./ui.module.css";

/** Lifetime missions with progress bars; completed ones paid out in bitty. */
export default function AchievementsPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const locale = useGameStore((s) => s.locale);
  const stats = useGameStore((s) => s.stats);
  const unlocked = useGameStore((s) => s.achievements);
  const done = ACHIEVEMENTS.filter((a) => unlocked.includes(a.id)).length;

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t("achievements")}>
      <div className={styles.modalPanel}>
        <ModalHeader title={t("achievements")} onClose={onClose} />
        <p className={styles.hint}>
          {done} / {ACHIEVEMENTS.length}
        </p>
        <ul className={styles.stageList}>
          {ACHIEVEMENTS.map((a) => {
            const isDone = unlocked.includes(a.id);
            const value = Math.min(stats[a.stat], a.target);
            // maxZone counts from 0 (Shibuya = 0) but players read zones from 1.
            const shift = a.stat === "maxZone" ? 1 : 0;
            const fmt = (v: number) => (v + shift).toLocaleString("en-US");
            return (
              <li key={a.id} className={`${styles.stageRow} ${isDone ? styles.rowEquipped : ""}`}>
                <div className={styles.stageInfo}>
                  <span className={styles.stageName}>
                    {isDone ? "★ " : ""}
                    {a.name[locale]}
                  </span>
                  <span className={styles.stageMeta}>{a.description[locale]}</span>
                  <span className={styles.progressBar} aria-hidden="true">
                    <span className={styles.progressFill} style={{ width: `${(100 * (value + shift)) / (a.target + shift)}%` }} />
                  </span>
                  <span className={styles.stageMeta}>
                    {fmt(value)} / {fmt(a.target)} · <BittyAmount n={a.reward} plus />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <PixelButton onClick={onClose}>{t("close")}</PixelButton>
      </div>
    </div>
  );
}
