# 開発進捗引き継ぎ

更新日: 2026-08-23  
基準: `main` @ `2c20f20`

Claude Code と Codex の分業開発を終了する時点の引き継ぎ情報。
今後はトラック A / B のファイル所有権を前提にせず、`main` を基準に開発を続ける。

## 現在地

- フェイズ0（Vite + TypeScript の雛形、型定義）は完了済み。
- core、カードデータ、UI を統合済み。
- 20ターン進行、捕食、カード獲得、外来種の侵入・増殖、崩壊判定、最終スコアを実装済み。
- 在来種22種、駆除3種、外来種5種のデータを実装済み。
- 幅360pxを基準にしたゲーム画面、捕食対象選択、供給、食物網、ログ、結果画面を実装済み。
- PWAインストールと、初回読み込み後のオフライン起動に対応済み。
- `docs/REVIEW.md` のレビュー指摘17件中16件は対応済み。

## 主な統合済みコミット

| コミット | 内容 |
| --- | --- |
| `f26dd87` | データ・UIを統合 |
| `a9d9aae` | coreのゲーム進行と生態系判定を統合 |
| `8d96c31` | coreのレビュー修正とPWA対応を統合 |
| `3123a55` | UIの侵入圧をcoreの値から導出 |
| `2c20f20` | レビュー対応状況を最新実装に更新 |

## 検証状況

- 2026-08-23、`codex/pwa` @ `c3cfcb8` で `npm.cmd test -- --run` を実行し、
  `tests/core.test.ts` の13テストがすべて成功。
- 同日、同コミットで `npm.cmd run build` を実行し、TypeScriptの型検査と
  Viteのプロダクションビルドが成功。
- `main` @ `8d96c31` では、ヘッドレスEdge（360×640）による12ターンの通しプレイ、
  ログ欄、侵入圧表示、崩壊画面を確認済み（詳細は `docs/REVIEW.md`）。
- Android実機からTailscale経由で画面表示とHMRを確認済み（詳細は `docs/MOBILE.md`）。
- `main` の最新UI修正を含む状態では、この引き継ぎ作成時にテスト／ビルドを再実行していない。

## 残件

1. `docs/REVIEW.md` C-7
   - `src/core/state.ts` の `supplyOf()` と `src/data/supply.ts` の `createSupply()` が重複。
   - `moveCard()` と `findCard()` は公開されているが、実装から呼ばれていない。
2. coreのテスト不足
   - `gainCard()`。
   - 20ターン終了時の `survived` 遷移。
   - `advancePhase()` の解決順序。
   - シード固定で20ターン完走する通しテスト。
3. バランス調整
   - `docs/CARDS.md` の数値は初期値のまま。通しプレイ結果に基づく調整は未実施。
4. READMEの状態表示
   - `README.md` 末尾は「設計フェイズ。実装は未着手」のままで、現状と一致していない。
5. 最新`main`の最終検証
   - `npm test`、`npm run build`、幅360pxでの通しプレイを改めて実施する。

## ブランチと引き継ぎ上の注意

- `codex/pwa` @ `c3cfcb8` の実装コミットは `main` に統合済み。
- このファイル作成前の時点で、`codex/pwa` は `main` より12コミット古い。
- 親リポジトリでは `main` を基準にし、このブランチから実装ファイルを再マージしないこと。
- この引き継ぎファイルだけが必要な場合は、親リポジトリから
  `git show codex/pwa:PROGRESS.md` で参照できる。

## 参照文書

- `docs/DESIGN.md`: ゲームルールと裁定
- `docs/ARCHITECTURE.md`: 型、モジュール、core API
- `docs/CARDS.md`: カードデータと初期バランス
- `docs/REVIEW.md`: レビュー指摘と対応状況（`main` に存在）
- `docs/MOBILE.md`: スマートフォン動作確認手順
- `docs/TASKS.md`: 旧分業計画。今後の担当分けとしては使用しない
