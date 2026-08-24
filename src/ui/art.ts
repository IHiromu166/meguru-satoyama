import type { CardDef } from "../core/types";
import { colorFor, shade } from "./theme";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * カードの絵柄。**素材ファイルは使わず、その場で図形を組む**
 * (外部アセットを増やさない方針 → AGENTS.md「この企画でのルール」)。
 *
 * 座標系は全カード共通で 60 × 40 (3:2)。地面は y≒32、水面は y=12 に揃えてあるので、
 * カードを並べたときに目線が揃う。色は段階色から作った3色だけで塗り、
 * 「色 = 栄養段階」という画面全体の約束を絵柄でも崩さない。
 */
const VIEW_BOX = "0 0 60 40";

interface Ink {
  /** 本体 */
  base: string;
  /** 影・輪郭・くちばしなどの締め */
  deep: string;
  /** 明るい差し色 (腹・穂・斑点) */
  pale: string;
}

/** 段階色から外す例外は2つだけ。枝や幹の木の色と、電気の火花 */
const WOOD = "#8b6b4a";
const SPARK = "#e9c33c";

function repeat(n: number, f: (i: number) => string): string {
  return Array.from({ length: n }, (_, i) => f(i)).join("");
}

// ---------- 背景 ----------

/** 生息環境ごとの下地。外来種と人間の介入は生態系の外なので別扱いにする */
function backdrop(def: CardDef): string {
  if (def.kind === "invasive") {
    return (
      `<rect width="60" height="40" fill="#f3e8fa"/>` +
      repeat(
        7,
        (i) => `<path d="M${-14 + i * 12} 40L${18 + i * 12} 0" stroke="#e8d5f5" stroke-width="3"/>`,
      )
    );
  }
  if (def.kind === "control") {
    return (
      `<rect width="60" height="40" fill="#eceae4"/>` +
      repeat(7, (i) => `<path d="M0 ${i * 6}h60" stroke="#dedbd2" stroke-width="0.6"/>`) +
      repeat(10, (i) => `<path d="M${i * 6} 0v40" stroke="#dedbd2" stroke-width="0.6"/>`)
    );
  }
  switch (def.habitat) {
    case "water":
      return (
        `<rect width="60" height="40" fill="#e0f0f7"/>` +
        `<rect y="12" width="60" height="28" fill="#b9dcec"/>` +
        `<path d="M0 12h60" stroke="#8dc4dc" stroke-width="0.8"/>` +
        `<path d="M5 19q3-2 6 0t6 0M33 25q3-2 6 0t6 0" fill="none" stroke="#a5d1e3" stroke-width="0.8"/>` +
        `<path d="M0 36q15-4 30-1t30-2v7H0z" fill="#c9bda2"/>`
      );
    case "grass":
      return (
        `<rect width="60" height="40" fill="#eff5e0"/>` +
        `<path d="M0 27q16-6 30-2t30-3v18H0z" fill="#dbe8bb"/>` +
        `<path d="M0 34h60v6H0z" fill="#cadca6"/>` +
        repeat(
          6,
          (i) =>
            `<path d="M${4 + i * 10} 34l-2-6M${6 + i * 10} 34l2-7" stroke="#bcd18f" stroke-width="0.8" fill="none"/>`,
        )
      );
    case "forest":
      return (
        `<rect width="60" height="40" fill="#e9f1e3"/>` +
        repeat(4, (i) => `<circle cx="${6 + i * 17}" cy="${13 + (i % 2) * 4}" r="9" fill="#d3e3ca"/>`) +
        repeat(4, (i) => `<rect x="${5 + i * 17}" y="18" width="2.5" height="14" fill="#cbc0a6"/>`) +
        `<path d="M0 31q15-3 30-1t30-2v12H0z" fill="#d7c9ab"/>`
      );
    default:
      return `<rect width="60" height="40" fill="#eceae4"/>`;
  }
}

// ---------- 絵柄 (カードごと) ----------

