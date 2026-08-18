import { describe, expect, it } from "vitest";
import { advancePhase, createGame, playCard, scoreOf } from "../src/core/engine";
import { resolveEffects } from "../src/core/effects";
import { resolveInvasion, isCollapsed } from "../src/core/invasion";
import { moveCard } from "../src/core/state";
import type { CardDef, GameState } from "../src/core/types";

function state(overrides: Partial<GameState> = {}): GameState {
  return { turn: 1, phase: "main", result: "playing", energy: 0, gainsLeft: 1, deck: [], hand: [], field: [], discard: [], trash: [], supply: {}, invasivePool: {}, invasionCounter: 0, rng: 1, nextUid: 100, log: [], ...overrides };
}

describe("core", () => {
  it("同じシードなら初期状態が同一になる", () => {
    expect(createGame(12345)).toEqual(createGame(12345));
  });

  it("獲物のない消費者は飢餓になり、効果を解決しない", () => {
    const initial = state({ hand: [{ uid: 1, defId: "batta" }], deck: [{ uid: 2, defId: "susuki" }] });
    const result = playCard(initial, 1);
    expect(result.field).toEqual([{ uid: 1, defId: "batta" }]);
    expect(result.hand).toEqual([]);
    expect(result.deck).toEqual([{ uid: 2, defId: "susuki" }]);
  });

  it("場から捕食した獲物が生んだエネルギーは失われない", () => {
    const initial = state({ energy: 3, deck: [{ uid: 3, defId: "susuki" }], hand: [{ uid: 2, defId: "batta" }], field: [{ uid: 1, defId: "susuki" }] });
    const result = playCard(initial, 2, 1);
    expect(result.energy).toBe(4);
    expect(result.discard).toEqual([{ uid: 1, defId: "susuki" }]);
  });

  it("外来種の山が尽きていれば侵入も増殖もしない", () => {
    const initial = state({ turn: 10, hand: [{ uid: 1, defId: "ushigaeru" }], invasivePool: { seitaka: 0, ushigaeru: 0, zarigani: 0 } });
    expect(resolveInvasion(initial).discard).toEqual([]);
  });

  it("全ゾーンで外来種が過半数なら崩壊する", () => {
    const initial = state({ deck: [{ uid: 1, defId: "seitaka" }, { uid: 2, defId: "ushigaeru" }], hand: [{ uid: 3, defId: "susuki" }] });
    expect(isCollapsed(initial)).toBe(true);
  });

  it("設計表どおりにスコアを計算する", () => {
    const initial = state({ result: "survived", deck: [
      { uid: 1, defId: "susuki" }, { uid: 2, defId: "susuki" }, { uid: 3, defId: "susuki" }, { uid: 4, defId: "susuki" }, { uid: 5, defId: "susuki" },
      { uid: 6, defId: "batta" }, { uid: 7, defId: "batta" }, { uid: 8, defId: "batta" },
      { uid: 9, defId: "tagame" }, { uid: 10, defId: "tagame" }, { uid: 11, defId: "ootaka" }, { uid: 12, defId: "mimizu" }, { uid: 13, defId: "wana" }, { uid: 14, defId: "seitaka" }, { uid: 15, defId: "mimizu" },
    ] });
    expect(scoreOf(initial)).toEqual({ diversity: 10, pyramid: 15, cycling: 10, apex: 15, invasivePenalty: -5, controlPenalty: -1, total: 44 });
  });

  it("producerEnergy の aura は生産者のエネルギーを減らす", () => {
    const result = playCard(state({ hand: [{ uid: 1, defId: "susuki" }, { uid: 2, defId: "seitaka" }] }), 1);
    expect(result.energy).toBe(0);
  });

  it("blockDecomposer の aura は分解者の効果を無効化する", () => {
    const result = playCard(state({ hand: [{ uid: 1, defId: "mimizu" }, { uid: 2, defId: "zarigani" }], discard: [{ uid: 3, defId: "susuki" }] }), 1);
    expect(result.discard).toEqual([{ uid: 3, defId: "susuki" }]);
    expect(result.deck).toEqual([]);
  });

  it("extraSpread の aura は外来種を追加で増殖させる", () => {
    const result = resolveInvasion(state({ hand: [{ uid: 1, defId: "ushigaeru" }], invasivePool: { ushigaeru: 2 } }));
    expect(result.discard).toEqual([{ uid: 100, defId: "ushigaeru" }, { uid: 101, defId: "ushigaeru" }]);
  });

  it("eatConsumer の aura は場の消費者を捨て札でなく廃棄へ送る", () => {
    const result = advancePhase(state({ phase: "cleanup", hand: [{ uid: 1, defId: "bass" }], field: [{ uid: 2, defId: "batta" }], deck: [
      { uid: 3, defId: "susuki" }, { uid: 4, defId: "susuki" }, { uid: 5, defId: "susuki" }, { uid: 6, defId: "susuki" }, { uid: 7, defId: "susuki" },
    ] }));
    expect(result.trash).toEqual([{ uid: 2, defId: "batta" }]);
    expect(result.discard).toEqual([{ uid: 1, defId: "bass" }]);
  });

  it("eatConsumer の aura は場に候補がなければ捨て札の消費者を廃棄する", () => {
    const result = advancePhase(state({ phase: "cleanup", hand: [{ uid: 1, defId: "bass" }], discard: [{ uid: 2, defId: "batta" }], deck: [
      { uid: 3, defId: "susuki" }, { uid: 4, defId: "susuki" }, { uid: 5, defId: "susuki" }, { uid: 6, defId: "susuki" }, { uid: 7, defId: "susuki" },
    ] }));
    expect(result.trash).toEqual([{ uid: 2, defId: "batta" }]);
    expect(result.discard).toEqual([{ uid: 1, defId: "bass" }]);
  });

  it("同じゾーンへの moveCard はカードを複製しない", () => {
    const initial = state({ hand: [{ uid: 1, defId: "susuki" }] });
    expect(moveCard(initial, 1, "hand", "hand")).toEqual(initial);
  });

  it("trash を対象にした trashInvasive はカードを複製しない", () => {
    const effect: CardDef = { id: "test", name: "test", kind: "control", trophic: 0, cost: 0, effects: [{ t: "trashInvasive", n: 1, from: ["trash"] }], supply: 0, text: "" };
    const result = resolveEffects(state({ trash: [{ uid: 1, defId: "seitaka" }] }), effect);
    expect(result.trash).toEqual([{ uid: 1, defId: "seitaka" }]);
  });
});
