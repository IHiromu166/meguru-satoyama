import type { CardInstance, GameState, ScoreBreakdown, Trophic } from "./types";

/** 初期状態を作る。同じ seed からは必ず同じ展開になる */
export function createGame(_seed: number): GameState {
  throw new Error("未実装");
}

/** カードをプレイする。捕食が必要な場合は preyUid を渡す */
export function playCard(_state: GameState, _uid: number, _preyUid?: number): GameState {
  throw new Error("未実装");
}

/** 供給からカードを獲得する */
export function gainCard(_state: GameState, _defId: string): GameState {
  throw new Error("未実装");
}

/** 現在のフェイズを終えて次に進める */
export function advancePhase(_state: GameState): GameState {
  throw new Error("未実装");
}

/** そのカードが今プレイ可能か */
export function canPlay(_state: GameState, _uid: number): boolean {
  throw new Error("未実装");
}

/** そのカードの捕食対象になりうるカードの一覧。空配列なら飢餓になる */
export function legalPreys(_state: GameState, _uid: number): CardInstance[] {
  throw new Error("未実装");
}

/** そのカードが捕食を必要とするか */
export function needsPrey(_state: GameState, _uid: number): boolean {
  throw new Error("未実装");
}

/** 今の状態でのスコア内訳 */
export function scoreOf(_state: GameState): ScoreBreakdown {
  throw new Error("未実装");
}

/** 段階ごとのカード枚数。可視化とスコアの両方で使う */
export function trophicCounts(_state: GameState): Record<Trophic, number> {
  throw new Error("未実装");
}
