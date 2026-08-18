import { beforeAll, describe, expect, it } from "vitest";
import { CARDS } from "../src/data/cards";
import { INVASIVES } from "../src/data/invasives";
import { createGame, playCard, scoreOf } from "../src/core/engine";
import { resolveInvasion, isCollapsed } from "../src/core/invasion";
import type { CardDef, GameState } from "../src/core/types";

const card = (id: string, kind: CardDef["kind"], trophic: CardDef["trophic"], effects: CardDef["effects"] = []): CardDef =>
  ({ id, name: id, kind, trophic, cost: kind === "invasive" ? null : 1, effects, supply: 10, text: id });

function state(overrides: Partial<GameState> = {}): GameState {
  return { turn: 1, phase: "main", result: "playing", energy: 0, gainsLeft: 1, deck: [], hand: [], field: [], discard: [], trash: [], supply: {}, invasivePool: {}, invasionCounter: 0, rng: 1, nextUid: 100, log: [], ...overrides };
}

beforeAll(() => {
  const add = (cards: CardDef[], definition: CardDef) => { if (!cards.some((existing) => existing.id === definition.id)) cards.push(definition); };
  add(CARDS, card("plant", "producer", 1, [{ t: "energy", n: 1 }]));
  add(CARDS, card("grazer", "consumer", 2, [{ t: "draw", n: 1 }]));
  add(CARDS, card("hunter", "consumer", 3, [{ t: "gain", n: 1 }]));
  add(CARDS, card("apex", "consumer", 4));
  add(CARDS, card("worm", "decomposer", 0));
  add(CARDS, card("control", "control", 0));
  add(INVASIVES, { ...card("invader", "invasive", 0), aura: [] });
});

describe("core", () => {
  it("同じシードなら初期状態が同一になる", () => {
    expect(createGame(12345)).toEqual(createGame(12345));
  });

  it("獲物のない消費者は飢餓になり、効果を解決しない", () => {
    const initial = state({ hand: [{ uid: 1, defId: "grazer" }], deck: [{ uid: 2, defId: "plant" }] });
    const result = playCard(initial, 1);
    expect(result.field).toEqual([{ uid: 1, defId: "grazer" }]);
    expect(result.hand).toEqual([]);
    expect(result.deck).toEqual([{ uid: 2, defId: "plant" }]);
  });

  it("場から捕食した獲物が生んだエネルギーは失われない", () => {
    const initial = state({ energy: 3, deck: [{ uid: 3, defId: "plant" }], hand: [{ uid: 2, defId: "grazer" }], field: [{ uid: 1, defId: "plant" }] });
    const result = playCard(initial, 2, 1);
    expect(result.energy).toBe(3);
    expect(result.discard).toEqual([{ uid: 1, defId: "plant" }]);
  });

  it("外来種の山が尽きていれば侵入も増殖もしない", () => {
    const initial = state({ turn: 10, invasionCounter: 0, hand: [{ uid: 1, defId: "invader" }], invasivePool: { invader: 0, seitaka: 0, ushigaeru: 0, zarigani: 0 } });
    expect(resolveInvasion(initial).discard).toEqual([]);
  });

  it("全ゾーンで外来種が過半数なら崩壊する", () => {
    const initial = state({ deck: [{ uid: 1, defId: "invader" }, { uid: 2, defId: "invader" }], hand: [{ uid: 3, defId: "plant" }] });
    expect(isCollapsed(initial)).toBe(true);
  });

  it("設計表どおりにスコアを計算する", () => {
    const initial = state({ result: "survived", deck: [
      { uid: 1, defId: "plant" }, { uid: 2, defId: "plant" }, { uid: 3, defId: "plant" }, { uid: 4, defId: "plant" }, { uid: 5, defId: "plant" },
      { uid: 6, defId: "grazer" }, { uid: 7, defId: "grazer" }, { uid: 8, defId: "grazer" },
      { uid: 9, defId: "hunter" }, { uid: 10, defId: "hunter" }, { uid: 11, defId: "apex" }, { uid: 12, defId: "worm" }, { uid: 13, defId: "control" }, { uid: 14, defId: "invader" }, { uid: 15, defId: "worm" },
    ] });
    expect(scoreOf(initial)).toEqual({ diversity: 10, pyramid: 15, cycling: 10, apex: 15, invasivePenalty: -5, controlPenalty: -1, total: 44 });
  });
});
