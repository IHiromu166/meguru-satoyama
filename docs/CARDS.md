# 巡る里山 — カードデータ

型は [ARCHITECTURE.md](./ARCHITECTURE.md) 第3節、ルールは [DESIGN.md](./DESIGN.md) を参照。

> **数値はすべて調整前の初期値。** Day 6 のバランス調整で必ず動く。
> 実装時はこの表のとおりに入れ、勝手に「良さそうな値」に変えない。
> 調整は通しプレイの結果を見てから行う。

供給は **v1 では25種すべてを常設する** (ランダム選抜は v2)。
UI は栄養段階ごとに行を分けて並べること。供給そのものがピラミッドの形になる。

---

## 生産者 (trophic 1, kind `producer`)

捕食不要。プレイすると場に出てエネルギーを産む。

| id | 名前 | cost | energy | 追加効果 | supply | habitat |
| --- | --- | ---: | ---: | --- | ---: | --- |
| `susuki` | ススキ | 2 | 1 | — | 10 | grass |
| `keisou` | ケイソウ | 2 | 1 | `recycle 1` | 8 | water |
| `yoshi` | ヨシ | 3 | 2 | — | 8 | water |
| `kuromo` | クロモ | 4 | 1 | `draw 1` | 8 | water |
| `konara` | コナラ | 5 | 3 | — | 8 | forest |

カードテキスト例:
- ススキ「エネルギー +1」
- ケイソウ「エネルギー +1。捨て札から1枚を山札の上に戻す」
- コナラ「エネルギー +3」

---

## 一次消費者 (trophic 2, kind `consumer`)

**捕食対象: 段階1を1枚。**

| id | 名前 | cost | 効果 | supply | habitat |
| --- | --- | ---: | --- | ---: | --- |
| `batta` | バッタ | 2 | `draw 1`, `energy 1` | 8 | grass |
| `nousagi` | ノウサギ | 3 | `draw 2` | 8 | grass |
| `tanishi` | タニシ | 3 | `recycle 2` | 8 | water |
| `dojou` | ドジョウ | 4 | `draw 1`, `gain 1` | 8 | water |
| `shika` | ニホンジカ | 5 | `draw 3` | 8 | forest |

---

## 二次消費者 (trophic 3, kind `consumer`)

**捕食対象: 段階2を1枚。**

| id | 名前 | cost | 効果 | eatsInvasive | supply | habitat |
| --- | --- | ---: | --- | --- | ---: | --- |
| `tagame` | タガメ | 4 | `draw 1`, `energy 2` | — | 8 | water |
| `yamame` | ヤマメ | 4 | `draw 2` | — | 8 | water |
| `kitsune` | キツネ | 5 | `draw 2`, `gain 1` | — | 8 | forest |
| `kawasemi` | カワセミ | 5 | `draw 3` | — | 8 | water |
| `sagi` | サギ | 6 | `draw 2`, `recycle 1` | `zarigani`, `ushigaeru` | 8 | water |

サギは在来天敵ルートの中核。手札のアメリカザリガニ / ウシガエルを
通常の捕食対象の代わりに食べ、**廃棄** できる。

---

## 頂点捕食者 (trophic 4, kind `consumer`)

**捕食対象: 段階3を1枚。**

| id | 名前 | cost | 効果 | eatsInvasive | supply | habitat |
| --- | --- | ---: | --- | --- | ---: | --- |
| `ootaka` | オオタカ | 7 | `draw 3`, `gain 1` | — | 6 | forest |
| `kuma` | ツキノワグマ | 7 | `draw 2`, `recycle 3` | `araiguma` | 6 | forest |
| `inuwashi` | イヌワシ | 8 | `draw 4`, `gain 1` | — | 6 | forest |

ツキノワグマはアライグマに対する唯一の在来天敵。
アライグマを生態系で処理したい場合、段階3までを揃えたうえでコスト7を払う必要がある。

---

## 分解者 (trophic 0, kind `decomposer`)

捕食不要。捨て札を山札に戻して循環を速める。
手札に `blockDecomposer` を持つ外来種があると効果が解決されない。

| id | 名前 | cost | 効果 | supply | habitat |
| --- | --- | ---: | --- | ---: | --- |
| `mimizu` | ミミズ | 2 | `recycle 2` | 10 | forest |
| `dangomushi` | ダンゴムシ | 3 | `recycle 3` | 8 | forest |
| `kinoko` | キノコ | 4 | `recycle 2`, `draw 1` | 8 | forest |
| `shidemushi` | シデムシ | 4 | `recycle 3` (kind: `consumer` 優先) | 8 | grass |

