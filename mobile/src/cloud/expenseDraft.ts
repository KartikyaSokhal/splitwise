import type { Expense } from "../types/expense.ts";
import type { GroupSnapshot } from "./contracts.ts";
import { assertValidExpense } from "../utils/expense.ts";
import { parseInrToMinor, MoneyValidationError } from "../utils/money.ts";
import { splitEqually, splitCustom } from "../utils/split.ts";

export type ExpenseDraft = {
  description: string;
  total: string;
  selected: string[];
  payerId: string;
  multiplePayers: boolean;
  paid: Record<string, string>;
  method: "equal" | "custom";
  owed: Record<string, string>;
  pinned: Record<string, boolean>;
};
/** Rebuilt from raw inputs at Review AND Save. No view-model trust. */
export function prepareExpense(
  draft: ExpenseDraft,
  group: GroupSnapshot,
  requestId: string,
): Expense {
  const activeIds = group.people.filter((p) => p.active).map((p) => p.id);
  if (
    group.archived ||
    !draft.selected.length ||
    new Set(draft.selected).size !== draft.selected.length ||
    draft.selected.some((id) => !activeIds.includes(id))
  )
    throw new MoneyValidationError("Choose active participants.");
  const totalMinor = parseInrToMinor(draft.total);
  if (totalMinor === 0)
    throw new MoneyValidationError("Enter a total greater than zero.");
  const shares =
    draft.method === "equal"
      ? splitEqually(
          totalMinor,
          draft.selected.map((id) => ({ id })),
        )
      : splitCustom(
          totalMinor,
          draft.selected.map((personId) => ({
            personId,
            shareMinor: parseInrToMinor(draft.owed[personId]?.trim() || "0"),
          })),
        );
  const payments = draft.multiplePayers
    ? activeIds
        .map((payerId) => ({
          payerId,
          amountMinor: parseInrToMinor(draft.paid[payerId] || "0"),
        }))
        .filter((p) => p.amountMinor > 0)
    : [{ payerId: draft.payerId, amountMinor: totalMinor }];
  // Reject stale values for removed payers, even if they would otherwise be dropped.
  if (
    draft.multiplePayers &&
    Object.entries(draft.paid).some(
      ([id, value]) =>
        !activeIds.includes(id) && value !== "" && parseInrToMinor(value) !== 0,
    )
  )
    throw new MoneyValidationError(
      "Payer access changed. Review this expense again.",
    );
  const result: Expense = {
    id: requestId,
    groupId: group.id,
    description: draft.description,
    totalMinor,
    currency: "INR",
    payments,
    shares: shares.map((s) => ({
      personId: s.personId,
      amountMinor: s.shareMinor,
    })),
  };
  assertValidExpense(result, activeIds);
  return result;
}
