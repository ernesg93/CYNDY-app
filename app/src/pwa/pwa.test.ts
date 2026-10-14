import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { registerOfflineShell, type ServiceWorkerContainerLike } from "./register-offline-shell";

const readText = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("PWA install metadata", () => {
  it("describes a host-neutral standalone app with scalable icons", () => {
    const manifest = JSON.parse(readText("../../public/manifest.webmanifest"));

    expect(manifest).toMatchObject({
      name: "CYNDY",
      short_name: "CYNDY",
      start_url: "/",
      scope: "/",
      display: "standalone",
      theme_color: "#16211a",
      background_color: "#f2f5ef",
    });
    expect(manifest.icons).toEqual([
      expect.objectContaining({ src: "/icons/cyndy-192.svg", sizes: "192x192" }),
      expect.objectContaining({ src: "/icons/cyndy-512.svg", sizes: "512x512" }),
    ]);

    const index = readText("../../index.html");
    expect(index).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(index).toContain('id="offline-ready" role="status" hidden');
  });
});

describe("offline shell registration", () => {
  it("announces offline availability only after an active worker is ready", async () => {
    let activate!: () => void;
    const ready = new Promise<void>((resolve) => {
      activate = resolve;
    });
    const serviceWorker: ServiceWorkerContainerLike = {
      register: vi.fn().mockResolvedValue(undefined),
      ready,
    };
    const announceReady = vi.fn();

    const registration = registerOfflineShell(serviceWorker, announceReady);
    await Promise.resolve();
    expect(announceReady).not.toHaveBeenCalled();

    activate();
    await registration;

    expect(serviceWorker.register).toHaveBeenCalledWith("/service-worker.js", { scope: "/" });
    expect(announceReady).toHaveBeenCalledOnce();
  });

  it("does not promise offline access when service workers are unavailable", async () => {
    const announceReady = vi.fn();

    await registerOfflineShell(undefined, announceReady);

    expect(announceReady).not.toHaveBeenCalled();
  });
});

describe("service worker boundaries", () => {
  it("generates the worker after Vite emits the final index", () => {
    const config = readText("../../vite.config.ts");

    expect(config).toMatch(/generateBundle:\s*{\s*order: "post"/);
  });

  it("precaches only the static shell and falls back to it for navigation", () => {
    const source = readText("./service-worker.js");

    expect(source).toContain("cache.addAll(PRECACHE_URLS)");
    expect(source).toContain('request.mode === "navigate"');
    expect(source).toContain('caches.match("/index.html")');
    expect(source).toContain("caches.match(request, { ignoreVary: true })");
    expect(source).not.toContain("indexedDB");
    expect(source).not.toContain("cache.put");
  });
});
