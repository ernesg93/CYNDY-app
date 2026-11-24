import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, expect, it } from "vitest";
import { IndexedDbRepository } from "../storage/indexed-db-repository";
import { ApplicationRoutes } from "./app-routes";
import { ReceiptView } from "../receipts/receipt-view";

afterEach(() => { cleanup(); window.localStorage.removeItem("cyndy.locale"); window.history.replaceState({}, "", "/"); });

it("groups quantities while editing, keeps caret and saves numeric values", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "Dollar", code: "USD", symbol: "$", denominations: [1000] }]);
  window.localStorage.setItem("cyndy.locale", "en");
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1,000 quantity") as HTMLInputElement;
  expect(input.inputMode).toBe("numeric");
  fireEvent.change(input, { target: { value: "1000000", selectionStart: 7, selectionEnd: 7 } });
  expect(input.value).toBe("1,000,000");
  expect(input.selectionStart).toBe(9);
  expect(screen.getByText("1,000,000,000", { selector: ".denomination-subtotal" })).toBeTruthy();
  expect(screen.getByText("$ 1,000,000,000 USD")).toBeTruthy();
  input.setSelectionRange(2, 2);
  fireEvent.change(input, { target: { value: "1,2000,000", selectionStart: 3, selectionEnd: 3 } });
  expect(input.value).toBe("12,000,000");
  expect(input.selectionStart).toBe(2);
  fireEvent.click(screen.getByRole("button", { name: "Save count" }));
  await screen.findByText("Count saved.");
  expect((await store.listCounts())[0].snapshots[0].entries[0].quantity).toBe(12000000);
  store.close();
});

it("deletes digits across separators and replaces a selection while retaining the caret", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "Dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.localStorage.setItem("cyndy.locale", "en");
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1 quantity") as HTMLInputElement;
  expect(input.inputMode).toBe("numeric");
  fireEvent.change(input, { target: { value: "1234567" } });
  input.setSelectionRange(2, 2);
  fireEvent.keyDown(input, { key: "Backspace" });
  expect(input.value).toBe("234,567");
  expect(input.selectionStart).toBe(0);
  fireEvent.change(input, { target: { value: "1234567" } });
  input.setSelectionRange(1, 1);
  fireEvent.keyDown(input, { key: "Delete" });
  expect(input.value).toBe("134,567");
  expect(input.selectionStart).toBe(1);
  fireEvent.change(input, { target: { value: "1234567" } });
  fireEvent.input(input, { inputType: "deleteContentBackward", target: { value: "1234,567", selectionStart: 1, selectionEnd: 1 } });
  expect(input.value).toBe("234,567");
  expect(input.selectionStart).toBe(0);
  fireEvent.change(input, { target: { value: "1234567" } });
  fireEvent.input(input, { inputType: "deleteContentForward", target: { value: "1234,567", selectionStart: 1, selectionEnd: 1 } });
  expect(input.value).toBe("134,567");
  expect(input.selectionStart).toBe(1);
  fireEvent.change(input, { target: { value: "1234567" } });
  input.setSelectionRange(2, 5);
  fireEvent.change(input, { target: { value: "1,9567", selectionStart: 3, selectionEnd: 3 } });
  expect(input.value).toBe("19,567");
  expect(input.selectionStart).toBe(2);
  fireEvent.click(screen.getByRole("button", { name: "Save count" }));
  await screen.findByText("Count saved.");
  expect((await store.listCounts())[0].snapshots[0].entries[0].quantity).toBe(19567);
  store.close();
});

it.each(["deleteContentBackward", "deleteContentForward"])("preserves digits when a selected separator is removed by %s", async (inputType) => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "Dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.localStorage.setItem("cyndy.locale", "en");
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1 quantity") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "1234" } });
  input.focus();
  input.setSelectionRange(1, 2);
  fireEvent.select(input);
  fireEvent.input(input, { inputType, target: { value: "1234", selectionStart: 1, selectionEnd: 1 } });
  expect(input.value).toBe("1,234");
  expect(input.selectionStart).toBe(1);
  fireEvent.click(screen.getByRole("button", { name: "Save count" }));
  await screen.findByText("Count saved.");
  expect((await store.listCounts())[0].snapshots[0].entries[0].quantity).toBe(1234);
  store.close();
});

it("edits existing settings as a grouped semicolon-delimited list and preserves stored values", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "Dollar", code: "USD", symbol: "$", denominations: [1000, 1] }]);
  window.localStorage.setItem("cyndy.locale", "en");
  window.history.replaceState({}, "", "/settings");
  render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("Denominations (semicolon separated)") as HTMLInputElement;
  expect(input.value).toBe("1,000; 1");
  fireEvent.change(input, { target: { value: "1,000; 1; 20,000" } });
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  await screen.findByText("Settings saved.");
  expect((await store.getCurrencyConfigurations())[0].denominations).toEqual([1000, 1, 20000]);
  fireEvent.change(input, { target: { value: "1,00; 2" } });
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  expect(await screen.findByText("Denominations must be positive integers.")).toBeTruthy();
  expect((await store.getCurrencyConfigurations())[0].denominations).toEqual([1000, 1, 20000]);
  store.close();
});

