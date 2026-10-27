import { useEffect, useState } from "react";
import { CONTINUE_PRICE } from "@/config/economy";
import { gameBridge } from "@/game/bridge";
import { useGameStore } from "@/game/store";
import { ZONES } from "@/game/zones";
import { useBits, useT } from "@/i18n/useT";
import { openShareWindow } from "@/lib/share";
import PixelButton from "./PixelButton";
import { BittyAmount, BittyCoin } from "./BittyCoin";
import styles from "./ui.module.css";

export default function GameOverScreen() {
  const t = useT();
  const bits = useBits();
  const score = useGameStore((s) => s.score);
  const best = useGameStore((s) => s.best);
  const isNewBest = useGameStore((s) => s.isNewBest);
  const locale = useGameStore((s) => s.locale);
  const practice = useGameStore((s) => s.practice);
  const zoneIndex = useGameStore((s) => s.zoneIndex);
  const runStartZone = useGameStore((s) => s.runStartZone);
  const runSats = useGameStore((s) => s.runSats);
  const continueUsed = useGameStore((s) => s.continueUsed);
  const balance = useGameStore((s) => s.sats);
  const payContinue = useGameStore((s) => s.payContinue);
  const setQuickRetry = useGameStore((s) => s.setQuickRetry);
  const zone = ZONES[zoneIndex];
  // Offered once per run, and only when the player can afford it.
  const canContinue = !continueUsed && !practice && balance >= CONTINUE_PRICE;
  // First the continue question (yes / no), then the usual result buttons.
  const [stage, setStage] = useState<"ask" | "result">(canContinue ? "ask" : "result");

  // Space / Enter may start the next run only once the result buttons are shown, after a
  // short pause, so a flap still in the player's fingers never skips this screen.
  useEffect(() => {
    if (stage !== "result") return;
    const timer = window.setTimeout(() => setQuickRetry(true), 900);
    return () => {
      window.clearTimeout(timer);
      setQuickRetry(false);
    };
  }, [stage, setQuickRetry]);

  return (
    <div className={styles.center}>
      <div className={styles.resultPanel}>
        <h2 className={`${styles.panelTitle} ${styles.resultTitle}`}>{t("gameOver")}</h2>
        {practice && <div className={styles.practiceBadge}>{t("practiceResult")}</div>}

        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t("score")}</span>
            <span className={styles.statValue}>{score}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t("best")}</span>
            <span className={styles.statValue}>{best}</span>
          </div>
        </div>
        <p className={styles.resultMeta}>
          <BittyAmount n={runSats} plus /> · {zone.name[locale]}
        </p>
        {stage === "ask" ? (
          <>
            <p className={styles.askLine}>{t("continueQuestion")}</p>
            <PixelButton
              variant="primary"
              onClick={() => {
                if (payContinue()) gameBridge.emit("continue");
                else setStage("result");
              }}
            >
              <span className={styles.bittyAmount}>
                <BittyCoin />
                {t("payBitty", { price: bits(CONTINUE_PRICE) })}
              </span>
            </PixelButton>
            <PixelButton onClick={() => setStage("result")}>{t("continueNo")}</PixelButton>
          </>
        ) : (
          <>
            {isNewBest && <div className={styles.badge}>{t("newBest")}</div>}
            <PixelButton
              variant="primary"
              className={styles.btnLarge}
              onClick={() => gameBridge.emit("start", { zoneIndex: runStartZone })}
            >
              {t("retry")}
            </PixelButton>
            <div className={styles.row}>
              <PixelButton onClick={() => openShareWindow(score, locale)}>{t("share")}</PixelButton>
              <PixelButton onClick={() => gameBridge.emit("menu")}>{t("menu")}</PixelButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
