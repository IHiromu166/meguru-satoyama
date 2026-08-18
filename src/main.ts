const app = document.querySelector<HTMLDivElement>("#app");

if (app === null) {
  throw new Error("アプリケーションのマウント先が見つかりません");
}

app.textContent = "巡る里山";
