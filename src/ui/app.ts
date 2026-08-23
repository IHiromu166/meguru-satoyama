import {
  advancePhase,
  createGame,
  gainCard,
  invasionPressure,
  playCard,
  scoreOf,
  TURN_LIMIT,
} from "../core/engine";
import type { GameState, Phase } from "../core/types";
import { renderField, renderHand } from "./hand";
import { openHelp } from "./help";
import { renderResult, renderTitle } from "./screens";
import { renderSupply } from "./supply";
import { invasionPressureLabel } from "./theme";
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

/** ログの表示件数。360px の画面を圧迫しない範囲に絞り、残りは開いてスクロールさせる */
const LOG_VISIBLE = 8;

let state: GameState | null = null;
let root: HTMLElement | null = null;
/** 結果画面で提示するために、開始時のシードを UI 側で覚えておく (GameState は持っていない) */
let currentSeed = 0;
/** ログ欄の開閉。再描画で DOM を作り直すため、開閉状態はここに保持する */
let logOpen = true;

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
    renderTitle(root, (seed) => {
      currentSeed = seed;
      setState(createGame(seed));
    });
    return;
  }

  if (state.result !== "playing" || state.phase === "over") {
    renderResult(root, state, scoreOf(state), currentSeed, () => {
      state = null;
      render();
    });
    return;
  }

  renderGameScreen(root, state);
}

function headerItem(text: string): HTMLElement {
  const item = document.createElement("span");
  item.className = "header-item";
  item.textContent = text;
  return item;
}

function section(className: string, title: string): { root: HTMLElement; body: HTMLElement } {
  const element = document.createElement("section");
  element.className = `section ${className}`;
  const heading = document.createElement("h2");
  heading.textContent = title;
  element.appendChild(heading);
  const body = document.createElement("div");
  element.appendChild(body);
  return { root: element, body };
}

/**
 * ヘッダは2段。上段が今の手番の状況、下段がデッキの内訳。
 * このゲームはデッキの循環そのものが主題なので、山札・捨て札・廃棄の枚数は常時見せる。
 */
function renderHeader(s: GameState): HTMLElement {
  const header = document.createElement("header");
  header.className = "game-header";

  const main = document.createElement("div");
  main.className = "header-row";
  main.append(
    headerItem(`ターン ${s.turn} / ${TURN_LIMIT}`),
    headerItem(PHASE_LABEL[s.phase]),
    headerItem(`エネルギー ${s.energy}`),
    headerItem(`獲得 ${s.gainsLeft}`),
  );

  // 遊び方。プレイ中に迷ったとき、盤面を失わずに開けるようにしておく
  const help = document.createElement("button");
  help.type = "button";
  help.className = "header-help";
  help.textContent = "遊び方";
  help.setAttribute("aria-label", "遊び方を開く");
  help.addEventListener("click", openHelp);
  main.appendChild(help);

  const deck = document.createElement("div");
  deck.className = "header-row header-row-sub";
  deck.append(
    headerItem(`山札 ${s.deck.length}`),
    headerItem(`捨て札 ${s.discard.length}`),
    headerItem(`廃棄 ${s.trash.length}`),
    headerItem(`侵入圧 ${invasionPressureLabel(invasionPressure(s.turn))}`),
  );

  header.append(main, deck);
  return header;
}

/**
 * ログ。フェイズを送った結果 (侵入・増殖・捕食・飢餓) は、ここを読まないと分からない。
 * スクロール領域の外に置き、送りボタンを押した直後に必ず目に入るようにする。
 */
function renderLog(s: GameState): HTMLElement {
  const details = document.createElement("details");
  details.className = "log";
  details.open = logOpen;
  details.addEventListener("toggle", () => {
    logOpen = details.open;
  });

  const summary = document.createElement("summary");
  summary.className = "log-summary";
  summary.textContent = "ログ";
  details.appendChild(summary);

  if (s.log.length === 0) {
    const empty = document.createElement("p");
    empty.className = "log-empty";
    empty.textContent = "まだ何も起きていない";
    details.appendChild(empty);
    return details;
  }

  const list = document.createElement("ul");
  list.className = "log-list";
  for (const entry of s.log.slice(-LOG_VISIBLE).reverse()) {
    const item = document.createElement("li");
    item.className = "log-entry";
    const turn = document.createElement("span");
    turn.className = "log-turn";
    turn.textContent = `T${entry.turn}`;
    const text = document.createElement("span");
    text.textContent = entry.text;
    item.append(turn, text);
    list.appendChild(item);
  }
  details.appendChild(list);

  return details;
}

/**
 * ゲーム画面は「ヘッダ + ログ (固定) / 本体 (スクロール) / フェイズ送り (固定)」の3段。
 * 送りボタンは唯一の進行手段なので、供給リストの下までスクロールしないと押せない状態を避ける。
 *
 * DOM はこの1通りだけで、幅 900px 以上では CSS 側が左右2カラムに組み替える
 * (左: 食物網・場・ログ / 右: 手札・供給)。詳細は docs/STATUS.md「画面幅ごとのレイアウト」。
 */
function renderGameScreen(container: HTMLElement, s: GameState): void {
  container.className = "screen screen-game";
  container.append(renderHeader(s), renderLog(s));

  const scroll = document.createElement("div");
  scroll.className = "game-scroll";
  container.appendChild(scroll);

  const web = section("section-web", "食物網");
  scroll.appendChild(web.root);
  renderWeb(s, web.body);

  const field = section("section-field", "場");
  scroll.appendChild(field.root);
  renderField(s, field.body);

  // 手札と供給は「触るもの」。広い画面では2カラムの右側へまとめて寄せるので、
  // ひとつの箱に入れておく (狭い画面では display: contents で透過させ、並びは変わらない)。
  const main = document.createElement("div");
  main.className = "game-col-main";
  scroll.appendChild(main);

  const hand = section("section-hand", "手札");
  main.appendChild(hand.root);
  renderHand(s, hand.body, {
    onPlay: (uid, preyUid) => setState(playCard(s, uid, preyUid)),
  });

  const supply = section("section-supply", "供給");
  main.appendChild(supply.root);
  renderSupply(s, supply.body, {
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
