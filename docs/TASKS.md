# 巡る里山 — 作業分担

このファイルは **着手前に必ず読む**。
ルールは [DESIGN.md](./DESIGN.md)、型と構成は [ARCHITECTURE.md](./ARCHITECTURE.md)、
カードの数値は [CARDS.md](./CARDS.md)。

リポジトリ全体の作業規約は [../AGENTS.md](../AGENTS.md) が優先する。

---

## 進め方の原則

複数のエージェントが同時に触るため、**フェイズ0だけは直列**にする。
ここで型定義とスタブを確定させて main に載せ、それを両トラックの起点にする。
これをやらずに並行着手すると、型の食い違いで両方の成果が捨てになる。

```
フェイズ0 (直列・1体)         型定義とスタブを main に載せる
        |
        +-------------------+
        |                   |
  トラックA (core)     トラックB (data + UI)     ← 並行
        |                   |
        +-------------------+
        |
フェイズ2 (直列・1体)         メインツリーで統合・バランス調整
```

---

## ファイル所有権

**自分の担当列にないファイルは、読んでもよいが書かない。**
必要になったら勝手に直さず、完了報告に「ここを変えたい」と書いて止める。

| ファイル | フェイズ0 | トラックA | トラックB | フェイズ2 |
| --- | :---: | :---: | :---: | :---: |
| `package.json` / `vite.config.ts` / `tsconfig.json` | 書 | — | — | 書 |
| `index.html` | 書 | — | 書 | — |
| `src/core/types.ts` | 書 | — | — | 書 |
| `src/core/rng.ts` | 書 | — | — | — |
| `src/core/state.ts` | 骨 | 書 | — | — |
| `src/core/engine.ts` | 骨 | 書 | — | — |
| `src/core/predation.ts` | 骨 | 書 | — | — |
| `src/core/effects.ts` | 骨 | 書 | — | — |
| `src/core/invasion.ts` | 骨 | 書 | — | — |
| `src/core/score.ts` | 骨 | 書 | — | — |
| `src/data/**` | 骨 | — | 書 | — |
| `src/ui/**` | — | — | 書 | — |
| `src/main.ts` | 骨 | — | 書 | — |
| `src/style.css` | — | — | 書 | — |
| `tests/**` | — | 書 | — | 書 |
| `docs/**` | — | — | — | 書 |

「骨」= 関数シグネチャだけ置いて中身は `throw new Error("未実装")`。

---

## フェイズ0 — 契約の確定 (直列・1体のみ)

ブランチ: `claude/scaffold` または `codex/scaffold`

**このフェイズが終わって main にマージされるまで、他のエージェントは着手しない。**

### やること

1. Vite + TypeScript (strict) の雛形を作る。
   `package.json` のスクリプトは `dev` / `build` / `test` の3つ。
   `vite.config.ts` の `server` 設定は [MOBILE.md](./MOBILE.md) 第2節のとおりに書く
   (`strictPort` / `allowedHosts` / `hmr.clientPort`)。**`--host` は付けない。**
2. Vitest を入れる。
3. `src/core/types.ts` を [ARCHITECTURE.md 第3節](./ARCHITECTURE.md) から**そのまま**書き写す。
4. `src/core/rng.ts` を実装する (mulberry32、[ARCHITECTURE.md 第5節](./ARCHITECTURE.md))。
   これは中身まで作る。トラックA・B の両方が依存するため。
5. `src/core/` の残りと `src/data/` を、**シグネチャだけのスタブ**として置く。
   中身は `throw new Error("未実装")`。`src/data/` は空配列を返すだけでよい。
6. `src/main.ts` と `index.html` は「画面に文字が出る」だけの最小構成。

### 完了条件

- `npm run dev` が起動し、[MOBILE.md](./MOBILE.md) の URL でスマートフォンから開ける
- `npm run build` が通る
- `npm test` が通る (テスト0件でよい)
- `npx tsc --noEmit` が型エラーなしで通る
- **スタブに対して `import` するだけのコードが両トラックで書ける状態**

### 完了後

main にマージする。マージ後、両トラックの担当に着手可能であることを伝える。

---

## トラックA — core ロジック

ブランチ: `<agent>/core`
依存: フェイズ0 の完了

`src/core/` の中身を実装する。**DOM を一切参照しない。**
UI がまだ無い状態で、テストだけで正しさを確認できるようにする。

### A-1. 状態とゾーン操作 (`state.ts`)

`createGame(seed)`、ゾーン間のカード移動、ドロー (山札が尽きたらシャッフルして補充)。
初期デッキは [CARDS.md](./CARDS.md) のとおり。

### A-2. 捕食判定 (`predation.ts`)

`needsPrey` / `legalPreys`。[DESIGN.md 第2節](./DESIGN.md) の裁定1〜6をすべて満たすこと。
`eatsInvasive` による在来天敵ルート (獲物は捨て札ではなく **廃棄**) を含む。

