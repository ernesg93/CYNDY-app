import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, expect, it, vi } from "vitest";
import { IndexedDbRepository } from "../storage/indexed-db-repository";
import { ApplicationRoutes } from "./app-routes";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); window.localStorage.removeItem("cyndy.locale"); window.history.replaceState({}, "", "/"); });

it("restores an unfinished count and hidden currency quantities after reload", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([
    { id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] },
    { id: "cup", name: "Cuban peso", code: "CUP", symbol: "$", denominations: [5] },
  ]);
  window.history.replaceState({}, "", "/count/new");
  const view = render(<ApplicationRoutes repository={store} />);
  fireEvent.change(await screen.findByLabelText("$1 quantity"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("$5 quantity"), { target: { value: "7" } });
  fireEvent.change(screen.getByLabelText("Count title"), { target: { value: "Draft" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "USD" }));
  await screen.findByText("Draft saved locally.");
  view.unmount();
  render(<ApplicationRoutes repository={store} />);
  expect(await screen.findByLabelText("$5 quantity")).toHaveProperty("value", "7");
  expect(screen.getByLabelText("Count title")).toHaveProperty("value", "Draft");
  expect(screen.getByRole("checkbox", { name: "USD" })).toHaveProperty("checked", false);
  fireEvent.click(screen.getByRole("checkbox", { name: "USD" }));
  expect(screen.getByLabelText("$1 quantity")).toHaveProperty("value", "3");
  store.close();
});

it.each(["save", "clear"])("discards the pending draft on %s without losing saved records", async (action) => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.history.replaceState({}, "", "/count/new");
  const view = render(<ApplicationRoutes repository={store} />);
  fireEvent.change(await screen.findByLabelText("$1 quantity"), { target: { value: "3" } });
  await screen.findByText("Draft saved locally.");
  fireEvent.click(screen.getByRole("button", { name: action === "save" ? "Save count" : "Clear unsaved count" }));
  await screen.findByText(action === "save" ? "Count saved." : "Draft cleared locally.");
  view.unmount();
  render(<ApplicationRoutes repository={store} />);
  expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "0");
  expect(await store.listCounts()).toHaveLength(action === "save" ? 1 : 0);
  expect(await store.getCurrencyConfigurations()).toHaveLength(1);
  store.close();
});

it("reports draft write failures while preserving the editable count", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  vi.spyOn(store, "saveCountDraft").mockRejectedValue(new Error("storage unavailable"));
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  fireEvent.change(await screen.findByLabelText("$1 quantity"), { target: { value: "3" } });
  expect((await screen.findByRole("alert")).textContent).toBe("Could not store the draft locally. Your changes may be lost.");
  expect(screen.getByLabelText("$1 quantity")).toHaveProperty("value", "3");
  store.close();
});

it.each(["write", "discard"])("recovers queued and later edits after a failed draft %s", async (failure) => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.history.replaceState({}, "", "/count/new");
  const view = render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1 quantity");
  fireEvent.change(input, { target: { value: "2" } });
  await screen.findByText("Draft saved locally.");
  let reject!: (error: Error) => void;
  const gate = new Promise<never>((_, fail) => { reject = fail; });
  const operation = failure === "write" ? vi.spyOn(store, "saveCountDraft").mockImplementationOnce(() => gate)
    : vi.spyOn(store, "deleteCountDraft").mockImplementationOnce(() => gate);
  if (failure === "write") fireEvent.change(input, { target: { value: "3" } });
  else fireEvent.click(screen.getByRole("button", { name: "Clear unsaved count" }));
  await waitFor(() => expect(operation).toHaveBeenCalled());
  fireEvent.change(input, { target: { value: "7" } });
  await act(async () => { reject(new Error("storage unavailable")); });
  await screen.findByText("Draft saved locally.");
  fireEvent.change(input, { target: { value: "9" } });
  await screen.findByText("Draft saved locally.");
  view.unmount();
  render(<ApplicationRoutes repository={store} />);
  expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "9");
  store.close();
});

it("does not resurrect an older write after clearing", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  const original = store.saveCountDraft.bind(store);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const write = vi.spyOn(store, "saveCountDraft").mockImplementationOnce(async (...args) => { await gate; await original(...args); });
  window.history.replaceState({}, "", "/count/new");
  const view = render(<ApplicationRoutes repository={store} />);
  fireEvent.change(await screen.findByLabelText("$1 quantity"), { target: { value: "9" } });
  await waitFor(() => expect(write).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Clear unsaved count" }));
  await act(async () => { release(); });
  await screen.findByText("Draft cleared locally.");
  view.unmount();
  render(<ApplicationRoutes repository={store} />);
  expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "0");
  store.close();
});

