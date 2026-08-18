import { cardDefinition } from "./cards";
import { nextInt } from "./rng";
import type { CardInstance, GameState } from "./types";

function addInvasive(state: GameState, allowed: readonly string[]): GameState {
  const candidates = allowed.filter((id) => (state.invasivePool[id] ?? 0) > 0);
  if (candidates.length === 0) return state;
  const random = nextInt(state.rng, candidates.length);
  const defId = candidates[random.value];
  const card: CardInstance = { uid: state.nextUid, defId };
  return { ...state, rng: random.state, nextUid: state.nextUid + 1, discard: [...state.discard, card], invasivePool: { ...state.invasivePool, [defId]: state.invasivePool[defId] - 1 } };
}

function appendLog(state: GameState, text: string): GameState {
  return { ...state, log: [...state.log, { turn: state.turn, text }] };
}

/** 指定ターンに加算される侵入圧 */
export function invasionPressure(turn: number): number {
  return turn < 4 ? 0 : turn < 9 ? 0.5 : 1;
}

export function resolveInvasion(state: GameState): GameState {
  const allowed = state.turn < 9 ? ["seitaka", "ushigaeru"] : state.turn < 15 ? ["seitaka", "ushigaeru", "zarigani"] : ["seitaka", "ushigaeru", "zarigani", "bass", "araiguma"];
  const pressure = invasionPressure(state.turn);
  let result = { ...state, invasionCounter: state.invasionCounter + pressure };
  while (result.invasionCounter >= 1) {
    const invaded = addInvasive(result, allowed);
    if (invaded !== result) {
      const instance = invaded.discard[invaded.discard.length - 1];
      result = appendLog(invaded, `${cardDefinition(instance.defId)!.name}が1枚侵入した`);
    }
    result = { ...result, invasionCounter: result.invasionCounter - 1 };
  }
  for (const instance of state.hand) {
    const def = cardDefinition(instance.defId);
    if (def?.kind !== "invasive") continue;
    const extra = def?.aura?.find((aura) => aura.t === "extraSpread");
    const spread = 1 + (extra?.t === "extraSpread" ? extra.n : 0);
    const before = result.invasivePool[instance.defId] ?? 0;
    for (let index = 0; index < spread; index += 1) result = addInvasive(result, [instance.defId]);
    const added = before - (result.invasivePool[instance.defId] ?? 0);
    if (added > 0) result = appendLog(result, `${def.name}が${added}枚増えた`);
  }
  return result;
}

export function isCollapsed(state: GameState): boolean {
  const cards = [state.deck, state.hand, state.field, state.discard].flat();
  return cards.length > 0 && cards.filter((instance) => cardDefinition(instance.defId)?.kind === "invasive").length > cards.length / 2;
}
