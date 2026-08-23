import { CARDS } from "../data/cards";
import { cardDefinition } from "./cards";
import { resolveEffects } from "./effects";
import { resolveInvasion, isCollapsed } from "./invasion";
import { legalPreys as findLegalPreys, needsPrey as cardNeedsPrey } from "./predation";
import { GAINS_PER_TURN, HAND_SIZE, TURN_LIMIT } from "./rules";
import { scoreOf as calculateScore, trophicCounts as calculateTrophicCounts } from "./score";
import { createInitialState, drawCards } from "./state";
import type { CardInstance, GameState, ScoreBreakdown, Trophic } from "./types";

const log = (state: GameState, text: string): GameState => ({ ...state, log: [...state.log, { turn: state.turn, text }] });

/** 初期状態を作る。同じ seed からは必ず同じ展開になる */
export function createGame(seed: number): GameState {
  return createInitialState(seed);
}

/** カードをプレイする。捕食が必要な場合は preyUid を渡す */
export function playCard(state: GameState, uid: number, preyUid?: number): GameState {
  if (!canPlay(state, uid)) return state;
  const instance = state.hand.find((card) => card.uid === uid)!;
  const card = cardDefinition(instance.defId)!;
  let result: GameState = { ...state, hand: state.hand.filter((candidate) => candidate.uid !== uid), field: [...state.field, instance] };
  if (cardNeedsPrey(state, uid)) {
    const prey = findLegalPreys(state, uid).find((candidate) => candidate.uid === preyUid);
    if (!prey) return log(result, `${card.name}は飢餓になった`);
    const preyDef = cardDefinition(prey.defId)!;
    if (state.hand.some((candidate) => candidate.uid === prey.uid)) result = { ...result, hand: result.hand.filter((candidate) => candidate.uid !== prey.uid) };
    else result = { ...result, field: result.field.filter((candidate) => candidate.uid !== prey.uid) };
    result = preyDef.kind === "invasive" ? { ...result, trash: [...result.trash, prey] } : { ...result, discard: [...result.discard, prey] };
  }
  if (card.kind === "producer") {
    const modifier = state.hand.reduce((total, candidate) => total + (cardDefinition(candidate.defId)?.aura ?? []).reduce((sum, aura) => sum + (aura.t === "producerEnergy" ? aura.n : 0), 0), 0);
    result = { ...result, energy: result.energy + Math.max(0, (card.energy ?? 0) + modifier) };
  }
  return log(resolveEffects(result, card), `${card.name}をプレイした`);
}

/** 供給からカードを獲得する */
export function gainCard(state: GameState, defId: string): GameState {
  if (state.phase !== "gain" || state.gainsLeft <= 0 || (state.supply[defId] ?? 0) <= 0) return state;
  const card = CARDS.find((candidate) => candidate.id === defId);
  if (!card || card.cost === null || state.energy < card.cost) return state;
  const instance = { uid: state.nextUid, defId };
  return log({ ...state, energy: state.energy - card.cost, gainsLeft: state.gainsLeft - 1, nextUid: state.nextUid + 1, discard: [...state.discard, instance], supply: { ...state.supply, [defId]: state.supply[defId] - 1 } }, `${card.name}を獲得した`);
}

/** 現在のフェイズを終えて次に進める */
export function advancePhase(state: GameState): GameState {
  if (state.result !== "playing") return state;
  if (state.phase === "main") return { ...state, phase: "gain" };
  if (state.phase === "gain") {
    const invaded = resolveInvasion(state);
    return isCollapsed(invaded)
      ? log({ ...invaded, phase: "over", result: "collapsed" }, "外来種が過半数に達した")
      : { ...invaded, phase: "invasion" };
  }
  if (state.phase === "invasion") return { ...state, phase: "cleanup" };
  if (state.phase !== "cleanup") return state;
  let result = cleanup(state);
  if (isCollapsed(result)) return { ...result, phase: "over", result: "collapsed" };
  if (state.turn >= TURN_LIMIT) return { ...result, phase: "over", result: "survived" };
  result = { ...result, turn: state.turn + 1, phase: "main", energy: 0, gainsLeft: GAINS_PER_TURN };
  return result;
}

/** そのカードが今プレイ可能か */
export function canPlay(state: GameState, uid: number): boolean {
  const card = state.hand.find((candidate) => candidate.uid === uid);
  return state.phase === "main" && state.result === "playing" && card !== undefined && cardDefinition(card.defId)?.kind !== "invasive";
}

/** そのカードの捕食対象になりうるカードの一覧。空配列なら飢餓になる */
export function legalPreys(state: GameState, uid: number): CardInstance[] {
  return findLegalPreys(state, uid);
}

/** そのカードが捕食を必要とするか */
export function needsPrey(state: GameState, uid: number): boolean {
  return cardNeedsPrey(state, uid);
}

/** 今の状態でのスコア内訳 */
export function scoreOf(state: GameState): ScoreBreakdown {
  return calculateScore(state);
}

/** 段階ごとのカード枚数。可視化とスコアの両方で使う */
export function trophicCounts(state: GameState): Record<Trophic, number> {
  return calculateTrophicCounts(state);
}

export { invasionPressure, unlockedInvasives } from "./invasion";

/**
 * ルール由来の定数。UI にルールの数値を書かないため、表示側もここから読む。
 * 実体は `src/core/rules.ts`。
 */
export {
  CYCLING_RATIO,
  GAINS_PER_TURN,
  HAND_SIZE,
  INVASION_SCHEDULE,
  SCORE_WEIGHTS,
  TURN_LIMIT,
} from "./rules";
export type { InvasionStage } from "./rules";

function cleanup(state: GameState): GameState {
  let result = state;
  for (const invasive of state.hand) {
    const def = cardDefinition(invasive.defId);
    for (const aura of def?.aura ?? []) {
      if (aura.t !== "eatConsumer") continue;
      const victim = [...result.field, ...result.hand, ...result.discard].find((candidate) => {
        const candidateDef = cardDefinition(candidate.defId);
        return candidateDef?.trophic === aura.trophic && candidateDef.kind === "consumer";
      });
      if (!victim) continue;
      if (result.field.some((candidate) => candidate.uid === victim.uid)) result = { ...result, field: result.field.filter((candidate) => candidate.uid !== victim.uid) };
      else if (result.hand.some((candidate) => candidate.uid === victim.uid)) result = { ...result, hand: result.hand.filter((candidate) => candidate.uid !== victim.uid) };
      else result = { ...result, discard: result.discard.filter((candidate) => candidate.uid !== victim.uid) };
      result = log({ ...result, trash: [...result.trash, victim] }, `${def?.name ?? invasive.defId}が${cardDefinition(victim.defId)?.name ?? victim.defId}を捕食した (廃棄)`);
    }
  }
  result = { ...result, discard: [...result.discard, ...result.field, ...result.hand], field: [], hand: [], energy: 0, gainsLeft: GAINS_PER_TURN };
  return drawCards(result, HAND_SIZE);
}
