import type { CardDef, CardKind, GameState, Trophic } from "../core/types";
import { CARDS } from "../data/cards";
import { colorFor } from "./theme";

export interface SupplyCallbacks {
  onGain(defId: string): void;
}

interface Row {
  title: string;
  trophic: Trophic;
  kind?: CardKind;
}

/**
 * 供給を栄養段階ごとの行に分けて並べる。
 * 頂点捕食者(上・少数)から生産者(下・多数)へと並べることで、
 * 供給そのものがピラミッドの形になる。分解者と人間の介入は段階外として下に別枠で置く。
 */
const ROWS: Row[] = [
  { title: "頂点捕食者", trophic: 4 },
  { title: "二次消費者", trophic: 3 },
  { title: "一次消費者", trophic: 2 },
  { title: "生産者", trophic: 1 },
  { title: "分解者", trophic: 0, kind: "decomposer" },
  { title: "人間の介入", trophic: 0, kind: "control" },
];

export function renderSupply(state: GameState, container: HTMLElement, callbacks: SupplyCallbacks): void {
  container.innerHTML = "";
  container.className = "supply";

  for (const row of ROWS) {
    const cards = CARDS.filter(
      (c) => c.trophic === row.trophic && (row.kind === undefined || c.kind === row.kind),
    );
    if (cards.length === 0) {
      continue;
    }
    container.appendChild(renderRow(state, row.title, cards, callbacks));
  }
}

function renderRow(
  state: GameState,
  title: string,
  cards: readonly CardDef[],
  callbacks: SupplyCallbacks,
): HTMLElement {
  const row = document.createElement("section");
  row.className = "supply-row";

  const heading = document.createElement("h3");
  heading.className = "supply-row-title";
  heading.textContent = title;
  row.appendChild(heading);

  const list = document.createElement("div");
  list.className = "supply-row-cards";

  for (const def of cards) {
    list.appendChild(renderSupplyCard(state, def, callbacks));
  }
  row.appendChild(list);

  return row;
}

function renderSupplyCard(state: GameState, def: CardDef, callbacks: SupplyCallbacks): HTMLElement {
  const remaining = state.supply[def.id] ?? 0;
  const cost = def.cost ?? 0;
  const affordable =
    state.phase === "gain" && state.gainsLeft > 0 && remaining > 0 && state.energy >= cost;

  const card = document.createElement("button");
  card.type = "button";
  card.className = "card supply-card";
  card.style.setProperty("--stage-color", colorFor(def));
  if (!affordable) {
    card.classList.add("card-disabled");
    card.disabled = true;
  }

  const costEl = document.createElement("span");
  costEl.className = "card-cost";
  costEl.textContent = String(cost);

  const name = document.createElement("span");
  name.className = "card-name";
  name.textContent = def.name;

  const text = document.createElement("span");
  text.className = "card-text";
  text.textContent = def.text;

  const stock = document.createElement("span");
  stock.className = "card-stock";
  stock.textContent = `残り${remaining}`;

  card.append(costEl, name, text, stock);

  card.addEventListener("click", () => {
    if (!affordable) {
      return;
    }
    callbacks.onGain(def.id);
  });

  return card;
}
