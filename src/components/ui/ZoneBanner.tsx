import { ZONE } from "@/game/constants";
import { useGameStore } from "@/game/store";
import { ZONES } from "@/game/zones";
import styles from "./ui.module.css";

/**
 * "ZONE n" banner. Re-mounted (via key) every time the store bumps bannerSeq;
 * the CSS animation plays once and leaves the element invisible.
 */
export default function ZoneBanner() {
  const zoneIndex = useGameStore((s) => s.zoneIndex);
  const seq = useGameStore((s) => s.bannerSeq);
  const locale = useGameStore((s) => s.locale);
  if (seq === 0) return null;
  const zone = ZONES[zoneIndex];
  return (
    <div key={seq} className={styles.zoneBanner} style={{ animationDuration: `${ZONE.bannerMs}ms` }} role="status">
      <span className={styles.zoneBannerLabel}>ZONE {zoneIndex + 1}</span>
      <span className={styles.zoneBannerName}>{zone.name[locale]}</span>
    </div>
  );
}
