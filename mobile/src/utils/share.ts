import { formatMinorAsInr } from "./money.ts";

export type ShareItem = {
  name: string;
  shareMinor: number;
};

/**
 * Generates clean, readable text summary for native sharing.
 *
 * Example:
 * Bill split
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
  const formattedTotal = formatMinorAsInr(totalMinor);
  const shareLines = shares.map(
    (item) => `${item.name}: ₹${formatMinorAsInr(item.shareMinor)}`,
  );

  return [
    "Bill split",
    "",
    `Total: ₹${formattedTotal}`,
    "",
    ...shareLines,
  ].join("\n");
}
