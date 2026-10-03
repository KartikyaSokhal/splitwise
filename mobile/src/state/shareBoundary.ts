import type { Person, SplitMethod } from "../types/index.ts";
import {
  isValidLabel,
  MoneyValidationError,
  parseInrToMinor,
} from "../utils/money.ts";
import { splitCustom, splitEqually } from "../utils/split.ts";
import { generateShareText } from "../utils/share.ts";

export type BillShareSnapshot = {
  totalInput: string;
  people: readonly Person[];
  splitMethod: SplitMethod;
  customShares: Record<string, string>;
};

/** Rebuild from raw current input: never trust display placeholders or prior screens. */
export function prepareBillShare(bill: BillShareSnapshot): string {
  if (
    !bill ||
    !Array.isArray(bill.people) ||
    bill.people.some((p) => !p || !isValidLabel(p.name))
  ) {
    throw new MoneyValidationError("Invalid participants.");
  }
  const total = parseInrToMinor(bill.totalInput);
  const equal = splitEqually(total, bill.people); // validates participant identities too
  let shares = equal;
  if (bill.splitMethod === "custom") {
    if (
      !bill.customShares ||
      typeof bill.customShares !== "object" ||
      Array.isArray(bill.customShares) ||
      Object.keys(bill.customShares).some(
        (id) => !bill.people.some((p) => p.id === id),
      )
    ) {
      throw new MoneyValidationError("Invalid custom allocations.");
    }
    shares = splitCustom(
      total,
      bill.people.map((p) => {
        if (!Object.hasOwn(bill.customShares, p.id))
          throw new MoneyValidationError("Missing custom allocation.");
        const raw = bill.customShares[p.id];
        return {
          personId: p.id,
          shareMinor:
            typeof raw === "string" && raw.trim() === ""
              ? 0
              : parseInrToMinor(raw),
        };
      }),
    );
  } else if (bill.splitMethod !== "equal") {
    throw new MoneyValidationError("Invalid split method.");
  }
  return generateShareText(
    total,
    shares.map((s, i) => ({
      name: bill.people[i].name,
      shareMinor: s.shareMinor,
    })),
  );
}

/** Injectable native boundary: test cancellation/failure without pretending to test an OS. */
export async function shareCurrentBill(
  getSnapshot: () => BillShareSnapshot,
  share: (message: string) => Promise<{ action: string }>,
): Promise<boolean> {
  const message = prepareBillShare(getSnapshot());
  const result = await share(message);
  return result.action === "sharedAction";
}
