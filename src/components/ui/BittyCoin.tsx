import { useBits } from "@/i18n/useT";
import styles from "./ui.module.css";

/**
 * The in-game point coin: a gold coin with bitty's face. Deliberately not the ₿ sign,
 * so points never look like real bitcoin. Mirrors the coin texture in src/game/textures.ts.
 */
export function BittyCoin({ size = 14 }: { size?: number }) {
  return (
    <svg className={styles.bittyCoin} width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" shapeRendering="crispEdges">
      <circle cx="7" cy="7" r="6.5" fill="#b8860b" />
      <circle cx="7" cy="7" r="5.5" fill="#ffd54a" />
      <circle cx="7" cy="7.5" r="4" fill="#f7931a" />
      <rect x="3" y="5" width="3" height="1" fill="#1b2a4a" />
      <rect x="8" y="5" width="3" height="1" fill="#1b2a4a" />
      <rect x="4" y="6" width="2" height="2" fill="#ffffff" />
      <rect x="8" y="6" width="2" height="2" fill="#ffffff" />
      <rect x="5" y="7" width="1" height="1" fill="#1b2a4a" />
      <rect x="9" y="7" width="1" height="1" fill="#1b2a4a" />
      <rect x="6" y="9" width="2" height="1" fill="#e8503f" />
    </svg>
  );
}

/** An amount of points with the coin, e.g. [coin] 900 bitty. */
export function BittyAmount({ n, plus = false }: { n: number; plus?: boolean }) {
  const bits = useBits();
  return (
    <span className={styles.bittyAmount}>
      <BittyCoin />
      {plus ? "+" : ""}
      {bits(n)}
    </span>
  );
}
