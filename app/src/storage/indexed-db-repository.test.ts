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
