import { isValidId, isValidLabel, MoneyValidationError } from "./money.ts";
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

  // Runtime metadata/membership validation precedes every use of caller data.
  if (
    !isValidId(expense.id) ||
    !isValidId(expense.groupId) ||
    !isValidLabel(expense.description, 500)
  ) {
    addIssue(
      "INVALID_METADATA",
      "Expense id, groupId and description must be valid bounded text.",
    );
  }
  if (
    !(
      Array.isArray(validParticipantIds) || validParticipantIds instanceof Set
    ) ||
    [...validParticipantIds].some((id) => !isValidId(id))
  ) {
    addIssue(
      "INVALID_PARTICIPANTS",
      "Participants must be an array or Set of valid IDs.",
    );
    return { isValid: false, errors: issues.map((i) => i.message), issues };
  }
  if (
    Array.isArray(validParticipantIds) &&
    new Set(validParticipantIds).size !== validParticipantIds.length
  ) {
    addIssue("INVALID_PARTICIPANTS", "Participant IDs must be unique.");
  }
  if (expense.currency !== "INR") {
    addIssue("INVALID_CURRENCY", "Currency must be 'INR'.");
  }

  // Total minor validation
  const isTotalValidNumber =
    typeof expense.totalMinor === "number" &&
    Number.isSafeInteger(expense.totalMinor) &&
    expense.totalMinor >= 0;

  if (!isTotalValidNumber) {
    addIssue(
      "INVALID_TOTAL",
      "totalMinor must be a non-negative safe integer of paise.",
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
    let totalPaymentsMinor = 0n;

    for (const payment of expense.payments) {
      if (!payment || typeof payment !== "object") {
        addIssue("INVALID_PAYMENT_AMOUNT", "Payment entry must be an object.");
        continue;
      }

      const payerId = payment.payerId;
      if (!isValidId(payerId)) {
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
          "Payment amount must be a positive safe integer of paise.",
          isValidId(payerId) ? payerId : undefined,
        );
      } else {
        totalPaymentsMinor += BigInt(amount);
      }
    }

    if (
      isTotalValidNumber &&
      totalPaymentsMinor !== BigInt(expense.totalMinor)
    ) {
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
    let totalSharesMinor = 0n;

    for (const share of expense.shares) {
      if (!share || typeof share !== "object") {
        addIssue("INVALID_SHARE_AMOUNT", "Share entry must be an object.");
        continue;
      }

      const personId = share.personId;
      if (!isValidId(personId)) {
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
          "Share amount must be a non-negative safe integer of paise.",
          isValidId(personId) ? personId : undefined,
        );
      } else {
        totalSharesMinor += BigInt(amount);
      }
    }

    if (isTotalValidNumber && totalSharesMinor !== BigInt(expense.totalMinor)) {
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
  if (
    !expense ||
    typeof expense !== "object" ||
    !Array.isArray(expense.payments) ||
    !Array.isArray(expense.shares) ||
    expense.payments.some((p) => !p || !isValidId(p.payerId)) ||
    expense.shares.some((s) => !s || !isValidId(s.personId)) ||
    (participantOrder !== undefined &&
      (!Array.isArray(participantOrder) ||
        participantOrder.some((id) => !isValidId(id))))
  ) {
    throw new ExpenseValidationError([
      "Invalid expense or participant order shape.",
    ]);
  }
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
  const sumBalances = balances.reduce(
    (sum, b) => sum + BigInt(b.balanceMinor),
    0n,
  );
  if (sumBalances !== 0n) {
    throw new ExpenseValidationError([
      `Balance conservation invariant violated: sum(balances) = ${sumBalances}, expected 0.`,
    ]);
  }

  return balances;
}

/**
 * Validated factory; optional membership context is not authorization.
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
  if (
    !params ||
    typeof params !== "object" ||
    !Array.isArray(params.payments) ||
    !Array.isArray(params.shares)
  ) {
    throw new ExpenseValidationError(["Invalid expense input."]);
  }
  const expense: Expense = {
    id: params.id,
    groupId: params.groupId,
    description: params.description,
    totalMinor: params.totalMinor,
    currency: params.currency === undefined ? "INR" : params.currency,
    payments: params.payments,
    shares: params.shares,
  };

  // Validate even without external membership context; that context is NOT authorization.
  if (validParticipantIds !== undefined)
    assertValidExpense(expense, validParticipantIds);
  calculateBalances(
    expense,
    validParticipantIds !== undefined ? [...validParticipantIds] : undefined,
  );
  return {
    ...expense,
    payments: expense.payments.map((p) => ({ ...p })),
    shares: expense.shares.map((s) => ({ ...s })),
  };
}
