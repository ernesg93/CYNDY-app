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
