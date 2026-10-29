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
  if (!status) return;
  const locale = document.documentElement.lang === "es" ? "es" : "en";
  status.lang = locale;
  status.textContent = locale === "es"
    ? "El acceso sin conexión está listo. Las funciones locales y los conteos guardados están disponibles sin conexión."
    : "Offline access is ready. Local features and saved records are available without a connection.";
  status.hidden = false;
});

createRoot(root).render(<App />);
