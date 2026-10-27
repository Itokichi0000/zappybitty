import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { sfx } from "@/game/audio";
import styles from "./ui.module.css";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "default";
}

/** Chunky pixel-style button with a click blip. Blurs itself so Space/Enter go to the game. */
export default function PixelButton({ variant = "default", className, onClick, children, ...rest }: Props) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    sfx.click();
    e.currentTarget.blur();
    onClick?.(e);
  };
  const classes = [styles.btn, variant === "primary" ? styles.btnPrimary : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={classes} onClick={handleClick} {...rest}>
      {children}
    </button>
  );
}
