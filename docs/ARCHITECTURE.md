# 巡る里山 — 実装アーキテクチャ

ルールの内容は [DESIGN.md](./DESIGN.md)、残っている作業は [TASKS.md](./TASKS.md) を参照。
この文書は **実装との契約** であり、勝手に変えない。
変更が必要な場合は実装せずに提案し、合意してから ARCHITECTURE.md を先に更新する。

---

## 1. 方針

- **`src/core/` は純粋関数のみ。** DOM・`window`・`Date`・`Math.random` を一切参照しない。
  すべての状態遷移は `(state, input) => newState` の形にする。
- **状態は不変に扱う。** 受け取った `GameState` を破壊的に変更せず、新しいオブジェクトを返す。
- **乱数はシードから決定的に生成する。** `Math.random()` は使用禁止。
  再現可能でないとバランス調整もテストもできない。
- **UI は状態を描くだけ。** UI 側にルールを書かない。判定は必ず `core` に問い合わせる。

---

## 2. ディレクトリ構成

```
src/
  core/                 純粋ロジック。DOM 非依存
    types.ts            型定義。全モジュールの契約
    rules.ts            ルール由来の定数 (ターン数・手札枚数・配点・侵入スケジュール)
    rng.ts              シード付き乱数
    state.ts            GameState の生成・ゾーン操作
    cards.ts            defId からカード定義を引く (cardDefinition)
    engine.ts           フェイズ遷移とコマンド適用。UI 向けの唯一の入口
    predation.ts        捕食判定
    effects.ts          効果の解決
    invasion.ts         侵入・増殖・敗北判定
    score.ts            最終スコア計算
  data/
    cards.ts            在来種 + 駆除カードの定義
    invasives.ts        外来種の定義
    supply.ts           供給の構成と初期デッキ
  ui/
    app.ts              画面全体の組み立てと入力処理
    hand.ts             手札・場・捕食対象選択の UI
    supply.ts           供給の UI
    web.ts              食物網 / ピラミッドの SVG 可視化
    screens.ts          タイトル・結果画面
    help.ts             遊び方 (ルールと操作方法) のオーバーレイ
    theme.ts            配色・段階名など表示上の共通部品
  main.ts               エントリポイント
  style.css
tests/
  *.test.ts             core に対するテスト
docs/
```

---

## 3. 型定義

以下をそのまま `src/core/types.ts` とする。

```ts
// ---------- 基本 ----------

/** 栄養段階。0 = 分解者(段階外)、1 = 生産者、2〜4 = 消費者 */
export type Trophic = 0 | 1 | 2 | 3 | 4;

export type CardKind =
  | "producer"    // 生産者
  | "consumer"    // 消費者
  | "decomposer"  // 分解者
  | "control"     // 人間の介入(駆除)
  | "invasive";   // 外来種

export type Zone = "deck" | "hand" | "field" | "discard" | "trash";

export type Habitat = "forest" | "grass" | "water";

// ---------- 効果 ----------

export type Effect =
  /** カードを n 枚引く */
  | { t: "draw"; n: number }
  /** エネルギーを n 得る */
  | { t: "energy"; n: number }
  /** 獲得回数を n 増やす */
  | { t: "gain"; n: number }
  /** 捨て札から n 枚を山札の一番上に戻す。kind 指定時はその種別を優先 */
  | { t: "recycle"; n: number; kind?: CardKind }
  /** 指定ゾーンの外来種を n 枚まで廃棄する */
  | { t: "trashInvasive"; n: number; from: Zone[] };

/** 外来種の常在効果。手札にある間だけ働く */
export type Aura =
  /** 生産者のエネルギー産出を n 変化させる(負値) */
  | { t: "producerEnergy"; n: number }
  /** 分解者の効果を無効化する */
  | { t: "blockDecomposer" }
  /** クリーンアップ時、場・手札・捨て札から指定段階の消費者を1枚廃棄する */
  | { t: "eatConsumer"; trophic: Trophic }
  /** 増殖時に追加で n 枚増える */
  | { t: "extraSpread"; n: number };

// ---------- カード定義 ----------

export interface CardDef {
  id: string;
  name: string;
  kind: CardKind;
  trophic: Trophic;
  /** 供給での獲得コスト。獲得不可(外来種)は null */
  cost: number | null;
  /** 生産者のエネルギー産出。それ以外は未定義 */
  energy?: number;
  /** 捕食成功時、または捕食不要なカードのプレイ時に解決する効果 */
  effects: Effect[];
  /** この在来種が例外的に捕食できる外来種の id */
  eatsInvasive?: string[];
  /** 外来種の常在効果 */
  aura?: Aura[];
  /** 供給 / 外来種の山に積む枚数 */
  supply: number;
  /** UI 表示用の日本語テキスト */
  text: string;
  /** v2 用。v1 では判定に使わない(→ DESIGN.md 第9節) */
  habitat?: Habitat;
}

// ---------- 状態 ----------

export interface CardInstance {
  uid: number;
  defId: string;
}

export type Phase = "main" | "gain" | "invasion" | "cleanup" | "over";

export type Result = "playing" | "collapsed" | "survived";

export interface GameState {
  turn: number;
  phase: Phase;
  result: Result;

  energy: number;
  gainsLeft: number;

  deck: CardInstance[];      // 先頭が次に引くカード
  hand: CardInstance[];
  field: CardInstance[];
  discard: CardInstance[];
  trash: CardInstance[];

  /** defId -> 供給の残枚数 */
  supply: Record<string, number>;
  /** defId -> 外来種の山の残枚数 */
  invasivePool: Record<string, number>;
  /** 侵入圧の端数を溜めるカウンタ */
  invasionCounter: number;

  /** mulberry32 の内部状態 */
  rng: number;
  nextUid: number;

  log: LogEntry[];
}

export interface LogEntry {
  turn: number;
  text: string;
}

export interface ScoreBreakdown {
  diversity: number;
  pyramid: number;
  cycling: number;
  apex: number;
  invasivePenalty: number;
  controlPenalty: number;
  total: number;
}
```

