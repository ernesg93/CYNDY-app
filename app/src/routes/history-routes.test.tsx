import { cleanup, render, screen } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";
import { calculateCountSnapshots } from "../domain/count";
import type { CurrencyConfiguration } from "../domain/validation";
import { IndexedDbRepository } from "../storage/indexed-db-repository";
import { ApplicationRoutes } from "./app-routes";

const dollar: CurrencyConfiguration = {
  id: "usd", name: "US dollar", symbol: "$", code: "USD", denominations: [1, 5],
};
const euro: CurrencyConfiguration = {
  id: "eur", name: "Euro", symbol: "€", code: "EUR", denominations: [2],
};

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

async function historyRepository() {
  let sequence = 0;
  const dates = ["2026-10-12T10:00:00.000Z", "2026-10-12T12:00:00.000Z"];
  const repository = new IndexedDbRepository({
    databaseName: crypto.randomUUID(),
    indexedDB: new IDBFactory(),
    createId: () => `count-${++sequence}`,
    now: () => new Date(dates[sequence - 1]),
  });
  await repository.saveCurrencyConfigurations([dollar, euro]);
  await repository.saveCount({
    snapshots: calculateCountSnapshots([dollar, euro], {
      usd: { "1": 3, "5": 2 }, eur: { "2": 4 },
    }),
    note: "Earlier note",
  });
  await repository.saveCount({
    snapshots: calculateCountSnapshots([dollar], { usd: { "1": 1, "5": 1 } }),
    note: "Current note",
  });
  await repository.saveCurrencyConfigurations([{
    id: "jpy", name: "Japanese yen", symbol: "¥", code: "JPY", denominations: [1000],
  }]);
  return repository;
}

function expectNeutralLanguage() {
  expect(document.body.textContent).not.toMatch(
    /shift|close[- ]?out|expected total|variance|reconciliation|grand total|combined total|conversion|exchange rate/i,
  );
}

describe("stored count routes", () => {
  it("shows the latest saved snapshot and per-currency local statistics", async () => {
    render(<ApplicationRoutes repository={await historyRepository()} />);

    await screen.findByRole("heading", { name: "Latest count" });
    expect(screen.getByText("$6 USD")).toBeTruthy();
    expect(screen.getByText("USD: 2 counts")).toBeTruthy();
    expect(screen.getByText("EUR: 1 count")).toBeTruthy();
    expect(screen.queryByText(/JPY/)).toBeNull();
    expect(screen.getByRole("link", { name: "View latest count" }).getAttribute("href"))
      .toBe("/history/count-2");
    expectNeutralLanguage();
  });

  it("lists persisted history newest first with independent subtotals", async () => {
    const repository = await historyRepository();
    window.history.replaceState({}, "", "/history");
    render(<ApplicationRoutes repository={repository} />);

    const links = await screen.findAllByRole("link", { name: /View count/ });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/history/count-2", "/history/count-1",
    ]);
    expect(screen.getByText("$13 USD")).toBeTruthy();
    expect(screen.getByText("€8 EUR")).toBeTruthy();
    expectNeutralLanguage();
  });

  it("renders immutable denomination entries, timestamp, subtotals, and current note", async () => {
    const repository = await historyRepository();
    await repository.updateCountNote("count-1", "Updated current note");
    window.history.replaceState({}, "", "/history/count-1");
    render(<ApplicationRoutes repository={repository} />);

    expect(await screen.findByText("$1 × 3 = $3")).toBeTruthy();
    expect(screen.getByText("$5 × 2 = $10")).toBeTruthy();
    expect(screen.getByText("Subtotal: $13 USD")).toBeTruthy();
    expect(screen.getByText("Subtotal: €8 EUR")).toBeTruthy();
    expect(screen.getByText("Updated current note")).toBeTruthy();
    expect(screen.getByText("2026-10-12T10:00:00.000Z").tagName).toBe("TIME");
    expect(screen.queryByText(/JPY|1000/)).toBeNull();
    expectNeutralLanguage();
  });
});