it("waits for an older draft write before resetting", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  const original = store.saveCountDraft.bind(store);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const write = vi.spyOn(store, "saveCountDraft").mockImplementationOnce(async (...args) => { await gate; await original(...args); });
  window.history.replaceState({}, "", "/");
  const view = render(<ApplicationRoutes repository={store} />);
  fireEvent.click(await screen.findByRole("checkbox", { name: "USD" }));
  await waitFor(() => expect(write).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Reset all local data" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue reset" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));
  await act(async () => { release(); });
  await screen.findByText("All local data was reset.");
  view.unmount();
  render(<ApplicationRoutes repository={store} />);
  expect(await screen.findByRole("checkbox", { name: "USD" })).toHaveProperty("checked", true);
  store.close();
});

it("does not replay a draft edit queued while reset is pending", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  const original = store.resetAll.bind(store);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const reset = vi.spyOn(store, "resetAll").mockImplementationOnce(async (configurations) => { await gate; await original(configurations); });
  window.history.replaceState({}, "", "/");
  const view = render(<ApplicationRoutes repository={store} />);
  await screen.findByRole("checkbox", { name: "USD" });
  fireEvent.click(screen.getByRole("button", { name: "Reset all local data" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue reset" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));
  await waitFor(() => expect(reset).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("checkbox", { name: "USD" }));
  await act(async () => { release(); });
  await screen.findByText("All local data was reset.");
  view.unmount();
  render(<ApplicationRoutes repository={store} />);
  expect(await screen.findByRole("checkbox", { name: "USD" })).toHaveProperty("checked", true);
  store.close();
});

it("persists an edit made while clearing the preceding draft", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  const original = store.deleteCountDraft.bind(store);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const discard = vi.spyOn(store, "deleteCountDraft").mockImplementationOnce(async (...args) => { await gate; return original(...args); });
  window.history.replaceState({}, "", "/count/new");
  const view = render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1 quantity");
  fireEvent.change(input, { target: { value: "2" } });
  await screen.findByText("Draft saved locally.");
  fireEvent.click(screen.getByRole("button", { name: "Clear unsaved count" }));
  await waitFor(() => expect(discard).toHaveBeenCalled());
  fireEvent.change(input, { target: { value: "7" } });
  await act(async () => { release(); });
  await screen.findByText("Draft saved locally.");
  view.unmount();
  render(<ApplicationRoutes repository={store} />);
  expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "7");
  store.close();
});

