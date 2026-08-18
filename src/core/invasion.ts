import { INVASIVES } from "../data/invasives";
import { nextInt } from "./rng";
import type { CardInstance, GameState } from "./types";

const definition = (id: string) => INVASIVES.find((card) => card.id === id);

function addInvasive(state: GameState, allowed: readonly string[]): GameState {
  const candidates = allowed.filter((id) => (state.invasivePool[id] ?? 0) > 0);
  if (candidates.length === 0) return state;
  const random = nextInt(state.rng, candidates.length);
  const defId = candidates[random.value];
  const card: CardInstance = { uid: state.nextUid, defId };
  return { ...state, rng: random.state, nextUid: state.nextUid + 1, discard: [...state.discard, card], invasivePool: { ...state.invasivePool, [defId]: state.invasivePool[defId] - 1 } };
}

export function resolveInvasion(state: GameState): GameState {
  const allowed = state.turn < 9 ? ["seitaka", "ushigaeru"] : state.turn < 15 ? ["seitaka", "ushigaeru", "zarigani"] : ["seitaka", "ushigaeru", "zarigani", "bass", "araiguma"];
  const pressure = state.turn < 4 ? 0 : state.turn < 9 ? 0.5 : 1;
  let result = { ...state, invasionCounter: state.invasionCounter + pressure };
  while (result.invasionCounter >= 1) {
    result = { ...addInvasive(result, allowed), invasionCounter: result.invasionCounter - 1 };
  }
  for (const instance of state.hand) {
    const def = definition(instance.defId);
    const extra = def?.aura?.find((aura) => aura.t === "extraSpread");
    const spread = 1 + (extra?.t === "extraSpread" ? extra.n : 0);
    for (let index = 0; index < spread; index += 1) result = addInvasive(result, [instance.defId]);
  }
  return result;
}

export function isCollapsed(state: GameState): boolean {
  const cards = [state.deck, state.hand, state.field, state.discard].flat();
  return cards.length > 0 && cards.filter((instance) => definition(instance.defId)).length > cards.length / 2;
}
