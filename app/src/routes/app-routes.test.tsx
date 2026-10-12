import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    expect(resolveRoute("/", [validConfiguration, invalid]).page).toBe("onboarding");
    expect(resolveRoute("/count/new", [validConfiguration, invalid]).page).toBe("onboarding");
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
    expect(document.activeElement).toBe(alert);
    expect(screen.getByLabelText("Currency code")).toHaveProperty("value", "USD");
    expect(window.location.pathname).toBe("/onboarding");
  });

  it("replaces indefinite loading with focused read-failure feedback", async () => {
    const store = routeRepository();
    vi.mocked(store.getCurrencyConfigurations).mockRejectedValueOnce(new Error("read failure"));
    render(<ApplicationRoutes repository={store} />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Could not load local settings. Refresh and try again.");
    expect(document.activeElement).toBe(alert);
    expect(screen.queryByText("Loading local settings…")).toBeNull();
  });

  it("persists valid onboarding and renders the dashboard", async () => {
    const store = routeRepository();
    window.history.replaceState({}, "", "/onboarding");
    render(<ApplicationRoutes repository={store} />);
    await screen.findByRole("heading", { name: "Set up CYNDY" });
    fill(validValues());
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy());
    expect(store.saveCurrencyConfigurations).toHaveBeenCalledWith([validConfiguration]);
    expect(window.location.pathname).toBe("/");
  });

  it("does not expose an out-of-scope settings route", async () => {
    window.history.replaceState({}, "", "/settings");
    render(<ApplicationRoutes repository={routeRepository([validConfiguration])} />);
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeTruthy();
  });
});
