import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, locale: "en-US" });

test("navigation and action pairs remain visible and symmetric on mobile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start a count" }).click();
  await page.getByRole("button", { name: "Save count" }).click();
  await expect(page.getByText("Count saved.")).toBeVisible();
  for (const [link, selector] of [["Settings", ".settings-actions"], ["Count", ".count-page .actions"], ["History", ""]] as const) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole("link", { name: link, exact: true }).click();
    const geometry = await page.evaluate(() => ({ header: document.querySelector(".app-header")!.getBoundingClientRect().bottom, card: document.querySelector(".card")!.getBoundingClientRect().top }));
    expect(geometry.card).toBeGreaterThanOrEqual(geometry.header);
    if (selector) {
      const buttons = page.locator(`${selector} > button`);
      const boxes = await Promise.all([buttons.nth(0).boundingBox(), buttons.nth(1).boundingBox()]);
      expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(1);
      expect(Math.abs(boxes[0]!.width - boxes[1]!.width)).toBeLessThan(1);
    }
  }
  await page.getByRole("link", { name: /View count/ }).first().click();
  await expect(page.getByText(/Total:.*USD/)).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Subtotal" }).first()).toBeVisible();
  const buttons = await page.locator(".detail-actions > button").all();
  const boxes = await Promise.all(buttons.map((button) => button.boundingBox()));
  expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(1);
  expect(Math.abs(boxes[0]!.width - boxes[1]!.width)).toBeLessThan(1);
});

test("fresh install selects currencies and preserves a hidden count", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("checkbox", { name: "USD" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "CUP" })).toBeChecked();
  await page.getByRole("link", { name: "Start a count" }).click();
  const dollar = page.getByRole("group", { name: "Dolar US (USD)" });
  const quantity = dollar.getByLabel("$100 quantity");
  await expect(quantity).toHaveValue("0");
  await quantity.fill("2");
  await page.getByRole("checkbox", { name: "USD" }).uncheck();
  await expect(dollar).toBeHidden();
  await page.getByRole("checkbox", { name: "USD" }).check();
  await expect(quantity).toHaveValue("2");
  await expect(dollar.getByText("$ 200 USD")).toBeVisible();
  const alignments = await dollar.locator(".denomination-row").first().evaluate((row) =>
    Array.from(row.querySelectorAll(".denomination-value, input, .denomination-subtotal")).map((item) => getComputedStyle(item).textAlign));
  expect(alignments).toEqual(["center", "center", "center"]);
});