it("does not resurrect an uncommitted draft after another owner resets", async () => {
  const indexedDB = new IDBFactory();
  const databaseName = crypto.randomUUID();
  const firstStore = new IndexedDbRepository({ databaseName, indexedDB });
  const secondStore = new IndexedDbRepository({ databaseName, indexedDB });
  window.history.replaceState({}, "", "/");
  const first = render(<ApplicationRoutes repository={firstStore} />);
  await screen.findByRole("checkbox", { name: "USD" });
  const original = firstStore.saveCountDraft.bind(firstStore);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const delayed = vi.spyOn(firstStore, "saveCountDraft").mockImplementationOnce(async (...args) => { await gate; return original(...args); });
  fireEvent.click(screen.getByRole("checkbox", { name: "USD" }));
  await waitFor(() => expect(delayed).toHaveBeenCalled());
  first.unmount();
  const second = render(<ApplicationRoutes repository={secondStore} />);
  await screen.findByRole("checkbox", { name: "USD" });
  fireEvent.click(screen.getByRole("button", { name: "Reset all local data" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue reset" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));
  await screen.findByText("All local data was reset.");
  await act(async () => { release(); await delayed.mock.results[0].value.catch(() => {}); });
  second.unmount();
  render(<ApplicationRoutes repository={secondStore} />);
  expect(await screen.findByRole("checkbox", { name: "USD" })).toHaveProperty("checked", true);
  firstStore.close(); secondStore.close();
});

it("does not delete a newer persisted draft when an earlier owner finishes saving", async () => {
  const indexedDB = new IDBFactory();
  const databaseName = crypto.randomUUID();
  const oldStore = new IndexedDbRepository({ databaseName, indexedDB });
  const newStore = new IndexedDbRepository({ databaseName, indexedDB });
  await oldStore.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  const original = oldStore.saveCount.bind(oldStore);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  vi.spyOn(oldStore, "saveCount").mockImplementationOnce(async (input) => { await gate; return original(input); });
  const discard = vi.spyOn(oldStore, "deleteCountDraft");
  window.history.replaceState({}, "", "/count/new");
  const first = render(<ApplicationRoutes repository={oldStore} />);
  fireEvent.change(await screen.findByLabelText("$1 quantity"), { target: { value: "2" } });
  await screen.findByText("Draft saved locally.");
  fireEvent.click(screen.getByRole("button", { name: "Save count" }));
  first.unmount();
  const second = render(<ApplicationRoutes repository={newStore} />);
  const input = await screen.findByLabelText("$1 quantity");
  expect(input).toHaveProperty("value", "2");
  fireEvent.change(input, { target: { value: "7" } });
  await screen.findByText("Draft saved locally.");
  await act(async () => { release(); });
  await waitFor(() => expect(discard).toHaveBeenCalled());
  await act(async () => { await discard.mock.results[0].value; });
  second.unmount();
  render(<ApplicationRoutes repository={newStore} />);
  expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "7");
  expect((await newStore.listCounts())[0].snapshots[0].entries[0].quantity).toBe(2);
  oldStore.close(); newStore.close();
});

it("does not resurrect a cleared draft from an older owner's delayed write", async () => {
  const indexedDB = new IDBFactory();
  const databaseName = crypto.randomUUID();
  const firstStore = new IndexedDbRepository({ databaseName, indexedDB });
  const secondStore = new IndexedDbRepository({ databaseName, indexedDB });
  await firstStore.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.history.replaceState({}, "", "/count/new");
  const first = render(<ApplicationRoutes repository={firstStore} />);
  fireEvent.change(await screen.findByLabelText("$1 quantity"), { target: { value: "2" } });
  await screen.findByText("Draft saved locally.");
  const original = firstStore.saveCountDraft.bind(firstStore);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const delayed = vi.spyOn(firstStore, "saveCountDraft").mockImplementationOnce(async (...args) => { await gate; return original(...args); });
  fireEvent.change(screen.getByLabelText("$1 quantity"), { target: { value: "7" } });
  await waitFor(() => expect(delayed).toHaveBeenCalled());
  first.unmount();
  const second = render(<ApplicationRoutes repository={secondStore} />);
  expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "2");
  fireEvent.click(screen.getByRole("button", { name: "Clear unsaved count" }));
  await screen.findByText("Draft cleared locally.");
  await act(async () => { release(); await delayed.mock.results[0].value.catch(() => {}); });
  second.unmount();
  render(<ApplicationRoutes repository={secondStore} />);
  expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "0");
  firstStore.close(); secondStore.close();
});

it("does not clear a newer draft written by another owner", async () => {
  const indexedDB = new IDBFactory();
  const databaseName = crypto.randomUUID();
  const oldStore = new IndexedDbRepository({ databaseName, indexedDB });
  const newStore = new IndexedDbRepository({ databaseName, indexedDB });
  await oldStore.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  const original = oldStore.deleteCountDraft.bind(oldStore);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const discard = vi.spyOn(oldStore, "deleteCountDraft").mockImplementationOnce(async (...args) => { await gate; return original(...args); });
  window.history.replaceState({}, "", "/count/new");
  const first = render(<ApplicationRoutes repository={oldStore} />);
  fireEvent.change(await screen.findByLabelText("$1 quantity"), { target: { value: "2" } });
  await screen.findByText("Draft saved locally.");
  fireEvent.click(screen.getByRole("button", { name: "Clear unsaved count" }));
  await waitFor(() => expect(discard).toHaveBeenCalled());
  first.unmount();
  const second = render(<ApplicationRoutes repository={newStore} />);
  fireEvent.change(await screen.findByLabelText("$1 quantity"), { target: { value: "7" } });
  await screen.findByText("Draft saved locally.");
  await act(async () => { release(); await discard.mock.results[0].value; });
  second.unmount();
  render(<ApplicationRoutes repository={newStore} />);
  expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "7");
  oldStore.close(); newStore.close();
});

it("keeps newer edits when a count save finishes later", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  const original = store.saveCount.bind(store);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  vi.spyOn(store, "saveCount").mockImplementationOnce(async (input) => { await gate; return original(input); });
  window.history.replaceState({}, "", "/count/new");
  const view = render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1 quantity");
  fireEvent.change(input, { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Save count" }));
  fireEvent.change(input, { target: { value: "7" } });
  await screen.findByText("Draft saved locally.");
  await act(async () => { release(); });
  await screen.findByText("Count saved.");
  view.unmount();
  render(<ApplicationRoutes repository={store} />);
  expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "7");
  expect((await store.listCounts())[0].snapshots[0].entries[0].quantity).toBe(3);
  store.close();
});

