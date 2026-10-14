import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateCountSnapshots } from "../domain/count";
import type { CurrencyConfiguration } from "../domain/validation";
import { ApplicationRoutes } from "../routes/app-routes";
import { IndexedDbRepository } from "../storage/indexed-db-repository";
import { BrowserPrintDestination } from "./receipt-destination";

const currencies: readonly CurrencyConfiguration[] = [
  { id: "usd", name: "US dollar", symbol: "$", code: "USD", denominations: [1, 5] },
  { id: "eur", name: "Euro", symbol: "€", code: "EUR", denominations: [2] },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

async function receiptRepository() {
  const repository = new IndexedDbRepository({
    databaseName: crypto.randomUUID(),
    indexedDB: new IDBFactory(),
    createId: () => "saved-count",
    now: () => new Date("2026-10-14T09:30:00.000Z"),
  });
  await repository.saveCurrencyConfigurations(currencies);
  await repository.saveCount({
    snapshots: calculateCountSnapshots(currencies, {
      usd: { "1": 3, "5": 2 }, eur: { "2": 4 },
    }),
    note: "Safe note",
  });
  await repository.saveCurrencyConfigurations([
    { id: "jpy", name: "Japanese yen", symbol: "¥", code: "JPY", denominations: [1000] },
  ]);
  return repository;
}

describe("saved count receipt", () => {
  it("opens from count detail and renders only the immutable saved snapshot", async () => {
    const repository = await receiptRepository();
    window.history.replaceState({}, "", "/history/saved-count");
    const view = render(<ApplicationRoutes repository={repository} />);

    const link = await screen.findByRole("link", { name: "Open receipt" });
    expect(link.getAttribute("href")).toBe("/history/saved-count/receipt");

    view.unmount();
    window.history.replaceState({}, "", link.getAttribute("href")!);
    render(<ApplicationRoutes repository={repository} />);

    expect(await screen.findByRole("heading", { name: "Count receipt" })).toBeTruthy();
    expect((await screen.findByText("2026-10-14T09:30:00.000Z")).tagName).toBe("TIME");
    expect(screen.getByText("$1 × 3 = $3")).toBeTruthy();
    expect(screen.getByText("$5 × 2 = $10")).toBeTruthy();
    expect(screen.getByText("Subtotal: $13 USD")).toBeTruthy();
    expect(screen.getByText("Subtotal: €8 EUR")).toBeTruthy();
    expect(screen.getByText("Safe note")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(
      /JPY|1000|conversion|exchange rate|grand total|combined total|expected (?:value|total)|variance|shift|close[- ]?out|reconciliation|bluetooth|esc[- /]?pos/i,
    );
  });

  it("delivers through the browser print workflow", async () => {
    const print = vi.fn();
    const destination = new BrowserPrintDestination(print);
    const repository = await receiptRepository();
    window.history.replaceState({}, "", "/history/saved-count/receipt");
    render(<ApplicationRoutes repository={repository} receiptDestination={destination} />);

    fireEvent.click(await screen.findByRole("button", { name: "Print or save as PDF" }));
    expect(print).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Return to count details" }).className)
      .toBe("button");
  });
});
