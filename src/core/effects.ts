import { cardDefinition } from "./cards";
import { drawCards } from "./state";
import type { CardDef, GameState } from "./types";

export function resolveEffects(state: GameState, card: CardDef): GameState {
  if (card.kind === "decomposer" && state.hand.some((instance) => cardDefinition(instance.defId)?.aura?.some((aura) => aura.t === "blockDecomposer"))) return state;
  return card.effects.reduce((result, effect) => {
    if (effect.t === "draw") return drawCards(result, effect.n);
    if (effect.t === "energy") return { ...result, energy: result.energy + effect.n };
    if (effect.t === "gain") return { ...result, gainsLeft: result.gainsLeft + effect.n };
    if (effect.t === "recycle") {
      const preferred = result.discard.filter((instance) => !effect.kind || cardDefinition(instance.defId)?.kind === effect.kind);
      const others = result.discard.filter((instance) => !preferred.includes(instance));
      const returned = [...preferred, ...others].slice(0, effect.n);
      return { ...result, deck: [...returned, ...result.deck], discard: result.discard.filter((instance) => !returned.includes(instance)) };
    }
    let next = result;
    for (const zone of effect.from) {
      if (zone === "trash") continue;
      const victims = next[zone].filter((instance) => cardDefinition(instance.defId)?.kind === "invasive").slice(0, effect.n - (next.trash.length - result.trash.length));
      next = { ...next, [zone]: next[zone].filter((instance) => !victims.includes(instance)), trash: [...next.trash, ...victims] };
    }
    return next;
  }, state);
}
