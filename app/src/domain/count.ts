import {
  type CurrencyConfiguration,
  validateCurrencyConfiguration,
} from "./validation";

export interface DenominationEntry {
  denomination: number;
  quantity: number;
  total: number;
}

export interface CurrencyCountSnapshot {
  currencyId: string;
  name: string;
  symbol: string;
  code: string;
  entries: readonly DenominationEntry[];
  subtotal: number;
}

export type CountQuantities = Readonly<Record<string, Readonly<Record<string, number>>>>;

export function calculateCountSnapshots(
  configurations: readonly CurrencyConfiguration[],
  quantities: CountQuantities,
): readonly CurrencyCountSnapshot[] {
  if (configurations.length === 0) {
    throw new TypeError("At least one currency configuration is required");
  }

  return configurations.map((configuration) => {
    const issues = validateCurrencyConfiguration(configuration);
    if (issues.length > 0) {
      throw new TypeError(`Invalid currency configuration: ${issues[0].message}`);
    }

    const entries = configuration.denominations.map((denomination) => {
      const quantity = quantities[configuration.id]?.[String(denomination)] ?? 0;
      if (!Number.isSafeInteger(quantity) || quantity < 0) {
        throw new TypeError("Quantities must be non-negative integers");
      }

      const total = denomination * quantity;
      if (!Number.isSafeInteger(total)) {
        throw new RangeError("Entry total exceeds the safe integer range");
      }

      return { denomination, quantity, total };
    });
    const subtotal = entries.reduce((sum, entry) => sum + entry.total, 0);

    if (!Number.isSafeInteger(subtotal)) {
      throw new RangeError("Currency subtotal exceeds the safe integer range");
    }

    return {
      currencyId: configuration.id,
      name: configuration.name,
      symbol: configuration.symbol,
      code: configuration.code,
      entries,
      subtotal,
    };
  });
}
