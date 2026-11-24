import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { calculateCountSnapshots } from "../domain/count";
import type { CurrencyConfiguration } from "../domain/validation";
import { IndexedDbRepository } from "./indexed-db-repository";

function currencyConfigurations(): CurrencyConfiguration[] {
  return [
    {
      id: "ars",
      name: "Argentine peso",
      symbol: "$",
      code: "ARS",
      denominations: [100, 200],
    },
    {
      id: "usd",
      name: "US dollar",
      symbol: "US$",
      code: "USD",
      denominations: [1, 5],
    },
  ];
}

function createRepository() {
  return new IndexedDbRepository({
    databaseName: "count-repository-test",
    indexedDB: new IDBFactory(),
    now: () => new Date("2026-10-12T16:30:00.000Z"),
    createId: () => "count-001",
  });
}

function countSnapshots() {
  return calculateCountSnapshots(currencyConfigurations(), {
    ars: { "100": 2, "200": 1 },
    usd: { "1": 3, "5": 4 },
  });
}

describe("IndexedDbRepository", () => {
  it("keeps a separate draft without changing saved counts or settings", async () => {
    const repository = createRepository();
    const currencies = currencyConfigurations();
    await repository.saveCurrencyConfigurations(currencies);
    const saved = await repository.saveCount({ snapshots: countSnapshots() });
    const draft = { quantities: { "ars:100": "3", "usd:1": "7" }, note: "draft", selectedCurrencies: ["ars"] };
    await repository.saveCountDraft(draft, "test-revision");
    expect(await repository.getCountDraft()).toEqual({ ...draft, revision: "test-revision" });
    const clearedRevision = await repository.deleteCountDraft();
    expect(await repository.getCountDraft()).toEqual({ cleared: true, revision: clearedRevision });
    expect(await repository.getCount(saved.id)).toEqual(saved);
    expect(await repository.getCurrencyConfigurations()).toEqual(currencies);
    repository.close();
  });
  it.each([
    { key: "count-draft", version: 99, extra: "preserve me" },
    { key: "count-draft", version: 1, draft: { quantities: { "usd:1": 2 }, note: "", selectedCurrencies: ["usd"] } },
  ])("preserves an unsupported or malformed stored draft when reading, writing or deleting it", async (unknown) => {
    const indexedDB = new IDBFactory();
    const databaseName = "unsupported-draft";
    const repository = new IndexedDbRepository({ databaseName, indexedDB });
    await repository.saveCurrencyConfigurations(currencyConfigurations());
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("settings", "readwrite");
      tx.objectStore("settings").put(unknown);
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
    });
    await expect(repository.getCountDraft()).rejects.toThrow("Unsupported or invalid count draft");
    await expect(repository.saveCountDraft({ quantities: {}, note: "", selectedCurrencies: [] }, "new")).rejects.toThrow("Unsupported or invalid count draft");
    await expect(repository.deleteCountDraft("old")).rejects.toThrow("Unsupported or invalid count draft");
    const stored = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction("settings", "readonly").objectStore("settings").get("count-draft");
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    expect(stored).toEqual(unknown);
    expect(await repository.getCurrencyConfigurations()).toEqual(currencyConfigurations());
    db.close(); repository.close();
  });

  it("saves a valid count with its generated ID, ISO timestamp, snapshots, and note", async () => {
    const repository = createRepository();

    const saved = await repository.saveCount({
      snapshots: countSnapshots(),
      note: "Opening count",
    });

    expect(saved).toEqual({
      id: "count-001",
      createdAt: "2026-10-12T16:30:00.000Z",
      snapshots: countSnapshots(),
      note: "Opening count",
    });
    expect(await repository.getCount("count-001")).toEqual(saved);
    repository.close();
  });

  it("preserves saved facts after source and stored configuration changes", async () => {
    const repository = createRepository();
    const currencies = currencyConfigurations();
    const snapshots = countSnapshots();
    await repository.saveCurrencyConfigurations(currencies);
    await repository.saveCount({ snapshots });

    currencies[0].name = "Changed peso";
    (currencies[0].denominations as number[])[0] = 500;
    (snapshots[0].entries[0] as { quantity: number }).quantity = 99;
    await repository.saveCurrencyConfigurations([
      { ...currencies[0], denominations: [500] },
    ]);

    const stored = await repository.getCount("count-001");
    expect(stored?.createdAt).toBe("2026-10-12T16:30:00.000Z");
    expect(stored?.snapshots[0]).toMatchObject({
      name: "Argentine peso",
      subtotal: 400,
      entries: [
        { denomination: 100, quantity: 2, total: 200 },
        { denomination: 200, quantity: 1, total: 200 },
      ],
    });

    (stored!.snapshots[0].entries[0] as { quantity: number }).quantity = 50;
    expect((await repository.getCount("count-001"))?.snapshots[0].entries[0].quantity).toBe(2);
    repository.close();
  });

  it("updates only the note of an existing count", async () => {
    const repository = createRepository();
    const saved = await repository.saveCount({ snapshots: countSnapshots() });

    const updated = await repository.updateCountNote(saved.id, "Reviewed");

    expect(updated).toEqual({ ...saved, note: "Reviewed" });
    expect(updated.snapshots).toEqual(saved.snapshots);
    expect(updated.createdAt).toBe(saved.createdAt);
    repository.close();
  });

  it("lists newest counts first and returns the latest count", async () => {
    let sequence = 0;
    const dates = ["2026-10-12T10:00:00.000Z", "2026-10-12T12:00:00.000Z"];
    const repository = new IndexedDbRepository({
      databaseName: "list-counts-test",
      indexedDB: new IDBFactory(),
      createId: () => `count-${++sequence}`,
      now: () => new Date(dates[sequence - 1]),
    });
    await repository.saveCount({ snapshots: countSnapshots(), note: "Earlier" });
    await repository.saveCount({ snapshots: countSnapshots(), note: "Latest" });

    expect((await repository.listCounts()).map(({ id }) => id)).toEqual(["count-2", "count-1"]);
    expect(await repository.getLatestCount()).toMatchObject({ id: "count-2", note: "Latest" });
    repository.close();
  });

  it("preserves save order when count timestamps are identical", async () => {
    const ids = ["z-older", "a-latest"];
    const repository = new IndexedDbRepository({
      databaseName: "same-timestamp-counts-test",
      indexedDB: new IDBFactory(),
      createId: () => ids.shift()!,
      now: () => new Date("2026-10-12T12:00:00.000Z"),
    });
    await repository.saveCount({ snapshots: countSnapshots(), note: "Earlier" });
    await repository.saveCount({ snapshots: countSnapshots(), note: "Latest" });

    expect((await repository.listCounts()).map(({ id }) => id)).toEqual(["a-latest", "z-older"]);
    expect(await repository.getLatestCount()).toMatchObject({ id: "a-latest", note: "Latest" });
    repository.close();
  });

  it("deletes only the selected count", async () => {
    let sequence = 0;
    const repository = new IndexedDbRepository({
      databaseName: "delete-count-test",
      indexedDB: new IDBFactory(),
      createId: () => `count-${++sequence}`,
    });
    await repository.saveCount({ snapshots: countSnapshots() });
    await repository.saveCount({ snapshots: countSnapshots(), note: "Keep me" });

    await repository.deleteCount("count-1");

    expect(await repository.getCount("count-1")).toBeUndefined();
    expect(await repository.getCount("count-2")).toMatchObject({ note: "Keep me" });
    repository.close();
  });

  it("atomically resets currency settings and all count records", async () => {
    const repository = createRepository();
    await repository.saveCurrencyConfigurations(currencyConfigurations());
    await repository.saveCount({ snapshots: countSnapshots() });

    await repository.resetAll();

    expect(await repository.getCurrencyConfigurations()).toEqual([]);
    expect(await repository.getCount("count-001")).toBeUndefined();
    repository.close();
  });
});
