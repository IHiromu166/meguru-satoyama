import {
  CYCLING_RATIO,
  GAINS_PER_TURN,
  HAND_SIZE,
  INVASION_SCHEDULE,
  SCORE_WEIGHTS,
  TURN_LIMIT,
} from "../core/engine";
import { INVASIVES } from "../data/invasives";
import { INITIAL_DECK } from "../data/supply";
import { colorFor, defOf, invasionPressureLabel, TROPHIC_STAGE_LABEL, trophicColor } from "./theme";

/*
 * 遊び方の画面。
 *
 * ルール由来の数値は一切書かず、core の定数 (TURN_LIMIT / HAND_SIZE / SCORE_WEIGHTS /
 * INVASION_SCHEDULE) とカードデータから組み立てる。バランス調整で数値を動かしたとき、
 * この画面を直し忘れて嘘の説明が残ることを防ぐため (AGENTS.md「ルール由来の数値を UI 側に書かない」)。
 */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

/** 箇条書き。文字列はそのまま、配列は [強調, 続き] として組む */
function bullets(items: readonly (string | [string, string])[]): HTMLElement {
  const list = el("ul", "help-list");
  for (const item of items) {
    const li = el("li");
    if (typeof item === "string") {
      li.textContent = item;
    } else {
      li.append(el("strong", undefined, item[0]), document.createTextNode(item[1]));
    }
    list.appendChild(li);
  }
  return list;
}

/** 2列の表。見出し行は付けず、左が項目名、右が説明 */
function pairs(rows: readonly [string, string][], className = "help-table"): HTMLElement {
  const table = el("table", className);
  for (const [label, value] of rows) {
    const tr = el("tr");
    tr.append(el("th", undefined, label), el("td", undefined, value));
    table.appendChild(tr);
  }
  return table;
}

function section(title: string): HTMLElement {
  const node = el("section", "help-section");
  node.appendChild(el("h3", "help-heading", title));
  return node;
}

/** 得点の増減を「+2」「−5」の形にする。結果画面と同じ見せ方に揃える */
function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

/** 初期デッキを「ススキ ×7 + ミミズ ×3」の形の文にする */
function initialDeckText(): string {
  const parts = Object.entries(INITIAL_DECK).map(([defId, count]) => `${defOf(defId).name} ×${count}`);
  const total = Object.values(INITIAL_DECK).reduce((sum, count) => sum + count, 0);
  return `${parts.join(" + ")} の${total}枚`;
}

/** 栄養段階の凡例。色は食物網の可視化と同じものを使う */
function trophicLegend(): HTMLElement {
  const wrap = el("div", "help-stages");
  const stages = [1, 2, 3, 4] as const;
  for (const stage of stages) {
    if (stage > 1) {
      wrap.appendChild(el("span", "help-stage-arrow", "→"));
    }
    const chip = el("span", "help-stage", TROPHIC_STAGE_LABEL[stage]);
    chip.style.setProperty("--stage-color", trophicColor(stage));
    wrap.appendChild(chip);
  }
  return wrap;
}

/** 侵入スケジュールの表。ターンの区切りと解禁される種は core のスケジュールから作る */
function invasionSchedule(): HTMLElement {
  const table = el("table", "help-table help-schedule");
  const head = el("tr");
  head.append(el("th", undefined, "ターン"), el("th", undefined, "侵入"), el("th", undefined, "加わる外来種"));
  table.appendChild(head);

  const unlockedSoFar: string[] = [];
  INVASION_SCHEDULE.forEach((stage, index) => {
    const next = INVASION_SCHEDULE[index + 1];
    const last = next === undefined ? TURN_LIMIT : next.fromTurn - 1;
    const turns = stage.fromTurn === last ? `${stage.fromTurn}` : `${stage.fromTurn}–${last}`;
    const names = stage.unlocks.map((id) => defOf(id).name);
    unlockedSoFar.push(...names);

    const tr = el("tr");
    tr.append(
      el("td", "help-schedule-turn", turns),
      el("td", undefined, invasionPressureLabel(stage.pressure)),
      el("td", undefined, names.length === 0 ? "—" : names.join(" / ")),
    );
    table.appendChild(tr);
  });
  return table;
}

