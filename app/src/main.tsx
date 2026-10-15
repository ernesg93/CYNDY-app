import { createRoot } from "react-dom/client";
import { App } from "./App";
import { registerOfflineShell } from "./pwa/register-offline-shell";
import "./styles.css";

const root = document.querySelector<HTMLDivElement>("#root");

if (!root) {
  throw new Error("Application root was not found");
}

const serviceWorker = "serviceWorker" in navigator ? navigator.serviceWorker : undefined;
void registerOfflineShell(serviceWorker, () => {
  const status = document.querySelector<HTMLElement>("#offline-ready");
  if (status) status.hidden = false;
});

createRoot(root).render(<App />);
