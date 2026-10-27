import { useGameStore } from "@/game/store";
import { ZONES } from "@/game/zones";
import { useT } from "@/i18n/useT";
import styles from "./ui.module.css";

/** Non-interactive hint shown until the first flap. */
export default function ReadyHint() {
  const t = useT();
  const runStartZone = useGameStore((s) => s.runStartZone);
  const zoneIndex = useGameStore((s) => s.zoneIndex);
  const locale = useGameStore((s) => s.locale);
  return (
    <div className={styles.readyHint}>
      <p>{t("tapToFlap")}</p>
      {runStartZone > 0 && (
        <p className={styles.readySub}>
          {t("zone")} {zoneIndex + 1} {ZONES[zoneIndex].name[locale]}
        </p>
      )}
    </div>
  );
}