### A-3. 効果の解決 (`effects.ts`)

`Effect` の全種別を解決する。`recycle` の `kind` 指定、
`trashInvasive` の `from` ゾーン指定を正しく扱う。
手札の外来種による `producerEnergy` / `blockDecomposer` の適用もここ。

### A-4. 侵入と増殖 (`invasion.ts`)

侵入スケジュール、`invasionCounter` による端数処理、
手札の外来種による増殖 (山が尽きたら増えない)、`eatConsumer`、敗北判定。

### A-5. スコア (`score.ts`)

[DESIGN.md 第7節](./DESIGN.md) の表どおりに `ScoreBreakdown` を返す。

### A-6. エンジン (`engine.ts`)

フェイズ遷移と `playCard` / `gainCard` / `advancePhase`。
解決順序は [ARCHITECTURE.md 第6節](./ARCHITECTURE.md) に従う。

### A-7. テスト (`tests/`)

[ARCHITECTURE.md 第8節](./ARCHITECTURE.md) の6項目は必須。
加えて、シード固定で20ターンを最後まで進めきる通しテストを1本書く
(クラッシュしないことの確認)。

### 完了条件

- `npm test` が全件通る
- `npx tsc --noEmit` が通る
- **UI なしで、テストコードから20ターンを完走できる**

---

## トラックB — データと UI

ブランチ: `<agent>/ui`
依存: フェイズ0 の完了 (トラックAの完了は待たない)

`src/data/` と `src/ui/` を実装する。
**core の中身がまだスタブでも進められるよう、手書きの `GameState` を使って画面を作る。**
`engine` の関数は呼ぶだけにして、中身の実装には触れない。

### B-1. カードデータ (`data/`)

[CARDS.md](./CARDS.md) の表をそのまま `CardDef[]` に落とす。
30種 (在来22 + 駆除3 + 外来5)。**数値を勝手に変えない。**
`text` と `effects` が食い違っていないか突き合わせること。

### B-2. 手札と場の UI (`ui/hand.ts`)

手札のカード表示、プレイ操作、捕食対象の選択。
候補は `legalPreys` の戻り値をそのまま使い、**UI 側で判定を書かない**。
飢餓になるカードは、プレイ前にそれと分かるように見せる。

### B-3. 供給の UI (`ui/supply.ts`)

25種を栄養段階ごとに行を分けて並べる。**供給そのものがピラミッドの形になる**ように置く。
コストを払えないものは分かるように落とす。

### B-4. 食物網 / ピラミッドの可視化 (`ui/web.ts`)

**このゲームの看板。** デッキ全体の栄養段階の構成をインライン SVG で常時描く。
`trophicCounts` の結果を使う。
形が崩れている (上位が下位より多い、分解者がいない) ことが一目で分かること。

### B-5. 画面まわり (`ui/app.ts`, `ui/screens.ts`, `style.css`)

タイトル / ゲーム本編 / 結果画面。ターン数・エネルギー・侵入圧の表示。
配色は栄養段階ごとに固定し、**外来種だけ生態系の色から外れた色**にする。

### 制約

- **幅 360px の縦画面で成立させる。** これが基準であり、PC は後回しでよい
- イラスト素材は使わない。色・記号・活字だけで見せる
- 外部フォント・外部ライブラリを追加しない

### 完了条件

- `npm run build` が通る
- スマートフォンの実機で全画面が破綻なく表示される
- core がスタブでも、画面遷移と描画が確認できる

---

## フェイズ2 — 統合 (直列・1体、メインツリー)

トラックA・B の両方が終わってから、`d:\git\game` で行う。

1. `git merge <agent>/core` と `git merge <agent>/ui`
2. UI と実装済み core を繋いで通しプレイ
3. **バランス調整** — ここで初めて [CARDS.md](./CARDS.md) の数値を動かしてよい。
   変更したら CARDS.md も同じ作業内で更新する
4. 結果画面の仕上げ、バグ修正
5. 余裕があれば Electron で包む

### 調整の観点

- 序盤 (1–8ターン) にエンジンが立ち上がるか。立たないなら初期コストが高すぎる
- 中盤 (9–14ターン) に外来種の対処と生態系の拡張がトレードオフになっているか
- 終盤 (15–20ターン) に手を打たないと崩壊するか。崩壊しないなら侵入圧が緩い
- 頂点捕食者が「到達できるが簡単ではない」位置にあるか

---

## 報告のしかた

各トラックの完了時、次を必ず含めて報告する。

- 実装したファイルの一覧
- **検証したこと / していないこと**。動かしていないものを「動く」と書かない
- 仕様と食い違った箇所、判断に迷って独断で決めた箇所
- 担当外のファイルで直したくなった箇所 (直さずに報告する)
