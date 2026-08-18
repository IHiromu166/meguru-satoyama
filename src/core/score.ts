import { cardDefinition } from "./cards";
import type { GameState, ScoreBreakdown, Trophic } from "./types";

const deckCards = (state: GameState) => [state.deck, state.hand, state.field, state.discard].flat();

export function scoreOf(state: GameState): ScoreBreakdown {
  if (state.result === "collapsed") return { diversity: 0, pyramid: 0, cycling: 0, apex: 0, invasivePenalty: 0, controlPenalty: 0, total: 0 };
  const cards = deckCards(state);
  const defs = cards.map((card) => cardDefinition(card.defId)).filter((card): card is NonNullable<typeof card> => Boolean(card));
  const counts = trophicCounts(state);
  const diversity = new Set(defs.filter((card) => card.kind === "producer" || card.kind === "consumer" || card.kind === "decomposer").map((card) => card.id)).size * 2;
  const pyramid = ([2, 3, 4] as const).filter((level) => counts[level] < counts[level - 1 as Trophic]).length * 5;
  const decomposers = defs.filter((card) => card.kind === "decomposer").length;
  const cycling = cards.length > 0 && decomposers / cards.length >= .1 && decomposers / cards.length <= .2 ? 10 : 0;
  const apex = counts[4] >= 1 && counts[3] >= counts[4] ? 15 : 0;
  const invasivePenalty = -defs.filter((card) => card.kind === "invasive").length * 5;
  const controlPenalty = -defs.filter((card) => card.kind === "control").length;
  return { diversity, pyramid, cycling, apex, invasivePenalty, controlPenalty, total: diversity + pyramid + cycling + apex + invasivePenalty + controlPenalty };
}

export function trophicCounts(state: GameState): Record<Trophic, number> {
  const counts: Record<Trophic, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const instance of deckCards(state)) { const def = cardDefinition(instance.defId); if (def && def.kind !== "invasive" && def.kind !== "control") counts[def.trophic] += 1; }
  return counts;
}
