import { isValidId, MoneyValidationError } from "./money.ts";
import type { ParticipantBalance } from "../types/expense.ts";
import type { SuggestedTransfer } from "../types/settlement.ts";

/**
 * Thrown when settlement suggestions cannot be computed due to invalid balances
 * or violation of the money conservation invariant (INV-B2).
 */
export class SettlementValidationError extends MoneyValidationError {
  override name = "SettlementValidationError";
}

/**
 * Calculates deterministic settlement transfer suggestions from participant balances.
 *
 * Algorithm: Deterministic two-pointer matching in stable participant order.
 * - Debtors (balanceMinor < 0) and Creditors (balanceMinor > 0) are matched in the
 *   exact order they appear in `balances`. Zero balances are ignored.
 * - Each transfer amount is min(remainingDebt, remainingCredit).
 * - Pointers advance when remaining debt/credit reaches 0.
 *
 * Complexity:
 * - Time: O(n) where n is the number of participants.
 * - Space: O(n) auxiliary memory.
 * - No sorting is performed.
 *
 * Invariants enforced:
 * - INV-B2: sum(all balanceMinor) === 0 (conservation of money).
 * - INV-S1: transfer.amountMinor > 0 (strictly positive integer paise).
 * - INV-S2: transfer.fromPersonId !== transfer.toPersonId (no self-transfers).
 * - INV-SS1: sum(transfers) === sum(positive balances) === sum(abs(negative balances)).
 * - INV-SS2: Applying all suggested transfers leaves every participant balance at 0.
 * - INV-SS3: Transfers count <= n - 1 for n participants with non-zero balances.
 * - Input array and its objects are NEVER mutated.
 */
export function suggestSettlements(
  balances: readonly ParticipantBalance[],
): SuggestedTransfer[] {
  if (!Array.isArray(balances)) {
    throw new SettlementValidationError("balances must be an array.");
  }

  if (balances.length === 0) {
    return [];
  }

  // Precondition checks: safe integer paise and unique person IDs
  const seenPersonIds = new Set<string>();
  let sumBalances = 0n;

  for (const b of balances) {
    if (!b || typeof b !== "object") {
      throw new SettlementValidationError(
        "Each balance entry must be an object.",
      );
    }

    if (!isValidId(b.personId)) {
      throw new SettlementValidationError(
        "Each balance entry must have a non-empty personId.",
      );
    }

    if (seenPersonIds.has(b.personId)) {
      throw new SettlementValidationError(
        `Duplicate participant ID found in balances: '${b.personId}'.`,
      );
    }
    seenPersonIds.add(b.personId);

    if (
      typeof b.balanceMinor !== "number" ||
      !Number.isSafeInteger(b.balanceMinor)
    ) {
      throw new SettlementValidationError(
        `Balance for person '${b.personId}' must be a safe integer of paise.`,
      );
    }

    sumBalances += BigInt(b.balanceMinor);
  }

  // Enforce conservation of money invariant INV-B2
  if (sumBalances !== 0n) {
    throw new SettlementValidationError(
      `Balance conservation invariant violated: sum(balances) = ${sumBalances}, expected 0.`,
    );
  }

  // Step 1: Partition into Debtors and Creditors in stable input order (ignore zeros)
  type MutableParty = {
    personId: string;
    amountMinor: number;
  };

  const debtors: MutableParty[] = [];
  const creditors: MutableParty[] = [];

  for (const b of balances) {
    if (b.balanceMinor < 0) {
      debtors.push({
        personId: b.personId,
        amountMinor: Math.abs(b.balanceMinor),
      });
    } else if (b.balanceMinor > 0) {
      creditors.push({
        personId: b.personId,
        amountMinor: b.balanceMinor,
      });
    }
  }

  // If there are no debtors or creditors (e.g. all balances 0), return empty
  if (debtors.length === 0 || creditors.length === 0) {
    return [];
  }

  // Step 2 & 3: Two-pointer matching in stable participant order
  const transfers: SuggestedTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const currentDebtor = debtors[debtorIndex];
    const currentCreditor = creditors[creditorIndex];

    const transferAmount = Math.min(
      currentDebtor.amountMinor,
      currentCreditor.amountMinor,
    );

    transfers.push({
      fromPersonId: currentDebtor.personId,
      toPersonId: currentCreditor.personId,
      amountMinor: transferAmount,
    });

    currentDebtor.amountMinor -= transferAmount;
    currentCreditor.amountMinor -= transferAmount;

    if (currentDebtor.amountMinor === 0 && currentCreditor.amountMinor === 0) {
      debtorIndex++;
      creditorIndex++;
    } else if (currentDebtor.amountMinor === 0) {
      debtorIndex++;
    } else {
      creditorIndex++;
    }
  }

  // Defense in depth: no successful result may leave either partition unsettled.
  if (
    debtors.some((p) => p.amountMinor !== 0) ||
    creditors.some((p) => p.amountMinor !== 0)
  ) {
    throw new SettlementValidationError("Settlement left a non-zero residual.");
  }
  return transfers;
}
