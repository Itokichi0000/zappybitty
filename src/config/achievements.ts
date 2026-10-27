import type { Locale } from "./game";

/** Lifetime statistics the achievements are evaluated against. */
export interface PlayerStats {
  runs: number;
  bestScore: number;
  totalScore: number;
  totalSats: number;
  bestCombo: number;
  maxZone: number;
  itemsUsed: number;
  shieldsBroken: number;
  rocketPoints: number;
  continues: number;
  cosmeticsOwned: number;
}

export const EMPTY_STATS: PlayerStats = {
  runs: 0,
  bestScore: 0,
  totalScore: 0,
  totalSats: 0,
  bestCombo: 0,
  maxZone: 0,
  itemsUsed: 0,
  shieldsBroken: 0,
  rocketPoints: 0,
  continues: 0,
  cosmeticsOwned: 0,
};

export interface AchievementDef {
  id: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  /** Reward in bitty (in-game points). */
  reward: number;
  /** Which stat is tracked and the target value (for progress bars). */
  stat: keyof PlayerStats;
  target: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-flight", name: { ja: "はじめての羽ばたき", en: "First Flight" }, description: { ja: "1 回プレイする", en: "Play once" }, reward: 50, stat: "runs", target: 1 },
  { id: "score-10", name: { ja: "ローソク足くぐり", en: "Candle Hopper" }, description: { ja: "スコア 10 を出す", en: "Score 10" }, reward: 100, stat: "bestScore", target: 10 },
  { id: "score-30", name: { ja: "トレーダー見習い", en: "Junior Trader" }, description: { ja: "スコア 30 を出す", en: "Score 30" }, reward: 200, stat: "bestScore", target: 30 },
  { id: "score-60", name: { ja: "ダイヤモンドハンド", en: "Diamond Hands" }, description: { ja: "スコア 60 を出す", en: "Score 60" }, reward: 400, stat: "bestScore", target: 60 },
  { id: "score-100", name: { ja: "TO THE MOON!", en: "To the Moon!" }, description: { ja: "スコア 100 を出す", en: "Score 100" }, reward: 1000, stat: "bestScore", target: 100 },
  { id: "score-150", name: { ja: "世界のトレーダー", en: "Global Trader" }, description: { ja: "スコア 150 を出す", en: "Score 150" }, reward: 1500, stat: "bestScore", target: 150 },
  { id: "score-250", name: { ja: "伝説の bitty", en: "Legendary bitty" }, description: { ja: "スコア 250 を出す", en: "Score 250" }, reward: 3000, stat: "bestScore", target: 250 },
  { id: "runs-10", name: { ja: "常連さん", en: "Regular" }, description: { ja: "10 回プレイする", en: "Play 10 runs" }, reward: 150, stat: "runs", target: 10 },
  { id: "runs-50", name: { ja: "HODLer", en: "HODLer" }, description: { ja: "50 回プレイする", en: "Play 50 runs" }, reward: 500, stat: "runs", target: 50 },
  { id: "runs-200", name: { ja: "マキシマリスト", en: "Maximalist" }, description: { ja: "200 回プレイする", en: "Play 200 runs" }, reward: 2000, stat: "runs", target: 200 },
  { id: "sats-500", name: { ja: "コツコツ開始", en: "Stacking Bitty" }, description: { ja: "累計 500 bitty を集める", en: "Collect 500 bitty in total" }, reward: 100, stat: "totalSats", target: 500 },
  { id: "sats-5000", name: { ja: "bitty の貯金箱", en: "bitty's Piggy Bank" }, description: { ja: "累計 5,000 bitty を集める", en: "Collect 5,000 bitty in total" }, reward: 500, stat: "totalSats", target: 5000 },
  { id: "sats-21000", name: { ja: "21,000 bitty", en: "21,000 bitty" }, description: { ja: "累計 21,000 bitty を集める", en: "Collect 21,000 bitty in total" }, reward: 2100, stat: "totalSats", target: 21000 },
  { id: "combo-10", name: { ja: "コンボ職人", en: "Combo Starter" }, description: { ja: "コンボ 10 を決める", en: "Reach a 10 combo" }, reward: 150, stat: "bestCombo", target: 10 },
  { id: "combo-30", name: { ja: "ノンストップ", en: "Non-stop" }, description: { ja: "コンボ 30 を決める", en: "Reach a 30 combo" }, reward: 500, stat: "bestCombo", target: 30 },
  { id: "zone-3", name: { ja: "東京めぐり", en: "Tokyo Tour" }, description: { ja: "ゾーン 3 に到達", en: "Reach zone 3" }, reward: 200, stat: "maxZone", target: 2 },
  { id: "zone-6", name: { ja: "嵐を越えて", en: "Through the Storm" }, description: { ja: "ゾーン 6 に到達", en: "Reach zone 6" }, reward: 600, stat: "maxZone", target: 5 },
  { id: "zone-7", name: { ja: "月面着陸", en: "Moon Landing" }, description: { ja: "ゾーン 7 に到達", en: "Reach zone 7" }, reward: 1200, stat: "maxZone", target: 6 },
  { id: "zone-8", name: { ja: "ウォール街デビュー", en: "Wall Street Debut" }, description: { ja: "ゾーン 8 に到達", en: "Reach zone 8" }, reward: 1500, stat: "maxZone", target: 7 },
  { id: "zone-12", name: { ja: "富士山頂", en: "Summit of Fuji" }, description: { ja: "ゾーン 12 に到達", en: "Reach zone 12" }, reward: 2500, stat: "maxZone", target: 11 },
  { id: "zone-14", name: { ja: "銀河の果てへ", en: "Edge of the Galaxy" }, description: { ja: "ゾーン 14 に到達", en: "Reach zone 14" }, reward: 4000, stat: "maxZone", target: 13 },
  { id: "items-10", name: { ja: "アイテムコレクター", en: "Item Collector" }, description: { ja: "アイテムを 10 回使う", en: "Use 10 items" }, reward: 200, stat: "itemsUsed", target: 10 },
  { id: "items-50", name: { ja: "アイテムマニア", en: "Item Maniac" }, description: { ja: "アイテムを 50 回使う", en: "Use 50 items" }, reward: 600, stat: "itemsUsed", target: 50 },
  { id: "shield-5", name: { ja: "HODL の鉄壁", en: "Iron HODL" }, description: { ja: "シールドで 5 回助かる", en: "Get saved by the shield 5 times" }, reward: 300, stat: "shieldsBroken", target: 5 },
  { id: "rocket-20", name: { ja: "ロケットマン", en: "Rocket Man" }, description: { ja: "ロケット中に 20 回くぐる", en: "Pass 20 candles on a rocket" }, reward: 400, stat: "rocketPoints", target: 20 },
  { id: "wardrobe-5", name: { ja: "おしゃれ bitty", en: "Stylish bitty" }, description: { ja: "ショップのアイテムを 5 個集める", en: "Own 5 cosmetics" }, reward: 300, stat: "cosmeticsOwned", target: 5 },
  { id: "wardrobe-15", name: { ja: "コレクション完成へ", en: "Collector" }, description: { ja: "ショップのアイテムを 15 個集める", en: "Own 15 cosmetics" }, reward: 1000, stat: "cosmeticsOwned", target: 15 },
  { id: "wardrobe-30", name: { ja: "ファッションリーダー", en: "Trendsetter" }, description: { ja: "ショップのアイテムを 30 個集める", en: "Own 30 cosmetics" }, reward: 2500, stat: "cosmeticsOwned", target: 30 },
];

