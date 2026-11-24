import { defineConfig } from "@playwright/test";
import react from "@vitejs/plugin-react";

const run = `${process.pid}-${Date.now()}`;
export default process.env.COPY_SAFETY_VITE ? {
  plugins: [react()],
  cacheDir: "test-results/copy-safety/vite-cache/parent-run-01",
  optimizeDeps: { include: ["react", "react-dom/client"] },
} : defineConfig({
  testDir: ".",
  testMatch: "copy-safety.spec.ts",
  outputDir: `../test-results/copy-safety/run-${run}`,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4175", serviceWorkers: "block" },
  webServer: {
    cwd: "..",
    command: "COPY_SAFETY_VITE=1 npx vite --config e2e/copy-safety.config.ts --configLoader runner --host 127.0.0.1 --port 4175 --strictPort",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
