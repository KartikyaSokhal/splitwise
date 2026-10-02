/**
 * Money helpers for the INR-only MVP.
 *
 * Values passed to split calculations are always integer paise. Decimal user
 * input is parsed as text so no floating-point rounding enters final values.
 */
export class MoneyValidationError extends Error {
  override name = "MoneyValidationError";
}

export function assertMinorAmount(
  value: number,
  fieldName = "amount",
): asserts value is number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new MoneyValidationError(
      `${fieldName} must be a non-negative safe integer number of paise.`,
    );
  }
}

/** Parses a non-negative INR decimal string into paise without using floats. */
export function parseInrToMinor(input: string): number {
  const normalized = input.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);

  if (!match) {
    throw new MoneyValidationError(
      "Amount must be a non-negative INR value with at most two decimal places.",
    );
  }

  const [, wholePart, fractionalPart = ""] = match;
  const wholeMinor = Number(wholePart);

  if (!Number.isSafeInteger(wholeMinor)) {
    throw new MoneyValidationError("Amount is too large.");
  }

  const fractionMinor = Number(fractionalPart.padEnd(2, "0"));
  const minor = wholeMinor * 100 + fractionMinor;
  assertMinorAmount(minor);

  return minor;
}

/** Formats a non-negative paise amount as a two-decimal INR value. */
export function formatMinorAsInr(minor: number): string {
  assertMinorAmount(minor);

  const whole = Math.floor(minor / 100);
  const fraction = String(minor % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}