シデムシの `recycle` は `kind: "consumer"` 指定つき。
捨て札に消費者があればそれを優先して戻し、足りない分は任意のカードで埋める。

---

## 人間の介入 (kind `control`, trophic 0)

捕食不要。生態系の一員ではないため、デッキに残ると最終スコアで減点される。

| id | 名前 | cost | 効果 | supply |
| --- | --- | ---: | --- | ---: |
| `wana` | わな | 3 | `trashInvasive 1` from `["hand"]` | 6 |
| `boujo` | 防除隊 | 5 | `trashInvasive 2` from `["hand","discard"]` | 6 |
| `denki` | 電気ショッカー | 7 | `trashInvasive 3` from `["hand","discard"]` | 4 |

---

## 外来種 (kind `invasive`, trophic 0, cost `null`)

プレイ不可。手札にある間だけ常在効果を発揮する。

| id | 名前 | aura | 山の枚数 | 在来天敵 |
| --- | --- | --- | ---: | --- |
| `seitaka` | セイタカアワダチソウ | `producerEnergy -1` | 8 | なし |
| `ushigaeru` | ウシガエル | `extraSpread 1` | 10 | サギ |
| `zarigani` | アメリカザリガニ | `blockDecomposer` | 8 | サギ |
| `bass` | オオクチバス | `eatConsumer trophic 2` | 8 | なし |
| `araiguma` | アライグマ | `producerEnergy -1`, `eatConsumer trophic 2` | 6 | ツキノワグマ |

`eatConsumer` は場・手札・捨て札から該当段階の在来消費者を1枚選び、
捨て札ではなく **廃棄** する (→ [DESIGN.md](./DESIGN.md) 第5節)。

外来種の山の合計は 40 枚。すべて出しきってもデッキが飲み込まれない量ではないため、
放置すれば確実に敗北する。

### 解禁ターン

| ターン | 侵入 / ターン | 追加で解禁される種 |
| --- | ---: | --- |
| 1–3 | 0 | — |
| 4–8 | 0.5 | `seitaka`, `ushigaeru` |
| 9–14 | 1 | `zarigani` |
| 15–20 | 1 | `bass`, `araiguma` |

---

## 初期デッキ

| カード | 枚数 |
| --- | ---: |
| `susuki` | 7 |
| `mimizu` | 3 |

計10枚。初期デッキの分は供給の枚数から引かない (別枠で用意する)。

---

## 定義の書き方

`src/data/cards.ts` は次の形にする。表の1行がオブジェクト1つに対応する。

```ts
import type { CardDef } from "../core/types";

export const CARDS: CardDef[] = [
  {
    id: "susuki",
    name: "ススキ",
    kind: "producer",
    trophic: 1,
    cost: 2,
    energy: 1,
    effects: [],
    supply: 10,
    habitat: "grass",
    text: "エネルギー +1",
  },
  {
    id: "nousagi",
    name: "ノウサギ",
    kind: "consumer",
    trophic: 2,
    cost: 3,
    effects: [{ t: "draw", n: 2 }],
    supply: 8,
    habitat: "grass",
    text: "生産者を1枚食べる。カードを2枚引く",
  },
  {
    id: "sagi",
    name: "サギ",
    kind: "consumer",
    trophic: 3,
    cost: 6,
    effects: [{ t: "draw", n: 2 }, { t: "recycle", n: 1 }],
    eatsInvasive: ["zarigani", "ushigaeru"],
    supply: 8,
    habitat: "water",
    text: "一次消費者を1枚食べる。カードを2枚引き、捨て札から1枚を山札の上に戻す。" +
          "アメリカザリガニ / ウシガエルを代わりに食べて廃棄してもよい",
  },
];
```

外来種は `src/data/invasives.ts` に分ける。

```ts
import type { CardDef } from "../core/types";

export const INVASIVES: CardDef[] = [
  {
    id: "seitaka",
    name: "セイタカアワダチソウ",
    kind: "invasive",
    trophic: 0,
    cost: null,
    effects: [],
    aura: [{ t: "producerEnergy", n: -1 }],
    supply: 8,
    text: "手札にある間、生産者のエネルギー産出 −1",
  },
];
```

`text` は UI にそのまま出す。**プレイヤーが読んで挙動が分かる日本語** で書くこと。
効果の配列とテキストが食い違っていないか、実装時に必ず突き合わせる。
