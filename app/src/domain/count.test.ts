import { describe, expect, it } from "vitest";
import { calculateCountSnapshots } from "./count";
import type { CurrencyConfiguration } from "./validation";

const currencies: CurrencyConfiguration[] = [
  {
    id: "ars", name: "Argentine peso", symbol: "$", code: "ARS",
    denominations: [100, 200],
  },
  {
    id: "usd", name: "US dollar", symbol: "US$", code: "USD",
    denominations: [1, 5],
  },
];

describe("calculateCountSnapshots", () => {
  it("calculates integer entries and independent currency subtotals", () => {
    const snapshots = calculateCountSnapshots(currencies, {
      ars: { "100": 2, "200": 3 },
      usd: { "1": 4, "5": 2 },
    });

    expect(snapshots.map(({ code, subtotal }) => ({ code, subtotal }))).toEqual([
      { code: "ARS", subtotal: 800 },
      { code: "USD", subtotal: 14 },
    ]);
    expect(snapshots[0].entries[0]).toEqual({ denomination: 100, quantity: 2, total: 200 });
  });

  it("does not expose a cross-currency aggregate", () => {
    const snapshots = calculateCountSnapshots(currencies, {});

    expect(snapshots).toHaveLength(2);
    expect(snapshots).not.toHaveProperty("total");
    expect(Object.keys(snapshots[0])).not.toContain("aggregate");
  });

  it.each([-1, 1.5])("rejects invalid quantity %s", (quantity) => {
    expect(() =>
      calculateCountSnapshots(currencies, { ars: { "100": quantity } }),
    ).toThrow("Quantities must be non-negative integers");
  });

  it("rejects invalid configuration before calculating", () => {
    expect(() =>
      calculateCountSnapshots([{ ...currencies[0], code: "" }], {}),
    ).toThrow("Invalid currency configuration: code is required");
  });
});