---

## 4. core の公開 API

`src/core/engine.ts` が外向きの入口。**すべて純粋関数で、新しい `GameState` を返す。**

```ts
/** 初期状態を作る。同じ seed からは必ず同じ展開になる */
export function createGame(seed: number): GameState;

/** カードをプレイする。捕食が必要な場合は preyUid を渡す */
export function playCard(s: GameState, uid: number, preyUid?: number): GameState;

/** 供給からカードを獲得する */
export function gainCard(s: GameState, defId: string): GameState;

/** 現在のフェイズを終えて次に進める */
export function advancePhase(s: GameState): GameState;

// ---- 問い合わせ(状態を変えない) ----

/** そのカードが今プレイ可能か */
export function canPlay(s: GameState, uid: number): boolean;

/** そのカードの捕食対象になりうるカードの一覧。空配列なら飢餓になる */
export function legalPreys(s: GameState, uid: number): CardInstance[];

/** そのカードが捕食を必要とするか */
export function needsPrey(s: GameState, uid: number): boolean;

/** 今の状態でのスコア内訳 */
export function scoreOf(s: GameState): ScoreBreakdown;

/** 段階ごとのカード枚数。可視化とスコアの両方で使う */
export function trophicCounts(s: GameState): Record<Trophic, number>;

/** 指定ターンに加算される侵入圧 (1ターンあたりの枚数) */
export function invasionPressure(turn: number): number;

/** 指定ターンまでに解禁されている外来種の id。解禁は累積する */
export function unlockedInvasives(turn: number): string[];

// ---- ルール由来の定数 (実体は core/rules.ts) ----

export const TURN_LIMIT: number;        // 生存とみなすターン数
export const HAND_SIZE: number;         // クリーンアップで引く枚数
export const GAINS_PER_TURN: number;    // 1ターンの基本の獲得回数
export const SCORE_WEIGHTS: { ... };    // 最終スコアの配点
export const CYCLING_RATIO: { min; max };  // 「循環効率」で加点される分解者の比率
export const INVASION_SCHEDULE: readonly InvasionStage[];  // 侵入スケジュール
```

UI が呼んでよいのはここに挙げたものだけ。`GameState` のフィールドを直接書き換えることは禁止。

**ルール由来の数値を UI 側に書かない。** 「20ターン」「手札5枚」「多様性 ×2」のような
ルールが決めた数はすべて `core/rules.ts` に置き、core も UI もそこから読む
(遊び方の画面 `ui/help.ts` もこの定数から文面を組み立てている)。

