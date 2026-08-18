import type { CardDef } from "../core/types";

/** 初期デッキの構成 (ススキ×7 + ミミズ×3)。供給の枚数からは独立した別枠 */
export const INITIAL_DECK: Readonly<Record<string, number>> = {
  susuki: 7,
  mimizu: 3,
};

/** カード定義の一覧から defId -> 残枚数 の供給テーブルを作る */
export function createSupply(cards: readonly CardDef[]): Record<string, number> {
  const supply: Record<string, number> = {};
  for (const card of cards) {
    supply[card.id] = card.supply;
  }
  return supply;
}
