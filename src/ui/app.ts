import { advancePhase, createGame, gainCard, playCard, scoreOf } from "../core/engine";
import type { GameState, Phase } from "../core/types";
import { renderField, renderHand } from "./hand";
import { renderResult, renderTitle } from "./screens";
import { renderSupply } from "./supply";
import { renderWeb } from "./web";

const PHASE_LABEL: Record<Phase, string> = {
  main: "メイン",
  gain: "獲得",
  invasion: "侵入",
  cleanup: "クリーンアップ",
  over: "終了",
};

const NEXT_PHASE_LABEL: Record<Phase, string> = {
  main: "獲得フェイズへ",
  gain: "侵入フェイズへ",
  invasion: "クリーンアップへ",
  cleanup: "次のターンへ",
  over: "結果を見る",
};

/** ターン数からの侵入圧の目安。DESIGN.md 第5節の侵入スケジュールをそのまま表示するだけ */
function invasionPressureLabel(turn: number): string {
  if (turn <= 3) {
    return "侵入圧: なし";
  }
  if (turn <= 8) {
    return "侵入圧: 2ターンに1体";
  }
  return "侵入圧: 1ターンに1体";
}

let state: GameState | null = null;
let root: HTMLElement | null = null;

export function mountApp(container: HTMLElement): void {
  root = container;
  render();
}

function setState(next: GameState): void {
  state = next;
  render();
}

function render(): void {
  if (root === null) {
    return;
  }
  root.innerHTML = "";

  if (state === null) {
    renderTitle(root, (seed) => setState(createGame(seed)));
    return;
  }

  if (state.result !== "playing" || state.phase === "over") {
    renderResult(root, state, scoreOf(state), () => {
      state = null;
      render();
    });
    return;
  }

  renderGameScreen(root, state);
}

function renderGameScreen(container: HTMLElement, s: GameState): void {
  container.className = "screen screen-game";

  const header = document.createElement("header");
  header.className = "game-header";
  header.innerHTML = `
    <span class="header-item">ターン ${s.turn} / 20</span>
    <span class="header-item">${PHASE_LABEL[s.phase]}</span>
    <span class="header-item">エネルギー ${s.energy}</span>
    <span class="header-item">獲得回数 ${s.gainsLeft}</span>
    <span class="header-item">${invasionPressureLabel(s.turn)}</span>
  `;
  container.appendChild(header);

  const webSection = document.createElement("section");
  webSection.className = "section section-web";
  const webTitle = document.createElement("h2");
  webTitle.textContent = "食物網";
  webSection.appendChild(webTitle);
  const webContainer = document.createElement("div");
  webSection.appendChild(webContainer);
  container.appendChild(webSection);
  renderWeb(s, webContainer);

  const fieldSection = document.createElement("section");
  fieldSection.className = "section section-field";
  const fieldTitle = document.createElement("h2");
  fieldTitle.textContent = "場";
  fieldSection.appendChild(fieldTitle);
  const fieldContainer = document.createElement("div");
  fieldSection.appendChild(fieldContainer);
  container.appendChild(fieldSection);
  renderField(s, fieldContainer);

  const handSection = document.createElement("section");
  handSection.className = "section section-hand";
  const handTitle = document.createElement("h2");
  handTitle.textContent = "手札";
  handSection.appendChild(handTitle);
  const handContainer = document.createElement("div");
  handSection.appendChild(handContainer);
  container.appendChild(handSection);
  renderHand(s, handContainer, {
    onPlay: (uid, preyUid) => setState(playCard(s, uid, preyUid)),
  });

  const supplySection = document.createElement("section");
  supplySection.className = "section section-supply";
  const supplyTitle = document.createElement("h2");
  supplyTitle.textContent = "供給";
  supplySection.appendChild(supplyTitle);
  const supplyContainer = document.createElement("div");
  supplySection.appendChild(supplyContainer);
  container.appendChild(supplySection);
  renderSupply(s, supplyContainer, {
    onGain: (defId) => setState(gainCard(s, defId)),
  });

  const advanceBar = document.createElement("div");
  advanceBar.className = "advance-bar";
  const advanceButton = document.createElement("button");
  advanceButton.type = "button";
  advanceButton.className = "primary-button";
  advanceButton.textContent = NEXT_PHASE_LABEL[s.phase];
  advanceButton.addEventListener("click", () => setState(advancePhase(s)));
  advanceBar.appendChild(advanceButton);
  container.appendChild(advanceBar);
}
