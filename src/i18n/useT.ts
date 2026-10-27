import { useCallback } from "react";
import { useGameStore } from "@/game/store";
import { formatBits, translate, type TranslationKey, type TranslationParams } from "./translations";

/** React hook returning a translator bound to the current locale. */
export function useT() {
  const locale = useGameStore((s) => s.locale);
  return useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(locale, key, params),
    [locale],
  );
}

/** Formats an amount of in-game bits in the current locale, e.g. "3 bits". */
export function useBits() {
  const locale = useGameStore((s) => s.locale);
  return useCallback((n: number) => formatBits(locale, n), [locale]);
}
