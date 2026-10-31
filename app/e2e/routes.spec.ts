import { expect, test, type Page } from "@playwright/test";

async function snapshotLocalData(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("cyndy");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const storeNames = Array.from(database.objectStoreNames);
    const transaction = database.transaction(storeNames, "readonly");
    const entries = await Promise.all(storeNames.map((storeName) =>
      new Promise<readonly unknown[]>((resolve, reject) => {
        const request = transaction.objectStore(storeName).getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      })));
    database.close();
    return Object.fromEntries(storeNames.map((storeName, index) => [storeName, entries[index]]));
  });
}

async function configureCountCurrencies(page: Page, firstCurrencyName = "US dollar") {
  await page.goto("/onboarding");
  await page.getByLabel("Currency name").fill(firstCurrencyName);
  await page.getByLabel("Symbol").fill("$");
  await page.getByLabel("Currency code").fill("USD");
  await page.getByLabel("Denominations (comma separated)").fill(
    Array.from({ length: 14 }, (_, index) => index + 1).join(", "),
  );
  await page.getByRole("button", { name: "Add another currency" }).click();
  await page.getByLabel("Currency name").nth(1).fill("Euro");
  await page.getByLabel("Symbol").nth(1).fill("€");
  await page.getByLabel("Currency code").nth(1).fill("EUR");
  await page.getByLabel("Denominations (comma separated)").nth(1).fill("2, 5");
  await page.getByRole("button", { name: "Save configuration" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.goto("/count/new");
}

test("a wrapping currency legend does not overlap its total at wide layouts", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await configureCountCurrencies(page, "United States dollar cash drawer primary operating currency");

  const firstFieldset = page.locator(".currency-fieldset").first();
  const legend = firstFieldset.locator(":scope > legend");
  const total = firstFieldset.locator(":scope > .currency-total");
  await expect(total).toHaveCSS("position", "static");

  const [legendBox, totalBox] = await Promise.all([legend.boundingBox(), total.boundingBox()]);
  expect(legendBox).not.toBeNull();
  expect(totalBox).not.toBeNull();
  expect(totalBox!.y).toBeGreaterThanOrEqual(legendBox!.y + legendBox!.height);
});

test("an unknown direct route renders safely without mutating local records", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByLabel("Currency name").fill("Test Dollar");
  await page.getByLabel("Symbol").fill("$");
  await page.getByLabel("Currency code").fill("TST");
  await page.getByLabel("Denominations (comma separated)").fill("1, 5");
  await page.getByRole("button", { name: "Save configuration" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const before = await snapshotLocalData(page);

  const response = await page.goto("/route-that-does-not-exist");

  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toBeVisible();
  await expect.poll(() => snapshotLocalData(page)).toEqual(before);
});

test("mobile header keeps controls on one row with readable dark colors", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/onboarding");
  const header = page.locator(".app-header");
  const boxes = await Promise.all([header.locator(".home-control").boundingBox(), header.locator(".brand").boundingBox(), header.locator(".header-actions").boundingBox()]);
  expect(boxes.every(Boolean)).toBe(true);
  expect(Math.abs(boxes[0]!.y - boxes[2]!.y)).toBeLessThan(2);
  expect(boxes[1]!.x).toBeGreaterThanOrEqual(boxes[0]!.x + boxes[0]!.width);
  expect(boxes[1]!.x + boxes[1]!.width).toBeLessThanOrEqual(boxes[2]!.x);
  const home = header.locator(".home-control");
  const brand = header.locator(".brand");
  await expect(home).toHaveCSS("color", "rgb(247, 237, 224)");
  await expect(brand).toHaveCSS("color", "rgb(255, 185, 172)");
  for (const [element, background] of [[home, home], [brand, header]] as const) {
    const foregroundColor = await element.evaluate((node) => getComputedStyle(node).color);
    const backgroundColor = await background.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(contrastRatio(foregroundColor, backgroundColor)).toBeGreaterThanOrEqual(4.5);
  }
});

function contrastRatio(foreground: string, background: string) {
  const luminance = (color: string) => {
    const channels = color.match(/\d+/g)!.slice(0, 3).map(Number).map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const theme of ["light", "dark"] as const) {
  test(`offline-ready status uses readable ledger colors in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("cyndy.theme", value), theme);
    await page.goto("/history");
    const status = page.locator("#offline-ready");
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute("role", "status");
    await expect(status).toContainText("Offline access is ready.");
    const color = theme === "light" ? "rgb(41, 39, 33)" : "rgb(247, 237, 224)";
    const background = theme === "light" ? "rgb(255, 253, 248)" : "rgb(48, 42, 37)";
    await expect(status).toHaveCSS("color", color);
    await expect(status).toHaveCSS("background-color", background);
    expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(4.5);
  });

  test(`empty history symbol uses readable ledger colors in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("cyndy.theme", value), theme);
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "No saved counts yet" })).toBeVisible();
    const symbol = page.locator(".history-empty-symbol");
    const color = theme === "light" ? "rgb(132, 56, 53)" : "rgb(255, 185, 172)";
    const background = theme === "light" ? "rgb(255, 253, 248)" : "rgb(48, 42, 37)";
    await expect(symbol).toHaveCSS("color", color);
    await expect(symbol).toHaveCSS("background-color", background);
    expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(4.5);
    await expect(page.getByRole("link", { name: "Start a count" })).toHaveAttribute("href", "/count/new");
  });
}

