import type { CardDef } from "../core/types";

export const INITIAL_DECK: Readonly<Record<string, number>> = {};

export function createSupply(_cards: readonly CardDef[]): Record<string, number> {
  throw new Error("未実装");
}