/** Ids of achievements newly completed given stats and the ids already unlocked. Pure. */
export function newlyUnlocked(stats: PlayerStats, unlocked: string[]): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !unlocked.includes(a.id) && stats[a.stat] >= a.target);
}

/** Per-run counters reported by the game scene. */
export interface RunStats {
  bestCombo: number;
  itemsUsed: number;
  shieldsBroken: number;
  rocketPoints: number;
  continues: number;
}

/** Folds one finished run into the lifetime stats. Pure, so it is unit-tested. */
export function mergeRunStats(
  prev: PlayerStats,
  run: { score: number; runSats: number; zone: number; practice: boolean; cosmeticsOwned: number } & Partial<RunStats>,
): PlayerStats {
  return {
    ...prev,
    runs: prev.runs + 1,
    bestScore: Math.max(prev.bestScore, run.practice ? 0 : run.score),
    totalScore: prev.totalScore + Math.max(0, run.score),
    totalSats: prev.totalSats + Math.max(0, run.runSats),
    bestCombo: Math.max(prev.bestCombo, run.bestCombo ?? 0),
    maxZone: Math.max(prev.maxZone, run.zone),
    itemsUsed: prev.itemsUsed + (run.itemsUsed ?? 0),
    shieldsBroken: prev.shieldsBroken + (run.shieldsBroken ?? 0),
    rocketPoints: prev.rocketPoints + (run.rocketPoints ?? 0),
    continues: prev.continues + (run.continues ?? 0),
    cosmeticsOwned: run.cosmeticsOwned,
  };
}
