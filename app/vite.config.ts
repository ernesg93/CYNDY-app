import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

function offlineShellPlugin(): Plugin {
  return {
    name: "cyndy-offline-shell",
    apply: "build",
    generateBundle(_, bundle) {
      const publicFiles = [
        ["/manifest.webmanifest", "./public/manifest.webmanifest"],
        ["/icons/cyndy-192.svg", "./public/icons/cyndy-192.svg"],
        ["/icons/cyndy-512.svg", "./public/icons/cyndy-512.svg"],
      ] as const;
      const shellUrls = [
        "/",
        "/index.html",
        ...publicFiles.map(([url]) => url),
        ...Object.keys(bundle).map((fileName) => `/${fileName}`),
      ].sort();
      const template = readFileSync(new URL("./src/pwa/service-worker.js", import.meta.url), "utf8");
      const revisionHash = createHash("sha256").update(template);
      for (const output of Object.values(bundle)) {
        revisionHash.update(output.type === "asset" ? output.source : output.code);
      }
      for (const [, path] of publicFiles) {
        revisionHash.update(readFileSync(new URL(path, import.meta.url)));
      }
      const revision = revisionHash.digest("hex").slice(0, 12);
      const source = template
        .replace("__CACHE_NAME__", `cyndy-shell-${revision}`)
        .replace("__PRECACHE_URLS__", JSON.stringify(shellUrls));

      this.emitFile({ type: "asset", fileName: "service-worker.js", source });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineShellPlugin()],
  build: {
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    pool: "threads",
  },
});
