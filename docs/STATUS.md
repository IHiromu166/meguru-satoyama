# 開発状況

- **時点**: `main` @ `2c20f20` (2026-08-23 更新)
- **目的**: 「今どこまで出来ていて、次に何をすればよいか」を1枚で把握する。
  ルールと型の**契約**は [DESIGN.md](./DESIGN.md) / [ARCHITECTURE.md](./ARCHITECTURE.md)、
  レビュー指摘の詳細は [REVIEW.md](./REVIEW.md) にある。ここには**状態だけ**を書く。

## 一行で言うと

**遊べる。** タイトル → 20ターン → 結果画面まで一通り動く。
残っているのは **バランス調整** と **テストの穴埋め** と **実機での最終確認**。

---

## 開発体制の変更 (2026-08-23)

Claude Code と Codex の**分業をやめた**。以降は単一の作業者が `main` 上で進める。

- `claude/*` / `codex/*` の全ブランチは **main に取り込み済み**で、未取り込みの作業はゼロ。
- worktree (`d:\git\game-claude` / `d:\git\game-codex`) を残す理由はない → 「片付け」参照。
- これに伴い [TASKS.md](./TASKS.md) の「トラックA / トラックB」「ファイル所有権」と、
  [../AGENTS.md](../AGENTS.md) の「複数エージェントの同時作業」「git worktree による作業分離」は
  **役目を終えた**。文面はまだ書き換えていない (残タスク4)。

---

## 出来ていること

### 遊べる範囲

| 画面・機能 | 状態 |
| --- | --- |
| タイトル画面 (シード指定 / 空欄ならランダム) | 動く |
| メインフェイズ (カードのプレイ・捕食対象の選択・飢餓表示) | 動く |
| 獲得フェイズ (供給25種から購入) | 動く |
| 侵入フェイズ (侵入・増殖・外来種の常在効果) | 動く |
| クリーンアップ (手札と場を捨て札へ、`eatConsumer` の廃棄) | 動く |
| 敗北 (外来種が過半数) / 生存 (20ターン到達) の判定 | 実装済み ※生存は未検証 |
| 結果画面 (スコア6項目の内訳 + 使用シード) | 動く |
| 食物網ピラミッドの常時表示 (インライン SVG) | 動く |
| 直近8件のログ欄 (侵入・増殖・捕食・飢餓・崩壊) | 動く |
| PWA (ホーム画面へ追加 / オフライン起動) | 実装済み ※実機未確認 |

### 実装状況

| 領域 | ファイル | 状態 |
| --- | --- | --- |
| core | `src/core/{state,engine,predation,effects,invasion,score,rng,cards,types}.ts` | 実装完了 |
| データ | `src/data/{cards,invasives,supply}.ts` | 30種すべて実装 (在来22 + 駆除3 + 外来5) |
| UI | `src/ui/{app,hand,supply,web,screens,theme}.ts` + `src/style.css` | 実装完了 (計 約1,400行) |
| PWA | `public/{manifest.webmanifest,icon.svg}` + `vite.config.ts` の SW 生成 | 実装完了 |
| テスト | `tests/core.test.ts` | 13件。カバレッジに穴あり (下記) |

core の公開 API は `createGame` / `playCard` / `gainCard` / `advancePhase` / `canPlay` /
`legalPreys` / `needsPrey` / `scoreOf` / `trophicCounts` / `invasionPressure`。
UI からは `src/core/engine.ts` 経由でのみ呼ぶ。UI に残っているルール由来の数値は
ヘッダの「ターン n / **20**」だけで、これは `engine.ts` の `turn >= 20` と二重になっている。

---

## 検証したこと / していないこと

### 確認済み

- `npx tsc -b` / `npx vitest run` (13 passed) / `npx vite build` が `main` @ `2c20f20` で通る。
- **ヘッドレス Edge (360×640) で12ターンの通しプレイ**。侵入・増殖のログが実際に流れること、
  侵入圧の表示がターン3/4/9の境目で切り替わること、11ターン目の崩壊から結果画面まで
  到達すること、ページが縦にも横にもはみ出さないことを確認。
- Android 実機からの接続経路 (Tailscale + dev server) は 2026-08-18 に確認済み
  ([MOBILE.md](./MOBILE.md) 第6節)。

### 未確認・未実施

- **20ターン生存 (`survived`) ルートを一度も通していない。** 観測できているのは崩壊だけ。
  コード上の分岐は存在するがテストも通しプレイも無い。
