# 開発状況

- **時点**: `main` (2026-08-23 更新)。実装コードの最終変更は `a14f269` 時点から動いていない。
- **目的**: 「今どこまで出来ていて、次に何をすればよいか」を1枚で把握する。
  ルールと型の**契約**は [DESIGN.md](./DESIGN.md) / [ARCHITECTURE.md](./ARCHITECTURE.md)、
  残作業の詳細は [TASKS.md](./TASKS.md)、レビュー指摘の詳細は [REVIEW.md](./REVIEW.md) にある。
  ここには**状態だけ**を書く。

## 一行で言うと

**遊べる。** タイトル → 20ターン → 結果画面まで一通り動く。
残っているのは **バランス調整** と **テストの穴埋め** と **実機での最終確認**。

---

## 開発体制 (2026-08-23 変更)

Claude Code と Codex の**分業をやめた**。以降は単一の作業者が `d:\git\game` の
`main` 上で直接作業する。

- `claude/*` / `codex/*` の全ブランチは **main に取り込み済み**で、未取り込みの作業はゼロ。
  codex 側が最後に残した引き継ぎ文書 `PROGRESS.md` も main の履歴に取り込んだ
  (内容はこの STATUS.md に統合したため、ファイル自体は削除済み。
  原文が要るなら `git show 4454ff1:PROGRESS.md`)。
- 分業前提の記述は除去済み — [TASKS.md](./TASKS.md) はトラック分担表から
  **残作業リスト**に書き換え、[../AGENTS.md](../AGENTS.md) からは
  「複数エージェントの同時作業」「git worktree による作業分離」の節を削除した。
- **worktree とトピックブランチの削除だけが未実施。** 下の「片付け」参照。

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

- **2026-08-23、分業終了時点のメインツリーで `npx tsc -b` / `npx vitest run` (13 passed) /
  `npx vite build` を実行し、すべて成功。**
- **ヘッドレス Edge (360×640) で12ターンの通しプレイ** (`main` @ `8d96c31` 時点)。
  侵入・増殖のログが実際に流れること、侵入圧の表示がターン3/4/9の境目で切り替わること、
  11ターン目の崩壊から結果画面まで到達すること、ページが縦にも横にもはみ出さないことを確認。
- Android 実機からの接続経路 (Tailscale + dev server) は 2026-08-18 に確認済み
  ([MOBILE.md](./MOBILE.md) 第6節)。

### 未確認・未実施

- **20ターン生存 (`survived`) ルートを一度も通していない。** 観測できているのは崩壊だけ。
  コード上の分岐は存在するがテストも通しプレイも無い。
- **現在の UI での実機通しプレイ**。実機で見たのは phase 0 の「文字が出るだけ」の画面まで。
- **バランス調整は未着手。** [CARDS.md](./CARDS.md) の数値は設計時の初期値のまま
  一度も動かしていない。序盤の立ち上がり / 終盤の崩壊圧が意図どおりかは**誰も検証していない**。
- テストの穴: `gainCard`、20ターン完走、`advancePhase` の解決順序。

---

## 残タスク

優先度順。各項目の中身は [TASKS.md](./TASKS.md) に書いてある。

1. **シード固定で20ターン完走する通しテスト** — 生存ルートを検証する唯一の手段。
2. **テストの穴埋め** — `gainCard`、`advancePhase` の解決順序、クリーンアップの廃棄。
3. **バランス調整** — 人が実際に20ターン遊ぶ。ここで初めて CARDS.md の数値を動かす。
4. **実機での通しプレイ** — PWA のインストールとオフライン起動もここで確認する。
5. **REVIEW.md C-7 の整理** — `core/state.ts` の `supplyOf` と `data/supply.ts` の
   `createSupply` が二重化。`findCard` / `moveCard` は未使用 export。
6. **ARCHITECTURE.md の追補** — `src/core/cards.ts` (`cardDefinition`) と `invasionPressure` が
   第2節の構成表と第4節の公開 API 一覧に載っていない。
7. (任意) Electron 化。

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
| 作業ブランチ | `main` のみ。以降のコミットはここに直接載せる |
| `origin/main` | **未 push。** ローカルの `main` が大きく先行している (`git log --oneline origin/main..main`) |
| 未取り込みのブランチ | なし (`claude/ui` `codex/pwa` `codex/core` `codex/clarify-branch-rules` すべて main に入っている) |
| worktree | `d:\git\game` (main) / `d:\git\game-claude` / `d:\git\game-codex` ← 後者2つは削除待ち |

### 片付け (分業終了に伴う後始末) — **未実施**

メインツリー `d:\git\game` で実行する。
4ブランチはいずれも `git branch --merged main` に出るため、削除しても失われるものはない。

```
git worktree remove --force ../game-claude
git worktree remove --force ../game-codex
git branch -d claude/ui codex/pwa codex/core codex/clarify-branch-rules
```

worktree 側に git 管理外のファイル (`node_modules` / `dist`) が残っているため `--force` が要る。
メインツリー `d:\git\game` の `node_modules` は既にあるので、削除後すぐ作業を続けられる。

リモートへの反映 (`git push origin main`) はユーザーの判断で行う。

---

## 文書の地図

| 文書 | 役割 | 現状 |
| --- | --- | --- |
| [../README.md](../README.md) | 企画概要 | 有効 |
| [DESIGN.md](./DESIGN.md) | ルールと裁定 | 有効 (`eatConsumer` の廃棄仕様を反映済み) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 型定義・モジュール構成・core API | 概ね有効。残タスク6の追補が要る |
| [CARDS.md](./CARDS.md) | 全30種の数値 | 有効。**調整前の初期値** |
| [MOBILE.md](./MOBILE.md) | 実機確認の経路 | 有効 |
| [REVIEW.md](./REVIEW.md) | レビュー指摘16件と対応状況 | 有効。残件は C-7 とテストの穴のみ |
| [TASKS.md](./TASKS.md) | 残作業の詳細と調整の観点 | 有効 (分担表から書き換え済み) |
| [../AGENTS.md](../AGENTS.md) | 作業規約 | 有効 (単独作業前提に書き換え済み) |
