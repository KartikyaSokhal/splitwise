/**
 * Money helpers for the INR-only MVP.
 *
 * Values passed to split calculations are always integer paise. Decimal user
 * input is parsed as text so no floating-point rounding enters final values.
 */
export class MoneyValidationError extends Error {
  override name = "MoneyValidationError";
}

/** Opaque IDs are compared exactly, never normalized silently. */
export function isValidId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 256 &&
    value.trim() === value &&
    !/[\s\u0000-\u0020\u007f]/.test(value)
  );
}

export function isValidLabel(value: unknown, maxLength = 100): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength &&
    !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(value)
  );
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
  if (typeof input !== "string" || input.length > 128) {
    throw new MoneyValidationError("Amount must be a bounded decimal string.");
  }
  const normalized = input.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);

  if (!match) {
    throw new MoneyValidationError(
      "Amount must be a non-negative INR value with at most two decimal places.",
    );
  }

  const [, wholePart, fractionalPart = ""] = match;
  const exact =
    BigInt(wholePart) * 100n + BigInt(fractionalPart.padEnd(2, "0"));
  if (exact > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new MoneyValidationError("Amount is too large.");
  }

  const minor = Number(exact);
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
