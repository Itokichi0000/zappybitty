/**
 * Game-wide configuration. The game runs entirely on the device: no server,
 * no accounts, nothing here is secret.
 */
export type Locale = "ja" | "en";

export const gameConfig = {
  /** Working title. Change it here and it propagates to the UI and <title>. */
  name: "Zappy Bitty",

  /** Short tagline shown under the title. */
  tagline: {
    ja: "タップで羽ばたけ！",
    en: "Tap to flap!",
  } satisfies Record<Locale, string>,

  /** One-line description of the game. */
  description: {
    ja: "bitty くんがローソク足チャートをくぐり抜けるワンタップゲーム。",
    en: "A one-tap game where bitty flaps through candlestick charts.",
  } satisfies Record<Locale, string>,

  /** Creator credit shown in the footer. */
  organization: {
    name: "Matthew",
    shortName: "Matthew",
    /** Leave empty until a link is wanted. */
    url: "",
  },

  /** Share-on-X settings. Hashtags are listed without the leading "#". */
  share: {
    /** The web version every share links to. */
    url: "https://zappybitty.vercel.app",
    hashtags: ["ZappyBitty", "Bitcoin"],
  },

  /** Source code, linked from the settings. */
  sourceUrl: "https://github.com/Itokichi0000/zappybitty",

  /**
   * Lightning Address for the "♥ Support" button, which opens the player's wallet app.
   * Leave empty to hide the button.
   */
  lightningAddress: "saltedbowling30@walletofsatoshi.com" as string,

  /** Default UI locale when the browser language is neither ja nor en. */
  fallbackLocale: "en" as Locale,
} as const;
