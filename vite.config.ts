import { defineConfig, type Plugin } from "vite";

function offlineCachePlugin(): Plugin {
  return {
    name: "offline-cache",
    apply: "build",
    generateBundle(_, bundle) {
      // パスはすべて sw.js からの相対にする。GitHub Pages のように
      // サブパス (/meguru-satoyama/) に置かれても、そのまま解決できるようにするため
      const precache = Object.values(bundle)
        .map((entry) => `./${entry.fileName}`)
        .filter((fileName) => fileName !== "./sw.js");

      precache.push("./", "./index.html", "./manifest.webmanifest", "./icon.svg");

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: `const CACHE_NAME = "meguru-satoyama-v1";
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }
    }),
  );
});
`,
      });
    },
  };
}

// `npm run dev` は PC のブラウザ (http://127.0.0.1:5180) から直接見るための設定。
// スマートフォンから tailscale serve 経由で見るときは `npm run dev:tunnel`
// (= `vite --mode tunnel`) を使う。違いは HMR の接続先ポートだけ。
export default defineConfig(({ mode }) => ({
  // 相対パスで出力する。GitHub Pages のプロジェクトサイトは
  // https://<user>.github.io/<repo>/ というサブパスに置かれるため、
  // 絶対パス (/assets/...) だとどれも 404 になる。
  // リポジトリ名を埋め込まないので、後でルート配信へ移しても直さなくてよい。
  base: "./",
  plugins: [offlineCachePlugin()],
  server: {
    // 明示しないと [::1] (IPv6) だけを掴み、tailscale serve の転送先である
    // 127.0.0.1 に何も居ない状態になって 502 になる
    host: "127.0.0.1",
    // 5173 は remote-dev-on-android の dev server が使うため避ける。
    // 共存させると、こちらを止めたときに同じ URL で向こうが表示されてしまう
    port: 5180,
    // ポートがずれると tailscale serve の向き先と食い違って 502 になる
    strictPort: true,
    // ts.net 経由のアクセスが "Blocked request" で弾かれるのを防ぐ
    allowedHosts: [".ts.net"],
    // tunnel モードではブラウザから見えるポートが 8443 (tailscale serve) になる。
    // 合わせないと HMR だけ繋がらない。PC から直接見る通常の dev では
    // dev server と同じ 5180 に繋がせる (true = 既定の推測に任せる)
    hmr: mode === "tunnel" ? { clientPort: 8443 } : true,
  },
  test: {
    include: ["tests/**/*.test.ts"],
    passWithNoTests: true,
  },
}));
