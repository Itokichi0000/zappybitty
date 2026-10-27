import { useT } from "@/i18n/useT";
import styles from "./ui.module.css";

export default function LoadingScreen() {
  const t = useT();
  return (
    <div className={styles.center}>
      <p className={styles.loading}>{t("loading")}</p>
    </div>
  );
}