/** 外来種の一覧。名前と常在効果はカードデータそのもの */
function invasiveList(): HTMLElement {
  const list = el("ul", "help-list help-invasives");
  for (const def of INVASIVES) {
    const li = el("li");
    const name = el("strong", "help-invasive-name", def.name);
    name.style.setProperty("--stage-color", colorFor(def));
    li.append(name, document.createTextNode(` ${def.text}`));
    list.appendChild(li);
  }
  return list;
}

function overview(): HTMLElement {
  const node = section("このゲームは");
  node.appendChild(
    el(
      "p",
      "help-lead",
      `里山の生態系を${TURN_LIMIT}ターン守り抜き、最後に「生態系の形の美しさ」で採点される1人用のデッキ構築ゲーム。`,
    ),
  );
  node.appendChild(
    el("p", undefined, "デッキの巡り方が、そのまま生態系の物質循環になっている。"),
  );
  node.appendChild(
    pairs(
      [
        ["山札", "土壌"],
        ["手札", "発芽"],
        ["場", "生育"],
        ["捨て札", "死骸"],
        ["シャッフル", "分解"],
      ],
      "help-table help-mapping",
    ),
  );
  node.appendChild(
    bullets([
      ["はじまりは裸地。", `初期デッキは ${initialDeckText()}。消費者は1枚もいない。`],
      ["やること。", "この上に食物連鎖を積み上げ、外来種に食い荒らされる前に形を整える。"],
    ]),
  );
  return node;
}

function controls(): HTMLElement {
  const node = section("操作方法");
  node.appendChild(
    bullets([
      ["手札のカードを押すとプレイ。", "消費者なら、続けて捕食対象を選ぶ画面が出る。"],
      ["獲得フェイズでは供給のカードを押すと購入。", "買ったカードは捨て札に入る。"],
      ["画面下のボタンでフェイズを送る。", "フェイズは戻せない。押す前に手札を出し切ること。"],
      ["カードの見分け方。", "薄く表示されているものは今は押せない。"],
    ]),
  );
  node.appendChild(
    pairs([
      ["破線の枠", "捕食対象がいない。プレイすると飢餓になる"],
      ["紫のカード", "外来種。プレイできず、手札にある間ずっと妨害する"],
      ["右上の数字", "獲得コスト。「―」は購入できないカード"],
    ]),
  );
  return node;
}

function screenGuide(): HTMLElement {
  const node = section("画面の見方");
  node.appendChild(
    pairs([
      ["エネルギー", "獲得フェイズで使える資源。ターンをまたいで持ち越せない"],
      ["獲得", `残りの購入回数。基本は1ターンに${GAINS_PER_TURN}回で、効果で増える`],
      ["山札 / 捨て札", "循環しているカード。山札が尽きると捨て札を混ぜて山札に戻す"],
      ["廃棄", "デッキから永久に失われた枚数。得点にも数えない"],
      ["侵入圧", "今のターンに外来種が侵入してくる勢い"],
      ["食物網", "デッキ全体の段階ごとの枚数。下ほど多い形が目標"],
      ["ログ", "侵入・増殖・捕食・飢餓など、送った結果がここに出る"],
    ]),
  );
  return node;
}

function turnFlow(): HTMLElement {
  const node = section("ターンの流れ");
  node.appendChild(el("p", undefined, "各ターンは4つのフェイズ。一方向にしか進まない。"));
  node.appendChild(
    pairs([
      ["1. メイン", "手札を好きな順にプレイする。出す枚数に制限はない"],
      ["2. 獲得", "エネルギーを払って供給からカードを買い、捨て札に加える"],
      ["3. 侵入", "外来種が侵入し、手札の外来種が増殖する"],
      ["4. クリーンアップ", `場と手札をすべて捨て札に送り、${HAND_SIZE}枚引く`],
    ]),
  );
  node.appendChild(
    bullets([
      [
        "プレイする順番が腕の見せどころ。",
        "生産者を先に出してエネルギーを作り、その生産者を消費者に食べさせる、といった連鎖が組める。",
      ],
    ]),
  );
  return node;
}

