import type { GameState, ScoreBreakdown } from "../core/types";

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** タイトル画面。シードを指定して再現可能なプレイができる */
export function renderTitle(container: HTMLElement, onStart: (seed: number) => void): void {
  container.innerHTML = "";
  container.className = "screen screen-title";

  const title = document.createElement("h1");
  title.textContent = "巡る里山";
  container.appendChild(title);

  const lead = document.createElement("p");
  lead.className = "lead";
  lead.textContent =
    "デッキの循環が、そのまま生態系の物質循環になる。20ターンを生き延び、綺麗な生態系を作れ。";
  container.appendChild(lead);

  const form = document.createElement("form");
  form.className = "seed-form";

  const label = document.createElement("label");
  label.className = "seed-label";
  label.textContent = "シード";

  const input = document.createElement("input");
  input.type = "number";
  input.className = "seed-input";
  input.value = String(randomSeed());
  label.appendChild(input);
  form.appendChild(label);

  const start = document.createElement("button");
  start.type = "submit";
  start.className = "primary-button";
  start.textContent = "はじめる";
  form.appendChild(start);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const seed = Number(input.value);
    onStart(Number.isFinite(seed) ? seed : randomSeed());
  });

  container.appendChild(form);
}

const SCORE_ROWS: Array<{ key: keyof ScoreBreakdown; label: string }> = [
  { key: "diversity", label: "多様性" },
  { key: "pyramid", label: "ピラミッド適合" },
  { key: "cycling", label: "循環効率" },
  { key: "apex", label: "頂点の定着" },
  { key: "invasivePenalty", label: "残存外来種" },
  { key: "controlPenalty", label: "介入の痕跡" },
];

/** 結果画面。生存/崩壊とスコア内訳を表示する */
export function renderResult(
  container: HTMLElement,
  state: GameState,
  score: ScoreBreakdown,
  onRestart: () => void,
): void {
  container.innerHTML = "";
  container.className = "screen screen-result";

  const heading = document.createElement("h1");
  heading.textContent = state.result === "collapsed" ? "生態系崩壊" : "生き延びた";
  container.appendChild(heading);

  const sub = document.createElement("p");
  sub.className = "lead";
  sub.textContent =
    state.result === "collapsed"
      ? `${state.turn}ターン目に生態系が崩壊した`
      : `${state.turn}ターンを生き延びた`;
  container.appendChild(sub);

  const table = document.createElement("table");
  table.className = "score-table";

  for (const row of SCORE_ROWS) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = row.label;
    const td = document.createElement("td");
    const value = score[row.key];
    td.textContent = (value > 0 ? "+" : "") + String(value);
    tr.append(th, td);
    table.appendChild(tr);
  }

  const totalRow = document.createElement("tr");
  totalRow.className = "score-total";
  const totalTh = document.createElement("th");
  totalTh.textContent = "合計";
  const totalTd = document.createElement("td");
  totalTd.textContent = String(score.total);
  totalRow.append(totalTh, totalTd);
  table.appendChild(totalRow);

  container.appendChild(table);

  const restart = document.createElement("button");
  restart.type = "button";
  restart.className = "primary-button";
  restart.textContent = "もう一度";
  restart.addEventListener("click", onRestart);
  container.appendChild(restart);
}
