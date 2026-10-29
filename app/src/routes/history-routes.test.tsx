import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
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

  it("renders approved History cards while preserving newest-first record links and independent subtotals", async () => {
    const repository = await historyRepository();
    window.history.replaceState({}, "", "/history");
    render(<ApplicationRoutes repository={repository} />);

    const list = await screen.findByRole("list", { name: "Saved local counts" });
    expect(list.classList.contains("history-list")).toBe(true);
    const cards = list.querySelectorAll(".history-record-card");
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector("time")?.dateTime).toBe("2026-10-12T12:00:00.000Z");
    expect(cards[0].querySelectorAll(".history-subtotals li")).toHaveLength(1);
    expect(cards[1].querySelectorAll(".history-subtotals li")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "View count count-2" }).getAttribute("href"))
      .toBe("/history/count-2");
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

    expect(await screen.findByText("$1 × 3 = $3")).toBeTruthy();
    expect(screen.getByText("$5 × 2 = $10")).toBeTruthy();
    expect(screen.getByText("Subtotal: $13 USD")).toBeTruthy();
    expect(screen.getByText("Subtotal: €8 EUR")).toBeTruthy();
    expect(screen.getByText("Updated current note")).toBeTruthy();
    expect(screen.getByText("2026-10-12T10:00:00.000Z").tagName).toBe("TIME");
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
    const denominations = screen.getByLabelText("Denominations (comma separated)");
    fireEvent.change(denominations, { target: { value: "5, 5" } });
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

    expect((await screen.findByRole("status")).textContent).toBe("All local data was reset.");
    expect(screen.getByRole("heading", { name: "Set up CYNDY" })).toBeTruthy();
    expect(await repository.getCurrencyConfigurations()).toEqual([]);
    expect(await repository.listCounts()).toEqual([]);
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
    fireEvent.change(screen.getByLabelText("Denominations (comma separated)"), {
      target: { value: "1, 5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));
    await screen.findByRole("heading", { name: "Dashboard" });

    fireEvent.click(await screen.findByRole("button", { name: "Reset all local data" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));

    await screen.findByRole("heading", { name: "Set up CYNDY" });
    expect(screen.getByLabelText<HTMLInputElement>("Currency name").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("Symbol").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("Currency code").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("Denominations (comma separated)").value)
      .toBe("");
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
