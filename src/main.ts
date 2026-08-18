import "./style.css";
import { mountApp } from "./ui/app";

const app = document.querySelector<HTMLDivElement>("#app");

if (app === null) {
  throw new Error("アプリケーションのマウント先が見つかりません");
}

mountApp(app);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