- **現在の UI での実機通しプレイ**。実機で見たのは phase 0 の「文字が出るだけ」の画面まで。
- **バランス調整 (TASKS.md フェイズ2) は未着手。** [CARDS.md](./CARDS.md) の数値は
  設計時の初期値のまま一度も動かしていない。序盤の立ち上がり / 終盤の崩壊圧が
  意図どおりかは**誰も検証していない**。
- テストの穴: `gainCard`、20ターン完走、`advancePhase` の解決順序。

---

## 残タスク (優先度順)

1. **シード固定で20ターン完走する通しテスト** (`tests/`)。
   TASKS.md A-7 の未了分であり、生存ルートを検証する唯一の手段。
2. **人が実際に20ターン遊んでのバランス調整**。ここで初めて CARDS.md の数値を動かす。
   観点は [TASKS.md](./TASKS.md) フェイズ2 の「調整の観点」。変更したら CARDS.md も同時に直す。
3. **[REVIEW.md](./REVIEW.md) C-7 の整理** — `core/state.ts` の `supplyOf` と
   `data/supply.ts` の `createSupply` が二重化している。`findCard` は未使用 export。
4. **分業前提の記述の除去** — AGENTS.md の worktree / 複数エージェント節、TASKS.md の分担表。
5. ARCHITECTURE.md の追補 — `src/core/cards.ts` (`cardDefinition`) と `invasionPressure` が
   第2節の構成表と第4節の公開 API 一覧に載っていない。
6. (任意) Electron 化。

---

## 動かし方

```
npm install
npm run dev      # http://127.0.0.1:5180
npm run build    # tsc -b && vite build
npm test         # vitest run
```

実機での確認手順は [MOBILE.md](./MOBILE.md)。

### 360px の自動確認

puppeteer / playwright は**入れていない**(外部ライブラリを増やさない方針)。
360px の通しプレイは、ビルドしたものを `vite preview` で出し、
**Edge headless を CDP で直接叩いて**確認している。

```
npx vite preview --port 4183 --strictPort --host 127.0.0.1
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new \
  --remote-debugging-port=9222 --user-data-dir=<一時ディレクトリ> --no-first-run
```

`http://127.0.0.1:9222/json/list` の `webSocketDebuggerUrl` に node の `WebSocket` で繋ぎ、
`Emulation.setDeviceMetricsOverride` (360×640, mobile) → `Runtime.evaluate` でボタンを click →
`Page.captureScreenshot`。はみ出しは `scrollWidth - clientWidth` で測る。
ボタンの文言は「はじめる」「〜フェイズへ」「クリーンアップへ」「次のターンへ」「結果を見る」。

---

## リポジトリの状態

| 項目 | 値 |
| --- | --- |
| `main` | `2c20f20` |
| `origin/main` | `d45f423` — **19コミット遅れ。未 push** |
| 未取り込みのブランチ | なし (`claude/ui` `codex/pwa` `codex/core` `codex/clarify-branch-rules` すべて main に入っている) |
| worktree | `d:\git\game` (main) / `d:\git\game-claude` / `d:\git\game-codex` |

### 片付け (分業終了に伴う後始末)

メインツリー `d:\git\game` で実行する。**まだ実行していない。**

```
git worktree remove ../game-claude
git worktree remove ../game-codex
git branch -d claude/ui codex/pwa codex/core codex/clarify-branch-rules
git push origin main
```

worktree 側に git 管理外のファイル (`node_modules` / `dist`) が残っているため、
`git worktree remove` が拒否される場合は `--force` が要る。
`node_modules` を作り直す手間を惜しむなら、先に `d:\git\game` 側で `npm install` を済ませておく。

---

## 文書の地図

| 文書 | 役割 | 現状 |
| --- | --- | --- |
| [../README.md](../README.md) | 企画概要 | 有効 |
| [DESIGN.md](./DESIGN.md) | ルールと裁定 | 有効 (`eatConsumer` の廃棄仕様を反映済み) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 型定義・モジュール構成・core API | 概ね有効。残タスク5の追補が要る |
| [CARDS.md](./CARDS.md) | 全30種の数値 | 有効。**調整前の初期値** |
| [MOBILE.md](./MOBILE.md) | 実機確認の経路 | 有効 |
| [REVIEW.md](./REVIEW.md) | レビュー指摘16件と対応状況 | 有効。残件は C-7 とテストの穴のみ |
| [TASKS.md](./TASKS.md) | 作業分担 | **陳腐化**。分業終了により分担表は無効 (フェイズ2の「調整の観点」は有効) |
| [../AGENTS.md](../AGENTS.md) | 作業規約 | 一部陳腐化 (worktree / 複数エージェントの節) |
