import { readFileSync } from "node:fs";
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
  window.localStorage.removeItem("cyndy.locale");
  window.localStorage.removeItem("cyndy.theme");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("lang");
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

describe("count title and formatted totals", () => {
  it("saves an optional title and displays grouped currency totals", async () => {
    const store = repository();
    await store.saveCurrencyConfigurations([validConfiguration]);
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "New count" });
    fireEvent.change(screen.getByLabelText("Count title"), { target: { value: "Morning cash" } });
    fireEvent.change(screen.getByLabelText("$1 quantity"), { target: { value: "12345" } });
    expect(screen.getByText("$ 12,345 USD")).toBeTruthy();
    expect(screen.queryByLabelText("Note (optional)")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    await screen.findByText("Count saved.");
    const saved = (await store.listCounts())[0];
    expect(saved.title).toBe("Morning cash");
    cleanup();
    window.history.replaceState({}, "", "/history");
    render(<ApplicationRoutes repository={store} />);
    expect(await screen.findByRole("heading", { name: "Morning cash" })).toBeTruthy();
    cleanup();
    window.history.replaceState({}, "", `/history/${saved.id}`);
    render(<ApplicationRoutes repository={store} />);
    expect(await screen.findByRole("heading", { name: "Morning cash" })).toBeTruthy();
  });
});

describe("count denomination order", () => {
  it("shows denominations from highest to lowest for each currency", async () => {
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={routeRepository([validConfiguration, secondConfiguration])} />);
    await screen.findByRole("heading", { name: "New count" });
    const fields = screen.getAllByRole("group");
    expect(within(fields[0]).getAllByRole("spinbutton").map((input) => input.getAttribute("aria-label"))).toEqual(["$5 quantity", "$1 quantity"]);
    expect(within(fields[1]).getAllByRole("spinbutton").map((input) => input.getAttribute("aria-label"))).toEqual(["€5 quantity", "€2 quantity"]);
  });
});

describe("count quantity limit", () => {
  it("reports an unsafe calculated total without saving or crashing", async () => {
    const store = routeRepository([{ ...validConfiguration, denominations: [Number.MAX_SAFE_INTEGER] }]);
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "New count" });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "2" } });
    expect(screen.getByText("The count total exceeds the supported range.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    expect(store.saveCount).not.toHaveBeenCalled();
  });

  it("accepts eight digits and prevents entering a ninth digit", async () => {
    const store = routeRepository([validConfiguration]);
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "New count" });
    const input = screen.getByLabelText("$1 quantity");
    fireEvent.change(input, { target: { value: "99999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    await screen.findByText("Count saved.");
    expect(store.saveCount).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: "999999999" } });
    expect(input).toHaveProperty("value", "99999999");
    expect(screen.getByText("Maximum 8 digits; the previous value was kept.")).toBeTruthy();
    expect(store.saveCount).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Count saved.")).toBeTruthy();
  });
});

