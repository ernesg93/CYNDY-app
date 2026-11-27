import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    now: () => new Date(dates[sequence - 1] ?? dates[1]),
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
  it("filters zero rows and currencies for details and printing while preserving resume data", async () => {
    const repository = new IndexedDbRepository({ indexedDB: new IDBFactory(), databaseName: crypto.randomUUID() });
    await repository.saveCurrencyConfigurations([dollar, euro]);
    const original = await repository.saveCount({ snapshots: calculateCountSnapshots([dollar, euro], { usd: { "1": 3, "5": 0 }, eur: { "2": 0 } }) });
    const deliver = vi.fn();
    window.history.replaceState({}, "", `/history/${original.id}`);
    render(<ApplicationRoutes repository={repository} receiptDestination={{ deliver }} />);
    const table = await screen.findByRole("table", { name: "US dollar (USD)" });
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getByText("$1")).toBeTruthy();
    expect(within(table).queryByText("$5")).toBeNull();
    expect(screen.queryByRole("table", { name: "Euro (EUR)" })).toBeNull();
    expect(screen.getByText("Total: $3 USD")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Print or save" }));
    expect(deliver).toHaveBeenCalledWith(original);
    expect(await repository.getCount(original.id)).toEqual(original);
    fireEvent.click(screen.getByRole("button", { name: "Resume as new count" }));
    expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "3");
    expect(screen.getByLabelText("$5 quantity")).toHaveProperty("value", "0");
    expect(screen.getByLabelText("€2 quantity")).toHaveProperty("value", "0");
    expect(await repository.getCount(original.id)).toEqual(original);
    repository.close();
  });

  it("shows a localized message for an all-zero saved count", async () => {
    const repository = new IndexedDbRepository({ indexedDB: new IDBFactory(), databaseName: crypto.randomUUID() });
    await repository.saveCurrencyConfigurations([dollar, euro]);
    const original = await repository.saveCount({ snapshots: calculateCountSnapshots([dollar, euro], {}) });
    window.history.replaceState({}, "", `/history/${original.id}`);
    render(<ApplicationRoutes repository={repository} />);
    expect(await screen.findByText("All quantities are zero.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Change language" }));
    expect(screen.getByText("Todas las cantidades son cero.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar idioma" }));
    expect(await repository.getCount(original.id)).toEqual(original);
    repository.close();
  });

  it("resumes a saved count as a historical draft", async () => {
    const repository = await historyRepository();
    const original = await repository.getCount("count-1");
    window.history.replaceState({}, "", "/history/count-1");
    const view = render(<ApplicationRoutes repository={repository} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume as new count" }));
    expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "3");
    expect(screen.getByLabelText("€2 quantity")).toHaveProperty("value", "4");
    expect(screen.getByRole("group", { name: "US dollar (USD)" })).toBeTruthy();
    view.unmount();
    render(<ApplicationRoutes repository={repository} />);
    expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "3");
    expect(screen.getByLabelText("€2 quantity")).toHaveProperty("value", "4");
    fireEvent.change(screen.getByLabelText("$1 quantity"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    await screen.findByText("Count saved.");
    const copy = await repository.getCount("count-3");
    expect(copy?.snapshots.map((snapshot) => snapshot.name)).toEqual(["US dollar", "Euro"]);
    expect(copy?.snapshots[0].entries[0].quantity).toBe(9);
    expect(await repository.getCount("count-1")).toEqual(original);
    repository.close();
  });
  it("confirms before replacing an unfinished draft and preserves it on cancel", async () => {
    const repository = await historyRepository();
    await repository.saveCountDraft({ quantities: { "jpy:1000": "invalid" }, note: "Unfinished", selectedCurrencies: ["jpy"] });
    const before = await repository.getCountDraft();
    const original = await repository.getCount("count-1");
    window.history.replaceState({}, "", "/history/count-1");
    render(<ApplicationRoutes repository={repository} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume as new count" }));
    expect(await screen.findByRole("alertdialog", { name: "Replace unfinished count?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await repository.getCountDraft()).toEqual(before);
    expect(await repository.getCount("count-1")).toEqual(original);
    fireEvent.click(screen.getByRole("button", { name: "Resume as new count" }));
    fireEvent.click(await screen.findByRole("button", { name: "Replace draft" }));
    expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "3");
    expect(await repository.getCount("count-1")).toEqual(original);
    repository.close();
  });

  it("does not resume after leaving details while draft preparation is pending", async () => {
    const repository = await historyRepository();
    const original = await repository.getCount("count-1");
    const beforeDraft = await repository.getCountDraft();
    const beforeHistory = await repository.listCounts();
    window.history.replaceState({}, "", "/history/count-1");
    render(<ApplicationRoutes repository={repository} />);
    const button = await screen.findByRole("button", { name: "Resume as new count" });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const read = repository.getCountDraft.bind(repository);
    const delayed = vi.spyOn(repository, "getCountDraft").mockImplementationOnce(async () => { await gate; return read(); });
    const save = vi.spyOn(repository, "saveCountDraft");
    fireEvent.click(button);
    await waitFor(() => expect(delayed).toHaveBeenCalled());
    act(() => { window.history.pushState({}, "", "/settings"); window.dispatchEvent(new PopStateEvent("popstate")); });
    await screen.findByRole("heading", { name: "Settings" });
    const name = screen.getByLabelText("Currency name");
    fireEvent.change(name, { target: { value: "Unsaved change" } });
    await act(async () => { release(); await delayed.mock.results[0].value; });
    expect(window.location.pathname).toBe("/settings");
    expect(screen.getByLabelText("Currency name")).toHaveProperty("value", "Unsaved change");
    expect(save).not.toHaveBeenCalled();
    expect(await repository.getCountDraft()).toEqual(beforeDraft);
    expect(await repository.getCount("count-1")).toEqual(original);
    expect(await repository.listCounts()).toEqual(beforeHistory);
    repository.close();
  });

  it("invalidates pending resume preparation after a countId round trip", async () => {
    const repository = await historyRepository();
    const beforeDraft = await repository.getCountDraft();
    const beforeHistory = await repository.listCounts();
    window.history.replaceState({}, "", "/history/count-1");
    render(<ApplicationRoutes repository={repository} />);
    const button = await screen.findByRole("button", { name: "Resume as new count" });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const read = repository.getCountDraft.bind(repository);
    const delayed = vi.spyOn(repository, "getCountDraft").mockImplementationOnce(async () => { await gate; return read(); });
    const save = vi.spyOn(repository, "saveCountDraft");
    fireEvent.click(button);
    await waitFor(() => expect(delayed).toHaveBeenCalledTimes(1));
    act(() => { window.history.pushState({}, "", "/history/count-2"); window.dispatchEvent(new PopStateEvent("popstate")); });
    await screen.findByText("Total: $6 USD");
    act(() => { window.history.pushState({}, "", "/history/count-1"); window.dispatchEvent(new PopStateEvent("popstate")); });
    await screen.findByText("Total: $13 USD");
    await act(async () => { release(); await delayed.mock.results[0].value; });
    expect(save).not.toHaveBeenCalled();
    expect(await repository.getCountDraft()).toEqual(beforeDraft);
    expect(await repository.listCounts()).toEqual(beforeHistory);
    expect(window.location.pathname).toBe("/history/count-1");
    repository.close();
  });

  it("protects an unfinished draft against navigation during an in-flight replacement", async () => {
    const repository = await historyRepository();
    await repository.saveCountDraft({ quantities: { "jpy:1000": "7" }, note: "Unfinished", selectedCurrencies: ["jpy"] });
    const before = JSON.stringify(await repository.getCountDraft());
    const original = JSON.stringify(await repository.getCount("count-1"));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const save = vi.spyOn(repository, "saveCountDraft").mockImplementationOnce(async () => { await gate; throw new Error("write failed"); });
    window.history.replaceState({}, "", "/history/count-1");
    render(<ApplicationRoutes repository={repository} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume as new count" }));
    fireEvent.click(await screen.findByRole("button", { name: "Replace draft" }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    act(() => { window.history.pushState({}, "", "/count/new"); window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(screen.queryByLabelText("¥1,000 quantity")).toBeNull();
    await act(async () => { release(); });
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(JSON.stringify(await repository.getCountDraft())).toBe(before);
    expect(JSON.stringify(await repository.getCount("count-1"))).toBe(original);
    repository.close();
  });

  it("keeps another owner's newer draft when replacement is delayed", async () => {
    const indexedDB = new IDBFactory();
    const databaseName = crypto.randomUUID();
    const repository = new IndexedDbRepository({ indexedDB, databaseName });
    const other = new IndexedDbRepository({ indexedDB, databaseName });
    await repository.saveCurrencyConfigurations([dollar]);
    const record = await repository.saveCount({ snapshots: calculateCountSnapshots([dollar], { usd: { "1": 3 } }) });
    await repository.saveCountDraft({ quantities: { "usd:1": "7" }, note: "Before", selectedCurrencies: ["usd"] });
    const before = await repository.getCountDraft();
    const original = JSON.stringify(await repository.getCount(record.id));
    const write = repository.saveCountDraft.bind(repository);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const delayed = vi.spyOn(repository, "saveCountDraft").mockImplementationOnce(async (...args) => { await gate; await write(...args); });
    window.history.replaceState({}, "", `/history/${record.id}`);
    render(<ApplicationRoutes repository={repository} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume as new count" }));
    fireEvent.click(await screen.findByRole("button", { name: "Replace draft" }));
    await waitFor(() => expect(delayed).toHaveBeenCalled());
    await other.saveCountDraft({ quantities: { "usd:1": "42" }, note: "Newer", selectedCurrencies: ["usd"] }, "other-revision", before?.revision);
    const newer = JSON.stringify(await other.getCountDraft());
    await act(async () => { release(); });
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(JSON.stringify(await other.getCountDraft())).toBe(newer);
    expect(JSON.stringify(await other.getCount(record.id))).toBe(original);
    repository.close(); other.close();
  });

  it("preserves both owners' draft and saved history after an actual replacement transaction abort", async () => {
    const indexedDB = new IDBFactory();
    const databaseName = crypto.randomUUID();
    const repository = new IndexedDbRepository({ indexedDB, databaseName });
    const other = new IndexedDbRepository({ indexedDB, databaseName });
    await repository.saveCurrencyConfigurations([dollar]);
    const record = await repository.saveCount({ snapshots: calculateCountSnapshots([dollar], { usd: { "1": 3 } }) });
    await repository.saveCountDraft({ quantities: { "usd:1": "7" }, note: "Original draft", selectedCurrencies: ["usd"] });
    const beforeDraft = await other.getCountDraft();
    const beforeHistory = await other.listCounts();
    window.history.replaceState({}, "", `/history/${record.id}`);
    render(<ApplicationRoutes repository={repository} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume as new count" }));
    await screen.findByRole("alertdialog", { name: "Replace unfinished count?" });
    const put = IDBObjectStore.prototype.put;
    let aborted = false;
    const spy = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      const request = put.call(this, value, key);
      if ((value as { version?: number })?.version === 4) { aborted = true; this.transaction.abort(); }
      return request;
    });
    fireEvent.click(screen.getByRole("button", { name: "Replace draft" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Could not resume the count. Your draft and saved count were kept. Refresh and try again.");
    expect(aborted).toBe(true);
    expect(screen.queryByLabelText("$1 quantity")).toBeNull();
    expect(await other.getCountDraft()).toEqual(beforeDraft);
    expect(await other.listCounts()).toEqual(beforeHistory);
    expect(await repository.getCountDraft()).toEqual(beforeDraft);
    spy.mockRestore(); repository.close(); other.close();
  });

  it.each(["unchanged", "changed"]) ("copies the historical configuration when current settings are %s", async (mode) => {
    const indexedDB = new IDBFactory();
    let sequence = 0;
    const repository = new IndexedDbRepository({ indexedDB, databaseName: crypto.randomUUID(), createId: () => `item-${++sequence}` });
    await repository.saveCurrencyConfigurations([dollar, euro]);
    const original = await repository.saveCount({ snapshots: calculateCountSnapshots([dollar, euro], { usd: { "1": 3, "5": 2 }, eur: { "2": 4 } }), title: "Original" });
    if (mode === "changed") await repository.saveCurrencyConfigurations([{ ...dollar, name: "New dollar", symbol: "£", denominations: [10] }]);
    window.history.replaceState({}, "", `/history/${original.id}`);
    const view = render(<ApplicationRoutes repository={repository} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume as new count" }));
    expect(await screen.findByLabelText("$1 quantity")).toHaveProperty("value", "3");
    expect(screen.getByLabelText("$5 quantity")).toHaveProperty("value", "2");
    expect(screen.getByLabelText("€2 quantity")).toHaveProperty("value", "4");
    expect(screen.queryByLabelText("£10 quantity")).toBeNull();
    view.unmount();
    render(<ApplicationRoutes repository={repository} />);
    expect(await screen.findByLabelText("€2 quantity")).toHaveProperty("value", "4");
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    await screen.findByText("Count saved.");
    expect((await repository.getCount("item-2"))?.snapshots).toEqual(original.snapshots);
    expect(await repository.getCount(original.id)).toEqual(original);
    repository.close();
  });

  it("preserves a version-one draft with invalid values when replacement is canceled", async () => {
    const indexedDB = new IDBFactory();
    const databaseName = crypto.randomUUID();
    const repository = new IndexedDbRepository({ indexedDB, databaseName });
    await repository.saveCurrencyConfigurations([dollar]);
    const original = await repository.saveCount({ snapshots: calculateCountSnapshots([dollar], {}) });
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const legacy = { key: "count-draft", version: 1, draft: { quantities: { "usd:1": "invalid" }, note: "Legacy", selectedCurrencies: ["usd"] } };
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("settings", "readwrite");
      transaction.objectStore("settings").put(legacy);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    const before = await repository.getCountDraft();
    window.history.replaceState({}, "", `/history/${original.id}`);
    render(<ApplicationRoutes repository={repository} />);
    fireEvent.click(await screen.findByRole("button", { name: "Resume as new count" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(await repository.getCountDraft()).toEqual(before);
    expect(await repository.getCount(original.id)).toEqual(original);
    db.close(); repository.close();
  });

  it("shows the latest saved snapshot and per-currency local statistics", async () => {
    render(<ApplicationRoutes repository={await historyRepository()} />);

    await screen.findByText("Latest count");
    expect(screen.getByRole("heading", { name: "Latest count" })).toBeTruthy();
    expect(screen.getByText("$6 USD")).toBeTruthy();
    expect(screen.getByText("New count", { selector: ".dashboard-card strong" })).toBeTruthy();
    expect(screen.getByText("USD: 2 counts")).toBeTruthy();
    expect(screen.getByText("EUR: 1 count")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Local statistics" })).queryByText(/JPY/)).toBeNull();
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

  it("renders approved History cards while preserving newest-first record links and independent subtotals", async () => {
    const repository = await historyRepository();
    window.history.replaceState({}, "", "/history");
    render(<ApplicationRoutes repository={repository} />);

    const list = await screen.findByRole("list", { name: "Saved local counts" });
    expect(list.classList.contains("history-list")).toBe(true);
    const cards = list.querySelectorAll(".history-record-card");
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector("time")?.dateTime).toBe("2026-10-12T12:00:00.000Z");
    expect(cards[0].querySelector("time")?.textContent).toBe(new Intl.DateTimeFormat("en", { dateStyle: "short", timeStyle: "short" }).format(new Date("2026-10-12T12:00:00.000Z")));
    expect(cards[0].querySelectorAll(".history-subtotals li")).toHaveLength(1);
    expect(cards[1].querySelectorAll(".history-subtotals li")).toHaveLength(2);
    const link = within(cards[0] as HTMLElement).getByRole("link", { name: /View count/ });
    expect(link.getAttribute("href")).toBe("/history/count-2");
    expect(link.textContent).not.toContain("count-2");
  });

  it("renders the approved empty History state with a count action", async () => {
    const repository = new IndexedDbRepository({
      databaseName: crypto.randomUUID(),
      indexedDB: new IDBFactory(),
    });
    await repository.saveCurrencyConfigurations([dollar]);
    window.history.replaceState({}, "", "/history");
    render(<ApplicationRoutes repository={repository} />);

    const emptyState = await screen.findByRole("region", { name: "No saved counts yet" });
    expect(emptyState.classList.contains("history-empty-state")).toBe(true);
    expect(screen.getByRole("link", { name: "Start a count" }).getAttribute("href"))
      .toBe("/count/new");
  });

  it("renders immutable denomination entries, timestamp, subtotals, and current note", async () => {
    const repository = await historyRepository();
    await repository.updateCountNote("count-1", "Updated current note");
    window.history.replaceState({}, "", "/history/count-1");
    render(<ApplicationRoutes repository={repository} />);

    expect(await screen.findByRole("table", { name: "US dollar (USD)" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader", { name: "Denomination" })[0]).toBeTruthy();
    expect(screen.getByText("Total: $13 USD")).toBeTruthy();
    expect(screen.getByText("Total: €8 EUR")).toBeTruthy();
    expect(screen.getAllByRole("columnheader", { name: "Subtotal" })).toHaveLength(2);
    expect(screen.queryByText("Updated current note")).toBeNull();
    expect(screen.getByRole("heading", { name: "New count" })).toBeTruthy();
    expect(screen.getByText(new Intl.DateTimeFormat("en", { dateStyle: "short", timeStyle: "short" }).format(new Date("2026-10-12T10:00:00.000Z"))).tagName).toBe("TIME");
    expect(screen.queryByText(/JPY|1000/)).toBeNull();
    expectNeutralLanguage();
  });

  it("cancels deletion without changing the selected count", async () => {
    const repository = await historyRepository();
    window.history.replaceState({}, "", "/history/count-1");
    render(<ApplicationRoutes repository={repository} />);
    await screen.findByRole("heading", { name: "Count details" });

    fireEvent.click(await screen.findByRole("button", { name: "Delete this count" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete this count?" });
    expect(dialog).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cancel deletion" }),
    ));
    fireEvent.click(screen.getByRole("button", { name: "Cancel deletion" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Delete this count" }),
    ));
    expect(await repository.getCount("count-1")).toBeTruthy();
  });

  it("confirms deletion for only the selected count and announces success", async () => {
    const repository = await historyRepository();
    window.history.replaceState({}, "", "/history/count-1");
    render(<ApplicationRoutes repository={repository} />);
    await screen.findByRole("heading", { name: "Count details" });

    fireEvent.click(await screen.findByRole("button", { name: "Delete this count" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));

    const status = await screen.findByRole("status");
    expect(status.textContent).toBe("Count deleted.");
    await waitFor(() => expect(document.activeElement).toBe(status));
    expect(await repository.getCount("count-1")).toBeUndefined();
    expect(await repository.getCount("count-2")).toBeTruthy();
  });

  it("announces a deletion error and leaves the count available", async () => {
    const repository = await historyRepository();
    const failure = vi.spyOn(repository, "deleteCount").mockRejectedValueOnce(new Error("failed"));
    window.history.replaceState({}, "", "/history/count-1");
    render(<ApplicationRoutes repository={repository} />);
    await screen.findByRole("heading", { name: "Count details" });

    fireEvent.click(await screen.findByRole("button", { name: "Delete this count" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "Could not delete the count. Try again.",
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(alert));
    expect(failure).toHaveBeenCalledWith("count-1");
    expect(await repository.getCount("count-1")).toBeTruthy();
  });

  it("renders the approved settings repair hierarchy and field-level validation without persistence", async () => {
    const repository = await historyRepository();
    window.history.replaceState({}, "", "/settings");
    render(<ApplicationRoutes repository={repository} />);
    await screen.findByRole("heading", { name: "Settings" });

    const page = screen.getByRole("heading", { name: "Settings" }).closest<HTMLElement>(".settings-page");
    expect(page).toBeTruthy();
    expect(within(page!).getByText("Local settings").classList.contains("eyebrow")).toBe(true);
    expect(within(page!).getByText(
      "Edit the currencies and positive whole-number denominations used by future counts.",
    ).classList.contains("settings-intro")).toBe(true);
    const denominations = screen.getByLabelText("Denominations (semicolon separated)");
    fireEvent.change(denominations, { target: { value: "5; 5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    const error = await screen.findByText("Denominations must be unique.");
    expect(error.classList.contains("field-error")).toBe(true);
    expect(denominations.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("button", { name: "Add another currency" }).parentElement?.classList
      .contains("settings-actions")).toBe(true);
    expect(await repository.getCurrencyConfigurations()).toHaveLength(1);
  });

  it("renders the approved destructive final-reset hierarchy while retaining safe cancellation", async () => {
    const repository = await historyRepository();
    render(<ApplicationRoutes repository={repository} />);
    await screen.findByRole("heading", { name: "Dashboard" });

    fireEvent.click(await screen.findByRole("button", { name: "Reset all local data" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue reset" }));
    const dialog = screen.getByRole("alertdialog", { name: "Final reset confirmation" });
    expect(dialog.classList.contains("confirmation--reset")).toBe(true);
    expect(within(dialog).getByText("Local data").classList.contains("danger-kicker")).toBe(true);
    expect(within(dialog).getByRole("button", { name: "Cancel reset" }).parentElement?.classList
      .contains("dialog-actions")).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(
      within(dialog).getByRole("button", { name: "Cancel reset" }),
    ));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel reset" }));

    expect(await repository.getCurrencyConfigurations()).toHaveLength(1);
    expect(await repository.listCounts()).toHaveLength(2);
  });

  it("cancels reset at either confirmation without changing settings or counts", async () => {
    const repository = await historyRepository();
    render(<ApplicationRoutes repository={repository} />);
    await screen.findByRole("heading", { name: "Dashboard" });

    fireEvent.click(await screen.findByRole("button", { name: "Reset all local data" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel reset" }));
    await waitFor(() => expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Reset all local data" }),
    ));
    expect(await repository.getCurrencyConfigurations()).toHaveLength(1);
    expect(await repository.listCounts()).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Reset all local data" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue reset" }));
    expect(screen.getByRole("alertdialog", { name: "Final reset confirmation" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel reset" }));

    await waitFor(() => expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Reset all local data" }),
    ));
    expect(await repository.getCurrencyConfigurations()).toHaveLength(1);
    expect(await repository.listCounts()).toHaveLength(2);
  });

  it("clears settings and counts after both reset confirmations and returns to onboarding", async () => {
    const repository = await historyRepository();
    render(<ApplicationRoutes repository={repository} />);
    await screen.findByRole("heading", { name: "Dashboard" });

    fireEvent.click(await screen.findByRole("button", { name: "Reset all local data" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));

    await waitFor(async () => expect((await repository.getCurrencyConfigurations()).map((currency) => currency.code)).toEqual(["USD", "CUP"]));
    expect(await repository.listCounts()).toEqual([]);
    expect(screen.getByRole("status").textContent).toBe("All local data was reset.");
    expect(screen.queryByRole("link", { name: "View latest count" })).toBeNull();
    expect(screen.getByText("0 saved counts")).toBeTruthy();
  });

  it("clears retained configuration drafts after a confirmed reset", async () => {
    const repository = new IndexedDbRepository({
      databaseName: crypto.randomUUID(),
      indexedDB: new IDBFactory(),
    });
    window.history.replaceState({}, "", "/onboarding");
    render(<ApplicationRoutes repository={repository} />);
    await screen.findByRole("heading", { name: "Set up CYNDY" });

    fireEvent.change(screen.getByLabelText("Currency name"), { target: { value: "US dollar" } });
    fireEvent.change(screen.getByLabelText("Symbol"), { target: { value: "$" } });
    fireEvent.change(screen.getByLabelText("Currency code"), { target: { value: "USD" } });
    fireEvent.change(screen.getByLabelText("Denominations (semicolon separated)"), {
      target: { value: "1; 5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));
    await screen.findByRole("heading", { name: "Dashboard" });

    fireEvent.click(await screen.findByRole("button", { name: "Reset all local data" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));

    await waitFor(async () => expect((await repository.getCurrencyConfigurations()).map((currency) => currency.code)).toEqual(["USD", "CUP"]));
    expect(await repository.listCounts()).toEqual([]);
  });

  it("announces a reset error without leaving the configured dashboard", async () => {
    const repository = await historyRepository();
    vi.spyOn(repository, "resetAll").mockRejectedValueOnce(new Error("failed"));
    render(<ApplicationRoutes repository={repository} />);

    fireEvent.click(await screen.findByRole("button", { name: "Reset all local data" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "Could not reset local data. Try again.",
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(alert));
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy();
    expect(await repository.getCurrencyConfigurations()).toHaveLength(1);
    expect(await repository.listCounts()).toHaveLength(2);
  });
});
