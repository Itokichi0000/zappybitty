import { sfx } from "@/game/audio";
import { useGameStore } from "@/game/store";
import { FLAP_SOUNDS, LEVELS, MUSIC_TRACKS, type FlapSound, type Level, type MusicTrack } from "@/game/soundSettings";
import { useT } from "@/i18n/useT";
import type { TranslationKey } from "@/i18n/translations";
import ModalHeader from "./ModalHeader";
import PixelButton from "./PixelButton";
import styles from "./ui.module.css";

const TRACK_LABEL: Record<MusicTrack, TranslationKey> = {
  auto: "trackAuto",
  pop: "trackPop",
  chill: "trackChill",
  upbeat: "trackUpbeat",
  space: "trackSpace",
};
const FLAP_LABEL: Record<FlapSound, TranslationKey> = {
  classic: "flapClassic",
  soft: "flapSoft",
  pop: "flapPop",
  wing: "flapWing",
  none: "flapNone",
};
const LEVEL_LABEL: Record<Level, TranslationKey> = { 1: "levelLow", 2: "levelMid", 3: "levelHigh" };

/** Music choice, music / effect volume and the flap sound. Every change applies at once. */
export default function SoundPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const music = useGameStore((s) => s.music);
  const muted = useGameStore((s) => s.muted);
  const sound = useGameStore((s) => s.sound);
  const setMusic = useGameStore((s) => s.setMusic);
  const setMuted = useGameStore((s) => s.setMuted);
  const setSound = useGameStore((s) => s.setSound);

  const choice = (selected: boolean, label: string, onClick: () => void) => (
    <PixelButton key={label} variant={selected ? "primary" : "default"} aria-pressed={selected} onClick={onClick}>
      {label}
    </PixelButton>
  );

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t("soundTitle")}>
      <div className={styles.modalPanel}>
        <ModalHeader title={t("soundTitle")} onClose={onClose} />

        <p className={styles.hint}>{t("soundMusicTrack")}</p>
        <div className={styles.choiceGrid}>
          {MUSIC_TRACKS.map((track) =>
            choice(music && sound.track === track, t(TRACK_LABEL[track]), () => {
              setSound({ track });
              if (!music) setMusic(true);
            }),
          )}
        </div>
        <p className={styles.muted}>{t("soundAutoNote")}</p>

        <p className={styles.hint}>{t("soundMusicVolume")}</p>
        <div className={styles.row}>
          {choice(!music, t("levelOff"), () => setMusic(false))}
          {LEVELS.map((level) =>
            choice(music && sound.musicLevel === level, t(LEVEL_LABEL[level]), () => {
              setSound({ musicLevel: level });
              if (!music) setMusic(true);
            }),
          )}
        </div>

        <p className={styles.hint}>{t("soundSfxVolume")}</p>
        <div className={styles.row}>
          {choice(muted, t("levelOff"), () => setMuted(true))}
          {LEVELS.map((level) =>
            choice(!muted && sound.sfxLevel === level, t(LEVEL_LABEL[level]), () => {
              setSound({ sfxLevel: level });
              if (muted) setMuted(false);
              // Let the click blip finish, then preview the new level with a flap.
              window.setTimeout(() => sfx.flap(), 140);
            }),
          )}
        </div>

        <p className={styles.hint}>{t("soundFlap")}</p>
        <div className={styles.choiceGrid}>
          {FLAP_SOUNDS.map((flap) =>
            choice(sound.flap === flap, t(FLAP_LABEL[flap]), () => {
              setSound({ flap });
              window.setTimeout(() => sfx.flap(), 140);
            }),
          )}
        </div>

        <PixelButton onClick={onClose}>{t("close")}</PixelButton>
      </div>
    </div>
  );
}
