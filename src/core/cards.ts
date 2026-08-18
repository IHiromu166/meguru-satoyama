import { CARDS } from "../data/cards";
import { INVASIVES } from "../data/invasives";
import type { CardDef } from "./types";

const definitions = new Map<string, CardDef>([...CARDS, ...INVASIVES].map((card) => [card.id, card]));

/** id に対応するカード定義を返す */
export function cardDefinition(id: string): CardDef | undefined {
  return definitions.get(id);
}
