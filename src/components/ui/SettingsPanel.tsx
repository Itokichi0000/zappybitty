import { useState } from "react";
import { gameConfig } from "@/config/game";
import { useGameStore } from "@/game/store";
import { useT } from "@/i18n/useT";
import { openExternal } from "@/lib/external";
import ModalHeader from "./ModalHeader";
import PixelButton from "./PixelButton";
import IntroPanel from "./IntroPanel";
import SoundPanel from "./SoundPanel";
import SupportPanel from "./SupportPanel";
import TermsPanel from "./TermsPanel";
import styles from "./ui.module.css";

/** Everything that isn't play: sound settings, language, the guide and the support link. */
export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const locale = useGameStore((s) => s.locale);
  const setLocale = useGameStore((s) => s.setLocale);
  const [sub, setSub] = useState<"none" | "support" | "terms" | "intro" | "sound">("none");

  if (sub === "support") return <SupportPanel onClose={() => setSub("none")} />;
  if (sub === "terms") return <TermsPanel onClose={() => setSub("none")} />;
  if (sub === "intro") return <IntroPanel onClose={() => setSub("none")} />;
  if (sub === "sound") return <SoundPanel onClose={() => setSub("none")} />;

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t("settings")}>
      <div className={styles.modalPanel}>
        <ModalHeader title={t("settings")} onClose={onClose} />
        <PixelButton onClick={() => setSub("sound")}>{t("soundButton")}</PixelButton>
        <div className={styles.row}>
          <PixelButton onClick={() => setSub("intro")}>？ {t("introHelp")}</PixelButton>
          <PixelButton onClick={() => setSub("terms")}>{t("termsButton")}</PixelButton>
        </div>
        {gameConfig.lightningAddress && (
          <PixelButton className={styles.btnLightning} onClick={() => setSub("support")}>
            ♥ {t("support")}
          </PixelButton>
        )}
        <PixelButton onClick={() => openExternal(gameConfig.sourceUrl)}>{t("sourceCode")}</PixelButton>
        <PixelButton onClick={() => setLocale(locale === "ja" ? "en" : "ja")}>{t("switchLanguage")}</PixelButton>
        <PixelButton onClick={onClose}>{t("close")}</PixelButton>
      </div>
    </div>
  );
}
