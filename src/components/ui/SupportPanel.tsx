import { useState } from "react";
import { gameConfig } from "@/config/game";
import { useT } from "@/i18n/useT";
import { openExternal } from "@/lib/external";
import ModalHeader from "./ModalHeader";
import PixelButton from "./PixelButton";
import styles from "./ui.module.css";

/** Support the creator: opens the player's wallet app on the Lightning Address. No server involved. */
export default function SupportPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const address = gameConfig.lightningAddress;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch {
      /* the address stays on screen to copy by hand */
    }
  };

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t("support")}>
      <div className={styles.modalPanel}>
        <ModalHeader title={t("support")} onClose={onClose} />
        <p className={styles.hint}>{t("supportHint")}</p>
        <code className={styles.code}>{address}</code>
        <PixelButton variant="primary" onClick={() => openExternal(`lightning:${address}`)}>
          ⚡ {t("openWallet")}
        </PixelButton>
        <PixelButton onClick={() => void copy()}>{copied ? t("copied") : t("copyAddress")}</PixelButton>
        <p className={styles.muted}>{t("supportNote")}</p>
        <PixelButton onClick={onClose}>{t("close")}</PixelButton>
      </div>
    </div>
  );
}
