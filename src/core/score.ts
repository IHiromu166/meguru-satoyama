import type { GameState, ScoreBreakdown, Trophic } from "./types";

export function scoreOf(_state: GameState): ScoreBreakdown {
  throw new Error("未実装");
}

export function trophicCounts(_state: GameState): Record<Trophic, number> {
  throw new Error("未実装");
}
