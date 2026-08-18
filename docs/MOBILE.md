# スマートフォンでの動作確認

このゲームは **幅 360px の縦画面が基準** ([DESIGN.md](./DESIGN.md) 第8節)。
PC のブラウザを縮めた確認では足りないので、実機で見られる経路を常設しておく。

---

## 1. 経路

```
Android (Chrome)
   |
   |  https://<PC名>.<tailnet>.ts.net:8443
   |  ※ Tailscale 経由。tailnet 外からは TCP レベルで到達しない
   v
Windows PC : tailscale serve (:8443)
   |
   |  http://127.0.0.1:5173
   v
Vite dev server
```

**Vite は 127.0.0.1 のまま動かし、外向きの口は Tailscale に任せる。** この形にする理由:

- Vite が LAN に晒されないので **Windows ファイアウォールの受信許可が不要**。
  `--host` で 0.0.0.0 に晒すと、Node の初回起動時にファイアウォールの
  ダイアログが出て、それを見逃すと延々つながらない
- Tailscale が本物の HTTPS 証明書を付けるので、証明書エラーが出ない
- tailnet に入っていない端末からは到達できない

---

## 2. 一度だけやること

### PC 側

```powershell
tailscale serve --bg --https=8443 5173
```

`--bg` で常駐し、**設定は Tailscale 側に永続化されるので PC を再起動しても再実行は不要**。

割り当てられた URL の確認:

```powershell
tailscale serve status
```

> ポート 443 は `remote-dev-on-android` のホストエージェントが使っているため、
> ゲーム用には 8443 を使う。両方は同時に共存できる。

### `vite.config.ts`

**この4つが揃っていないとスマホから開けない。**

```ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // 明示しないと Vite は [::1] (IPv6) だけを掴む。tailscale serve の転送先は
    // 127.0.0.1 (IPv4) なので、そこに何も居ないと 502 になる
    host: "127.0.0.1",
    port: 5173,
    // ポートがずれると tailscale serve の向き先と食い違って 502 になる
    strictPort: true,
    // Vite はリクエストの Host ヘッダを検査する。これがないと
    // ts.net 経由のアクセスが "Blocked request. This host is not allowed" で弾かれる
    allowedHosts: [".ts.net"],
    // ブラウザから見えるポートは 8443。ここを合わせないと HMR だけ繋がらない
    hmr: { clientPort: 8443 },
  },
});
```

`hmr.clientPort` を忘れると、**画面は出るのに保存しても再読み込みされない**という
分かりにくい壊れ方をする。コンソールに WebSocket の接続エラーが出ていたらこれ。

### スマホ側

1. Tailscale アプリを接続状態にする
2. Chrome で URL を開き、ホーム画面に追加しておく

---

## 3. 毎回の手順

1. PC で `npm run dev`
2. スマホの Tailscale が接続状態であることを確認
3. ホーム画面のショートカットから開く

コードを保存すれば HMR でそのまま反映される。スマホを見ながら PC 側を直せる。

---

## 4. 確認する観点

幅 360px で、次が破綻していないこと。

- **手札** — 5枚が横に並ぶか。カード名とコストが読めるか
- **捕食対象の選択** — 候補が指で押せる大きさか (最低 44px 四方)
- **供給** — 25種が栄養段階ごとの行として成立しているか。
  縦スクロールは許容、横スクロールは不可
- **食物網 / ピラミッド** — 画面内に収まるか。SVG がはみ出す場合は
  `overflow-x: auto` を持つ親要素の中に入れる
- **ターン情報** — ターン数・エネルギー・侵入圧が常に見えているか
- 長い日本語のカードテキストで**レイアウトが崩れないか**
  (「セイタカアワダチソウ」が最長)

---

## 5. うまくいかないとき

| 症状 | 確認すること |
| --- | --- |
| ページが開けない | スマホの Tailscale が接続中か。`tailscale status` に両端末が出るか |
| 502 が返る | `npm run dev` が動いているか。`netstat -ano \| findstr :5173` の待ち受けが `[::1]` になっていないか (`server.host` の指定漏れ) |
| `Port 5173 is already in use` で起動しない | 前回の Vite が残っている。`Get-NetTCPConnection -LocalPort 5173 -State Listen` で PID を調べて落とす |
| `Blocked request. This host is not allowed` | `server.allowedHosts` に `.ts.net` があるか |
| 画面は出るが保存しても反映されない | `server.hmr.clientPort` が 8443 になっているか |
| 証明書エラー | Tailscale 管理画面で **HTTPS Certificates** が ON か |
| PC からは見えるがスマホから見えない | `tailscale serve status` に 8443 の行があるか |

### 公開を止める

```powershell
tailscale serve --https=8443 off
```

---

## 6. この環境の値

> 環境固有の値。別の PC で作業する場合は `tailscale serve status` で読み替える。

| | |
| --- | --- |
| PC | `desktop-4nlbkml` (100.66.210.24) |
| スマホ | `a502zt` (100.117.26.91) |
| URL | `https://desktop-4nlbkml.tail8fe514.ts.net:8443/` |

2026-08-18 時点で、**実際の Vite dev server で疎通を確認済み**。
`https://desktop-4nlbkml.tail8fe514.ts.net:8443/` が 200 を返し、
`allowedHosts` によって Host ヘッダ検査を通過することまで確認した。
HMR (`hmr.clientPort`) は実機のブラウザでの確認が必要で、未検証。
