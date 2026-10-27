import { useState } from "react";
import { COSMETIC_SLOTS, cosmeticsFor, type CosmeticDef, type CosmeticSlot } from "@/config/economy";
import { useGameStore } from "@/game/store";
import { ZONES } from "@/game/zones";
import { useT } from "@/i18n/useT";
import ModalHeader from "./ModalHeader";
import PixelButton from "./PixelButton";
import { BittyAmount } from "./BittyCoin";
import styles from "./ui.module.css";

const SLOT_KEYS = { skin: "slotSkin", hat: "slotHat", face: "slotFace", neck: "slotNeck", trail: "slotTrail" } as const;

/** Skins, hats, faces, neckwear and trails, bought with the bitty earned by playing. */
export default function ShopPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const locale = useGameStore((s) => s.locale);
  const sats = useGameStore((s) => s.sats);
  const owned = useGameStore((s) => s.owned);
  const equipped = useGameStore((s) => s.equipped);
  const buy = useGameStore((s) => s.buy);
  const equip = useGameStore((s) => s.equip);
  const [slot, setSlot] = useState<CosmeticSlot>("skin");
  const [notice, setNotice] = useState<string | null>(null);

  const isOwned = (item: CosmeticDef) => item.price === 0 && item.unlockZone === undefined ? true : owned.includes(item.id);
  const isEquipped = (item: CosmeticDef) => equipped[item.slot] === item.id;

  const renderRow = (item: CosmeticDef) => {
    const have = isOwned(item);
    const on = isEquipped(item);
    const progressLocked = item.unlockZone !== undefined && !have;
    return (
      <li key={item.id} className={`${styles.stageRow} ${on ? styles.rowEquipped : ""}`}>
        <div className={styles.stageInfo}>
          <span className={styles.stageName}>{item.name[locale]}</span>
          <span className={styles.stageMeta}>
            {progressLocked ? t("unlockZone", { n: (item.unlockZone ?? 0) + 1, zone: ZONES[item.unlockZone ?? 0]?.name[locale] ?? "" }) : have ? (on ? t("equipped") : "") : <BittyAmount n={item.price} />}
          </span>
        </div>
        {progressLocked ? null : have ? (
          <PixelButton
            variant={on ? "default" : "primary"}
            disabled={on && item.slot === "skin"}
            onClick={() => equip(item.slot, on ? null : item.id)}
          >
            {on ? (item.slot === "skin" ? t("equipped") : t("unequip")) : t("equip")}
          </PixelButton>
        ) : (
          <PixelButton
            variant="primary"
            onClick={() => {
              if (buy(item.id, item.price)) {
                equip(item.slot, item.id);
                setNotice(null);
              } else {
                setNotice(t("notEnough"));
              }
            }}
          >
            {t("buy")}
          </PixelButton>
        )}
      </li>
    );
  };

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t("shop")}>
      <div className={styles.modalPanel}>
        <ModalHeader title={t("shop")} onClose={onClose} />
        <div className={styles.balance}>
          <span>{t("satsBalance")}</span>
          <span className={styles.scoreValue}>
            <BittyAmount n={sats} />
          </span>
        </div>
        <p className={styles.hint}>{t("satsNote")}</p>
        <div className={styles.slotTabs}>
          {COSMETIC_SLOTS.map((s) => (
            <PixelButton key={s} className={`${styles.slotTab} ${slot === s ? styles.tabActive : ""}`} aria-pressed={slot === s} onClick={() => setSlot(s)}>
              {t(SLOT_KEYS[s])}
            </PixelButton>
          ))}
        </div>
        <ul className={styles.stageList}>{cosmeticsFor(slot).map(renderRow)}</ul>
        {notice && <p className={styles.notice}>{notice}</p>}
        <PixelButton onClick={onClose}>{t("close")}</PixelButton>
      </div>
    </div>
  );
}
