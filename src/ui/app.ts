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

/**
 * ゲーム画面の骨組み。**再描画で作り直さない要素**への参照をここに持つ。
 *
 * スクロールしているのは、狭い画面では `.game-scroll`、900px 以上では `.section-supply`。
 * 以前は再描画のたびに画面全体を作り直していたため、この箱ごと別の DOM ノードに
 * 入れ替わり、ブラウザがスクロール位置を捨てていた
 * (手札を1枚プレイするたびに画面が一番上へ戻っていた原因)。
 *
 * 箱は最初の1回だけ作り、以降は**中身だけ**を入れ替える。スクロール位置は
 * 要素が生き残っていればブラウザが勝手に保つので、こちらで復元はしない。
 */
interface GameShell {
  header: HTMLElement;
  log: HTMLElement;
  web: HTMLElement;
  field: HTMLElement;
  hand: HTMLElement;
  supply: HTMLElement;
  advanceButton: HTMLButtonElement;
}

let state: GameState | null = null;
let root: HTMLElement | null = null;
/** 結果画面で提示するために、開始時のシードを UI 側で覚えておく (GameState は持っていない) */
let currentSeed = 0;
/** ログ欄の開閉。details は使い回すが、タイトルへ戻ると作り直すのでここにも持つ */
let logOpen = true;
/** ゲーム画面の骨組み。タイトル・結果画面へ移るときに捨てる */
let shell: GameShell | null = null;

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

  // タイトルと結果はゲーム画面と骨組みを共有しないので、作り直す
  // (renderTitle / renderResult が中身を消してから描く)
  if (state === null) {
    shell = null;
    renderTitle(root, (seed) => {
      currentSeed = seed;
      setState(createGame(seed));
    });
    return;
  }

  if (state.result !== "playing" || state.phase === "over") {
    shell = null;
    renderResult(root, state, scoreOf(state), currentSeed, () => {
      state = null;
      render();
    });
    return;
  }

  if (shell === null) {
    shell = buildGameShell(root);
  }
  updateGameScreen(shell, state);
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
function updateHeader(header: HTMLElement, s: GameState): void {
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

  header.replaceChildren(main, deck);
}

function buildLogContent(s: GameState): HTMLElement {
  if (s.log.length === 0) {
    const empty = document.createElement("p");
    empty.className = "log-empty";
    empty.textContent = "まだ何も起きていない";
    return empty;
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
  return list;
}

/**
 * ログ。フェイズを送った結果 (侵入・増殖・捕食・飢餓) は、ここを読まないと分からない。
 * スクロール領域の外に置き、送りボタンを押した直後に必ず目に入るようにする。
 *
 * `details` と `summary` は使い回し、一覧だけ差し替える。開閉状態を DOM に残すため。
 */
function updateLog(log: HTMLElement, s: GameState): void {
  const next = buildLogContent(s);
  const current = log.querySelector(".log-list, .log-empty");
  if (current === null) {
    log.appendChild(next);
  } else {
    current.replaceWith(next);
  }
}

/**
 * ゲーム画面は「ヘッダ + ログ (固定) / 本体 (スクロール) / フェイズ送り (固定)」の3段。
 * 送りボタンは唯一の進行手段なので、供給リストの下までスクロールしないと押せない状態を避ける。
 *
 * DOM はこの1通りだけで、幅 900px 以上では CSS 側が左右2カラムに組み替える
 * (左: 食物網・場・ログ / 右: 手札・供給)。詳細は docs/STATUS.md「画面幅ごとのレイアウト」。
 *
 * ここで作った要素は**ゲーム中ずっと使い回す**。中身の更新は updateGameScreen が行う。
 */
function buildGameShell(container: HTMLElement): GameShell {
  container.innerHTML = "";
  container.className = "screen screen-game";

  const header = document.createElement("header");
  header.className = "game-header";

  const log = document.createElement("details");
  log.className = "log";
  log.open = logOpen;
  log.addEventListener("toggle", () => {
    logOpen = log.open;
  });
  const summary = document.createElement("summary");
  summary.className = "log-summary";
  summary.textContent = "ログ";
  log.appendChild(summary);

  container.append(header, log);

  const scroll = document.createElement("div");
  scroll.className = "game-scroll";
  container.appendChild(scroll);

  const web = section("section-web", "食物網");
  const field = section("section-field", "場");
  scroll.append(web.root, field.root);

  // 手札と供給は「触るもの」。広い画面では2カラムの右側へまとめて寄せるので、
  // ひとつの箱に入れておく (狭い画面では display: contents で透過させ、並びは変わらない)。
  const main = document.createElement("div");
  main.className = "game-col-main";
  scroll.appendChild(main);

  const hand = section("section-hand", "手札");
  const supply = section("section-supply", "供給");
  main.append(hand.root, supply.root);

  const advanceBar = document.createElement("div");
  advanceBar.className = "advance-bar";
  const advanceButton = document.createElement("button");
  advanceButton.type = "button";
  advanceButton.className = "primary-button";
  // ボタンを使い回すので、押した時点の state を見る (描画時の値を閉じ込めない)
  advanceButton.addEventListener("click", () => {
    if (state !== null) {
      setState(advancePhase(state));
    }
  });
  advanceBar.appendChild(advanceButton);
  container.appendChild(advanceBar);

  return {
    header,
    log,
    web: web.body,
    field: field.body,
    hand: hand.body,
    supply: supply.body,
    advanceButton,
  };
}

/** 骨組みはそのままに、中身だけを今の状態で描き直す */
function updateGameScreen(view: GameShell, s: GameState): void {
  updateHeader(view.header, s);
  updateLog(view.log, s);
  renderWeb(s, view.web);
  renderField(s, view.field);
  renderHand(s, view.hand, {
    onPlay: (uid, preyUid) => setState(playCard(s, uid, preyUid)),
  });
  renderSupply(s, view.supply, {
    onGain: (defId) => setState(gainCard(s, defId)),
  });
  view.advanceButton.textContent = NEXT_PHASE_LABEL[s.phase];
}
