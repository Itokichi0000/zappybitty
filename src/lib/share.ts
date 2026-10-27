import { gameConfig, type Locale } from "@/config/game";
import { translate } from "@/i18n/translations";
import { openExternal } from "./external";

/**
 * Share-card revision of the web version, added to shared links as ?v=. X keeps the card it
 * saw for each exact URL; the web version bumps it when its card changes.
 */
export const CARD_REVISION = 3;

/** The page URL to share: the site plus the card revision. */
export function shareLink(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}/?v=${CARD_REVISION}`;
}

/** Builds an X (Twitter) post-intent URL with the score, site URL and hashtags. */
export function buildShareUrl(score: number, locale: Locale, siteUrl: string): string {
  const text = translate(locale, "shareText", { score, name: gameConfig.name });
  const params = new URLSearchParams();
  params.set("text", text);
  params.set("url", shareLink(siteUrl));
  if (gameConfig.share.hashtags.length > 0) {
    params.set("hashtags", gameConfig.share.hashtags.join(","));
  }
  return `https://x.com/intent/post?${params.toString()}`;
}

/** Public game URL for shares (the web version). */
export function getClientSiteUrl(): string {
  return gameConfig.share.url;
}

/** Opens the X post dialog. */
export function openShareWindow(score: number, locale: Locale): void {
  openExternal(buildShareUrl(score, locale, getClientSiteUrl()));
}
