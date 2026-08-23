import { CARDS } from "../data/cards";
import { INVASIVES } from "../data/invasives";
import { INITIAL_DECK } from "../data/supply";
import { shuffle } from "./rng";
import { GAINS_PER_TURN, HAND_SIZE } from "./rules";
import type { CardInstance, GameState, Zone } from "./types";

export function createInitialState(seed: number): GameState {
  let nextUid = 1;
  const initialCards: CardInstance[] = [];
  for (const [defId, count] of Object.entries(INITIAL_DECK)) {
    for (let index = 0; index < count; index += 1) initialCards.push({ uid: nextUid++, defId });
  }
  const shuffled = shuffle(seed, initialCards);
  return drawCards({ turn: 1, phase: "main", result: "playing", energy: 0, gainsLeft: GAINS_PER_TURN,
    deck: shuffled.value, hand: [], field: [], discard: [], trash: [],
    supply: supplyOf(CARDS), invasivePool: supplyOf(INVASIVES), invasionCounter: 0,
    rng: shuffled.state, nextUid, log: [] }, HAND_SIZE);
}

function supplyOf(cards: readonly { id: string; supply: number }[]): Record<string, number> {
  return Object.fromEntries(cards.map((card) => [card.id, card.supply]));
}

export function moveCard(
  state: GameState, uid: number, from: Zone, to: Zone,
): GameState {
  if (from === to) return state;
  const source = state[from];
  const index = source.findIndex((card) => card.uid === uid);
  if (index < 0) return state;
  const card = source[index];
  return { ...state, [from]: [...source.slice(0, index), ...source.slice(index + 1)], [to]: [...state[to], card] };
}

export function drawCards(state: GameState, count: number): GameState {
  let result = state;
  for (let index = 0; index < count; index += 1) {
    if (result.deck.length === 0 && result.discard.length > 0) {
      const shuffled = shuffle(result.rng, result.discard);
      result = { ...result, deck: shuffled.value, discard: [], rng: shuffled.state };
    }
    if (result.deck.length === 0) break;
    result = { ...result, deck: result.deck.slice(1), hand: [...result.hand, result.deck[0]] };
  }
  return result;
}

export function findCard(state: GameState, uid: number): CardInstance | undefined {
  return [state.deck, state.hand, state.field, state.discard, state.trash].flat().find((card) => card.uid === uid);
}
