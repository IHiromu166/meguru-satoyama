import type { CardDef, Trophic } from "../core/types";
import { CARDS } from "../data/cards";
import { INVASIVES } from "../data/invasives";

const BY_ID = new Map<string, CardDef>();
for (const card of [...CARDS, ...INVASIVES]) {
  BY_ID.set(card.id, card);
}

/** defId からカード定義を引く。在来種 (`cards.ts`) と外来種 (`invasives.ts`) の両方を見る */
export function defOf(defId: string): CardDef {
  const def = BY_ID.get(defId);
  if (def === undefined) {
    throw new Error(`未知のカードIDです: ${defId}`);
  }
  return def;
}

/** カードの表示上の段階名 (kind と trophic の組み合わせ) */
export function stageLabel(def: CardDef): string {
  switch (def.kind) {
    case "producer":
      return "生産者";
    case "decomposer":
      return "分解者";
    case "control":
      return "人間の介入";
    case "invasive":
      return "外来種";
    case "consumer":
      switch (def.trophic) {
        case 2:
          return "一次消費者";
        case 3:
          return "二次消費者";
        case 4:
          return "頂点捕食者";
        default:
          return "消費者";
      }
  }
}

/**
 * カードの配色。栄養段階ごとに固定し、外来種だけ生態系の色から外れた色にする。
 * 人間の介入も生態系の一員ではないため、分解者とは別の無彩色にする。
 */
export function colorFor(def: CardDef): string {
  if (def.kind === "invasive") {
    return "#b23bd1";
  }
  if (def.kind === "control") {
    return "#6b7280";
  }
  if (def.kind === "decomposer") {
    return "#8a6a4c";
  }
  switch (def.trophic) {
    case 1:
      return "#4c9a4c";
    case 2:
      return "#8aa93a";
    case 3:
      return "#d9752c";
    case 4:
      return "#b23a3a";
    default:
      return "#6b7280";
  }
}

/** 食物網ピラミッド用。段階 1〜4 の表示名 (下から上へ) */
export const TROPHIC_STAGE_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "生産者",
  2: "一次消費者",
  3: "二次消費者",
  4: "頂点捕食者",
};

/**
 * 侵入圧 (1ターンあたりに侵入する枚数) を日本語のラベルにする。
 * 数値そのものは core の `invasionPressure` / `INVASION_SCHEDULE` から取り、
 * ここは言い換えるだけにする (docs/REVIEW.md B-5)。
 */
export function invasionPressureLabel(pressure: number): string {
  if (pressure <= 0) {
    return "なし";
  }
  if (pressure < 1) {
    return `${Math.round(1 / pressure)}ターンに1体`;
  }
  return `1ターンに${pressure}体`;
}

export function trophicColor(trophic: Exclude<Trophic, 0>): string {
  switch (trophic) {
    case 1:
      return "#4c9a4c";
    case 2:
      return "#8aa93a";
    case 3:
      return "#d9752c";
    case 4:
      return "#b23a3a";
  }
}

/**
 * 16進の色を黒 (ratio < 0) か白 (ratio > 0) へ寄せる。
 * カードの絵柄で、段階色から影と差し色を作るために使う。
 */
export function shade(hex: string, ratio: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const target = ratio < 0 ? 0 : 255;
  const weight = Math.min(Math.abs(ratio), 1);
  const mix = (channel: number): number => Math.round(channel + (target - channel) * weight);
  const r = mix((value >> 16) & 0xff);
  const g = mix((value >> 8) & 0xff);
  const b = mix(value & 0xff);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
