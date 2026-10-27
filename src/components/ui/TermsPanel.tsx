import { useT } from "@/i18n/useT";
import ModalHeader from "./ModalHeader";
import PixelButton from "./PixelButton";
import styles from "./ui.module.css";

const ITEMS = ["terms1", "terms2", "terms3", "terms4"] as const;

/** Plain-language notes on bitty points, saved data and the open-source license. */
export default function TermsPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t("termsTitle")}>
      <div className={styles.modalPanel}>
        <ModalHeader small title={t("termsTitle")} onClose={onClose} />
        <ol className={styles.termsList}>
          {ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ol>
        <PixelButton onClick={onClose}>{t("close")}</PixelButton>
      </div>
    </div>
  );
}
