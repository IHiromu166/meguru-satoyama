import type { CardInstance, GameState, Zone } from "./types";

export function createInitialState(_seed: number): GameState {
  throw new Error("未実装");
}

export function moveCard(
  _state: GameState,
  _uid: number,
  _from: Zone,
  _to: Zone,
): GameState {
  throw new Error("未実装");
}

export function drawCards(_state: GameState, _count: number): GameState {
  throw new Error("未実装");
}

export function findCard(_state: GameState, _uid: number): CardInstance | undefined {
  throw new Error("未実装");
}
