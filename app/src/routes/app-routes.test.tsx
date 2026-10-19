import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { CurrencyConfiguration } from "../domain/validation";
import { IndexedDbRepository } from "../storage/indexed-db-repository";
import {
  ApplicationRoutes,
  type ConfigurationFormValues,
  resolveRoute,
  submitConfiguration,
} from "./app-routes";

const validConfiguration: CurrencyConfiguration = {
  id: "usd", name: "US dollar", symbol: "$", code: "USD", denominations: [1, 5],
};
const secondConfiguration: CurrencyConfiguration = {
  id: "eur", name: "Euro", symbol: "€", code: "EUR", denominations: [2, 5],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

function repository() {
  return new IndexedDbRepository({
    databaseName: crypto.randomUUID(), indexedDB: new IDBFactory(),
  });
}

function routeRepository(configurations: readonly CurrencyConfiguration[] = []) {
  return {
    getCurrencyConfigurations: vi.fn().mockResolvedValue(configurations),
    saveCurrencyConfigurations: vi.fn().mockResolvedValue(undefined),
    saveCount: vi.fn().mockResolvedValue(undefined),
    listCounts: vi.fn().mockResolvedValue([]),
    getLatestCount: vi.fn().mockResolvedValue(undefined),
  } as unknown as IndexedDbRepository;
}

function validValues(): ConfigurationFormValues {
  return { name: "US dollar", symbol: "$", code: "USD", denominations: "1, 5" };
}

function fill(values: ConfigurationFormValues) {
  fireEvent.change(screen.getByLabelText("Currency name"), { target: { value: values.name } });
  fireEvent.change(screen.getByLabelText("Symbol"), { target: { value: values.symbol } });
  fireEvent.change(screen.getByLabelText("Currency code"), { target: { value: values.code } });
  fireEvent.change(screen.getByLabelText("Denominations (comma separated)"), {
    target: { value: values.denominations },
  });
}

describe("configuration routes", () => {
  it.each(["/", "/count/new"])("renders guarded %s with replacement and focused status", async (path) => {
    window.history.replaceState({}, "", path);
    const replace = vi.spyOn(window.history, "replaceState");
    render(<ApplicationRoutes repository={routeRepository()} />);

    await screen.findByRole("heading", { name: "Set up CYNDY" });
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Add a valid currency before starting a count.");
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith({}, "", "/onboarding?reason=configuration");
      expect(document.activeElement).toBe(status);
    });
  });

  it("blocks navigation until every configured currency is valid", () => {
    const invalid = { ...validConfiguration, code: "" };
    const duplicate = { ...secondConfiguration, id: "usd", code: " usd " };
    expect(resolveRoute("/", [validConfiguration, invalid]).page).toBe("onboarding");
    expect(resolveRoute("/count/new", [validConfiguration, invalid]).page).toBe("onboarding");
    expect(resolveRoute("/count/new", [validConfiguration, duplicate]).page).toBe("onboarding");
    expect(resolveRoute("/", [validConfiguration]).page).toBe("dashboard");
  });

  it("retains invalid input and identifies the invalid field", async () => {
    const store = routeRepository();
    window.history.replaceState({}, "", "/onboarding");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "Set up CYNDY" });
    fill({ ...validValues(), denominations: "5, 1.5" });
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));

    expect(await screen.findByText("Denominations must be positive integers.")).toBeTruthy();
    expect(screen.getByLabelText("Denominations (comma separated)")).toHaveProperty("value", "5, 1.5");
    expect(store.saveCurrencyConfigurations).not.toHaveBeenCalled();
  });

  it("shows one correct error for an empty currency code", async () => {
    const result = await submitConfiguration(repository(), { ...validValues(), code: "" });
    expect(result.issues).toEqual([{ field: "code", message: "code is required" }]);
  });

  it("shows focused feedback and retains input when saving fails", async () => {
    const store = routeRepository();
    vi.mocked(store.saveCurrencyConfigurations).mockRejectedValueOnce(new Error("disk failure"));
    window.history.replaceState({}, "", "/onboarding");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "Set up CYNDY" });
    fill(validValues());
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Could not save local settings. Try again.");
    await waitFor(() => expect(document.activeElement).toBe(alert));
    expect(screen.getByLabelText("Currency code")).toHaveProperty("value", "USD");
    expect(window.location.pathname).toBe("/onboarding");
  });

  it("clears stale field errors when a corrected configuration cannot be saved", async () => {
    const store = routeRepository();
    window.history.replaceState({}, "", "/onboarding");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "Set up CYNDY" });
    fill({ ...validValues(), denominations: "1.5" });
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));
    expect(await screen.findByText("Denominations must be positive integers.")).toBeTruthy();

    vi.mocked(store.saveCurrencyConfigurations).mockRejectedValueOnce(new Error("disk failure"));
    fill(validValues());
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));

    const alert = await screen.findByText("Could not save local settings. Try again.");
    expect(screen.queryByText("Denominations must be positive integers.")).toBeNull();
    expect(screen.getByLabelText("Denominations (comma separated)").getAttribute("aria-invalid")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(alert));
  });

  it("replaces indefinite loading with focused read-failure feedback", async () => {
    const store = routeRepository();
    vi.mocked(store.getCurrencyConfigurations).mockRejectedValueOnce(new Error("read failure"));
    render(<ApplicationRoutes repository={store} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Could not load local settings. Refresh and try again.");
    await waitFor(() => expect(document.activeElement).toBe(alert));
    expect(screen.queryByText("Loading local settings…")).toBeNull();
  });

  it("renders focused feedback when IndexedDB is unavailable during startup", async () => {
    render(<App createRepository={() => { throw new Error("IndexedDB is unavailable"); }} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Could not load local settings. Refresh and try again.");
    await waitFor(() => expect(document.activeElement).toBe(alert));
  });

  it("permits onboarding to save two active currencies", async () => {
    const store = routeRepository();
    window.history.replaceState({}, "", "/onboarding");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "Set up CYNDY" });
    fill(validValues());
    fireEvent.click(screen.getByRole("button", { name: "Add another currency" }));
    const names = screen.getAllByLabelText("Currency name");
    const symbols = screen.getAllByLabelText("Symbol");
    const codes = screen.getAllByLabelText("Currency code");
    const denominations = screen.getAllByLabelText("Denominations (comma separated)");
    fireEvent.change(names[1], { target: { value: "Euro" } });
    fireEvent.change(symbols[1], { target: { value: "€" } });
    fireEvent.change(codes[1], { target: { value: "EUR" } });
    fireEvent.change(denominations[1], { target: { value: "2, 5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy());
    expect(store.saveCurrencyConfigurations).toHaveBeenCalledWith([
      validConfiguration, secondConfiguration,
    ]);
    expect(window.location.pathname).toBe("/");
  });

  it("rejects duplicate currency codes after trimming and case normalization", async () => {
    const store = routeRepository();
    window.history.replaceState({}, "", "/onboarding");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "Set up CYNDY" });
    fill(validValues());
    fireEvent.click(screen.getByRole("button", { name: "Add another currency" }));
    const names = screen.getAllByLabelText("Currency name");
    const symbols = screen.getAllByLabelText("Symbol");
    const codes = screen.getAllByLabelText("Currency code");
    const denominations = screen.getAllByLabelText("Denominations (comma separated)");
    fireEvent.change(names[1], { target: { value: "Duplicate dollar" } });
    fireEvent.change(symbols[1], { target: { value: "US$" } });
    fireEvent.change(codes[1], { target: { value: " usd " } });
    fireEvent.change(denominations[1], { target: { value: "1, 10" } });
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));

    expect(await screen.findAllByText("Currency codes must be unique.")).toHaveLength(2);
    expect(store.saveCurrencyConfigurations).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/onboarding");
  });

  it("keeps settings available to repair an invalid stored configuration", async () => {
    const invalid = { ...validConfiguration, denominations: [] };
    window.history.replaceState({}, "", "/settings");
    render(<ApplicationRoutes repository={routeRepository([invalid])} />);

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeTruthy();
    expect(screen.getByLabelText("Currency name")).toHaveProperty("value", "US dollar");
    expect(screen.getByLabelText("Denominations (comma separated)")).toHaveProperty("value", "");
    expect(window.location.pathname).toBe("/settings");
  });

  it("saves settings for later counts without changing saved snapshots", async () => {
    const store = repository();
    await store.saveCurrencyConfigurations([validConfiguration]);
    const saved = await store.saveCount({ snapshots: [{
      currencyId: "usd", name: "US dollar", symbol: "$", code: "USD",
      entries: [{ denomination: 1, quantity: 3, total: 3 }], subtotal: 3,
    }] });
    window.history.replaceState({}, "", "/settings");
    const view = render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "Settings" });
    fireEvent.change(screen.getByLabelText("Denominations (comma separated)"), {
      target: { value: "10, 20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    const status = await screen.findByRole("status");
    expect(status.textContent).toBe("Settings saved.");
    await waitFor(() => expect(document.activeElement).toBe(status));
    expect((await store.getCount(saved.id))?.snapshots).toEqual(saved.snapshots);
    view.unmount();
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "New count" });
    expect(screen.getByLabelText("$10 quantity")).toBeTruthy();
    expect(screen.queryByLabelText("$1 quantity")).toBeNull();
  });

  it("retains invalid settings, links errors, and does not touch count persistence", async () => {
    const store = routeRepository([validConfiguration]);
    window.history.replaceState({}, "", "/settings");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "Settings" });
    const denominations = screen.getByLabelText("Denominations (comma separated)");
    fireEvent.change(denominations, { target: { value: "5, 5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText("Denominations must be unique.")).toBeTruthy();
    expect(denominations).toHaveProperty("value", "5, 5");
    expect(denominations.getAttribute("aria-invalid")).toBe("true");
    expect(denominations.getAttribute("aria-describedby")).toBe("currency-0-denominations-error");
    await waitFor(() => expect(document.activeElement).toBe(denominations));
    expect(store.saveCurrencyConfigurations).not.toHaveBeenCalled();
    expect(store.saveCount).not.toHaveBeenCalled();
    expect(store.listCounts).not.toHaveBeenCalled();
    expect(store.getLatestCount).not.toHaveBeenCalled();
  });

  it("renders the safe not-found view for a malformed encoded history ID", async () => {
    expect(resolveRoute("/history/%", [validConfiguration])).toEqual({ page: "not-found" });
    window.history.replaceState({}, "", "/history/%");
    render(<ApplicationRoutes repository={routeRepository([validConfiguration])} />);

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getByRole("main").id).toBe("main-content");
    expect(screen.getByRole("link", { name: "Return home" }).getAttribute("href")).toBe("/");
  });
});

