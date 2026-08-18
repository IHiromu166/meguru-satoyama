import type { CardInstance, GameState } from "../core/types";
import { canPlay, legalPreys, needsPrey } from "../core/engine";
import { colorFor, defOf, stageLabel } from "./theme";

export interface HandCallbacks {
  /** カードをプレイする。捕食が必要な場合は preyUid を渡す */
  onPlay(uid: number, preyUid?: number): void;
}

/** 手札を描画する。プレイ可否・飢餓の見込みは engine の問い合わせ関数の結果をそのまま使う */
export function renderHand(state: GameState, container: HTMLElement, callbacks: HandCallbacks): void {
  container.innerHTML = "";
  container.className = "hand";

  for (const inst of state.hand) {
    container.appendChild(renderHandCard(state, inst, callbacks));
  }
}

/** 場のカードを描画する (このターンにプレイ済みのカード) */
export function renderField(state: GameState, container: HTMLElement): void {
  container.innerHTML = "";
  container.className = "field";

  if (state.field.length === 0) {
    const empty = document.createElement("p");
    empty.className = "field-empty";
    empty.textContent = "まだ何もプレイしていない";
    container.appendChild(empty);
    return;
  }

  for (const inst of state.field) {
    container.appendChild(renderChip(inst));
  }
}

function renderChip(inst: CardInstance): HTMLElement {
  const def = defOf(inst.defId);
  const chip = document.createElement("div");
  chip.className = "chip";
  chip.style.setProperty("--stage-color", colorFor(def));
  chip.textContent = def.name;
  return chip;
}

function renderHandCard(state: GameState, inst: CardInstance, callbacks: HandCallbacks): HTMLElement {
  const def = defOf(inst.defId);
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card hand-card";
  card.style.setProperty("--stage-color", colorFor(def));

  const isInvasive = def.kind === "invasive";
  const playable = !isInvasive && canPlay(state, inst.uid);
  const willStarve =
    !isInvasive && needsPrey(state, inst.uid) && legalPreys(state, inst.uid).length === 0;

  if (isInvasive) {
    card.classList.add("card-invasive");
    card.disabled = true;
  } else if (!playable) {
    card.disabled = true;
  }
  if (willStarve) {
    card.classList.add("card-starving");
  }

  const cost = document.createElement("span");
  cost.className = "card-cost";
  cost.textContent = def.cost === null ? "―" : String(def.cost);

  const name = document.createElement("span");
  name.className = "card-name";
  name.textContent = def.name;

  const stage = document.createElement("span");
  stage.className = "card-stage";
  stage.textContent = stageLabel(def);

  const text = document.createElement("span");
  text.className = "card-text";
  text.textContent = def.text;

  card.append(cost, name, stage, text);

  if (isInvasive) {
    const badge = document.createElement("span");
    badge.className = "card-badge";
    badge.textContent = "プレイ不可・常在";
    card.appendChild(badge);
  } else if (willStarve) {
    const badge = document.createElement("span");
    badge.className = "card-badge card-badge-warning";
    badge.textContent = "捕食対象なし・飢餓";
    card.appendChild(badge);
  }

  card.addEventListener("click", () => {
    if (isInvasive || !canPlay(state, inst.uid)) {
      return;
    }
    if (!needsPrey(state, inst.uid)) {
      callbacks.onPlay(inst.uid);
      return;
    }
    const preys = legalPreys(state, inst.uid);
    if (preys.length === 0) {
      callbacks.onPlay(inst.uid);
      return;
    }
    openPreyPicker(state, def.name, preys, (preyUid) => callbacks.onPlay(inst.uid, preyUid));
  });

  return card;
}

/**
 * 捕食対象を選ぶ。候補は `legalPreys` の結果をそのまま使い、UI では可否を判定しない。
 * ただし **どのゾーンにいるか** は必ず出す。場の生産者は既にエネルギーを産出済みで、
 * 手札のカードはまだプレイしていない (DESIGN.md 第2節 裁定2) ため、
 * 同名のカードでも選択の意味がまったく違う。
 */
function openPreyPicker(
  state: GameState,
  predatorName: string,
  preys: readonly CardInstance[],
  onChoose: (preyUid: number) => void,
): void {
  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const dialog = document.createElement("div");
  dialog.className = "dialog";

  const title = document.createElement("h3");
  title.textContent = `${predatorName} の捕食対象を選ぶ`;
  dialog.appendChild(title);

  const hint = document.createElement("p");
  hint.className = "dialog-hint";
  hint.textContent = "場のカードは既にエネルギーを産出済み。手札のカードはまだプレイしていない。";
  dialog.appendChild(hint);

  const list = document.createElement("div");
  list.className = "prey-list";

  for (const prey of preys) {
    const def = defOf(prey.defId);
    const inField = state.field.some((candidate) => candidate.uid === prey.uid);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card prey-choice";
    btn.style.setProperty("--stage-color", colorFor(def));

    const name = document.createElement("span");
    name.className = "card-name";
    name.textContent = def.name;

    const zone = document.createElement("span");
    zone.className = `prey-zone prey-zone-${inField ? "field" : "hand"}`;
    zone.textContent = inField ? "場" : "手札";

    const stage = document.createElement("span");
    stage.className = "card-stage";
    stage.textContent = stageLabel(def);

    btn.append(name, zone, stage);
    btn.addEventListener("click", () => {
      document.body.removeChild(overlay);
      onChoose(prey.uid);
    });
    list.appendChild(btn);
  }
  dialog.appendChild(list);

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "dialog-cancel";
  cancel.textContent = "やめる";
  cancel.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });
  dialog.appendChild(cancel);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}
