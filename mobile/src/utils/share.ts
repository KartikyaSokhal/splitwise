import {
  assertMinorAmount,
  formatMinorAsInr,
  isValidLabel,
  MoneyValidationError,
} from "./money.ts";

export type ShareItem = {
  name: string;
  shareMinor: number;
};

/**
 * Generates clean, readable text summary for native sharing.
 *
 * Example:
 * DueShare · Bill split
 *
 * Total: ₹1,240.00
 *
 * Kartikya: ₹413.34
 * Rahul: ₹413.33
 * Aman: ₹413.33
 */
export function generateShareText(
  totalMinor: number,
  shares: readonly ShareItem[],
): string {
  assertMinorAmount(totalMinor, "total");
  if (totalMinor === 0 || !Array.isArray(shares) || shares.length === 0) {
    throw new MoneyValidationError(
      "A positive total and participants are required to share.",
    );
  }
  let allocated = 0n;
  for (const item of shares) {
    if (!item || !isValidLabel(item.name))
      throw new MoneyValidationError("Invalid participant name.");
    assertMinorAmount(item.shareMinor, "share");
    allocated += BigInt(item.shareMinor);
  }
  if (allocated !== BigInt(totalMinor))
    throw new MoneyValidationError("Shares must equal the bill total.");
  const formattedTotal = formatMinorAsInr(totalMinor);
  const shareLines = shares.map(
    (item) => `${item.name}: ₹${formatMinorAsInr(item.shareMinor)}`,
  );

  return [
    "DueShare · Bill split",
    "",
    `Total: ₹${formattedTotal}`,
    "",
    ...shareLines,
  ].join("\n");
}