const MOTIFS: Record<string, (c: Ink) => string> = {
  // ---- 生産者 ----
  susuki: (c) =>
    `<g fill="none" stroke="${c.deep}" stroke-width="1.4" stroke-linecap="round">` +
    `<path d="M30 36C28 28 24 22 18 17"/><path d="M30 36V13"/><path d="M30 36c2-8 6-14 12-19"/>` +
    `<path d="M30 36c-4-6-9-9-16-11"/><path d="M30 36c4-6 9-9 16-11"/></g>` +
    `<g fill="${c.pale}" stroke="${c.deep}" stroke-width="0.5">` +
    `<ellipse cx="17" cy="15" rx="2.6" ry="5.4" transform="rotate(-28 17 15)"/>` +
    `<ellipse cx="30" cy="10" rx="2.6" ry="5.4"/>` +
    `<ellipse cx="43" cy="15" rx="2.6" ry="5.4" transform="rotate(28 43 15)"/></g>`,

  keisou: (c) =>
    `<g fill="${c.pale}" stroke="${c.deep}" stroke-width="0.9">` +
    `<circle cx="21" cy="22" r="7.5"/>` +
    `<rect x="34" y="11" width="19" height="6.4" rx="3.2" transform="rotate(16 43 14)"/>` +
    `<rect x="33" y="26" width="15" height="5.4" rx="2.7" transform="rotate(-14 40 29)"/></g>` +
    `<g stroke="${c.deep}" stroke-width="0.6" fill="none">` +
    `<path d="M21 15v14M14 22h14M16 17l10 10M26 17L16 27"/>` +
    repeat(5, (i) => `<path d="M${37 + i * 3.4} ${11.6 + i}v5"/>`) +
    `</g>`,

  yoshi: (c) =>
    `<g stroke="${c.deep}" stroke-width="1.5" stroke-linecap="round" fill="none">` +
    `<path d="M18 34V11"/><path d="M28 34V6"/><path d="M38 34V13"/><path d="M47 34V18"/></g>` +
    `<g fill="${c.base}"><path d="M28 19q9-4 13-11-9 1-13 8z"/><path d="M18 23q-8-3-11-9 8 1 11 7z"/>` +
    `<path d="M38 24q7-3 10-8-7 0-10 6z"/></g>` +
    `<g fill="${c.deep}"><ellipse cx="28" cy="6" rx="1.7" ry="4"/><ellipse cx="18" cy="11" rx="1.5" ry="3.4"/>` +
    `<ellipse cx="38" cy="13" rx="1.5" ry="3.4"/><ellipse cx="47" cy="18" rx="1.4" ry="3"/></g>`,

  kuromo: (c) =>
    `<g fill="none" stroke="${c.deep}" stroke-width="1.3">` +
    `<path d="M20 38C22 28 17 20 22 9"/><path d="M39 38C36 30 41 22 36 13"/></g>` +
    `<g fill="${c.base}">` +
    repeat(6, (i) => `<ellipse cx="${20 + (i % 2 ? 4 : -4)}" cy="${34 - i * 4.6}" rx="4" ry="1.5"/>`) +
    repeat(5, (i) => `<ellipse cx="${39 + (i % 2 ? -4 : 4)}" cy="${34 - i * 4.6}" rx="3.6" ry="1.4"/>`) +
    `</g>` +
    `<g fill="#ffffff" opacity="0.65"><circle cx="48" cy="17" r="2"/><circle cx="52" cy="10" r="1.4"/>` +
    `<circle cx="12" cy="14" r="1.6"/></g>`,

  konara: (c) =>
    `<path d="M28 37V20h4.4v17z" fill="${WOOD}"/>` +
    `<g fill="${c.base}"><circle cx="30" cy="15" r="11.5"/><circle cx="19" cy="20" r="7"/>` +
    `<circle cx="41" cy="20" r="7"/></g>` +
    `<circle cx="37" cy="20" r="7" fill="${c.deep}" opacity="0.28"/>` +
    `<ellipse cx="48" cy="32" rx="2.2" ry="3" fill="${WOOD}"/>` +
    `<path d="M45.4 29.6h5.2v-1.8a2.6 2.6 0 0 0-5.2 0z" fill="${c.deep}"/>`,

  // ---- 一次消費者 ----
  batta: (c) =>
    `<g transform="rotate(-12 30 24)">` +
    `<ellipse cx="30" cy="24" rx="12" ry="4.6" fill="${c.base}"/>` +
    `<path d="M30 20q10-3 12 3-6 3-12 1z" fill="${c.pale}"/>` +
    `<circle cx="42" cy="22" r="3.8" fill="${c.deep}"/>` +
    `<g stroke="${c.deep}" stroke-width="1" fill="none" stroke-linecap="round">` +
    `<path d="M45 19l6-4M45 21l7-1M26 27l-3 6M32 27l-2 6"/></g>` +
    `<path d="M26 22l-9 8 4-10z" fill="${c.deep}"/>` +
    `<path d="M18 30l3 7" stroke="${c.deep}" stroke-width="1.4" stroke-linecap="round" fill="none"/>` +
    `<circle cx="43.4" cy="21" r="0.9" fill="#ffffff"/></g>`,

  nousagi: (c) =>
    `<ellipse cx="28" cy="27" rx="11.5" ry="7" fill="${c.base}"/>` +
    `<circle cx="40" cy="21" r="5.4" fill="${c.base}"/>` +
    `<g fill="${c.base}"><ellipse cx="38" cy="11" rx="2.1" ry="6.2" transform="rotate(-10 38 11)"/>` +
    `<ellipse cx="44" cy="12" rx="2.1" ry="6.2" transform="rotate(12 44 12)"/></g>` +
    `<g fill="${c.pale}"><ellipse cx="38" cy="11.5" rx="0.9" ry="4.2" transform="rotate(-10 38 11.5)"/>` +
    `<ellipse cx="44" cy="12.5" rx="0.9" ry="4.2" transform="rotate(12 44 12.5)"/>` +
    `<circle cx="17" cy="25" r="2.8"/></g>` +
    `<circle cx="42.6" cy="20" r="1" fill="${c.deep}"/>` +
    `<g stroke="${c.deep}" stroke-width="1.6" stroke-linecap="round"><path d="M23 33v3M32 33v3"/></g>`,

  tanishi: (c) =>
    `<path d="M17 34q7-5 15-2t11 2z" fill="${c.pale}"/>` +
    `<circle cx="31" cy="23" r="8" fill="${c.base}"/>` +
    `<path d="M35 27a5.5 5.5 0 1 1-5-8 4 4 0 1 1 3.4 6" fill="none" stroke="${c.deep}" stroke-width="1.7"/>` +
    `<g stroke="${c.pale}" stroke-width="1.1" stroke-linecap="round"><path d="M19 32l-4-5M22 33l-3-6"/></g>` +
    `<g fill="${c.deep}"><circle cx="15" cy="27" r="1"/><circle cx="19" cy="27" r="1"/></g>`,

  dojou: (c) =>
    `<path d="M9 29q12-6 26-4t17 3q-3 4-17 5T9 29z" fill="${c.base}"/>` +
    `<path d="M50 26l7-4v11l-7-5z" fill="${c.deep}"/>` +
    `<g stroke="${c.deep}" stroke-width="0.8" stroke-linecap="round" fill="none">` +
    `<path d="M10 27l-5-3M10 30l-5 2M12 31l-4 3"/></g>` +
    `<circle cx="14" cy="27.5" r="1" fill="${c.deep}"/>` +
    `<g fill="${c.deep}" opacity="0.45">` +
    repeat(5, (i) => `<ellipse cx="${20 + i * 6}" cy="${26.4 + i * 0.3}" rx="1.6" ry="1"/>`) +
    `</g>`,

  shika: (c) =>
    `<ellipse cx="26" cy="23" rx="11.5" ry="6.2" fill="${c.base}"/>` +
    `<path d="M34 21l5-8 3.4 2.2-4 8z" fill="${c.base}"/>` +
    `<ellipse cx="43" cy="13" rx="4.8" ry="3" transform="rotate(-22 43 13)" fill="${c.base}"/>` +
    `<g fill="none" stroke="${c.deep}" stroke-width="1.2" stroke-linecap="round">` +
    `<path d="M40.4 10C39 6 37 4 34.6 3M38.4 6l-3.6-1M45.6 9c1-4 3-6 5.4-7.4M47 5l3.6-1.4"/></g>` +
    `<g stroke="${c.deep}" stroke-width="1.7" stroke-linecap="round">` +
    `<path d="M19 28v8M24 28v8M31 28v8M35 27v8"/></g>` +
    `<g fill="${c.pale}"><circle cx="22" cy="20" r="1.2"/><circle cx="27" cy="19" r="1.2"/>` +
    `<circle cx="32" cy="21" r="1.2"/><circle cx="24" cy="24" r="1.2"/><circle cx="30" cy="24" r="1.2"/>` +
    `<circle cx="15" cy="21" r="2.4"/></g>` +
    `<circle cx="45" cy="12" r="0.9" fill="${c.deep}"/>`,

  // ---- 二次消費者 ----
  tagame: (c) =>
    `<ellipse cx="30" cy="23" rx="9" ry="12" fill="${c.base}"/>` +
    `<path d="M25 12h10l-1.4 4h-7.2z" fill="${c.deep}"/>` +
    `<path d="M30 15v20" stroke="${c.deep}" stroke-width="0.9"/>` +
    `<g fill="none" stroke="${c.deep}" stroke-width="1.8" stroke-linecap="round">` +
    `<path d="M22 15C14 15 11 19 13 24"/><path d="M38 15c8 0 11 4 9 9"/>` +
    `<path d="M22 24l-9 4M22 30l-7 6M38 24l9 4M38 30l7 6"/></g>` +
    `<path d="M30 35v4" stroke="${c.deep}" stroke-width="1.3" stroke-linecap="round"/>` +
    `<g fill="${c.pale}"><circle cx="26.6" cy="13" r="1"/><circle cx="33.4" cy="13" r="1"/></g>`,

  yamame: (c) =>
    `<path d="M8 22q9-8 22-7t16 7q-5 8-17 8T8 22z" fill="${c.base}"/>` +
    `<path d="M45 22l9-6v12z" fill="${c.deep}"/>` +
    `<path d="M24 15l4-6 4 6z" fill="${c.deep}"/>` +
    `<path d="M25 27l7 1-5 4z" fill="${c.deep}"/>` +
    `<circle cx="14" cy="21" r="1.4" fill="${c.deep}"/>` +
    `<g fill="${c.deep}" opacity="0.4">` +
    repeat(4, (i) => `<ellipse cx="${21 + i * 7}" cy="21" rx="2.4" ry="3.2"/>`) +
    `</g>` +
    `<g fill="${c.pale}">` +
    repeat(4, (i) => `<circle cx="${23 + i * 7}" cy="17" r="1"/>`) +
    `</g>`,

  kitsune: (c) =>
    `<path d="M19 25C12 24 9 19 11 13" fill="none" stroke="${c.base}" stroke-width="4.4" stroke-linecap="round"/>` +
    `<circle cx="11" cy="13" r="2.2" fill="${c.pale}"/>` +
    `<ellipse cx="29" cy="24" rx="11" ry="5.4" fill="${c.base}"/>` +
    `<circle cx="40" cy="19" r="5" fill="${c.base}"/>` +
    `<path d="M44 18.4l6.6 1.8-6.6 2.2z" fill="${c.base}"/>` +
    `<g fill="${c.base}"><path d="M36 15l-1-6 5 3z"/><path d="M43 14l2-6 3 5z"/></g>` +
    `<g stroke="${c.deep}" stroke-width="1.7" stroke-linecap="round"><path d="M22 28v7M27 28v7M34 28v7"/></g>` +
    `<circle cx="41" cy="18" r="0.9" fill="${c.deep}"/><circle cx="50.2" cy="20.2" r="1.1" fill="${c.deep}"/>`,

  kawasemi: (c) =>
    `<path d="M14 32h32" stroke="${WOOD}" stroke-width="2.4" stroke-linecap="round"/>` +
    `<ellipse cx="29" cy="21" rx="6.8" ry="7.8" fill="${c.base}"/>` +
    `<circle cx="29" cy="13" r="4.8" fill="${c.base}"/>` +
    `<path d="M33 12l11 2.4-11 2.2z" fill="${c.deep}"/>` +
    `<path d="M23 26l-7 6 9-3z" fill="${c.deep}"/>` +
    `<path d="M25 17q6 2 6 9" fill="none" stroke="${c.deep}" stroke-width="0.8"/>` +
    `<path d="M25 24q5 4 9 1" fill="${c.pale}"/>` +
    `<g stroke="${c.deep}" stroke-width="1.2" stroke-linecap="round"><path d="M27 28v4M32 28v4"/></g>` +
    `<circle cx="31" cy="12" r="1" fill="#ffffff"/>`,

  sagi: (c) =>
    `<g stroke="${c.deep}" stroke-width="1.3" stroke-linecap="round"><path d="M27 37V25M33 37V25"/></g>` +
    `<ellipse cx="28" cy="24" rx="10" ry="5.6" fill="${c.base}"/>` +
    `<path d="M34 22C37 16 32 12 35 7" fill="none" stroke="${c.base}" stroke-width="3.2" stroke-linecap="round"/>` +
    `<circle cx="35" cy="6" r="3" fill="${c.base}"/>` +
    `<path d="M38 5l10 2-10 2z" fill="${c.deep}"/>` +
    `<path d="M33 3l-5-2" stroke="${c.deep}" stroke-width="0.9" stroke-linecap="round"/>` +
    `<path d="M20 22q9 5 15 0" fill="none" stroke="${c.deep}" stroke-width="0.8"/>` +
    `<path d="M18 26l-6 3 8 1z" fill="${c.pale}"/>` +
    `<circle cx="36" cy="5.4" r="0.8" fill="${c.deep}"/>`,

  // ---- 頂点捕食者 ----
  ootaka: (c) =>
    `<path d="M12 34h36" stroke="${WOOD}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M30 11c6 0 9 6 8 12s-3 8-8 8-9-2-9-8 3-12 9-12z" fill="${c.base}"/>` +
    `<circle cx="30" cy="11" r="5.2" fill="${c.base}"/>` +
    `<path d="M34 9.6l5.6 1.4-4.4 3.2z" fill="${c.deep}"/>` +
    `<path d="M26 29l2 8 7-1-3-7z" fill="${c.deep}"/>` +
    `<g stroke="${c.pale}" stroke-width="1" fill="none">` +
    repeat(4, (i) => `<path d="M24 ${19 + i * 3.4}h12"/>`) +
    `</g>` +
    `<g stroke="${c.deep}" stroke-width="1.3" stroke-linecap="round"><path d="M27 30v4M33 30v4"/></g>` +
    `<circle cx="32" cy="9.6" r="1.1" fill="${c.pale}"/>`,

  kuma: (c) =>
    `<ellipse cx="26" cy="24" rx="14" ry="9" fill="${c.base}"/>` +
    `<circle cx="44" cy="19" r="6.4" fill="${c.base}"/>` +
    `<g fill="${c.base}"><circle cx="40" cy="12" r="2.6"/><circle cx="48.4" cy="12" r="2.6"/></g>` +
    `<ellipse cx="49" cy="21.4" rx="3.2" ry="2.4" fill="${c.deep}"/>` +
    `<path d="M35 23q5 5 10 0" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>` +
    `<g stroke="${c.deep}" stroke-width="4" stroke-linecap="round"><path d="M18 31v4M27 31v4M35 31v3"/></g>` +
    `<circle cx="42" cy="17.6" r="1" fill="${c.deep}"/>`,

  inuwashi: (c) =>
    `<path d="M27 15C18 11 8 11 2 15c6 1 6 3 4 5 6 2 14 2 21-1z" fill="${c.base}"/>` +
    `<path d="M33 15c9-4 19-4 25 0-6 1-6 3-4 5-6 2-14 2-21-1z" fill="${c.base}"/>` +
    `<g stroke="${c.deep}" stroke-width="0.8" fill="none">` +
    repeat(3, (i) => `<path d="M${5 + i * 2} 15.6l-3 2"/>`) +
    repeat(3, (i) => `<path d="M${55 - i * 2} 15.6l3 2"/>`) +
    `</g>` +
    `<ellipse cx="30" cy="20" rx="3.6" ry="8.4" fill="${c.deep}"/>` +
    `<circle cx="30" cy="10.6" r="2.8" fill="${c.deep}"/>` +
    `<path d="M32 9.6l3.4 1-3.4 1.6z" fill="${c.pale}"/>` +
    `<path d="M26.6 27h6.8l2.6 9h-12z" fill="${c.base}"/>`,

  // ---- 分解者 ----
  mimizu: (c) =>
    `<rect y="14" width="60" height="26" fill="#a98c6a"/>` +
    `<g fill="#8f7355" opacity="0.5"><circle cx="10" cy="22" r="2"/><circle cx="49" cy="20" r="1.6"/>` +
    `<circle cx="38" cy="35" r="2.2"/><circle cx="20" cy="36" r="1.4"/></g>` +
    `<path d="M6 34c8-12 16 0 24-12s16-4 22-10" fill="none" stroke="${c.base}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M6 34c8-12 16 0 24-12s16-4 22-10" fill="none" stroke="${c.deep}" stroke-width="5" stroke-dasharray="0.9 3.6" opacity="0.45"/>` +
    `<circle cx="52" cy="12" r="2.6" fill="${c.pale}"/>`,

  dangomushi: (c) =>
    `<rect y="30" width="60" height="10" fill="#a98c6a"/>` +
    `<path d="M10 30a11 8 0 0 1 22 0z" fill="${c.base}"/>` +
    `<g stroke="${c.deep}" stroke-width="0.9" fill="none">` +
    `<path d="M14 30v-5.4M18 30v-7M22 30v-7.4M26 30v-6"/></g>` +
    `<circle cx="33" cy="28" r="2.6" fill="${c.deep}"/>` +
    `<g stroke="${c.deep}" stroke-width="0.8" stroke-linecap="round" fill="none">` +
    `<path d="M35 26l4-2M35 28.4h4"/>` +
    repeat(3, (i) => `<path d="M${14 + i * 6} 30l-1.6 3"/>`) +
    `</g>` +
    `<circle cx="47" cy="24" r="6.4" fill="${c.base}"/>` +
    `<g fill="none" stroke="${c.deep}" stroke-width="0.9">` +
    repeat(3, (i) => `<path d="M${41.6 + i * 2.6} 21.4a6.4 6.4 0 0 0 2.6 7.6"/>`) +
    `</g>`,

  kinoko: (c) =>
    `<rect x="3" y="29" width="54" height="8" rx="4" fill="${WOOD}"/>` +
    `<g fill="none" stroke="#75593c" stroke-width="0.8"><path d="M12 29v8M22 29v8"/></g>` +
    `<path d="M20 29v-8" stroke="${c.pale}" stroke-width="3.6" stroke-linecap="round"/>` +
    `<path d="M11 22a9 7 0 0 1 18 0z" fill="${c.base}"/>` +
    `<path d="M11 22h18" stroke="${c.deep}" stroke-width="0.8"/>` +
    `<path d="M39 29v-6" stroke="${c.pale}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M32 24a7 5.4 0 0 1 14 0z" fill="${c.base}"/>` +
    `<path d="M32 24h14" stroke="${c.deep}" stroke-width="0.8"/>` +
    `<g fill="${c.pale}"><circle cx="16" cy="19" r="1.4"/><circle cx="23" cy="17.6" r="1.2"/>` +
    `<circle cx="41" cy="21" r="1.1"/></g>`,

  shidemushi: (c) =>
    `<g stroke="${c.deep}" stroke-width="1.1" stroke-linecap="round">` +
    repeat(3, (i) => `<path d="M25 ${19 + i * 5}l-8 ${i * 3 - 2}"/><path d="M35 ${19 + i * 5}l8 ${i * 3 - 2}"/>`) +
    `<path d="M28 10l-5-4M32 10l5-4"/></g>` +
    `<g fill="${c.deep}"><circle cx="23" cy="6" r="1.5"/><circle cx="37" cy="6" r="1.5"/>` +
    `<ellipse cx="30" cy="12" rx="3.2" ry="2.6"/><ellipse cx="30" cy="17" rx="6" ry="3.8"/></g>` +
    `<path d="M24 19h12l-1 12a5 5 0 0 1-10 0z" fill="${c.base}"/>` +
    `<g stroke="${c.pale}" stroke-width="2.6" stroke-linecap="round"><path d="M26 23h8M26.5 28.4h7"/></g>` +
    `<path d="M30 19v14" stroke="${c.deep}" stroke-width="0.7"/>`,

  // ---- 人間の介入 ----
  wana: (c) =>
    `<rect x="13" y="14" width="31" height="19" rx="2" fill="#ffffff" opacity="0.55"/>` +
    `<rect x="13" y="14" width="31" height="19" rx="2" fill="none" stroke="${c.deep}" stroke-width="1.6"/>` +
    `<g stroke="${c.deep}" stroke-width="0.9">` +
    repeat(5, (i) => `<path d="M${18 + i * 5} 14v19"/>`) +
    `<path d="M13 23.5h31"/></g>` +
    `<path d="M44 14l9-9 2.4 2.4-9 9z" fill="${c.base}"/>` +
    `<path d="M20 30h16" stroke="${c.pale}" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="37" cy="27" r="2.4" fill="${c.pale}"/>`,

  boujo: (c) =>
    `<circle cx="15" cy="14" r="4" fill="${c.deep}"/>` +
    `<path d="M15 18v10" stroke="${c.deep}" stroke-width="5" stroke-linecap="round"/>` +
    `<g stroke="${c.deep}" stroke-width="2" stroke-linecap="round" fill="none">` +
    `<path d="M15 28l-4 8M15 28l4 8M15 21l10-5"/></g>` +
    `<circle cx="30" cy="17" r="3.4" fill="${c.base}"/>` +
    `<path d="M30 20.4v8" stroke="${c.base}" stroke-width="4.4" stroke-linecap="round"/>` +
    `<g stroke="${c.base}" stroke-width="1.8" stroke-linecap="round" fill="none">` +
    `<path d="M30 28l-3 8M30 28l3 8"/></g>` +
    `<path d="M25 16l17-8" stroke="${WOOD}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<ellipse cx="46" cy="7" rx="6.4" ry="4.6" transform="rotate(-28 46 7)" fill="none" stroke="${c.deep}" stroke-width="1.4"/>` +
    `<path d="M43 11q4 8 9 2" fill="none" stroke="${c.deep}" stroke-width="0.8" stroke-dasharray="1.4 1.4"/>`,

  denki: (c) =>
    `<rect y="16" width="60" height="24" fill="#b9dcec"/>` +
    `<path d="M0 16h60" stroke="#8dc4dc" stroke-width="0.8"/>` +
    `<path d="M8 4l16 16" stroke="${WOOD}" stroke-width="2.2" stroke-linecap="round"/>` +
    `<circle cx="27" cy="24" r="6.4" fill="none" stroke="${c.deep}" stroke-width="2"/>` +
    `<path d="M41 6l-7 10h5l-4 10 12-13h-6l6-7z" fill="${SPARK}" stroke="${c.deep}" stroke-width="0.6"/>` +
    `<ellipse cx="44" cy="31" rx="7" ry="2.8" fill="#ffffff" opacity="0.85"/>` +
    `<path d="M51 28.6l5-2.6v10l-5-2.6z" fill="#ffffff" opacity="0.85"/>` +
    `<g stroke="${c.deep}" stroke-width="0.8" stroke-linecap="round"><path d="M39 30l2 2M41 30l-2 2"/></g>`,

  // ---- 外来種 ----
  seitaka: (c) =>
    `<g stroke="${c.deep}" stroke-width="1.3" fill="none">` +
    `<path d="M10 38V19"/><path d="M21 38V11"/><path d="M32 38V7"/><path d="M43 38V13"/><path d="M53 38V21"/></g>` +
    `<g fill="${c.base}"><path d="M10 20l-4 9h8z"/><path d="M21 12l-5 12h10z"/><path d="M32 6l-6 15h12z"/>` +
    `<path d="M43 13l-5 12h10z"/><path d="M53 21l-4 9h8z"/></g>` +
    `<g stroke="${c.deep}" stroke-width="0.9" stroke-linecap="round">` +
    repeat(5, (i) => `<path d="M${10 + i * 10.7} ${32 - (i === 2 ? 4 : 0)}l${i % 2 ? 4 : -4}-3"/>`) +
    `</g>`,

  ushigaeru: (c) =>
    `<ellipse cx="30" cy="27" rx="15" ry="9.6" fill="${c.base}"/>` +
    `<g fill="${c.base}"><path d="M14 30q-7 2-5 8 4-3 8-3z"/><path d="M46 30q7 2 5 8-4-3-8-3z"/></g>` +
    `<g fill="${c.base}"><circle cx="23" cy="15" r="5"/><circle cx="37" cy="15" r="5"/></g>` +
    `<g fill="${c.deep}"><circle cx="23" cy="14.6" r="2.4"/><circle cx="37" cy="14.6" r="2.4"/></g>` +
    `<g fill="#ffffff"><circle cx="22" cy="13.6" r="0.9"/><circle cx="36" cy="13.6" r="0.9"/></g>` +
    `<path d="M18 27q12 8 24 0" fill="none" stroke="${c.deep}" stroke-width="1.3"/>` +
    `<g fill="none" stroke="${c.deep}" stroke-width="0.9"><circle cx="18" cy="21" r="2.6"/>` +
    `<circle cx="42" cy="21" r="2.6"/></g>` +
    `<g fill="${c.deep}" opacity="0.35"><circle cx="27" cy="31" r="1.6"/><circle cx="34" cy="33" r="1.4"/></g>`,

  zarigani: (c) =>
    `<ellipse cx="30" cy="21" rx="5.4" ry="9.4" fill="${c.base}"/>` +
    `<path d="M25 29h10l-1 5 3 4H23l3-4z" fill="${c.base}"/>` +
    `<g stroke="${c.base}" stroke-width="2.6" stroke-linecap="round" fill="none">` +
    `<path d="M26 16l-7-4"/><path d="M34 16l7-4"/></g>` +
    `<g fill="${c.base}"><path d="M19 12l-8-4 3 5-4 3 9 1z"/><path d="M41 12l8-4-3 5 4 3-9 1z"/></g>` +
    `<g stroke="${c.deep}" stroke-width="0.9" stroke-linecap="round" fill="none">` +
    `<path d="M28 10l-5-8M32 10l5-8"/>` +
    repeat(3, (i) => `<path d="M25 ${20 + i * 4}l-7 ${2 + i * 2}"/><path d="M35 ${20 + i * 4}l7 ${2 + i * 2}"/>`) +
    `</g>` +
    `<g fill="${c.deep}"><circle cx="27.6" cy="13" r="1"/><circle cx="32.4" cy="13" r="1"/>` +
    repeat(3, (i) => `<rect x="25" y="${18 + i * 4}" width="10" height="1.2"/>`) +
    `</g>`,

  bass: (c) =>
    `<path d="M14 14q14-4 24 1t14 7q-6 6-16 7t-22-6z" fill="${c.base}"/>` +
    `<path d="M50 22l8-6v13z" fill="${c.deep}"/>` +
    `<path d="M15 14l-9 6 10 8q-5-7-1-14z" fill="${c.deep}"/>` +
    `<path d="M22 11l3-6 2 6 3-6 2 6 3-5 2 5z" fill="${c.deep}"/>` +
    `<circle cx="19" cy="15.6" r="2" fill="#ffffff"/><circle cx="19" cy="15.6" r="1" fill="${c.deep}"/>` +
    `<g fill="${c.deep}" opacity="0.45">` +
    repeat(4, (i) => `<rect x="${24 + i * 7}" y="${16 + i * 0.6}" width="4.4" height="3" rx="1.4"/>`) +
    `</g>` +
    `<path d="M26 26l8 2-6 4z" fill="${c.deep}"/>`,

  araiguma: (c) =>
    `<path d="M40 30q11-1 13-11" fill="none" stroke="${c.base}" stroke-width="6.4" stroke-linecap="round"/>` +
    `<path d="M40 30q11-1 13-11" fill="none" stroke="${c.deep}" stroke-width="6.4" stroke-dasharray="3 3.4"/>` +
    `<g fill="${c.base}"><circle cx="17" cy="12" r="4.6"/><circle cx="35" cy="12" r="4.6"/>` +
    `<circle cx="26" cy="21" r="11.4"/></g>` +
    `<g fill="${c.pale}"><circle cx="17" cy="12.6" r="2.4"/><circle cx="35" cy="12.6" r="2.4"/></g>` +
    `<path d="M16 18q10-4.6 20 0l-2 5.4q-8 3.4-16 0z" fill="${c.deep}"/>` +
    `<g fill="#ffffff"><circle cx="21" cy="20.4" r="1.5"/><circle cx="31" cy="20.4" r="1.5"/></g>` +
    `<path d="M21 26q5 5 10 0z" fill="${c.pale}"/>` +
    `<path d="M24 26h4l-2 2.4z" fill="${c.deep}"/>`,
};

/** 未知の id でも画面が壊れないようにする。段階色の葉だけを置く */
function fallback(c: Ink): string {
  return (
    `<circle cx="30" cy="20" r="11" fill="${c.base}"/>` +
    `<path d="M30 12q9 4 0 16-9-12 0-16z" fill="${c.pale}"/>`
  );
}

/**
 * カード1枚ぶんの絵柄を作る。
 * `preserveAspectRatio="slice"` にしてあるので、枠の縦横比が多少変わっても
 * 絵柄は歪まず、上下 (または左右) が切れるだけになる。
 */
export function createCardArt(def: CardDef): SVGSVGElement {
  const base = colorFor(def);
  const ink: Ink = { base, deep: shade(base, -0.4), pale: shade(base, 0.5) };

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", VIEW_BOX);
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.innerHTML = backdrop(def) + (MOTIFS[def.id] ?? fallback)(ink);
  return svg;
}