it("groups denominations while typing and preserves caret across edits and separators", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "Dollar", code: "USD", symbol: "$", denominations: [1000, 1] }]);
  window.localStorage.setItem("cyndy.locale", "en");
  window.history.replaceState({}, "", "/settings");
  render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("Denominations (semicolon separated)") as HTMLInputElement;
  expect(input.value).toBe("1,000; 1");
  fireEvent.change(input, { target: { value: "10000; 1", selectionStart: 5, selectionEnd: 5 } });
  expect(input.value).toBe("10,000; 1");
  expect(input.selectionStart).toBe(6);
  fireEvent.change(input, { target: { value: "10,000; 1234", selectionStart: 12, selectionEnd: 12 } });
  expect(input.value).toBe("10,000; 1,234");
  expect(input.selectionStart).toBe(13);
  input.setSelectionRange(3, 3);
  fireEvent.keyDown(input, { key: "Backspace" });
  expect(input.value).toBe("1,000; 1,234");
  expect(input.selectionStart).toBe(1);
  fireEvent.input(input, { inputType: "insertText", data: "9", target: { value: "1,9000; 1,234", selectionStart: 3, selectionEnd: 3 } });
  expect(input.value).toBe("19,000; 1,234");
  expect(input.selectionStart).toBe(2);
  input.setSelectionRange(2, 2);
  fireEvent.keyDown(input, { key: "Delete" });
  expect(input.value).toBe("1,900; 1,234");
  expect(input.selectionStart).toBe(3);
  fireEvent.change(input, { target: { value: "1,000; 5678", selectionStart: 11, selectionEnd: 11 } });
  expect(input.value).toBe("1,000; 5,678");
  expect(input.selectionStart).toBe(12);
  fireEvent.change(input, { target: { value: "1,000 5,678", selectionStart: 6, selectionEnd: 6 } });
  expect(input.value).toBe("1,000 5,678");
  fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
  expect(await screen.findByText("Denominations must be positive integers.")).toBeTruthy();
  expect((await store.getCurrencyConfigurations())[0].denominations).toEqual([1000, 1]);
  store.close();
});

it("accepts grouped semicolon denominations in onboarding", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  window.localStorage.setItem("cyndy.locale", "en");
  window.history.replaceState({}, "", "/onboarding");
  render(<ApplicationRoutes repository={store} />);
  fireEvent.change(await screen.findByLabelText("Currency name"), { target: { value: "Dollar" } });
  fireEvent.change(screen.getByLabelText("Symbol"), { target: { value: "$" } });
  fireEvent.change(screen.getByLabelText("Currency code"), { target: { value: "USD" } });
  fireEvent.change(screen.getByLabelText("Denominations (semicolon separated)"), { target: { value: "1,000; 1" } });
  fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));
  await screen.findByRole("heading", { name: "Dashboard" });
  expect((await store.getCurrencyConfigurations())[0].denominations).toEqual([1000, 1]);
  store.close();
});

it("rejects invalid quantity edits without changing the previous value or subtotal", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "Dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.localStorage.setItem("cyndy.locale", "en");
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1 quantity") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "1234" } });
  for (const value of ["1,234a", "12.34", "1,2x34", "-1234"]) {
    fireEvent.change(input, { target: { value } });
    expect(input.value).toBe("1,234");
    expect(screen.getByText("1,234", { selector: ".denomination-subtotal" })).toBeTruthy();
  }
  fireEvent.change(input, { target: { value: "2,345" } });
  expect(input.value).toBe("2,345");
  store.close();
});

it("preserves zero, paste, caret editing and invalid rejection around default zero", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "Dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.localStorage.setItem("cyndy.locale", "en");
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1 quantity") as HTMLInputElement;
  input.focus();
  input.setSelectionRange(0, 0);
  fireEvent.input(input, { inputType: "insertText", data: "0", target: { value: "00", selectionStart: 1, selectionEnd: 1 } });
  expect(input.value).toBe("0");
  fireEvent.input(input, { inputType: "insertText", data: "9", target: { value: "90", selectionStart: 1, selectionEnd: 1 } });
  expect(input.value).toBe("9");
  expect(input.selectionStart).toBe(1);
  fireEvent.input(input, { inputType: "insertText", data: "a", target: { value: "9a", selectionStart: 2, selectionEnd: 2 } });
  expect(input.value).toBe("9");
  fireEvent.change(input, { target: { value: "0" } });
  fireEvent.input(input, { inputType: "insertFromPaste", data: "12", target: { value: "012", selectionStart: 3, selectionEnd: 3 } });
  expect(input.value).toBe("12");
  input.setSelectionRange(1, 1);
  fireEvent.input(input, { inputType: "insertText", data: "3", target: { value: "132", selectionStart: 2, selectionEnd: 2 } });
  expect(input.value).toBe("132");
  expect(input.selectionStart).toBe(2);
  store.close();
});

