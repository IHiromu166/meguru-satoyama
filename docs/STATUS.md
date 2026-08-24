# 開発状況

- **時点**: `main` (2026-08-24 更新)。
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
| 幅 900px 以上での2カラムレイアウト | 動く (2026-08-23 追加) |
| 遊び方 (ルールと操作方法) の画面 | 動く (2026-08-23 追加)。タイトルとゲーム中の両方から開く |
| カード30種の絵柄と、実物と同じ縦横比 (63:88) の枠 | 動く (2026-08-24 追加。下記) |

### 実装状況

| 領域 | ファイル | 状態 |
| --- | --- | --- |
| core | `src/core/{state,engine,predation,effects,invasion,score,rng,cards,rules,types}.ts` | 実装完了 |
| データ | `src/data/{cards,invasives,supply}.ts` | 30種すべて実装 (在来22 + 駆除3 + 外来5) |
| UI | `src/ui/{app,hand,supply,card,art,web,screens,help,theme}.ts` + `src/style.css` | 実装完了。幅で1カラム / 2カラムを切り替える (下記)。カードは絵柄付き (下記) |
| PWA | `public/{manifest.webmanifest,icon.svg}` + `vite.config.ts` の SW 生成 | 実装完了 |
| テスト | `tests/core.test.ts` / `tests/playthrough.test.ts` | 17件。カバレッジに穴あり (下記) |

core の公開 API は `createGame` / `playCard` / `gainCard` / `advancePhase` / `canPlay` /
`legalPreys` / `needsPrey` / `scoreOf` / `trophicCounts` / `invasionPressure` /
`unlockedInvasives` と、`core/rules.ts` の定数 (`TURN_LIMIT` / `HAND_SIZE` /
`GAINS_PER_TURN` / `SCORE_WEIGHTS` / `CYCLING_RATIO` / `INVASION_SCHEDULE`)。
UI からは `src/core/engine.ts` 経由でのみ呼ぶ。

**ルール由来の数値が UI に直書きされている箇所はもう無い** (2026-08-23)。
「ターン n / 20」も遊び方の画面も `core/rules.ts` の定数から組み立てている。

### カードの見た目 (2026-08-24)

カードを**絵柄付き**にし、枠を**実物のカードと同じ 63:88** に固定した。

- 絵柄は**素材ファイルではない。** `src/ui/art.ts` が30種ぶんの SVG を
  その場で組み立てている (外部アセットを増やさない方針のため。ビルド後の増分は約 8KB)。
  座標系は全カード共通の 60 × 40 で、地面 y≒32 / 水面 y=12 を揃えてあるので、
  カードを並べたとき目線が揃う。
- 背景は `CardDef.habitat` (森 / 草地 / 水辺) で描き分ける。**v1 では判定に使わない値**
  (→ DESIGN.md 第9節) だが、絵柄の下地としては意味があるのでここで使っている。
  外来種と人間の介入は生態系の外なので、生息環境ではなく専用の下地にする。
- 色は段階色 (`colorFor`) から `shade()` で本体 / 影 / 差し色の3色を作る。
  **「色 = 栄養段階」の約束を絵柄でも崩さない。** 例外は幹と枝の茶、電気の火花の黄だけ。
- 1枚の面 (名前 → 絵柄 → 種別帯 → 効果文) は `src/ui/card.ts` の `createCardFace` に
  まとめ、手札・供給・捕食対象の選択の3箇所で共有する。
- 縦横比は CSS の `--card-ratio`。はみ出しは切り落とし、**縮む余地は絵柄だけ**に持たせる
  (効果文は縮ませない)。効果文の級数はカード幅に対する比 (`cqw`) で決め、
  文字数の多いカードほど小さく組む。これで最長の「サギ」でも全文が入る。
- 捕食対象の選択は1枚が縦に伸びるため、2列から3列 (`minmax(88px, 1fr)`) に変えた。

### 画面幅ごとのレイアウト (2026-08-23)

基準は従来どおり 360px の縦画面。広い画面はメディアクエリでの上積みだけで、
狭い画面の見え方は変えていない。

| 幅 | レイアウト |
| --- | --- |
| 〜599px | 1カラム。ヘッダとログを上に固定し、中央だけスクロール (従来どおり) |
| 600〜899px | 1カラムのまま、カードの列数だけ増やす |
| 900px〜 | **2カラム。** 左が食物網・場・ログ、右が手札・供給。スクロールするのは供給だけ |

