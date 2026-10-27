import { useState } from "react";
import { loadIntroSeen, loadLocale, saveIntroSeen } from "@/lib/storage";
import { gameConfig } from "@/config/game";
import { gameBridge } from "@/game/bridge";
import { useGameStore } from "@/game/store";
import { useT } from "@/i18n/useT";
import IntroPanel from "./IntroPanel";
import LanguagePanel from "./LanguagePanel";
import PixelButton from "./PixelButton";
import AchievementsPanel from "./AchievementsPanel";
import ShopPanel from "./ShopPanel";
import StagePanel from "./StagePanel";
import SettingsPanel from "./SettingsPanel";
import { BittyAmount } from "./BittyCoin";
import styles from "./ui.module.css";

type Panel = "none" | "achievements" | "stage" | "shop" | "settings" | "intro" | "language";

/**
 * First launch: choose the language, then the guide. A device that has already chosen a
 * language (or seen the guide) skips the choice. Tests open the page with ?nointro to skip both.
 */
const firstPanel = (): Panel => {
  if (typeof window === "undefined" || new URLSearchParams(window.location.search).has("nointro")) return "none";
  if (loadIntroSeen()) return "none";
  return loadLocale() === null ? "language" : "intro";
};

export default function StartScreen() {
  const t = useT();
  const best = useGameStore((s) => s.best);
  const sats = useGameStore((s) => s.sats);
  const locale = useGameStore((s) => s.locale);
  const [panel, setPanel] = useState<Panel>(firstPanel);

  return (
    <div className={styles.screen}>
      <header className={styles.titleBlock}>
        <h1 className={styles.title}>{gameConfig.name}</h1>
        <p className={styles.tagline}>{gameConfig.tagline[locale]}</p>
      </header>

      {/* bitty hovers in the canvas behind this gap */}
      <div className={styles.spacer} />

      <div className={styles.chipRow}>
        <div className={styles.bestChip}>
          {t("best")} {best}
        </div>
        <div className={styles.bestChip}>
          <BittyAmount n={sats} />
        </div>
      </div>

      <div className={styles.panel}>
        <PixelButton variant="primary" className={styles.btnLarge} onClick={() => gameBridge.emit("start", { zoneIndex: 0 })}>
          ▶ {t("start")}
        </PixelButton>
        <p className={styles.hint}>{t("howTo")}</p>
        <div className={styles.row}>
          <PixelButton onClick={() => setPanel("stage")}>{t("stage")}</PixelButton>
          <PixelButton onClick={() => setPanel("shop")}>{t("shop")}</PixelButton>
          <PixelButton onClick={() => setPanel("achievements")}>★ {t("achievements")}</PixelButton>
        </div>
        <PixelButton onClick={() => setPanel("settings")}>⚙ {t("settings")}</PixelButton>
      </div>

      <footer className={styles.footer}>
        <span>
          {t("presentedBy")} {gameConfig.organization.name}
        </span>
        <span className={styles.disclaimer}>{t("satsDisclaimer")}</span>
      </footer>

      {panel === "achievements" && <AchievementsPanel onClose={() => setPanel("none")} />}
      {panel === "stage" && <StagePanel onClose={() => setPanel("none")} />}
      {panel === "shop" && <ShopPanel onClose={() => setPanel("none")} />}
      {panel === "settings" && <SettingsPanel onClose={() => setPanel("none")} />}
      {panel === "language" && <LanguagePanel onChosen={() => setPanel("intro")} />}
      {panel === "intro" && (
        <IntroPanel
          onClose={() => {
            saveIntroSeen();
            setPanel("none");
          }}
        />
      )}
    </div>
  );
}
