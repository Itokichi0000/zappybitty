import { gameBridge } from "@/game/bridge";
import { useGameStore } from "@/game/store";
import { ZONES } from "@/game/zones";
import { useT } from "@/i18n/useT";
import ModalHeader from "./ModalHeader";
import PixelButton from "./PixelButton";
import styles from "./ui.module.css";

/** Stage select: start a real run in any zone that is free or already reached. */
export default function StagePanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const locale = useGameStore((s) => s.locale);
  const reachedZone = useGameStore((s) => s.reachedZone);

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t("stageSelect")}>
      <div className={styles.modalPanel}>
        <ModalHeader title={t("stageSelect")} onClose={onClose} />
        <p className={styles.hint}>{t("stageNote")}</p>
        <ul className={styles.stageList}>
          {ZONES.map((zone, index) => {
            const unlocked = zone.freeSelect || index <= reachedZone;
            return (
              <li key={zone.id} className={`${styles.stageRow} ${unlocked ? "" : styles.stageRowLocked}`}>
                <div className={styles.stageInfo}>
                  <span className={styles.stageIndex}>
                    {t("zone")} {index + 1}
                  </span>
                  <span className={styles.stageName}>{zone.name[locale]}</span>
                  {(!unlocked || index === 0) && (
                    <span className={styles.stageMeta}>{unlocked ? t("normalRun") : t("locked", { score: zone.startScore })}</span>
                  )}
                </div>
                {unlocked && (
                  <PixelButton
                    variant={index === 0 ? "primary" : "default"}
                    onClick={() => {
                      onClose();
                      gameBridge.emit("start", { zoneIndex: index });
                    }}
                  >
                    {t("play")}
                  </PixelButton>
                )}
              </li>
            );
          })}
        </ul>
        <PixelButton onClick={onClose}>{t("close")}</PixelButton>
      </div>
    </div>
  );
}