describe("application shell accessibility", () => {
  it.each([
    ["onboarding", "/onboarding", []],
    ["dashboard", "/", [validConfiguration]],
    ["count", "/count/new", [validConfiguration]],
  ])("keeps semantic landmarks on the %s view", async (_view, path, configurations) => {
    window.history.replaceState({}, "", path);
    render(<ApplicationRoutes repository={routeRepository(configurations)} />);

    await screen.findByRole("main");
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeTruthy();
    expect(screen.getByRole("main").id).toBe("main-content");
    expect(screen.getByRole("link", { name: "CYNDY home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "New count" }).getAttribute("href")).toBe("/count/new");
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings");
  });

  it("puts an operable skip link first in keyboard order", async () => {
    render(<ApplicationRoutes repository={routeRepository([validConfiguration])} />);
    await screen.findByRole("heading", { name: "Dashboard" });

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    const focusable = document.querySelectorAll("a[href], button, input, [tabindex]");
    expect(focusable[0]).toBe(skipLink);
    skipLink.focus();
    expect(document.activeElement).toBe(skipLink);
    expect(skipLink.getAttribute("href")).toBe("#main-content");
    const main = screen.getByRole("main");
    expect(main.tabIndex).toBe(-1);
    fireEvent.click(skipLink);
    expect(document.activeElement).toBe(main);
  });

  it("uses native keyboard-operable controls with accessible names", async () => {
    window.history.replaceState({}, "", "/onboarding");
    render(<ApplicationRoutes repository={routeRepository()} />);
    await screen.findByRole("heading", { name: "Set up CYNDY" });

    expect(screen.getByRole("button", { name: "Add another currency" }).tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: "Save configuration" }).tagName).toBe("BUTTON");
    expect(screen.getByLabelText("Currency name").tagName).toBe("INPUT");
  });
});

describe("new count route", () => {
  it("saves two independent currency snapshots with an automatic timestamp and note", async () => {
    const store = new IndexedDbRepository({
      databaseName: crypto.randomUUID(),
      indexedDB: new IDBFactory(),
      createId: () => "count-1",
      now: () => new Date("2026-10-13T15:00:00.000Z"),
    });
    await store.saveCurrencyConfigurations([validConfiguration, secondConfiguration]);
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={store} />);

    await screen.findByRole("heading", { name: "New count" });
    fireEvent.change(screen.getByLabelText("$1 quantity"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("$5 quantity"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("€2 quantity"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("€5 quantity"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: "Morning count" } });

    const dollars = screen.getByRole("group", { name: "US dollar (USD)" });
    const euros = screen.getByRole("group", { name: "Euro (EUR)" });
    expect(within(dollars).getByText("$1 ×")).toBeTruthy();
    expect(within(dollars).getByText("= $3")).toBeTruthy();
    expect(within(dollars).getByText("= $10")).toBeTruthy();
    expect(within(dollars).getByText("$13 USD")).toBeTruthy();
    expect(within(euros).getByText("= €8")).toBeTruthy();
    expect(within(euros).getByText("= €5")).toBeTruthy();
    expect(within(euros).getByText("€13 EUR")).toBeTruthy();
    expect(within(dollars).queryByRole("status")).toBeNull();
    const quantity = screen.getByLabelText("$1 quantity");
    expect(quantity.getAttribute("type")).toBe("number");
    expect(quantity.getAttribute("min")).toBe("0");
    expect(quantity.getAttribute("step")).toBe("1");
    expect(quantity.getAttribute("inputmode")).toBe("numeric");
    expect(document.body.textContent).not.toMatch(/combined total|conversion|exchange|receipt|reconciliation/i);
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    expect((await screen.findByRole("status")).textContent).toBe("Count saved.");

    expect(await store.getCount("count-1")).toEqual({
      id: "count-1",
      createdAt: "2026-10-13T15:00:00.000Z",
      note: "Morning count",
      snapshots: [
        {
          currencyId: "usd", name: "US dollar", symbol: "$", code: "USD",
          entries: [
            { denomination: 1, quantity: 3, total: 3 },
            { denomination: 5, quantity: 2, total: 10 },
          ],
          subtotal: 13,
        },
        {
          currencyId: "eur", name: "Euro", symbol: "€", code: "EUR",
          entries: [
            { denomination: 2, quantity: 4, total: 8 },
            { denomination: 5, quantity: 1, total: 5 },
          ],
          subtotal: 13,
        },
      ],
    });
  });

  it.each(["-1", "1.5", "9007199254740992"])("rejects invalid quantity %s", async (quantity) => {
    const store = routeRepository([validConfiguration, secondConfiguration]);
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "New count" });
    const input = screen.getByLabelText("$1 quantity");
    fireEvent.change(input, { target: { value: quantity } });
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Quantities must be non-negative integers.",
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain("usd:1-error");
    expect(store.saveCount).not.toHaveBeenCalled();
  });

  it("clears only the unsaved draft and transient feedback without persistence", async () => {
    const store = routeRepository([validConfiguration, secondConfiguration]);
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "New count" });
    const invalidQuantity = screen.getByLabelText("$1 quantity");
    const secondInvalidQuantity = screen.getByLabelText("€2 quantity");
    const note = screen.getByLabelText("Note (optional)");
    fireEvent.change(invalidQuantity, { target: { value: "-1" } });
    fireEvent.change(secondInvalidQuantity, { target: { value: "1.5" } });
    fireEvent.change(note, { target: { value: "Unsaved note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(invalidQuantity.getAttribute("aria-invalid")).toBe("true");
    expect(secondInvalidQuantity.getAttribute("aria-invalid")).toBe("true");
    expect(invalidQuantity.getAttribute("aria-describedby")).toContain("usd:1-error");
    expect(screen.getAllByText("Enter a non-negative whole number within the safe integer range.")).toHaveLength(2);

    const clear = screen.getByRole("button", { name: "Clear unsaved count" });
    clear.focus();
    fireEvent.click(clear);

    expect(invalidQuantity).toHaveProperty("value", "");
    expect(secondInvalidQuantity).toHaveProperty("value", "");
    expect(invalidQuantity.getAttribute("aria-invalid")).toBeNull();
    expect(note).toHaveProperty("value", "");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getAllByText(/= [$€]0/)).toHaveLength(4);
    expect(document.activeElement).toBe(clear);
    expect(store.saveCount).not.toHaveBeenCalled();
    expect(store.saveCurrencyConfigurations).not.toHaveBeenCalled();
  });
});
