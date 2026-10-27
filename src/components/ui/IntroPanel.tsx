import { useState } from "react";
import { gameConfig } from "@/config/game";
import { useT } from "@/i18n/useT";
import type { TranslationKey } from "@/i18n/translations";
import ModalHeader from "./ModalHeader";
import PixelButton from "./PixelButton";
import styles from "./ui.module.css";

interface Page {
  icon: string;
  title: TranslationKey;
  lines: TranslationKey[];
}

const PAGES: Page[] = [
  { icon: "🕹️", title: "intro1Title", lines: ["intro1a", "intro1b"] },
  { icon: "🪙", title: "intro2Title", lines: ["intro2a", "intro2b"] },
  { icon: "📌", title: "intro3Title", lines: ["intro3a", "intro3b", "intro3c"] },
];

/**
 * A short first-launch guide: how to play, what bitty points are, and where they are kept.
 * Shown once on the first launch, and again from Settings → How to play.
 */
export default function IntroPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const page = PAGES[index];
  const last = index === PAGES.length - 1;

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t("introTitle", { name: gameConfig.name })}>
      <div className={styles.modalPanel}>
        <ModalHeader small title={t("introTitle", { name: gameConfig.name })} onClose={onClose} />
        <div className={styles.introPage}>
          <div className={styles.introIcon} aria-hidden="true">
            {page.icon}
          </div>
          <h3 className={styles.introHeading}>{t(page.title)}</h3>
          <ul className={styles.introList}>
            {page.lines.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
        <div className={styles.introDots} aria-label={`${index + 1} / ${PAGES.length}`}>
          {PAGES.map((p, i) => (
            <button
              key={p.title}
              type="button"
              className={`${styles.introDot} ${i === index ? styles.introDotActive : ""}`}
              aria-label={`${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <div className={styles.row}>
          {index > 0 ? (
            <PixelButton onClick={() => setIndex(index - 1)}>{t("introBack")}</PixelButton>
          ) : (
            <PixelButton onClick={onClose}>{t("introSkip")}</PixelButton>
          )}
          <PixelButton variant="primary" onClick={() => (last ? onClose() : setIndex(index + 1))}>
            {last ? t("introStart") : t("introNext")}
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