function predation(): HTMLElement {
  const node = section("中核ルール ― 捕食と飢餓");
  node.appendChild(
    el(
      "p",
      "help-rule",
      "消費者をプレイするときは、場または手札から「ひとつ下の段階」のカードを1枚選んで捨て札に送る。",
    ),
  );
  node.appendChild(trophicLegend());
  node.appendChild(
    bullets([
      ["食べられれば", "、そのカードの効果が発動する。"],
      ["食べられなければ飢餓。", "場には出るが、何も起きない。"],
      [
        "場のカードを食べてもよい。",
        "すでに産出したエネルギーは戻らないので、生産者を出してから食べるのが基本。",
      ],
      [
        "比率のルールはどこにもない。",
        "それでも、捕食者と獲物を同じ手札に揃えるには獲物のほうが多く要る。ピラミッド型は自然にそうなる。",
      ],
    ]),
  );
  return node;
}

function invasion(): HTMLElement {
  const node = section("外来種");
  node.appendChild(
    bullets([
      ["プレイできない。", "手札に居座り、手札にある間だけ常在効果で妨害してくる。"],
      ["増殖する。", "侵入フェイズに、手札に残っている外来種1枚につき1枚増える。抱えるほど増える。"],
      ["過半数で即敗北。", "山札・手札・場・捨て札を合わせた過半数が外来種になった時点で終わる。"],
    ]),
  );
  node.appendChild(invasionSchedule());
  node.appendChild(invasiveList());
  node.appendChild(el("h4", "help-subheading", "駆除のジレンマ"));
  node.appendChild(
    pairs([
      ["人間の介入", "即効性があり確実。ただし生態系の一員ではなく、最終スコアで減点される"],
      ["在来天敵", "特定の在来種が特定の外来種を食べる。遅く仕込みが要るが、デッキは汚れない"],
    ]),
  );
  node.appendChild(
    el("p", "help-note", "手っ取り早い解決と綺麗な解決は別のルートで、最終的に強いのは後者。"),
  );
  return node;
}

function scoring(): HTMLElement {
  const node = section("得点");
  node.appendChild(
    el("p", undefined, `${TURN_LIMIT}ターンを生き延びた時点で、デッキ全体を評価する。`),
  );
  const percent = (ratio: number) => `${Math.round(ratio * 100)}%`;
  node.appendChild(
    pairs([
      ["多様性", `在来種の種類1つにつき ${signed(SCORE_WEIGHTS.diversity)}`],
      ["ピラミッド適合", `ひとつ下の段階より枚数が少ない段階1つにつき ${signed(SCORE_WEIGHTS.pyramid)}`],
      [
        "循環効率",
        `分解者がデッキ全体の ${percent(CYCLING_RATIO.min)}〜${percent(CYCLING_RATIO.max)} なら ${signed(SCORE_WEIGHTS.cycling)}`,
      ],
      ["頂点の定着", `頂点捕食者がいて、二次消費者がそれ以上いれば ${signed(SCORE_WEIGHTS.apex)}`],
      ["残存外来種", `デッキに残った外来種1枚につき ${signed(SCORE_WEIGHTS.invasive)}`],
      ["介入の痕跡", `デッキに残った駆除カード1枚につき ${signed(SCORE_WEIGHTS.control)}`],
    ]),
  );
  node.appendChild(
    el("p", "help-note", "途中で生態系が崩壊した場合はスコア0。何ターン持ちこたえたかだけが残る。"),
  );
  return node;
}

/**
 * 遊び方をオーバーレイで開く。タイトルからもプレイ中からも同じものを開く。
 * プレイ中に開いても盤面には触らないので、状態は失われない。
 */
export function openHelp(): void {
  const overlay = el("div", "overlay help-overlay");

  const panel = el("div", "help-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "遊び方");

  const header = el("div", "help-header");
  header.appendChild(el("h2", "help-title", "遊び方"));

  const close = el("button", "help-close");
  close.type = "button";
  close.textContent = "閉じる";
  header.appendChild(close);
  panel.appendChild(header);

  const body = el("div", "help-body");
  body.append(
    overview(),
    controls(),
    screenGuide(),
    turnFlow(),
    predation(),
    invasion(),
    scoring(),
  );
  panel.appendChild(body);

  const dismiss = (): void => {
    if (overlay.parentNode !== null) {
      document.body.removeChild(overlay);
    }
    document.removeEventListener("keydown", onKeyDown);
  };
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      dismiss();
    }
  }

  close.addEventListener("click", dismiss);
  // パネルの外 (背景) を押したときも閉じる
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      dismiss();
    }
  });
  document.addEventListener("keydown", onKeyDown);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  close.focus();
}
