import type { CardInstance, GameState } from "./types";

export function needsPrey(_state: GameState, _uid: number): boolean {
  throw new Error("未実装");
}

export function legalPreys(_state: GameState, _uid: number): CardInstance[] {
  throw new Error("未実装");
}
