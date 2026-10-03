import { MoneyValidationError } from "./money.ts";
import type {
  Expense,
  ExpenseValidationIssue,
  ExpenseValidationIssueCode,
  ExpenseValidationResult,
  ParticipantBalance,
  Payment,
  Share,
} from "../types/expense.ts";

/**
 * Custom error thrown when an Expense violates domain or money invariants.
 */
export class ExpenseValidationError extends MoneyValidationError {
  override name = "ExpenseValidationError";
  readonly errors: readonly string[];
  readonly issues: readonly ExpenseValidationIssue[];

  constructor(
    errors: readonly string[],
    issues: readonly ExpenseValidationIssue[] = [],
  ) {
    super(errors.length > 0 ? errors.join("; ") : "Invalid expense.");
    this.errors = errors;
    this.issues = issues;
  }
}

/**
 * Validates a multi-payer Expense against financial and group invariants:
 * - totalMinor >= 0 (safe integer)
 * - currency === "INR"
 * - every payment amountMinor > 0 (strictly positive)
 * - every share amountMinor >= 0 (non-negative)
 * - sum(payments.amountMinor) === totalMinor (INV-E1)
 * - sum(shares.amountMinor) === totalMinor (INV-E2)
 * - every payerId belongs to the supplied group member set
 * - every share personId belongs to the supplied group member set
 * - duplicate payment entries for the same payer are rejected
 * - duplicate share entries for the same participant are rejected
 *
 * Does NOT silently alter or redistribute money. Returns deterministic, structured errors.
 */
export function validateExpense(
  expense: Expense,
  validParticipantIds: readonly string[] | ReadonlySet<string>,
): ExpenseValidationResult {
  const issues: ExpenseValidationIssue[] = [];

  function addIssue(
    code: ExpenseValidationIssueCode,
    message: string,
    participantId?: string,
  ): void {
    issues.push({ code, message, participantId });
  }

  if (!expense || typeof expense !== "object") {
    addIssue("INVALID_TOTAL", "Expense must be a valid object.");
    return {
      isValid: false,
      errors: issues.map((i) => i.message),
      issues,
    };
  }

  // Currency validation
  if (expense.currency !== "INR") {
    addIssue(
      "INVALID_CURRENCY",
      `Currency must be 'INR', got '${expense.currency}'.`,
    );
  }

  // Total minor validation
  const isTotalValidNumber =
    typeof expense.totalMinor === "number" &&
    Number.isSafeInteger(expense.totalMinor) &&
    expense.totalMinor >= 0;

  if (!isTotalValidNumber) {
    addIssue(
      "INVALID_TOTAL",
      `totalMinor must be a non-negative safe integer of paise, got ${expense.totalMinor}.`,
    );
  }

  const validSet =
    validParticipantIds instanceof Set
      ? validParticipantIds
      : new Set(validParticipantIds);

  // Validate Payments
  if (!Array.isArray(expense.payments)) {
    addIssue("INVALID_PAYMENT_AMOUNT", "expense.payments must be an array.");
  } else {
    const seenPayers = new Set<string>();
    let totalPaymentsMinor = 0;

    for (const payment of expense.payments) {
      if (!payment || typeof payment !== "object") {
        addIssue("INVALID_PAYMENT_AMOUNT", "Payment entry must be an object.");
        continue;
      }

      const payerId = payment.payerId;
      if (typeof payerId !== "string" || payerId.trim() === "") {
        addIssue("EMPTY_ID", "Payment payerId must be a non-empty string.");
      } else {
        if (!validSet.has(payerId)) {
          addIssue(
            "PAYER_NOT_IN_GROUP",
            `Payer '${payerId}' does not belong to the group.`,
            payerId,
          );
        }

        if (seenPayers.has(payerId)) {
          addIssue(
            "DUPLICATE_PAYER",
            `Duplicate payment entry for payer '${payerId}'.`,
            payerId,
          );
        }
        seenPayers.add(payerId);
      }

      const amount = payment.amountMinor;
      if (
        typeof amount !== "number" ||
        !Number.isSafeInteger(amount) ||
        amount <= 0
      ) {
        addIssue(
          "INVALID_PAYMENT_AMOUNT",
          `Payment amount for payer '${payerId}' must be a positive safe integer of paise (got ${amount}).`,
          payerId,
        );
      } else {
        totalPaymentsMinor += amount;
      }
    }

    if (isTotalValidNumber && totalPaymentsMinor !== expense.totalMinor) {
      addIssue(
        "PAYMENTS_SUM_MISMATCH",
        `Total payments (${totalPaymentsMinor} paise) must equal expense total (${expense.totalMinor} paise).`,
      );
    }
  }

  // Validate Shares
  if (!Array.isArray(expense.shares)) {
    addIssue("INVALID_SHARE_AMOUNT", "expense.shares must be an array.");
  } else {
    const seenSharePersons = new Set<string>();
    let totalSharesMinor = 0;

    for (const share of expense.shares) {
      if (!share || typeof share !== "object") {
        addIssue("INVALID_SHARE_AMOUNT", "Share entry must be an object.");
        continue;
      }

      const personId = share.personId;
      if (typeof personId !== "string" || personId.trim() === "") {
        addIssue("EMPTY_ID", "Share personId must be a non-empty string.");
      } else {
        if (!validSet.has(personId)) {
          addIssue(
            "SHARE_PARTICIPANT_NOT_IN_GROUP",
            `Share participant '${personId}' does not belong to the group.`,
            personId,
          );
        }

        if (seenSharePersons.has(personId)) {
          addIssue(
            "DUPLICATE_SHARE_PARTICIPANT",
            `Duplicate share entry for participant '${personId}'.`,
            personId,
          );
        }
        seenSharePersons.add(personId);
      }

      const amount = share.amountMinor;
      if (
        typeof amount !== "number" ||
        !Number.isSafeInteger(amount) ||
        amount < 0
      ) {
        addIssue(
          "INVALID_SHARE_AMOUNT",
          `Share amount for participant '${personId}' must be a non-negative safe integer of paise (got ${amount}).`,
          personId,
        );
      } else {
        totalSharesMinor += amount;
      }
    }

    if (isTotalValidNumber && totalSharesMinor !== expense.totalMinor) {
      addIssue(
        "SHARES_SUM_MISMATCH",
        `Total shares (${totalSharesMinor} paise) must equal expense total (${expense.totalMinor} paise).`,
      );
    }
  }

  return {
    isValid: issues.length === 0,
    errors: issues.map((i) => i.message),
    issues,
  };
}

