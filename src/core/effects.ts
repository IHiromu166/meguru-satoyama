import { CARDS } from "../data/cards";
import { INVASIVES } from "../data/invasives";
import { drawCards } from "./state";
import type { CardDef, GameState } from "./types";

const definition = (id: string) => [...CARDS, ...INVASIVES].find((card) => card.id === id);

export function resolveEffects(state: GameState, card: CardDef): GameState {
  if (card.kind === "decomposer" && state.hand.some((instance) => definition(instance.defId)?.aura?.some((aura) => aura.t === "blockDecomposer"))) return state;
  return card.effects.reduce((result, effect) => {
    if (effect.t === "draw") return drawCards(result, effect.n);
    if (effect.t === "energy") return { ...result, energy: result.energy + effect.n };
    if (effect.t === "gain") return { ...result, gainsLeft: result.gainsLeft + effect.n };
    if (effect.t === "recycle") {
      const preferred = result.discard.filter((instance) => !effect.kind || definition(instance.defId)?.kind === effect.kind);
      const others = result.discard.filter((instance) => !preferred.includes(instance));
      const returned = [...preferred, ...others].slice(0, effect.n);
      return { ...result, deck: [...returned, ...result.deck], discard: result.discard.filter((instance) => !returned.includes(instance)) };
    }
    let next = result;
    for (const zone of effect.from) {
      const victims = next[zone].filter((instance) => definition(instance.defId)?.kind === "invasive").slice(0, effect.n - (next.trash.length - result.trash.length));
      next = { ...next, [zone]: next[zone].filter((instance) => !victims.includes(instance)), trash: [...next.trash, ...victims] };
    }
    return next;
  }, state);
}
