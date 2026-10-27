import { sfx } from "@/game/audio";
import { useT } from "@/i18n/useT";
import styles from "./ui.module.css";

/** Panel title with an always-visible close (back) button in the corner. */
export default function ModalHeader({ title, onClose, small = false }: { title: string; onClose: () => void; small?: boolean }) {
  const t = useT();
  return (
    <div className={styles.modalHead}>
      <h2 className={`${styles.panelTitle} ${small ? styles.panelTitleSmall : ""}`}>{title}</h2>
      <button
        type="button"
        className={styles.closeX}
        aria-label={t("close")}
        onClick={() => {
          sfx.click();
          onClose();
        }}
      >
        ✕
      </button>
    </div>
  );
}