test("Libro de caja surfaces retain the approved mobile palette on dashboard, history and settings", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await configureCountCurrencies(page);
  await page.getByLabel("Count title").fill("Morning cash");
  await page.getByLabel("$1 quantity").fill("3");
  await page.getByLabel("€2 quantity").fill("4");
  await page.getByRole("button", { name: "Save count" }).click();
  await expect(page.getByText("Count saved.")).toBeVisible();

  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((value) => localStorage.setItem("cyndy.theme", value), theme);
    for (const [path, heading] of [["/", "Dashboard"], ["/history", "History"], ["/settings", "Settings"]]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      await expect(page.locator(".card")).toHaveCSS("background-color", theme === "light" ? "rgb(251, 247, 239)" : "rgb(33, 30, 27)");
      await expect(page.locator(".app-header")).toHaveCSS("border-bottom-style", "double");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (path === "/") {
        await expect(page.locator(".dashboard-card").first()).toContainText("Morning cash");
        await expect(page.locator(".dashboard-card").first()).toContainText("$3 USD");
        await expect(page.locator(".dashboard-card").first()).toContainText("€8 EUR");
      } else if (path === "/history") {
        await expect(page.locator(".history-record-card")).toContainText("Morning cash");
        await expect(page.locator(".history-record-card")).toHaveCSS("border-bottom-style", "solid");
      } else {
        await expect(page.locator(".settings-page fieldset")).toHaveCount(2);
        await expect(page.locator(".settings-page fieldset").first()).toHaveCSS("background-color", theme === "light" ? "rgb(255, 253, 248)" : "rgb(48, 42, 37)");
      }
    }
  }
});

