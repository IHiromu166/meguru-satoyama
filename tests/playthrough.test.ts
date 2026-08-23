import { describe, expect, it } from "vitest";
import { advancePhase, canPlay, createGame, gainCard, legalPreys, needsPrey, playCard, scoreOf } from "../src/core/engine";
import { cardDefinition } from "../src/core/cards";
import { CARDS } from "../src/data/cards";
import type { CardDef, CardInstance, GameState } from "../src/core/types";

// 20ターンを最後まで進めきる通しテスト。
// UI を通さずに engine の公開 API だけでゲームを1回完走させ、生存 (survived) と
// 崩壊 (collapsed) の両方の終わり方を実際に踏む。単体テストが個々の関数を見るのに対し、
// ここはフェイズ遷移が20ターン繋がったときに壊れないことを見る。

const SEED = 20260823;

/** 全ゾーンのカード。uid の重複検査と枚数の保存則に使う */
const allCards = (state: GameState): CardInstance[] =>
  [state.deck, state.hand, state.field, state.discard, state.trash].flat();

const definitionOf = (instance: CardInstance): CardDef => cardDefinition(instance.defId)!;
const isInvasive = (instance: CardInstance): boolean => definitionOf(instance).kind === "invasive";

// ---------- 自動プレイヤー ----------
// 人がやりそうな最低限の判断だけを入れる。強さの追求はしない。
// 「何をしても崩壊する / 何もしなくても生存する」ではないことを示すのが目的なので、
// 判断の中身は下の passivePlayout (何もしない) との対比で意味を持つ。

/** プレイ順の優先度。小さいほど先。99 は「今は出さない」 */
function playPriority(state: GameState, uid: number): number {
  const card = definitionOf(state.hand.find((instance) => instance.uid === uid)!);
  if (card.kind === "control") {
    // 駆除は外来種がいるときだけ。いないなら手札に温存する
    return [...state.hand, ...state.discard].some(isInvasive) ? 0 : 99;
  }
  // 在来天敵ルート。外来種を捕食できるならそれが最優先 (捨て札でなく廃棄になる)
  if (card.kind === "consumer" && legalPreys(state, uid).some(isInvasive)) return 1;
  if (card.kind === "producer") return 2;
  // 消費者は低い段階から。先に出した消費者が上位の獲物になる
  if (card.kind === "consumer") return legalPreys(state, uid).length > 0 ? 3 + card.trophic : 99;
  if (card.kind === "decomposer") return 10;
  return 99;
}

/** 捕食対象の選択。外来種 > 場の在来種 > 手札の在来種 */
function pickPrey(state: GameState, uid: number): number | undefined {
  const preys = legalPreys(state, uid);
  const invasive = preys.find(isInvasive);
  if (invasive) return invasive.uid;
  const inField = preys.find((prey) => state.field.some((instance) => instance.uid === prey.uid));
  // 場の生産者は既にエネルギーを生んでいるので、手札から食べるより損が小さい
  return (inField ?? preys[0])?.uid;
}

function mainPhase(state: GameState): GameState {
  let result = state;
  for (let guard = 0; guard < 40; guard += 1) {
    const playable = result.hand
      .filter((instance) => canPlay(result, instance.uid))
      .map((instance) => ({ uid: instance.uid, priority: playPriority(result, instance.uid) }))
      .filter((candidate) => candidate.priority < 99)
      .sort((a, b) => a.priority - b.priority);
    if (playable.length === 0) break;
    const uid = playable[0].uid;
    const next = needsPrey(result, uid) ? playCard(result, uid, pickPrey(result, uid)) : playCard(result, uid);
    if (next === result) break; // プレイできなかった。無限ループを避ける
    result = next;
  }
  return result;
}

function gainPhase(state: GameState): GameState {
  let result = state;
  for (let guard = 0; guard < 10 && result.gainsLeft > 0; guard += 1) {
    // 外来種が溜まってきたら駆除を優先し、そうでなければ買える中で最も高いものを買う
    const pressured = allCards(result).filter(isInvasive).length >= 3;
    const affordable = CARDS.filter((card) => card.cost !== null && card.cost <= result.energy && (result.supply[card.id] ?? 0) > 0);
    if (affordable.length === 0) break;
    const ranked = affordable.slice().sort((a, b) => value(b, pressured) - value(a, pressured));
    const next = gainCard(result, ranked[0].id);
    if (next === result) break;
    result = next;
  }
  return result;
}

function value(card: CardDef, pressured: boolean): number {
  if (card.kind === "control") return pressured ? 90 + (card.cost ?? 0) : -50;
  return card.cost ?? 0;
}

/** 1ターン分 (メイン → 獲得 → 侵入 → クリーンアップ) を進める */
function playTurn(state: GameState): GameState {
  let result = advancePhase(mainPhase(state));
  if (result.result !== "playing") return result;
  result = advancePhase(gainPhase(result));
  if (result.result !== "playing") return result;
  return advancePhase(advancePhase(result));
}

/** 何も操作せずフェイズだけ送り続ける。侵入に対処しなければどうなるかの対照 */
function passivePlayout(seed: number): GameState {
  let state = createGame(seed);
  for (let guard = 0; guard < 100 && state.result === "playing"; guard += 1) {
    state = advancePhase(advancePhase(advancePhase(advancePhase(state))));
  }
  return state;
}

describe("20ターンの通しプレイ", () => {
  it("シード固定で20ターンを完走し、生存で終わる", () => {
    let state = createGame(SEED);
    const seen: GameState[] = [];
    for (let guard = 0; guard < 100 && state.result === "playing"; guard += 1) {
      const before = state.turn;
      state = playTurn(state);
      seen.push(state);
      // 1ターンにつきターン番号が1つだけ進む (途中で終わった場合は据え置き)
      expect(state.turn).toBe(state.result === "playing" ? before + 1 : before);
      // カードが複製されていないこと。20ターン分のゾーン移動で uid が重複しないか見る
      const uids = allCards(state).map((instance) => instance.uid);
      expect(new Set(uids).size).toBe(uids.length);
    }
    expect(state.result).toBe("survived");
    expect(state.phase).toBe("over");
    expect(state.turn).toBe(20);
    expect(seen).toHaveLength(20);
    expect(state.log.length).toBeGreaterThan(0);
  });

  it("完走後もスコアが計算でき、内訳の合計が total と一致する", () => {
    let state = createGame(SEED);
    for (let guard = 0; guard < 100 && state.result === "playing"; guard += 1) state = playTurn(state);
    const score = scoreOf(state);
    const { total, ...parts } = score;
    expect(Object.values(parts).reduce((sum, part) => sum + part, 0)).toBe(total);
    expect(Number.isFinite(total)).toBe(true);
  });

  it("同じシードなら通しプレイの結果も同一になる", () => {
    const run = (): GameState => {
      let state = createGame(SEED);
      for (let guard = 0; guard < 100 && state.result === "playing"; guard += 1) state = playTurn(state);
      return state;
    };
    expect(run()).toEqual(run());
  });

  it("何も対処しなければ20ターンより前に崩壊する", () => {
    const state = passivePlayout(SEED);
    expect(state.result).toBe("collapsed");
    expect(state.phase).toBe("over");
    expect(state.turn).toBeLessThan(20);
  });
});
