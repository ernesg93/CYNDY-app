import { expect, test } from "@playwright/test";

const liveBaseUrl = process.env.PLAYWRIGHT_LIVE_BASE_URL ?? "https://cyndy-app.pages.dev";

test("the Pages deployment serves HTTPS SPA direct routes", async ({ page }) => {
  const historyResponse = await page.goto(`${liveBaseUrl}/history`);

  expect(new URL(page.url()).protocol).toBe("https:");
  expect(historyResponse?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();

  const unknownResponse = await page.goto(`${liveBaseUrl}/e2e-unknown-route`);

  expect(unknownResponse?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
