import { expect, test } from "@playwright/test";

test("a controlled initial page can be closed and relaunched offline", async ({ context, page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Set up CYNDY" })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null))
    .toContain("/service-worker.js");
  await expect(page.getByText("Offline access is ready.", { exact: false })).toBeVisible();

  await page.close();
  await context.setOffline(true);
  const relaunchedPage = await context.newPage();
  await relaunchedPage.goto("/", { waitUntil: "domcontentloaded" });

  await expect(relaunchedPage.getByRole("heading", { name: "Set up CYNDY" })).toBeVisible();
  await expect(relaunchedPage.getByText("Offline access is ready.", { exact: false })).toBeVisible();
});

test("a first visit without a network fails safely without an in-app promise", async ({ context, page }) => {
  await context.setOffline(true);

  const navigationError = await page.goto("/").catch((error: unknown) => error);

  expect(navigationError).toBeInstanceOf(Error);
  await expect(page.locator("#root")).toHaveCount(0);
  await expect(page.getByText("Offline access is ready.", { exact: false })).toHaveCount(0);
});