it("blocks edits if the draft cannot be loaded", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  vi.spyOn(store, "getCountDraft").mockRejectedValue(new Error("read failed"));
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  expect((await screen.findByRole("alert")).textContent).toBe("Could not load the draft. Refresh and try again.");
  expect(screen.queryByLabelText("$1 quantity")).toBeNull();
  expect(await store.getCurrencyConfigurations()).toHaveLength(1);
  store.close();
});

it("reports failure to discard a draft", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1] }]);
  vi.spyOn(store, "deleteCountDraft").mockRejectedValue(new Error("delete failed"));
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  fireEvent.change(await screen.findByLabelText("$1 quantity"), { target: { value: "3" } });
  await screen.findByText("Draft saved locally.");
  fireEvent.click(screen.getByRole("button", { name: "Clear unsaved count" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Could not discard the draft locally. It may return after reload.");
  store.close();
});

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
  const denominations = screen.getAllByLabelText("Denominations (semicolon separated)");
  expect(codes.map((input) => (input as HTMLInputElement).value)).toEqual(["", "USD", "CUP"]);
  fireEvent.change(names[0], { target: { value: "Euro" } });
  fireEvent.change(symbols[0], { target: { value: "€" } });
  fireEvent.change(codes[0], { target: { value: "EUR" } });
  fireEvent.change(denominations[0], { target: { value: "1; 2" } });
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
  fireEvent.change(screen.getAllByLabelText("Denominations (semicolon separated)")[1], { target: { value: "5; 5" } });
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
  fireEvent.change(within(groups[0]).getByLabelText("Denominations (semicolon separated)"), { target: { value: "5; 10" } });
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

it("focus moves between quantities without selecting all and preserves deliberate editing", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1, 5] }]);
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  const first = await screen.findByLabelText("$1 quantity") as HTMLInputElement;
  const second = screen.getByLabelText("$5 quantity") as HTMLInputElement;
  expect(first.value).toBe("0");
  fireEvent.change(first, { target: { value: "1234" } });
  fireEvent.change(second, { target: { value: "5678" } });
  const selectFirst = vi.spyOn(first, "select");
  const selectSecond = vi.spyOn(second, "select");
  first.focus();
  second.focus();
  first.focus();
  expect(selectFirst).not.toHaveBeenCalled();
  expect(selectSecond).not.toHaveBeenCalled();
  expect(first.value).toBe("1,234");
  expect(second.value).toBe("5,678");
  first.setSelectionRange(2, 5);
  fireEvent.select(first);
  expect([first.selectionStart, first.selectionEnd]).toEqual([2, 5]);
  fireEvent.input(first, { inputType: "insertFromPaste", data: "99", target: { value: "1,99", selectionStart: 4, selectionEnd: 4 } });
  expect(first.value).toBe("199");
  expect(first.selectionStart).toBe(3);
  fireEvent.click(screen.getByRole("button", { name: "Save count" }));
  await screen.findByText("Count saved.");
  expect((await store.listCounts())[0].snapshots[0].entries.map(({ denomination, quantity }) => ({ denomination, quantity }))).toEqual([{ denomination: 1, quantity: 199 }, { denomination: 5, quantity: 5678 }]);
  store.close();
});

it("replaces the default zero on digit entry without selecting and restores all eight digits", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "US dollar", code: "USD", symbol: "$", denominations: [1, 5] }]);
  window.history.replaceState({}, "", "/count/new");
  const view = render(<ApplicationRoutes repository={store} />);
  const first = await screen.findByLabelText("$1 quantity") as HTMLInputElement;
  const second = screen.getByLabelText("$5 quantity") as HTMLInputElement;
  const select = vi.spyOn(second, "select");
  first.focus(); second.focus();
  second.setSelectionRange(1, 1);
  fireEvent.input(second, { inputType: "insertText", data: "1", target: { value: "01", selectionStart: 2, selectionEnd: 2 } });
  expect(second.value).toBe("1");
  expect(second.selectionStart).toBe(1);
  expect(select).not.toHaveBeenCalled();
  fireEvent.input(second, { inputType: "insertText", data: "2", target: { value: "12", selectionStart: 2, selectionEnd: 2 } });
  fireEvent.input(second, { inputType: "insertText", data: "345678", target: { value: "12345678", selectionStart: 8, selectionEnd: 8 } });
  expect(second.value).toBe("12,345,678");
  await screen.findByText("Draft saved locally.");
  view.unmount();
  render(<ApplicationRoutes repository={store} />);
  expect(await screen.findByLabelText("$5 quantity")).toHaveProperty("value", "12,345,678");
  store.close();
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
