import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // 明示しないと [::1] (IPv6) だけを掴み、tailscale serve の転送先である
    // 127.0.0.1 に何も居ない状態になって 502 になる
    host: "127.0.0.1",
    port: 5173,
    // ポートがずれると tailscale serve の向き先と食い違って 502 になる
    strictPort: true,
    // ts.net 経由のアクセスが "Blocked request" で弾かれるのを防ぐ
    allowedHosts: [".ts.net"],
    // ブラウザから見えるポートは 8443。合わせないと HMR だけ繋がらない
    hmr: { clientPort: 8443 },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    passWithNoTests: true,
  },
});
