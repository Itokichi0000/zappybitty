import { describe, expect, it } from "vitest";
import { translate, translations } from "./translations";

describe("translations", () => {
  it("has the same keys in every locale", () => {
    const ja = Object.keys(translations.ja).sort();
    const en = Object.keys(translations.en).sort();
    expect(en).toEqual(ja);
  });

  it("substitutes placeholders and leaves unknown ones untouched", () => {
    expect(translate("en", "shareText", { score: 3, name: "X" })).toBe("I scored 3 in X!");
    expect(translate("en", "shareText", { score: 3 })).toBe("I scored 3 in {name}!");
  });
});
