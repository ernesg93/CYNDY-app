import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateCountSnapshots } from "../domain/count";
import { ApplicationRoutes } from "../routes/app-routes";
import { IndexedDbRepository } from "../storage/indexed-db-repository";
import { BrowserPrintDestination } from "./receipt-destination";

const currencies = [
  { id: "usd", name: "US dollar", symbol: "$", code: "USD", denominations: [1, 5] },
  { id: "eur", name: "Euro", symbol: "€", code: "EUR", denominations: [2] },
];
afterEach(() => { cleanup(); localStorage.clear(); window.history.replaceState({}, "", "/"); });

async function repositoryWithCount() {
  const repository = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory(), createId: () => "saved-count", now: () => new Date("2026-10-14T09:30:00.000Z") });
  await repository.saveCurrencyConfigurations(currencies);
  await repository.saveCount({ snapshots: calculateCountSnapshots(currencies, { usd: { "1": 3, "5": 2 }, eur: { "2": 4 } }), note: "Safe note" });
  await repository.saveCurrencyConfigurations([{ id: "jpy", name: "Japanese yen", symbol: "¥", code: "JPY", denominations: [1000] }]);
  return repository;
}

describe("unified saved count", () => {
  for (const [locale, title, action, nav] of [["en", "Count details", "Print or save", "CYNDY navigation"], ["es", "Detalles del conteo", "Imprimir o guardar", "Navegación de CYNDY"]]) {
    for (const suffix of ["", "/receipt"]) {
      it(`${locale}: opens direct ${suffix || "detail"} without printing and prints only on request`, async () => {
        localStorage.setItem("cyndy.locale", locale);
        const repository = await repositoryWithCount();
        const before = await repository.listCounts();
        const print = vi.fn();
        window.history.replaceState({}, "", `/history/saved-count${suffix}`);
        render(<ApplicationRoutes repository={repository} receiptDestination={new BrowserPrintDestination(print)} />);
        expect(await screen.findByRole("heading", { name: title })).toBeTruthy();
        expect(await screen.findByText("$1 × 3 = $3")).toBeTruthy();
        expect(screen.getByText("$5 × 2 = $10")).toBeTruthy();
        expect(screen.getByText("€2 × 4 = €8")).toBeTruthy();
        expect(screen.getByText("Safe note")).toBeTruthy();
        expect(document.body.textContent).not.toMatch(/JPY|1000/);
        expect(screen.queryByRole("link", { name: /Return to history|Volver al historial/ })).toBeNull();
        expect(within(screen.getByRole("navigation", { name: nav })).getAllByRole("link")).toHaveLength(3);
        expect(print).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: action }));
        expect(print).toHaveBeenCalledOnce();
        expect(await repository.listCounts()).toEqual(before);
      });
    }
  }
});
