export interface CurrencyConfiguration {
  id: string;
  name: string;
  symbol: string;
  code: string;
  denominations: readonly number[];
}

export type ConfigurationField = "id" | "name" | "symbol" | "code" | "denominations";

export interface ValidationIssue {
  field: ConfigurationField;
  message: string;
}

export function validateCurrencyConfiguration(
  configuration: CurrencyConfiguration,
): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const requiredText: readonly [ConfigurationField, string][] = [
    ["id", configuration.id],
    ["name", configuration.name],
    ["symbol", configuration.symbol],
    ["code", configuration.code],
  ];

  for (const [field, value] of requiredText) {
    if (value.trim().length === 0) {
      issues.push({ field, message: `${field} is required` });
    }
  }

  if (configuration.denominations.length === 0) {
    issues.push({ field: "denominations", message: "at least one denomination is required" });
  } else if (
    configuration.denominations.some(
      (value) => !Number.isSafeInteger(value) || value <= 0,
    )
  ) {
    issues.push({
      field: "denominations",
      message: "denominations must be positive integers",
    });
  } else if (new Set(configuration.denominations).size !== configuration.denominations.length) {
    issues.push({
      field: "denominations",
      message: "denominations must be unique",
    });
  }

  return issues;
}