/**
 * Asserts that an expense satisfies all domain validation rules and invariants.
 * Throws ExpenseValidationError if any violation is found.
 */
export function assertValidExpense(
  expense: Expense,
  validParticipantIds: readonly string[] | ReadonlySet<string>,
): void {
  const result = validateExpense(expense, validParticipantIds);
  if (!result.isValid) {
    throw new ExpenseValidationError(result.errors, result.issues);
  }
}

/**
 * Calculates net participant balances for an expense:
 *
 *   balance = total paid - total owed
 *
 * - balance > 0: Participant paid more than their share and should receive money (creditor).
 * - balance < 0: Participant owes money to the group (debtor).
 * - balance === 0: Participant is settled.
 *
 * Invariants:
 * - Integer paise only (no floating-point arithmetic).
 * - Deterministic output order matching `participantOrder`.
 * - Participants with zero balance are included.
 * - Balance conservation: sum(all balances) === 0 (INV-B2).
 *
 * If the input expense is invalid, throws ExpenseValidationError.
 */
export function calculateBalances(
  expense: Expense,
  participantOrder?: readonly string[],
): ParticipantBalance[] {
  const effectiveOrder =
    participantOrder ??
    Array.from(
      new Set([
        ...expense.payments.map((p) => p.payerId),
        ...expense.shares.map((s) => s.personId),
      ]),
    );

  if (participantOrder) {
    const seen = new Set<string>();
    for (const id of participantOrder) {
      if (seen.has(id)) {
        throw new ExpenseValidationError([
          `participantOrder contains duplicate person id '${id}'.`,
        ]);
      }
      seen.add(id);
    }
  }

  assertValidExpense(expense, effectiveOrder);

  const paidMap = new Map<string, number>();
  for (const payment of expense.payments) {
    paidMap.set(
      payment.payerId,
      (paidMap.get(payment.payerId) ?? 0) + payment.amountMinor,
    );
  }

  const shareMap = new Map<string, number>();
  for (const share of expense.shares) {
    shareMap.set(
      share.personId,
      (shareMap.get(share.personId) ?? 0) + share.amountMinor,
    );
  }

  const balances: ParticipantBalance[] = effectiveOrder.map((personId) => {
    const paid = paidMap.get(personId) ?? 0;
    const share = shareMap.get(personId) ?? 0;
    const balanceMinor = paid - share;

    if (!Number.isSafeInteger(balanceMinor)) {
      throw new ExpenseValidationError([
        `Balance for person '${personId}' exceeds safe integer range.`,
      ]);
    }

    return {
      personId,
      balanceMinor,
    };
  });

  // Verify conservation of money invariant (INV-B2)
  const sumBalances = balances.reduce((sum, b) => sum + b.balanceMinor, 0);
  if (sumBalances !== 0) {
    throw new ExpenseValidationError([
      `Balance conservation invariant violated: sum(balances) = ${sumBalances}, expected 0.`,
    ]);
  }

  return balances;
}

/**
 * Helper factory to create a strongly-typed Expense object with optional validation.
 */
export function createExpense(
  params: {
    id: string;
    groupId: string;
    description: string;
    totalMinor: number;
    currency?: "INR";
    payments: Payment[];
    shares: Share[];
  },
  validParticipantIds?: readonly string[] | ReadonlySet<string>,
): Expense {
  const expense: Expense = {
    id: params.id,
    groupId: params.groupId,
    description: params.description,
    totalMinor: params.totalMinor,
    currency: params.currency ?? "INR",
    payments: params.payments,
    shares: params.shares,
  };

  if (validParticipantIds) {
    assertValidExpense(expense, validParticipantIds);
  }

  return expense;
}
