import { describe, expect, it } from "vitest";
import { gameConfig } from "@/config/game";
import { buildShareUrl, CARD_REVISION, getClientSiteUrl } from "./share";

describe("buildShareUrl", () => {
  it("builds an X intent with score text, url and hashtags", () => {
    const url = new URL(buildShareUrl(42, "en", "https://example.com"));
    expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
    expect(url.searchParams.get("text")).toBe(`I scored 42 in ${gameConfig.name}!`);
    expect(url.searchParams.get("url")).toBe(`https://example.com/?v=${CARD_REVISION}`);
    expect(url.searchParams.get("hashtags")).toBe(gameConfig.share.hashtags.join(","));
  });

  it("uses the Japanese template for ja", () => {
    const url = new URL(buildShareUrl(7, "ja", "https://example.com"));
    expect(url.searchParams.get("text")).toBe(`${gameConfig.name} で 7 点とった！`);
  });

  it("shares the zappybitty domain", () => {
    const url = new URL(buildShareUrl(3, "en", getClientSiteUrl()));
    expect(url.searchParams.get("url")).toBe(`https://zappybitty.vercel.app/?v=${CARD_REVISION}`);
  });
});
