import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };

for (const width of [320, 360]) {
  test(`package version and header controls fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/onboarding");

    const header = page.locator(".app-header");
    const home = header.locator(".home-control");
    const brand = header.locator(".brand");
    const actions = header.locator(".header-actions");
    await expect(brand.locator("small")).toHaveText(`v${version}`);
    await expect(brand.locator("small")).toBeVisible();
    const [headerBox, homeBox, brandBox, actionsBox] = await Promise.all([
      header.boundingBox(), home.boundingBox(), brand.boundingBox(), actions.boundingBox(),
    ]);
    expect(headerBox).not.toBeNull();
    expect(homeBox).not.toBeNull();
    expect(brandBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect(homeBox!.x).toBeGreaterThanOrEqual(headerBox!.x);
    expect(brandBox!.x).toBeGreaterThanOrEqual(homeBox!.x + homeBox!.width);
    expect(brandBox!.x + brandBox!.width).toBeLessThanOrEqual(actionsBox!.x);
    expect(actionsBox!.x + actionsBox!.width).toBeLessThanOrEqual(headerBox!.x + headerBox!.width);
    for (const box of [homeBox!, brandBox!, actionsBox!]) {
      expect(box.y).toBeGreaterThanOrEqual(headerBox!.y);
      expect(box.y + box.height).toBeLessThanOrEqual(headerBox!.y + headerBox!.height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await brand.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  });
}

test("header controls do not overlap with wider version text at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/onboarding");
  const header = page.locator(".app-header");
  const brand = header.locator(".brand");
  await expect(brand.locator("small")).toBeVisible();
  await brand.locator("small").evaluate((element) => { element.style.letterSpacing = "0.6em"; });
  const [home, label, actions] = await Promise.all([
    header.locator(".home-control").boundingBox(), brand.boundingBox(), header.locator(".header-actions").boundingBox(),
  ]);
  expect(label!.x).toBeGreaterThanOrEqual(home!.x + home!.width);
  expect(label!.x + label!.width).toBeLessThanOrEqual(actions!.x);
  expect(await brand.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});
