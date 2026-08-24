import type { CardDef } from "../core/types";
import { createCardArt } from "./art";
import { colorFor, stageLabel } from "./theme";

/** 絵柄の上に重ねる帯の色味 */
export type FlagTone = "neutral" | "warning" | "field" | "hand";

export interface CardFaceOptions {
  /** 右上のコスト。null なら「―」(獲得できない)。省略するとコスト欄を出さない */
  cost?: number | null;
  /** 種別帯の右端に出す短い文字 (供給の残り枚数など) */
  note?: string;
  /** 絵柄の上に重ねる帯 (飢餓の警告、捕食対象のゾーンなど) */
  flag?: { text: string; tone?: FlagTone };
  /** 効果テキストを出すか。既定は出す */
  showText?: boolean;
}

/**
 * カード1枚の面を組む。手札・供給・捕食対象の選択で共有する。
 *
 * 実物のカードに合わせて **名前 → 絵柄 → 種別帯 → 効果文** の順に積む。
 * 縦横比は CSS の `--card-ratio` (63:88) で固定してあり、はみ出しは切り落とすので、
 * 効果文が長いカードでも枠の形は崩れない。切れた文は `title` から読める。
 */
export function createCardFace(def: CardDef, options: CardFaceOptions = {}): HTMLButtonElement {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";
  card.style.setProperty("--stage-color", colorFor(def));
  card.title = `${def.name}(${stageLabel(def)}) — ${def.text}`;

  const head = document.createElement("div");
  head.className = "card-head";

  const name = document.createElement("span");
  name.className = "card-name";
  name.textContent = def.name;
  head.appendChild(name);

  if (options.cost !== undefined) {
    const cost = document.createElement("span");
    cost.className = "card-cost";
    cost.textContent = options.cost === null ? "―" : String(options.cost);
    head.appendChild(cost);
  }
  card.appendChild(head);

  const art = document.createElement("div");
  art.className = "card-art";
  art.appendChild(createCardArt(def));
  if (options.flag !== undefined) {
    const flag = document.createElement("span");
    flag.className = `card-flag card-flag-${options.flag.tone ?? "neutral"}`;
    flag.textContent = options.flag.text;
    art.appendChild(flag);
  }
  card.appendChild(art);

  const type = document.createElement("div");
  type.className = "card-type";

  const stage = document.createElement("span");
  stage.className = "card-stage";
  stage.textContent = stageLabel(def);
  type.appendChild(stage);

  if (options.note !== undefined) {
    const note = document.createElement("span");
    note.className = "card-note";
    note.textContent = options.note;
    type.appendChild(note);
  }
  card.appendChild(type);

  if (options.showText === false) {
    // 効果文を出さない場合 (捕食対象の選択) は、余った高さを絵柄に回す
    card.classList.add("card-artless");
  } else {
    const text = document.createElement("p");
    text.className = "card-text";
    text.textContent = def.text;
    text.style.setProperty("--text-fit", String(textFit(def.text.length)));
    card.appendChild(text);
  }

  return card;
}

/**
 * 効果文の級数。カード幅に対する比 (cqw) で指定するので、画面幅が変わっても
 * 比率は保たれる。**文が長いカードほど小さく組む** — 縦横比を固定した以上、
 * 入る文字数には上限があり、長い1枚に合わせて全部を小さくすると読みにくいため。
 */
function textFit(length: number): number {
  if (length <= 28) {
    return 9;
  }
  if (length <= 45) {
    return 8;
  }
  return 7;
}
