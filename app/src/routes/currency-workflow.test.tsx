import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, expect, it, vi } from "vitest";
import { IndexedDbRepository } from "../storage/indexed-db-repository";
import { ApplicationRoutes } from "./app-routes";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); window.localStorage.removeItem("cyndy.locale"); window.history.replaceState({}, "", "/"); });

it("saves valid quantities when randomUUID is unavailable on an HTTP LAN origin", async () => {
  const store = new IndexedDbRepository({ databaseName: "insecure-count", indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.localStorage.setItem("cyndy.locale", "es");
  window.history.replaceState({}, "", "/count/new");
  vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
  render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1 cantidad");
  fireEvent.change(input, { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Guardar conteo" }));
  expect(await screen.findByText("Conteo guardado.")).toBeTruthy();
  expect((await store.listCounts())[0].snapshots[0].entries[0].quantity).toBe(3);
  store.close();
});

it("reports a repository TypeError as a save failure, not a quantity error", async () => {
  const store = new IndexedDbRepository({ databaseName: "save-error", indexedDB: new IDBFactory(), createId: () => "" });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  await screen.findByLabelText("$1 quantity");
  fireEvent.click(screen.getByRole("button", { name: "Save count" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Could not save the count. Try again.");
  expect(await store.listCounts()).toEqual([]);
  store.close();
});

it("starts a fresh installation with USD and CUP and lets the user select currencies", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  window.history.replaceState({}, "", "/");
  render(<ApplicationRoutes repository={store} />);
  await screen.findByRole("heading", { name: "Dashboard" });
  const currencies = await store.getCurrencyConfigurations();
  expect(currencies.map((currency) => currency.code)).toEqual(["USD", "CUP"]);
  expect(currencies[0].denominations).toEqual([1, 2, 5, 10, 20, 50, 100]);
  expect(currencies[1].denominations).toEqual([1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]);
  expect(await screen.findByRole("checkbox", { name: "USD" })).toBeTruthy();
  expect(screen.getByRole("checkbox", { name: "CUP" })).toBeTruthy();
});

it("allows adding a third currency in settings", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  window.history.replaceState({}, "", "/settings");
  render(<ApplicationRoutes repository={store} />);
  await screen.findByRole("heading", { name: "Settings" });
  fireEvent.click(screen.getByRole("button", { name: "Add another currency" }));
  const names = screen.getAllByLabelText("Currency name");
  const symbols = screen.getAllByLabelText("Symbol");
  const codes = screen.getAllByLabelText("Currency code");
  const denominations = screen.getAllByLabelText("Denominations (comma separated)");
  expect(codes.map((input) => (input as HTMLInputElement).value)).toEqual(["", "USD", "CUP"]);
  fireEvent.change(names[0], { target: { value: "Euro" } });
  fireEvent.change(symbols[0], { target: { value: "€" } });
  fireEvent.change(codes[0], { target: { value: "EUR" } });
  fireEvent.change(denominations[0], { target: { value: "1, 2" } });
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await screen.findByText("Settings saved.");
  expect((await store.getCurrencyConfigurations()).map((currency) => currency.code)).toEqual(["EUR", "USD", "CUP"]);
});

it("reorders settings while preserving edits and validation, and persists order for counts", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  window.history.replaceState({}, "", "/settings");
  const view = render(<ApplicationRoutes repository={store} />);
  await screen.findByRole("heading", { name: "Settings" });
  fireEvent.change(screen.getAllByLabelText("Currency name")[1], { target: { value: "Edited peso" } });
  fireEvent.change(screen.getAllByLabelText("Denominations (comma separated)")[1], { target: { value: "5, 5" } });
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  expect(await screen.findByText("Denominations must be unique.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Move CUP up" }));
  const groups = screen.getAllByRole("group");
  expect(within(groups[0]).getByLabelText("Currency name")).toHaveProperty("value", "Edited peso");
  expect(within(groups[0]).getByText("Denominations must be unique.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Move CUP up" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("button", { name: "Move USD down" })).toHaveProperty("disabled", true);
  fireEvent.click(screen.getByRole("button", { name: "Move CUP down" }));
  expect(screen.getAllByLabelText("Currency code").map((input) => (input as HTMLInputElement).value)).toEqual(["USD", "CUP"]);
  fireEvent.click(screen.getByRole("button", { name: "Move CUP up" }));
  expect((await store.getCurrencyConfigurations()).map((item) => item.code)).toEqual(["USD", "CUP"]);
  fireEvent.change(within(groups[0]).getByLabelText("Denominations (comma separated)"), { target: { value: "5, 10" } });
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await screen.findByText("Settings saved.");
  expect((await store.getCurrencyConfigurations()).map((item) => item.code)).toEqual(["CUP", "USD"]);
  view.unmount();
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  await screen.findByRole("heading", { name: "New count" });
  expect(screen.getAllByRole("checkbox").map((input) => input.parentElement?.textContent?.trim())).toEqual(["CUP", "USD"]);
  store.close();
});

it("shows zero in untouched quantities and selects the value on focus", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1 quantity");
  expect(input).toHaveProperty("value", "0");
  const select = vi.spyOn(input as HTMLInputElement, "select");
  fireEvent.focus(input);
  expect(select).toHaveBeenCalledOnce();
});

it("allows clearing the last selection without crashing or saving", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  fireEvent.click(await screen.findByRole("checkbox", { name: "USD" }));
  expect(screen.getByRole("button", { name: "Save count" })).toHaveProperty("disabled", true);
  expect(await store.listCounts()).toEqual([]);
});

it("keeps quantities when a currency is hidden but saves only selected currencies", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([
    { id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] },
    { id: "cup", name: "Cuban peso", code: "CUP", symbol: "$", denominations: [5] },
  ]);
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  await screen.findByRole("heading", { name: "New count" });
  fireEvent.change(screen.getByLabelText("$1 quantity"), { target: { value: "3" } });
  const usd = screen.getByRole("checkbox", { name: "USD" });
  fireEvent.click(usd);
  expect(screen.queryByLabelText("$1 quantity")).toBeNull();
  fireEvent.click(usd);
  expect(screen.getByLabelText("$1 quantity")).toHaveProperty("value", "3");
  fireEvent.click(usd);
  fireEvent.click(screen.getByRole("button", { name: "Save count" }));
  await screen.findByText("Count saved.");
  expect((await store.listCounts())[0].snapshots.map((item) => item.code)).toEqual(["CUP"]);
});
