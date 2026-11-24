import { expect, test, type Page } from "@playwright/test";

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("cyndy");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(["settings", "counts"], "readonly");
    const read = (name: string) => new Promise<unknown[]>((resolve, reject) => {
      const request = tx.objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = await Promise.all([read("settings"), read("counts")]);
    db.close();
    return result;
  });
}

test("browser back during an aborted historical replacement preserves the draft and history", async ({ page, context }) => {
  await page.goto("/count/new");
  const input = page.getByLabel("$1 quantity").first();
  await input.fill("3");
  await page.getByRole("button", { name: "Save count" }).click();
  await expect(page.getByText("Count saved.")).toBeVisible();
  await input.fill("7");
  await expect(page.getByText("Draft saved locally.")).toBeVisible();
  const before = await snapshot(page);
  const counts = before[1] as { id: string }[];
  expect(counts).toHaveLength(1);
  const detail = `/history/${counts[0].id}`;
  await page.evaluate((path) => {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, detail);
  await page.getByRole("button", { name: "Resume as new count" }).click();
  await expect(page.getByRole("alertdialog", { name: "Replace unfinished count?" })).toBeVisible();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      const request = original.call(this, value, key);
      if ((value as { version?: number })?.version === 4) {
        const tx = this.transaction;
        const global = window as unknown as { copyGate?: boolean; copyStarted?: boolean };
        global.copyStarted = true;
        const keepAlive = () => {
          if (global.copyGate) { tx.abort(); return; }
          const read = this.get("count-draft");
          read.onsuccess = keepAlive;
        };
        keepAlive();
      }
      return request;
    };
  });
  await page.getByRole("button", { name: "Replace draft" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { copyStarted?: boolean }).copyStarted)).toBe(true);
  await page.goBack({ waitUntil: "commit" });
  await expect(page).toHaveURL(new RegExp(`${detail}$`));
  await expect(page.locator("[inert] .bottom-nav")).toHaveCount(1);
  await expect(page.getByLabel("$1 quantity")).toHaveCount(0);
  await page.evaluate(() => { (window as unknown as { copyGate?: boolean }).copyGate = true; });
  await expect(page.getByRole("alert")).toHaveText("Could not resume the count. Your draft and saved count were kept. Refresh and try again.");
  const other = await context.newPage();
  await other.goto("/history");
  expect(await snapshot(other)).toEqual(before);
  await other.close();
});