- カードの並びは固定3列をやめ、`repeat(auto-fill, minmax(var(--card-min), 1fr))` に変えた。
  `--card-min` は 100px → 130px → 150px と幅に応じて上げる。360px では従来と同じ3列になる。
- 食物網の SVG に `max-width: 360px` を掛けた。これがないと幅いっぱいまで
  引き伸ばされ、viewBox ごと拡大されてラベルが巨大化する。
- 2カラムは `.game-scroll` を `display: contents` で透過させ、その子を
  `.screen-game` のグリッドへ直接載せて組んでいる。こうするとログだけを左カラムへ移せる。
  ログは狭い画面ではスクロール領域の外に固定する必要があり、DOM 上は動かせないため。
- 手札と供給は `div.game-col-main` でまとめてある (`src/ui/app.ts`)。
  別々のグリッド行に置くと左の食物網の高さに引きずられ、手札の下に余白ができる。
  狭い画面ではこの箱を `display: contents` で透過させるので、並びは従来と変わらない。
- グリッド指定は `#app.screen-game` で書いてある。`#app { display: flex }` が
  ID セレクタで詳細度が高く、`.screen-game { display: grid }` では負けるため。

### スクロール位置の引き継ぎ (2026-08-24)

`render()` は毎回 `root.innerHTML = ""` で DOM を作り直すので、スクロール領域も
別物に入れ替わり、位置が 0 に戻る。手札は画面のかなり下にあるため、
1枚プレイするたびに一番上へ飛ばされ、そのつどスクロールし直す羽目になっていた。

`src/ui/app.ts` の `captureScroll` / `restoreScroll` で、再描画を挟んで
`scrollTop` を手で引き継ぐ。対象は実際にスクロールする2つだけ
(狭い画面の `.game-scroll`、900px 以上の `.section-supply`)。
内容が縮んで位置が残らない場合はブラウザ側で丸められる。

---

## 検証したこと / していないこと

### 確認済み

- **2026-08-23、メインツリーで `npx tsc -b` / `npx vitest run` (17 passed) /
  `npx vite build` を実行し、すべて成功。**
- **20ターンの通しプレイを `tests/playthrough.test.ts` で自動化した。**
  シード `20260823` を自動プレイヤーで完走させ、`survived` に到達することを確認。
  同ファイルで、何も操作せずフェイズだけ送る対照が20ターン前に崩壊することも確認している。
- **ヘッドレス Edge (360×640) で12ターンの通しプレイ** (`main` @ `8d96c31` 時点)。
  侵入・増殖のログが実際に流れること、侵入圧の表示がターン3/4/9の境目で切り替わること、
  11ターン目の崩壊から結果画面まで到達すること、ページが縦にも横にもはみ出さないことを確認。
- Android 実機からの接続経路 (Tailscale + dev server) は 2026-08-18 に確認済み
  ([MOBILE.md](./MOBILE.md) 第6節)。
- **2026-08-23、PC のブラウザでの HMR を確認した。** `npm run dev` の
  `http://127.0.0.1:5180` にヘッドレス Edge を CDP で繋ぎ、コンソールに
  `[vite] connected.` が出ること、`src/style.css` の編集がリロードなしで
  (`[vite] hot updated`) 反映されること、`src/main.ts` の編集ではページが
  自動リロードされることを確認。
- **2026-08-23、PC 向け2カラムをヘッドレス Edge で確認した。**
  1440×900 / 1280×720 / 900×700 (切り替えの境目) で2カラムになること、
  スクロールするのが供給だけであること、6ターン進めてログ・場・侵入圧の表示が
  左カラムに収まること、捕食対象ダイアログと結果画面が崩れないことを確認。
  700×900 (1カラム) と 360×640 でも確認し、**360px の見え方は変更前と一致**
  (カード幅 108px の3列、横のはみ出しなし)。全幅で `scrollWidth === clientWidth`。
- **2026-08-24、カードの絵柄と縦横比をヘッドレス Edge で確認した。**
  360×640 / 700×900 / 1440×900 で、30種すべての絵柄が出ること、枠が 63:88 になること、
  効果文が最長のカード (サギ・アライグマ) でも切れずに入ること、外来種の「プレイ不可・常在」と
  捕食対象の「場 / 手札」が絵柄の上の帯で読めること、全幅で `scrollWidth === clientWidth`
  であることを確認した。捕食対象ダイアログと場のチップ (小さい絵柄付き) も確認済み。
