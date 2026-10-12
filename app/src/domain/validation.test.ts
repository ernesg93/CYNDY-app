import { describe, expect, it } from "vitest";
import {
  type CurrencyConfiguration,
  validateCurrencyConfiguration,
} from "./validation";

const validConfiguration: CurrencyConfiguration = {
  id: "ars", name: "Argentine peso", symbol: "$", code: "ARS", denominations: [100, 200],
};

describe("validateCurrencyConfiguration", () => {
  it("accepts complete identity and positive integer denominations", () => {
    expect(validateCurrencyConfiguration(validConfiguration)).toEqual([]);
  });

  it("identifies every missing identity field", () => {
    const issues = validateCurrencyConfiguration({
      ...validConfiguration,
      id: " ",
      name: "",
      symbol: " ",
      code: "",
    });

    expect(issues.map(({ field }) => field)).toEqual(["id", "name", "symbol", "code"]);
  });

  it("rejects an empty denomination set", () => {
    const issues = validateCurrencyConfiguration({ ...validConfiguration, denominations: [] });
    expect(issues).toContainEqual({
      field: "denominations",
      message: "at least one denomination is required",
    });
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid denomination %s",
    (denomination) => {
      const issues = validateCurrencyConfiguration({
        ...validConfiguration,
        denominations: [denomination],
      });
      expect(issues).toContainEqual({
        field: "denominations",
        message: "denominations must be positive integers",
      });
    },
  );
});
