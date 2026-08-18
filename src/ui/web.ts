import type { CardInstance, GameState, Trophic } from "../core/types";
import { trophicCounts } from "../core/engine";
import { defOf, TROPHIC_STAGE_LABEL, trophicColor } from "./theme";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW_WIDTH = 300;
const BAR_HEIGHT = 22;
const LABEL_HEIGHT = 14;
const ROW_GAP = 6;
const ROW_HEIGHT = LABEL_HEIGHT + BAR_HEIGHT + ROW_GAP;
const PX_PER_CARD = 10;
const MIN_BAR_WIDTH = 14;
const MAX_BAR_WIDTH = VIEW_WIDTH - 48;

/** スコア算定と同じ範囲 (デッキ全体、廃棄は除く) */
function livingInstances(state: GameState): CardInstance[] {
  return [...state.deck, ...state.hand, ...state.field, ...state.discard];
}

function countByKind(state: GameState, kind: string): number {
  let count = 0;
  for (const inst of livingInstances(state)) {
    if (defOf(inst.defId).kind === kind) {
      count += 1;
    }
  }
  return count;
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
  const stages: Trophic[] = [4, 3, 2, 1];
  const pyramidHeight = stages.length * ROW_HEIGHT;
  const dividerY = pyramidHeight + ROW_GAP / 2;
  const decomposerRowStart = pyramidHeight + ROW_GAP;
  const totalHeight = decomposerRowStart + ROW_HEIGHT * 2;

  const svg = el("svg", {
    viewBox: `0 0 ${VIEW_WIDTH} ${totalHeight}`,
    class: "web-svg",
    role: "img",
    "aria-label": "デッキの栄養段階ピラミッド",
  });

  stages.forEach((trophic, index) => {
    const y = index * ROW_HEIGHT;
    svg.appendChild(
      renderBar(
        counts[trophic],
        y,
        trophicColor(trophic as Exclude<Trophic, 0>),
        TROPHIC_STAGE_LABEL[trophic as 1 | 2 | 3 | 4],
      ),
    );
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

  const decomposerCount = countByKind(state, "decomposer");
  svg.appendChild(renderBar(decomposerCount, decomposerRowStart, "#8a6a4c", "分解者(循環)"));

  const invasiveCount = countByKind(state, "invasive");
  svg.appendChild(
    renderBar(invasiveCount, decomposerRowStart + ROW_HEIGHT, "#b23bd1", "外来種"),
  );

  container.appendChild(svg);
}

function renderBar(count: number, rowY: number, color: string, label: string): SVGElement {
  const group = el("g", {});
  const barY = rowY + LABEL_HEIGHT;

  const labelEl = el("text", { x: "0", y: String(rowY + LABEL_HEIGHT - 3), class: "web-label" });
  labelEl.textContent = `${label} ${count}`;
  group.appendChild(labelEl);

  if (count > 0) {
    const width = Math.min(MAX_BAR_WIDTH, Math.max(MIN_BAR_WIDTH, count * PX_PER_CARD));
    const x = (VIEW_WIDTH - width) / 2;
    group.appendChild(
      el("rect", {
        x: String(x),
        y: String(barY),
        width: String(width),
        height: String(BAR_HEIGHT),
        rx: "4",
        fill: color,
      }),
    );
  }

  return group;
}