---

## 5. 乱数

`src/core/rng.ts`。mulberry32 を使う。状態は `GameState.rng` に持ち、
乱数を消費するたびに新しい状態を返す。

```ts
/** 乱数を1つ消費し、[0,1) の値と次の状態を返す */
export function next(state: number): { value: number; state: number };

/** [0, n) の整数 */
export function nextInt(state: number, n: number): { value: number; state: number };

/** 配列をシャッフルした新しい配列と次の状態を返す(Fisher-Yates) */
export function shuffle<T>(state: number, xs: readonly T[]): { value: T[]; state: number };
```

---

## 6. 解決順序

実装で迷いやすい箇所。**この順序で実装する。**

### `playCard` の内部

1. `canPlay` で検証。不正なら状態を変えずにそのまま返す。
2. カードを `hand` から `field` へ移す。
3. 捕食が必要な場合:
   - `preyUid` が `legalPreys` に含まれるか検証。含まれなければ **飢餓** として 5 へ。
   - 獲物を `field` または `hand` から取り除き、`discard` へ (在来天敵の場合は `trash` へ)。
4. `effects` を配列の順に解決する。
5. ログを追記して返す。

### 生産者のエネルギー

`energy += max(0, def.energy + Σ(手札の外来種の producerEnergy))`。
下限は0とし、負のエネルギーは発生させない。

### 分解者の無効化

手札に `blockDecomposer` を持つ外来種が1枚でもあれば、
`kind === "decomposer"` のカードの `effects` は解決しない (場には出る)。

### クリーンアップの順序

1. 手札の外来種の `eatConsumer` を解決。**場 → 手札 → 捨て札** の順に
   `trophic === aura.trophic && kind === "consumer"` を探し、最初に見つかった1枚を
   **`trash` へ** 送る (捨て札ではない)。手札の外来種1枚につき、その `aura` に
   列挙された順で1回ずつ解決する。候補が無ければ何もしない。
2. 場と手札をすべて捨て札へ。
3. 5枚引く。山札が足りなければ捨て札をシャッフルして山札に補充してから引く。
4. 敗北判定 → 20ターン判定。

---

## 7. UI の契約

- UI は `GameState` を受け取って描画するだけ。差分計算はせず、毎回まるごと描き直してよい
  (この規模なら十分速い)。
- 入力は `engine` のコマンド関数を呼び、返ってきた新しい状態で再描画する。
- 捕食対象の選択は `legalPreys` の結果をそのまま候補として表示する。
  UI 側で「食べられるかどうか」を判定しない。
- **スマートフォンの縦画面 (幅 360px) で成立させる。** 開発中の動作確認は
  Tailscale 経由でスマートフォンから行うため、これが基準の画面幅になる。

---

## 8. テスト

`tests/` に置き、`core` のみを対象とする。UI のテストは v1 では書かない。

最低限、次は必ず通すこと。

- 同じシードから `createGame` すると完全に同じ状態になる
- 捕食対象がない消費者は飢餓になり、効果が発動しない
- 場から捕食した獲物のエネルギーは失われない (DESIGN.md 第2節の裁定2)
- 外来種の山が尽きたら増殖しない
- 過半数が外来種になった時点で `result === "collapsed"` になる
- `scoreOf` が DESIGN.md 第7節の表どおりに計算される

---

## 9. 技術選定

| 項目 | 選択 | 理由 |
| --- | --- | --- |
| ビルド | Vite | 設定なしで TS が通り、起動が速い |
| 言語 | TypeScript (strict) | 型が契約として機能する |
| UI | 素の DOM | この規模でフレームワークは過剰。依存を増やさない |
| テスト | Vitest | Vite と同じ設定で動く |
| 描画 | インライン SVG | 食物網とピラミッドに最適。画像素材が不要 |

`package.json` のスクリプトは `dev` / `build` / `test` の3つを用意する。

`vite.config.ts` の `server` 設定 (`strictPort` / `allowedHosts` / `hmr.clientPort`) は
スマートフォン確認の経路に直結する。**[MOBILE.md](./MOBILE.md) 第2節のとおりに書くこと。**
`--host` は付けない。Vite は 127.0.0.1 のままにして、外向きの口は Tailscale に任せる。