test("mobile count rows keep denomination, quantity and subtotal on one line", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await configureCountCurrencies(page);
  const row = page.locator(".denomination-row").first();
  const geometry = await row.evaluate((element) => {
    const label = element.querySelector(".denomination-value")!.getBoundingClientRect();
    const input = element.querySelector("input")!.getBoundingClientRect();
    const subtotal = element.querySelector(".denomination-subtotal")!.getBoundingClientRect();
    return { labelTop: label.top, inputTop: input.top, subtotalTop: subtotal.top,
      inputHeight: input.height, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(geometry.labelTop).toBe(geometry.inputTop);
  expect(geometry.subtotalTop).toBe(geometry.inputTop);
  expect(geometry.inputHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.overflow).toBe(false);
});

test("five digit denominations and large totals fit on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/onboarding");
  await page.getByLabel("Currency name").fill("Peso");
  await page.getByLabel("Symbol").fill("$");
  await page.getByLabel("Currency code").fill("CUP");
  await page.getByLabel("Denominations (comma separated)").fill("20000, 1");
  await page.getByRole("button", { name: "Save configuration" }).click();
  await page.goto("/count/new");
  await page.getByLabel("$20000 quantity").fill("99999999");
  const geometry = await page.locator(".currency-fieldset").evaluate((fieldset) => {
    const label = fieldset.querySelector<HTMLElement>(".denomination-value")!;
    const total = fieldset.querySelector<HTMLElement>(".currency-total")!;
    return { labelFits: label.scrollWidth <= label.clientWidth && label.scrollHeight <= label.clientHeight,
      labelHeight: label.getBoundingClientRect().height, totalFont: getComputedStyle(total).fontSize,
      totalFits: total.scrollWidth <= total.clientWidth };
  });
  expect(geometry.labelFits).toBe(true);
  expect(geometry.labelHeight).toBeLessThan(60);
  expect(parseFloat(geometry.totalFont)).toBeGreaterThanOrEqual(16);
  expect(geometry.totalFits).toBe(true);
});

test("large quantities remain visible without overflowing their mobile row", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await configureCountCurrencies(page);
  const input = page.getByLabel("$14 quantity");
  await input.fill("99999999");
  const row = page.locator(".denomination-row").first();
  const subtotal = row.locator(".denomination-subtotal");
  await expect(subtotal).toHaveText("1399999986");
  await expect(subtotal).toHaveClass(/denomination-subtotal--long/);
  const fit = await row.evaluate((element) => {
    const input = element.querySelector("input")!;
    const subtotal = element.querySelector<HTMLElement>(".denomination-subtotal")!;
    return { inputFits: input.scrollWidth <= input.clientWidth, subtotalFits: subtotal.scrollWidth <= subtotal.clientWidth,
      overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(fit).toEqual({ inputFits: true, subtotalFits: true, overflow: false });
});

test("compact currency totals stay fieldset-bound and clear keyboard focus at 200% zoom", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 520 });
  await configureCountCurrencies(page);
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });

  const firstFieldset = page.locator(".currency-fieldset").first();
  const nextFieldset = page.locator(".currency-fieldset").nth(1);
  const total = firstFieldset.locator(".currency-total");
  await expect(total).toHaveCSS("position", "sticky");

  const target = firstFieldset.getByLabel("$11 quantity");
  const previous = firstFieldset.getByLabel("$12 quantity");
  await previous.focus();
  await page.keyboard.press("Tab");
  await expect(target).toBeFocused();

  const focusedGeometry = await target.evaluate((input) => {
    const inputBox = input.getBoundingClientRect();
    const totalBox = document.querySelector(".currency-total")!.getBoundingClientRect();
    return {
      inputTop: inputBox.top,
      inputBottom: inputBox.bottom,
      totalTop: totalBox.top,
      totalBottom: totalBox.bottom,
    };
  });
  expect(focusedGeometry.inputBottom).toBeGreaterThan(focusedGeometry.totalBottom);
  expect(focusedGeometry.inputTop).toBeLessThan(page.viewportSize()!.height);

  await nextFieldset.scrollIntoViewIfNeeded();
  const boundaryGeometry = await page.evaluate(() => {
    const first = document.querySelectorAll<HTMLElement>(".currency-fieldset")[0].getBoundingClientRect();
    const second = document.querySelectorAll<HTMLElement>(".currency-fieldset")[1].getBoundingClientRect();
    const totalBox = document.querySelector<HTMLElement>(".currency-total")!.getBoundingClientRect();
    return {
      firstBottom: first.bottom,
      secondTop: second.top,
      totalBottom: totalBox.bottom,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(boundaryGeometry.totalBottom).toBeLessThanOrEqual(boundaryGeometry.firstBottom);
  expect(boundaryGeometry.totalBottom).toBeLessThanOrEqual(boundaryGeometry.secondTop);
  expect(boundaryGeometry.hasHorizontalOverflow).toBe(false);
});