describe("duplicate count protection", () => {
  it("blocks concurrent saves and allows an intentional identical save only after confirmation", async () => {
    const store = routeRepository([validConfiguration]);
    let finish!: () => void;
    vi.mocked(store.saveCount).mockImplementationOnce(() => new Promise((resolve) => { finish = () => resolve(undefined as never); }));
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "New count" });
    fireEvent.change(screen.getByLabelText("$1 quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toHaveProperty("disabled", true);
    fireEvent.submit(screen.getByRole("button", { name: "Saving…" }).closest("form")!);
    expect(store.saveCount).toHaveBeenCalledTimes(1);
    finish();
    await screen.findByText("Count saved.");
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    expect(screen.getByText("This count has already been saved. Save it again?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(store.saveCount).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    fireEvent.click(screen.getByRole("button", { name: "Save again" }));
    await waitFor(() => expect(store.saveCount).toHaveBeenCalledTimes(2));
  });

  it("saves changed drafts normally", async () => {
    const store = routeRepository([validConfiguration]);
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "New count" });
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    await screen.findByText("Count saved.");
    fireEvent.change(screen.getByLabelText("Count title"), { target: { value: "changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    await waitFor(() => expect(store.saveCount).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("This count has already been saved. Save it again?")).toBeNull();
  });
});

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

  it("preserves the unsaved count draft while settings are opened and saved", async () => {
    const store = routeRepository([validConfiguration]);
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "New count" });
    fireEvent.change(screen.getByLabelText("$1 quantity"), { target: { value: "-1" } });
    fireEvent.change(screen.getByLabelText("Count title"), {
      target: { value: "Unsaved note" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    expect(await screen.findByRole("alert")).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: "Settings" }));
    await screen.findByRole("heading", { name: "Settings" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("main")));
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    expect((await screen.findByRole("status")).textContent).toBe("Settings saved.");

    fireEvent.click(screen.getByRole("link", { name: "Count" }));
    await screen.findByRole("heading", { name: "New count" });
    expect(screen.getByLabelText("$1 quantity")).toHaveProperty("value", "-1");
    expect(screen.getByLabelText("Count title")).toHaveProperty("value", "Unsaved note");
    expect(screen.getByRole("alert").textContent).toBe("Quantities must be non-negative integers.");
    expect(store.saveCount).not.toHaveBeenCalled();
  });

  it("removes saved feedback when settings become dirty", async () => {
    const store = routeRepository([validConfiguration]);
    window.history.replaceState({}, "", "/settings");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "Settings" });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    expect((await screen.findByRole("status")).textContent).toBe("Settings saved.");

    fireEvent.change(screen.getByLabelText("Denominations (comma separated)"), {
      target: { value: "10, 20" },
    });

    expect(screen.queryByRole("status")).toBeNull();
    expect(store.saveCurrencyConfigurations).toHaveBeenCalledTimes(1);
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
  it("defines narrow Count-row and header reflow with readable dark-theme surfaces", () => {
    const styles = readFileSync("src/styles.css", "utf8");

    expect(styles).toMatch(/@media\s*\(max-width:\s*20rem\)\s*\{[\s\S]*?\.denomination-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+12px\s+minmax\(0,\s*1fr\);[\s\S]*?grid-template-areas:\s*["']denomination multiply quantity["']\s*["']equals equals subtotal["'];[\s\S]*?\}/);
    expect(styles).toMatch(/@media\s*\(max-width:\s*20rem\)\s*\{[\s\S]*?\.denomination-value\s*\{\s*grid-area:\s*denomination;\s*\}[\s\S]*?\.denomination-row input\s*\{\s*grid-area:\s*quantity;\s*\}[\s\S]*?\.row-operator:nth-of-type\(1\)\s*\{\s*grid-area:\s*multiply;\s*\}[\s\S]*?\.row-operator:nth-of-type\(2\)\s*\{\s*grid-area:\s*equals;\s*\}[\s\S]*?\.denomination-subtotal\s*\{\s*grid-area:\s*subtotal;\s*\}/);
    expect(styles).toMatch(/:root\[data-theme=["']dark["']\]\s+\.currency-total\s*\{\s*color:\s*#f3f7f4;\s*background:\s*#22312e;/);
    expect(styles).toMatch(/:root\[data-theme=["']dark["']\]\s+\.card\s*>\s*a:not\(\.button\)\s*\{\s*color:\s*#8ce5ca;\s*\}/);
    expect(styles).toMatch(/:root\[data-theme=["']dark["']\]\s+\.error\s*\{\s*color:\s*#ffb4ab;\s*\}/);
    expect(styles).toMatch(/:root\[data-theme=["']dark["']\]\s+\.status\s*\{\s*color:\s*#f3f7f4;\s*background:\s*#174a29;\s*\}/);
  });

  it.each([
    ["onboarding", "/onboarding", []],
    ["dashboard", "/", [validConfiguration]],
    ["count", "/count/new", [validConfiguration]],
  ])("keeps semantic landmarks on the %s view", async (_view, path, configurations) => {
    window.history.replaceState({}, "", path);
    render(<ApplicationRoutes repository={routeRepository(configurations)} />);

    await screen.findByRole("main");
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "CYNDY navigation" })).toBeTruthy();
    expect(screen.getByRole("main").id).toBe("main-content");
    expect(screen.getByRole("link", { name: "CYNDY home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Count" }).getAttribute("href")).toBe("/count/new");
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings");
  });

  it("localizes Spanish validation feedback without saving local configuration", async () => {
    window.localStorage.setItem("cyndy.locale", "es");
    window.history.replaceState({}, "", "/onboarding");
    const store = routeRepository();
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "Configura CYNDY" });
    fireEvent.change(screen.getByLabelText("Denominaciones (separadas por comas)"), {
      target: { value: "1.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));

    expect(await screen.findByText("Las denominaciones deben ser enteros positivos.")).toBeTruthy();
    expect(store.saveCurrencyConfigurations).not.toHaveBeenCalled();
  });

  it("localizes saved-settings status feedback in Spanish", async () => {
    window.localStorage.setItem("cyndy.locale", "es");
    window.history.replaceState({}, "", "/settings");
    render(<ApplicationRoutes repository={routeRepository([validConfiguration])} />);
    await screen.findByRole("heading", { name: "Ajustes" });
    fireEvent.click(screen.getByRole("button", { name: "Guardar ajustes" }));

    expect((await screen.findByRole("status")).textContent).toBe("Ajustes guardados.");
  });

  it("applies the stored Spanish locale to route content and document language", async () => {
    window.localStorage.setItem("cyndy.locale", "es");
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={routeRepository([validConfiguration])} />);
    await screen.findByRole("heading", { name: "Nuevo conteo" });

    expect(document.documentElement.lang).toBe("es");
    expect(screen.getByLabelText("Título del conteo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar conteo" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Inicio" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("button", { name: "Cambiar tema" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cambiar idioma" })).toBeTruthy();
  });

  it("updates the offline-ready announcement when the selected locale changes", async () => {
    const offlineReady = document.createElement("p");
    offlineReady.id = "offline-ready";
    offlineReady.hidden = true;
    offlineReady.setAttribute("role", "status");
    document.body.append(offlineReady);
    try {
      window.history.replaceState({}, "", "/count/new");
      render(<ApplicationRoutes repository={routeRepository([validConfiguration])} />);
      await screen.findByRole("heading", { name: "New count" });

      fireEvent.click(screen.getByRole("button", { name: "Change language" }));

      expect(offlineReady.lang).toBe("es");
      expect(offlineReady.textContent).toBe(
        "El acceso sin conexión está listo. Las funciones locales y los conteos guardados están disponibles sin conexión.",
      );
    } finally {
      offlineReady.remove();
    }
  });

  it.each([
    ["/count/new", "Count"],
    ["/history", "History"],
    ["/settings", "Settings"],
  ])("marks the active bottom-navigation destination on %s", async (path, name) => {
    window.history.replaceState({}, "", path);
    render(<ApplicationRoutes repository={routeRepository([validConfiguration])} />);

    const navigation = await screen.findByRole("navigation", { name: "CYNDY navigation" });
    expect(within(navigation).getByRole("link", { name }).getAttribute("aria-current")).toBe("page");
  });

  it("applies the stored light theme to the header and bottom-navigation surfaces", async () => {
    window.localStorage.setItem("cyndy.theme", "light");
    render(<ApplicationRoutes repository={routeRepository([validConfiguration])} />);

    await screen.findByRole("banner");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.querySelector(".app-header")).toBeTruthy();
    expect(document.querySelector(".bottom-nav")).toBeTruthy();
  });

  it("renders local routes and updates preferences when localStorage is unavailable", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    window.history.replaceState({}, "", "/count/new");

    render(<ApplicationRoutes repository={routeRepository([validConfiguration])} />);
    await screen.findByRole("heading", { name: "New count" });
    fireEvent.click(screen.getByRole("button", { name: "Change theme" }));
    fireEvent.click(screen.getByRole("button", { name: "Change language" }));

    expect(await screen.findByRole("heading", { name: "Nuevo conteo" })).toBeTruthy();
    expect(getItem).toHaveBeenCalledWith("cyndy.locale");
    expect(getItem).toHaveBeenCalledWith("cyndy.theme");
    expect(setItem).toHaveBeenCalledWith("cyndy.theme", "light");
    expect(setItem).toHaveBeenCalledWith("cyndy.locale", "es");
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
  it("describes each quantity subtotal with its value and currency while keeping the visible subtotal numeric-only", async () => {
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={routeRepository([validConfiguration])} />);
    await screen.findByRole("heading", { name: "New count" });

    const quantity = screen.getByLabelText("$1 quantity");
    const description = document.getElementById("usd:1-subtotal-description");
    const visibleSubtotal = document.getElementById("usd:1-subtotal");

    expect(quantity.getAttribute("aria-describedby")).toBe("usd:1-subtotal-description");
    expect(description?.textContent).toBe("Subtotal: $0 USD");
    expect(visibleSubtotal?.textContent).toBe("0");
    expect(visibleSubtotal?.getAttribute("aria-label")).toBeNull();

    fireEvent.change(quantity, { target: { value: "3" } });
    expect(description?.textContent).toBe("Subtotal: $3 USD");
    expect(visibleSubtotal?.textContent).toBe("3");
  });

  it("renders passive fieldset-scoped totals that update independently", async () => {
    const store = routeRepository([validConfiguration, secondConfiguration]);
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "New count" });

    const dollars = screen.getByRole("group", { name: "US dollar (USD)" });
    const euros = screen.getByRole("group", { name: "Euro (EUR)" });
    const dollarTotal = dollars.querySelector(".currency-total");
    const euroTotal = euros.querySelector(".currency-total");
    const dollarLegend = dollars.querySelector(":scope > legend");
    const euroLegend = euros.querySelector(":scope > legend");

    expect(dollars.classList.contains("currency-fieldset")).toBe(true);
    expect(dollarLegend?.nextElementSibling).toBe(dollarTotal);
    expect(euroLegend?.nextElementSibling).toBe(euroTotal);
    expect(within(dollars).getByText("$ 0 USD")).toBeTruthy();
    expect(within(euros).getByText("€ 0 EUR")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("$5 quantity"), { target: { value: "2" } });
    expect(within(dollars).getByText("$ 10 USD")).toBeTruthy();
    expect(within(euros).getByText("€ 0 EUR")).toBeTruthy();

    for (const total of [dollarTotal, euroTotal]) {
      expect(total?.getAttribute("role")).toBeNull();
      expect(total?.getAttribute("aria-live")).toBeNull();
      expect(total?.getAttribute("tabindex")).toBeNull();
      expect(total?.querySelector("button, a, input, select, textarea, [tabindex]")).toBeNull();
      expect(total?.textContent).not.toMatch(/combined|converted|denominations|items/i);
    }
    expect(within(dollars).queryByRole("status")).toBeNull();
    expect(within(dollars).queryByRole("alert")).toBeNull();
    expect(screen.getByLabelText("$5 quantity").getAttribute("aria-describedby")).toBe("usd:5-subtotal-description");
  });

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
    fireEvent.change(screen.getByLabelText("Count title"), { target: { value: "Morning count" } });

    const dollars = screen.getByRole("group", { name: "US dollar (USD)" });
    const euros = screen.getByRole("group", { name: "Euro (EUR)" });
    expect(within(dollars).getByText("1")).toBeTruthy();
    expect(within(dollars).getByText("3")).toBeTruthy();
    expect(within(dollars).getByText("10")).toBeTruthy();
    expect(within(dollars).getByText("$ 13 USD")).toBeTruthy();
    expect(within(euros).getByText("8")).toBeTruthy();
    expect(document.getElementById("eur:5-subtotal")?.textContent).toBe("5");
    expect(within(euros).getByText("€ 13 EUR")).toBeTruthy();
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
      title: "Morning count",
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

  it.each(["-1", "1.5"])("rejects invalid quantity %s", async (quantity) => {
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
    expect(input.getAttribute("aria-describedby")).toBe("usd:1-subtotal-description usd:1-error");
    expect(store.saveCount).not.toHaveBeenCalled();
  });

  it("clears only the unsaved draft and transient feedback without persistence", async () => {
    const store = routeRepository([validConfiguration, secondConfiguration]);
    window.history.replaceState({}, "", "/count/new");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "New count" });
    const invalidQuantity = screen.getByLabelText("$1 quantity");
    const secondInvalidQuantity = screen.getByLabelText("€2 quantity");
    const note = screen.getByLabelText("Count title");
    fireEvent.change(invalidQuantity, { target: { value: "-1" } });
    fireEvent.change(secondInvalidQuantity, { target: { value: "1.5" } });
    fireEvent.change(note, { target: { value: "Unsaved note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save count" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(invalidQuantity.getAttribute("aria-invalid")).toBe("true");
    expect(secondInvalidQuantity.getAttribute("aria-invalid")).toBe("true");
    expect(invalidQuantity.getAttribute("aria-describedby")).toBe("usd:1-subtotal-description usd:1-error");
    expect(screen.getAllByText("Enter a non-negative whole number within the safe integer range.")).toHaveLength(2);

    const clear = screen.getByRole("button", { name: "Clear unsaved count" });
    clear.focus();
    fireEvent.click(clear);

    expect(invalidQuantity).toHaveProperty("value", "");
    expect(secondInvalidQuantity).toHaveProperty("value", "");
    expect(invalidQuantity.getAttribute("aria-invalid")).toBeNull();
    expect(note).toHaveProperty("value", "");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(document.querySelectorAll(".visually-hidden[id$='-subtotal-description']")).toHaveLength(4);
    expect(screen.getByText("$ 0 USD")).toBeTruthy();
    expect(screen.getByText("€ 0 EUR")).toBeTruthy();
    expect(document.activeElement).toBe(clear);
    expect(store.saveCount).not.toHaveBeenCalled();
    expect(store.saveCurrencyConfigurations).not.toHaveBeenCalled();
  });
});
