import { CARDS } from "../data/cards";
import { INVASIVES } from "../data/invasives";
import type { CardInstance, GameState } from "./types";

function definition(defId: string) { return [...CARDS, ...INVASIVES].find((card) => card.id === defId); }

export function needsPrey(state: GameState, uid: number): boolean {
  return definition(state.hand.find((card) => card.uid === uid)?.defId ?? "")?.kind === "consumer";
}

export function legalPreys(state: GameState, uid: number): CardInstance[] {
  const predator = definition(state.hand.find((card) => card.uid === uid)?.defId ?? "");
  if (!predator || predator.kind !== "consumer") return [];
  const nativePrey = [...state.field, ...state.hand].filter((card) => {
    if (card.uid === uid) return false;
    const def = definition(card.defId);
    return def?.kind !== "invasive" && def?.trophic === predator.trophic - 1;
  });
  const invasivePrey = state.hand.filter((card) => {
    const def = definition(card.defId);
    return def?.kind === "invasive" && predator.eatsInvasive?.includes(def.id);
  });
  return [...nativePrey, ...invasivePrey];
}