- **2026-08-24、スクロール位置がプレイ後も残ることをヘッドレス Edge で確認した。**
  360×640 で手札の位置まで下げてからカードをプレイし、`.game-scroll` の `scrollTop` が
  432 のまま変わらないこと、1200×800 では供給を獲得しても `.section-supply` の
  `scrollTop` が 955 のまま変わらないことを確認。どちらも再描画で DOM ノード自体は
  入れ替わっている (旧ノードと不一致) ので、引き継ぎが効いていることまで確かめてある。
- **2026-08-23、遊び方の画面をヘッドレス Edge で確認した。**
  タイトルとゲーム中の両方から開くこと、7節すべてが描画されること、
  1440×900 では2段組・360×640 では1段でパネル内だけがスクロールすること、
  侵入スケジュールと配点が `core/rules.ts` の値どおりに出ることを確認。

### 未確認・未実施

- **人間による通しプレイ。** 20ターン完走はテストの自動プレイヤーでしか通していない。
- **現在の UI での実機通しプレイ**。実機で見たのは phase 0 の「文字が出るだけ」の画面まで。
- **バランス調整は未着手。** [CARDS.md](./CARDS.md) の数値は設計時の初期値のまま
  一度も動かしていない。ただし下記のとおり、調整の手がかりになる数値は取れている。
- テストの穴: `gainCard`、`advancePhase` の解決順序。

### 通しテストから見えたバランスの傾向 (2026-08-23)

`tests/playthrough.test.ts` と同じ自動プレイヤーで500シードを走らせた結果。
**人が遊んだ結果ではない**ので、調整の出発点としてのみ扱う。

| 観測 | 値 |
| --- | --- |
| 生存率 | 446 / 500 (89%) |
| 崩壊したシードのターン | 最短11、多くは17〜20 |
| 生存時の最終スコア | 中央値 **−52**、最大 32、最小 −120 |
| 何も操作しない対照の崩壊ターン | 9〜13 (中央値11) |

- **生き延びてもスコアがほぼマイナスになる。** 生存時もデッキに外来種が15枚前後残り、
  `invasivePenalty` (1枚 −5) だけで −85 に達してプラス要素を食い潰している。
  除去手段が足りないか、ペナルティの係数が重すぎる。
- 崩壊は序盤ではなく終盤 (17〜20ターン) に集中している。序盤の侵入圧は緩い。

---

## 残タスク

優先度順。各項目の中身は [TASKS.md](./TASKS.md) に書いてある。

1. **テストの穴埋め** — `gainCard`、`advancePhase` の解決順序。
2. **バランス調整** — 人が実際に20ターン遊ぶ。ここで初めて CARDS.md の数値を動かす。
   上の「傾向」のとおり、まず疑うのは外来種の除去手段と `invasivePenalty` の係数。
3. **実機での通しプレイ** — PWA のインストールとオフライン起動もここで確認する。
4. **REVIEW.md C-7 の整理** — `core/state.ts` の `supplyOf` と `data/supply.ts` の
   `createSupply` が二重化。`findCard` / `moveCard` は未使用 export。
5. (任意) Electron 化。

> **2026-08-23 完了**: 「ARCHITECTURE.md の追補」は済んだ。第2節の構成表に
> `core/cards.ts` `core/rules.ts` `ui/help.ts` `ui/theme.ts` を、第4節の公開 API に
> `invasionPressure` `unlockedInvasives` とルール定数を追記した。

---

## 動かし方

```
npm install
npm run dev        # http://127.0.0.1:5180 — PC のブラウザで見る (HMR あり)
npm run dev:tunnel # スマホから tailscale serve (:8443) 経由で見るとき
npm run build      # tsc -b && vite build
npm test           # vitest run
```

`dev` と `dev:tunnel` の違いは **HMR の接続先ポートだけ**。`dev:tunnel` は
`vite --mode tunnel` で、ブラウザ側に 8443 (tailscale serve の待ち受け) へ繋がせる。
PC から `127.0.0.1:5180` を直接見るときにこれを使うと、8443 に誰も居ないので
**画面は出るが保存しても反映されない**。逆も同様なので、見る経路で使い分ける。

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

同じ手順は `npm run dev` (5180) に向けても使える。PC の 2カラムはこちらで確認した。
ただし **`mv` でファイルを差し替えると Vite の watcher が inode を見失い、
古い CSS を配り続ける**。編集は追記か上書き (`cat tmp > src/style.css`) で行う。

