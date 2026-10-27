import type { Locale } from "@/config/game";
import { gameConfig } from "@/config/game";
import { sfx } from "@/game/audio";
import { useGameStore } from "@/game/store";
import styles from "./ui.module.css";

const CHOICES: Array<{ locale: Locale; label: string; sub: string }> = [
  { locale: "ja", label: "日本語", sub: "Japanese" },
  { locale: "en", label: "English", sub: "英語" },
];

/**
 * First thing a new visitor sees: pick Japanese or English. Written in both
 * languages on purpose, since we don't know yet which one the player reads.
 * The browser's language is pre-highlighted. Can be changed later in Settings.
 */
export default function LanguagePanel({ onChosen }: { onChosen: () => void }) {
  const detected = useGameStore((s) => s.locale);
  const setLocale = useGameStore((s) => s.setLocale);

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label="言語を選んでください / Choose your language">
      <div className={styles.modalPanel}>
        <h2 className={`${styles.panelTitle} ${styles.panelTitleSmall}`}>{gameConfig.name}</h2>
        <p className={styles.langPrompt}>
          言語を選んでください
          <br />
          Choose your language
        </p>
        {CHOICES.map((c) => (
          <button
            key={c.locale}
            type="button"
            className={`${styles.btn} ${styles.btnLarge} ${styles.langChoice} ${c.locale === detected ? styles.btnPrimary : ""}`}
            lang={c.locale}
            onClick={() => {
              sfx.click();
              setLocale(c.locale);
              onChosen();
            }}
          >
            <span>{c.label}</span>
            <span className={styles.langSub}>{c.sub}</span>
          </button>
        ))}
        <p className={styles.disclaimer}>
          設定からいつでも変更できます
          <br />
          You can change this later in Settings
        </p>
      </div>
    </div>
  );
}
