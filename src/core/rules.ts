/**
 * ルール由来の定数。
 *
 * UI にルールの数値を書かないという約束 (AGENTS.md) を守るため、
 * 「20ターン」「手札5枚」「多様性 ×2」のような**ルールが決めた数**はすべてここに置き、
 * core の各モジュールと UI の両方がここから読む。
 * 数値を変えるときは docs/DESIGN.md と docs/CARDS.md も同じ作業内で更新する。
 */

/** 何ターン生き延びれば生存とするか */
export const TURN_LIMIT = 20;

/** クリーンアップで引く枚数 (= 手札の基本枚数) */
export const HAND_SIZE = 5;

/** 1ターンあたりの基本の獲得回数。効果で増える */
export const GAINS_PER_TURN = 1;

/** 最終スコアの配点 (→ docs/DESIGN.md 第7節) */
export const SCORE_WEIGHTS = {
  /** 在来種の種類数1つにつき */
  diversity: 2,
  /** ピラミッドの条件を満たす段階1つにつき */
  pyramid: 5,
  /** 分解者の比率が適正なら */
  cycling: 10,
  /** 頂点捕食者が定着していれば */
  apex: 15,
  /** デッキに残った外来種1枚につき */
  invasive: -5,
  /** デッキに残った駆除カード1枚につき */
  control: -1,
} as const;

/** 「循環効率」で加点される分解者の比率の範囲 */
export const CYCLING_RATIO = { min: 0.1, max: 0.2 } as const;

/**
 * 侵入スケジュール (→ docs/DESIGN.md 第5節)。
 * `fromTurn` 以降、1ターンあたり `pressure` 枚が侵入し、`unlocks` の種が解禁される。
 * 解禁は累積で、後の段階でも前の段階の種は侵入し続ける。
 */
export interface InvasionStage {
  /** この段が始まるターン */
  fromTurn: number;
  /** 1ターンあたりに加算される侵入圧 */
  pressure: number;
  /** この段で新たに解禁される外来種の id */
  unlocks: readonly string[];
}

export const INVASION_SCHEDULE: readonly InvasionStage[] = [
  { fromTurn: 1, pressure: 0, unlocks: [] },
  { fromTurn: 4, pressure: 0.5, unlocks: ["seitaka", "ushigaeru"] },
  { fromTurn: 9, pressure: 1, unlocks: ["zarigani"] },
  { fromTurn: 15, pressure: 1, unlocks: ["bass", "araiguma"] },
];