---

## 公開 (デプロイ) — 2026-08-24

`main` に push すると [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) が
型検査 → テスト → ビルドを回し、通れば GitHub Pages に公開する。
公開先は <https://ihiromu166.github.io/meguru-satoyama/>。

### 有効化の手順 (2026-08-24 実施済み)

1. **リポジトリを公開にする。** GitHub Pages は private リポジトリでは
   有料プラン (GitHub Pro 以上) でないと使えない。→ `public` に変更済み。
2. **Settings → Pages → Build and deployment → Source を「GitHub Actions」にする。**
   ここが未設定だと deploy ジョブが失敗する。→ 設定済み。

> **最初の2回のデプロイは失敗している** (`32673676154` / `32673762809`)。
> どちらも上記2の設定より前に走ったもので、build ジョブは全ステップ成功、
> `actions/deploy-pages@v4` の1ステップだけが落ちていた。
> 設定を変えても**自動では再実行されない**ので、Actions タブの Run workflow
> (`workflow_dispatch` を入れてある) か、次の push で走らせ直す必要がある。

### サブパス対応でやったこと

GitHub Pages のプロジェクトサイトは `/<リポジトリ名>/` の下に置かれる。
以前は配信パスがすべて絶対 (`/assets/...`、`/sw.js`、`start_url: "/"`) だったため、
ルート以外に置くと全ファイルが 404 になり PWA ごと動かなかった。

`vite.config.ts` の `base: "./"` を軸に、index.html・manifest・Service Worker の
登録と precache をすべて相対パスへ変えた。**リポジトリ名は埋め込んでいない**ので、
後でルート配信 (独自ドメイン等) へ移しても直す必要はない。

### 検証したこと

`dist` を `<一時ディレクトリ>/meguru-satoyama/` に置いて自前の静的サーバで配信し、
GitHub Pages と同じサブパス構成をローカルで再現して確認した (2026-08-24)。

- 全アセット (index / manifest / icon / sw / assets 配下) が 200。失敗リクエストゼロ、
  console.error ゼロ
- Service Worker のスコープが `/meguru-satoyama/` になり active になる
- タイトル → ゲーム画面まで描画され、2カラム・手札5枚・供給25種が出る
- **オフライン起動が動く。** 静的サーバのプロセスを止め (接続不可を確認したうえで)
  再読み込みしても、キャッシュ済みの6ファイルだけで起動しゲームが遊べる
- `npm run dev` (5180) も従来どおり動く。`base: "./"` は dev では `/` として扱われる

### 本番 (GitHub Pages) での確認 — 2026-08-24

`3349c9a` のデプロイが成功し、<https://ihiromu166.github.io/meguru-satoyama/> が公開された。
ヘッドレス Edge で本番 URL に直接つないで確認した。

- index / manifest / icon / sw / assets 配下がすべて 200
- Service Worker のスコープが `https://ihiromu166.github.io/meguru-satoyama/` になり active
- 1440×900 で2カラム、360×640 で1カラム。どちらも横のはみ出しなし
  (`scrollWidth === clientWidth`)、手札5枚・供給25種が出る
- 失敗リクエストゼロ、console.error ゼロ

未確認: **本番 URL でのオフライン起動と、実機でのホーム画面追加**。
オフラインの仕組み自体はローカルのサブパス再現で確認済み (上記)。

---

## リポジトリの状態

| 項目 | 値 |
| --- | --- |
| 作業ブランチ | `main` のみ。以降のコミットはここに直接載せる |
| `origin/main` | **push 済み** (2026-08-24、`b585c2e`)。以降は push するたび Pages のデプロイが走る |
| リポジトリの公開範囲 | **public** (2026-08-24 に変更)。GitHub Pages を無料プランで使うために必要 |
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
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 型定義・モジュール構成・core API | 概ね有効。残タスク5の追補が要る |
| [CARDS.md](./CARDS.md) | 全30種の数値 | 有効。**調整前の初期値** |
| [MOBILE.md](./MOBILE.md) | 実機確認の経路 | 有効 |
| [REVIEW.md](./REVIEW.md) | レビュー指摘16件と対応状況 | 有効。残件は C-7 とテストの穴のみ |
| [TASKS.md](./TASKS.md) | 残作業の詳細と調整の観点 | 有効 (分担表から書き換え済み) |
| [../AGENTS.md](../AGENTS.md) | 作業規約 | 有効 (単独作業前提に書き換え済み) |