it.each([
  ["null data", "insertText", null, "01", 2, "1"],
  ["missing metadata", "", null, "01", 2, "1"],
  ["composition", "insertCompositionText", "1", "01", 2, "1"],
  ["replacement", "insertReplacementText", "1", "01", 2, "1"],
  ["eight inserted digits", "insertText", "12345678", "012345678", 9, "12,345,678"],
  ["eight pasted digits", "insertFromPaste", "12345678", "012345678", 9, "12,345,678"],
  ["eight digits before zero", "insertText", null, "123456780", 8, "12,345,678"],
  ["repeated zeros", "insertText", null, "000", 3, "0"],
] as const)("replaces default zero for %s", async (_label, inputType, data, value, caret, expected) => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "Dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.localStorage.setItem("cyndy.locale", "en");
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1 quantity") as HTMLInputElement;
  input.focus();
  input.setSelectionRange(1, 1);
  fireEvent.input(input, { inputType, data, target: { value, selectionStart: caret, selectionEnd: caret } });
  expect(input.value).toBe(expected);
  expect(screen.queryByText("Maximum 8 digits; the previous value was kept.")).toBeNull();
  store.close();
});

it("preserves explicit selection and rejects invalid paste and nine digits", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "Dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.localStorage.setItem("cyndy.locale", "en");
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1 quantity") as HTMLInputElement;
  input.focus();
  input.setSelectionRange(0, 1);
  fireEvent.select(input);
  fireEvent.input(input, { inputType: "insertFromPaste", data: "01", target: { value: "01", selectionStart: 2, selectionEnd: 2 } });
  expect(input.value).toBe("01");
  const accepted = fireEvent.paste(input, { clipboardData: { getData: () => "12x" } });
  expect(accepted).toBe(false);
  expect(input.value).toBe("01");
  fireEvent.change(input, { target: { value: "0" } });
  fireEvent.input(input, { inputType: "insertFromPaste", data: "123456789", target: { value: "0123456789", selectionStart: 10, selectionEnd: 10 } });
  expect(input.value).toBe("0");
  expect(screen.getByText("Maximum 8 digits; the previous value was kept.")).toBeTruthy();
  store.close();
});

it("keeps the previous quantity when an invalid out-of-range edit is rejected", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory() });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "Dollar", code: "USD", symbol: "$", denominations: [1] }]);
  window.localStorage.setItem("cyndy.locale", "en");
  window.history.replaceState({}, "", "/count/new");
  render(<ApplicationRoutes repository={store} />);
  const input = await screen.findByLabelText("$1 quantity");
  fireEvent.change(input, { target: { value: "100000000.0" } });
  expect(input).toHaveProperty("value", "0");
  expect(await store.listCounts()).toEqual([]);
  store.close();
});

it("groups saved detail, history, dashboard and receipt without rounding decimals", async () => {
  const store = new IndexedDbRepository({ databaseName: crypto.randomUUID(), indexedDB: new IDBFactory(), createId: () => "count" });
  await store.saveCurrencyConfigurations([{ id: "usd", name: "Dollar", code: "USD", symbol: "$", denominations: [1000] }]);
  const snapshot = { currencyId: "usd", name: "Dollar", code: "USD", symbol: "$", entries: [{ denomination: 1234, quantity: 1000, total: 1234000 }], subtotal: 1234000 };
  await store.saveCount({ snapshots: [snapshot] });
  window.localStorage.setItem("cyndy.locale", "en");
  window.history.replaceState({}, "", "/history/count");
  const view = render(<ApplicationRoutes repository={store} />);
  const table = await screen.findByRole("table", { name: "Dollar (USD)" });
  expect(within(table).getByText("$1,234")).toBeTruthy();
  expect(within(table).getByText("1,000")).toBeTruthy();
  expect(within(table).getByText("$1,234,000")).toBeTruthy();
  expect(screen.getByText("Total: $1,234,000 USD")).toBeTruthy();
  view.unmount();
  window.history.replaceState({}, "", "/history");
  const history = render(<ApplicationRoutes repository={store} />);
  expect(await screen.findByText("$1,234,000 USD")).toBeTruthy();
  history.unmount();
  window.history.replaceState({}, "", "/");
  const dashboard = render(<ApplicationRoutes repository={store} />);
  expect(await screen.findByText("$1,234,000 USD")).toBeTruthy();
  dashboard.unmount();
  const record = (await store.listCounts())[0];
  const decimal = { ...snapshot, entries: [{ denomination: 1234.5678, quantity: 1000, total: 1234567.8 }], subtotal: 1234567.8 };
  render(<ReceiptView record={{ ...record, snapshots: [decimal] }} destination={{ deliver: () => {} }} />);
  expect(screen.getByText("$1,234.5678 × 1,000 = $1,234,567.8")).toBeTruthy();
  expect(screen.getByText("Subtotal: $1,234,567.8 USD")).toBeTruthy();
  store.close();
});
