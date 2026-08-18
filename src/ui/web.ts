import type { CardInstance, GameState } from "../core/types";
import { trophicCounts } from "../core/engine";
import { defOf, TROPHIC_STAGE_LABEL, trophicColor } from "./theme";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW_WIDTH = 300;
const BAR_HEIGHT = 22;
const LABEL_HEIGHT = 14;
const ROW_GAP = 6;
const ROW_HEIGHT = LABEL_HEIGHT + BAR_HEIGHT + ROW_GAP;
const MIN_BAR_WIDTH = 14;
const MAX_BAR_WIDTH = VIEW_WIDTH - 48;

type Stage = 1 | 2 | 3 | 4;

interface Row {
  count: number;
  color: string;
  label: string;
}

/** スコア算定と同じ範囲 (デッキ全体、廃棄は除く) */
function livingInstances(state: GameState): CardInstance[] {
  return [...state.deck, ...state.hand, ...state.field, ...state.discard];
}

/** 段階の外に置く2行 (分解者・外来種) の枚数を1回の走査で数える */
function countExtraRows(state: GameState): { decomposer: number; invasive: number } {
  let decomposer = 0;
  let invasive = 0;
  for (const inst of livingInstances(state)) {
    const kind = defOf(inst.defId).kind;
    if (kind === "decomposer") {
      decomposer += 1;
    } else if (kind === "invasive") {
      invasive += 1;
    }
  }
  return { decomposer, invasive };
}

function el(tag: string, attrs: Record<string, string>): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

/**
 * デッキ全体の栄養段階の構成を常時 SVG で描く。このゲームの看板。
 * trophicCounts の結果をそのまま使い、UI 側では合否判定をしない
 * (バーの幅の大小関係を見せるだけで、「崩れている」の判定はしない)。
 */
export function renderWeb(state: GameState, container: HTMLElement): void {
  container.innerHTML = "";
  container.className = "web";

  const counts = trophicCounts(state);
  const stages: Stage[] = [4, 3, 2, 1];
  const pyramidRows: Row[] = stages.map((trophic) => ({
    count: counts[trophic],
    color: trophicColor(trophic),
    label: TROPHIC_STAGE_LABEL[trophic],
  }));

  const extra = countExtraRows(state);
  const extraRows: Row[] = [
    { count: extra.decomposer, color: "#8a6a4c", label: "分解者(循環)" },
    { count: extra.invasive, color: "#b23bd1", label: "外来種" },
  ];

  // 最大の行を基準にした相対スケール。1枚あたり固定 px だと終盤に頭打ちになり、
  // ちょうどピラミッドが逆転したことを見せたい局面で差が出なくなる。
  const scaleMax = Math.max(1, ...pyramidRows.map((row) => row.count), ...extraRows.map((row) => row.count));

  const pyramidHeight = pyramidRows.length * ROW_HEIGHT;
  const dividerY = pyramidHeight + ROW_GAP / 2;
  const extraRowStart = pyramidHeight + ROW_GAP;
  const totalHeight = extraRowStart + ROW_HEIGHT * extraRows.length;

  const svg = el("svg", {
    viewBox: `0 0 ${VIEW_WIDTH} ${totalHeight}`,
    class: "web-svg",
    role: "img",
    "aria-label": "デッキの栄養段階ピラミッド",
  });

  pyramidRows.forEach((row, index) => {
    svg.appendChild(renderBar(row, index * ROW_HEIGHT, scaleMax));
  });

  svg.appendChild(
    el("line", {
      x1: "4",
      x2: String(VIEW_WIDTH - 4),
      y1: String(dividerY),
      y2: String(dividerY),
      class: "web-divider",
      "stroke-dasharray": "4 4",
    }),
  );

  extraRows.forEach((row, index) => {
    svg.appendChild(renderBar(row, extraRowStart + index * ROW_HEIGHT, scaleMax));
  });

  container.appendChild(svg);
}

function renderBar(row: Row, rowY: number, scaleMax: number): SVGElement {
  const group = el("g", {});
  const barY = rowY + LABEL_HEIGHT;

  const labelEl = el("text", { x: "0", y: String(rowY + LABEL_HEIGHT - 3), class: "web-label" });
  labelEl.textContent = `${row.label} ${row.count}`;
  group.appendChild(labelEl);

  if (row.count > 0) {
    const ratio = row.count / scaleMax;
    const width = MIN_BAR_WIDTH + (MAX_BAR_WIDTH - MIN_BAR_WIDTH) * ratio;
    const x = (VIEW_WIDTH - width) / 2;
    group.appendChild(
      el("rect", {
        x: String(x),
        y: String(barY),
        width: String(width),
        height: String(BAR_HEIGHT),
        rx: "4",
        fill: row.color,
      }),
    );
  }

  return group;
}
