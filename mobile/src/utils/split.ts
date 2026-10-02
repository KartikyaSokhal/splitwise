import { assertMinorAmount, MoneyValidationError } from "./money.ts";

export type SplitParticipant = {
  id: string;
};

export type SplitShare = {
  personId: string;
  shareMinor: number;
};

export type CustomSplitReconciliation = {
  allocatedMinor: number;
  /** `totalMinor - allocatedMinor`; positive means money remains to assign. */
  remainingMinor: number;
  isReconciled: boolean;
};

function assertParticipants(
  participants: readonly SplitParticipant[],
): void {
  if (participants.length === 0) {
    throw new MoneyValidationError("At least one person is required.");
  }

  const ids = new Set<string>();
  for (const participant of participants) {
    if (typeof participant !== "object" || participant === null) {
      throw new MoneyValidationError("Each person must be an object with an id.");
    }
    if (typeof participant.id !== "string" || participant.id.trim() === "") {
      throw new MoneyValidationError("Each person must have a non-empty id.");
    }
    if (ids.has(participant.id)) {
      throw new MoneyValidationError("Each person id must be unique.");
    }
    ids.add(participant.id);
  }
}

function assertCustomShares(shares: readonly SplitShare[]): void {
  if (shares.length === 0) {
    throw new MoneyValidationError("At least one custom share is required.");
  }

  const ids = new Set<string>();
  for (const share of shares) {
    if (typeof share !== "object" || share === null) {
      throw new MoneyValidationError(
        "Each custom share must be an object with a person id and amount.",
      );
    }
    if (typeof share.personId !== "string" || share.personId.trim() === "") {
      throw new MoneyValidationError(
        "Each custom share must have a non-empty person id.",
      );
    }
    if (ids.has(share.personId)) {
      throw new MoneyValidationError("Each custom share person id must be unique.");
    }
    ids.add(share.personId);
    assertMinorAmount(share.shareMinor, "custom share");
  }
}

/**
 * Splits `totalMinor` equally in the input's stable person order.
 * The first people receive any leftover paise.
 */
export function splitEqually(
  totalMinor: number,
  participants: readonly SplitParticipant[],
): SplitShare[] {
  assertMinorAmount(totalMinor, "total");
  assertParticipants(participants);

  const base = Math.floor(totalMinor / participants.length);
  const remainder = totalMinor % participants.length;

  return participants.map((participant, index) => ({
    personId: participant.id,
    shareMinor: base + (index < remainder ? 1 : 0),
  }));
}

/**
 * Calculates the custom-split remainder while it is being edited. This does
 * not redistribute money and can represent an under- or over-allocation.
 */
export function reconcileCustomSplit(
  totalMinor: number,
  shares: readonly SplitShare[],
): CustomSplitReconciliation {
  assertMinorAmount(totalMinor, "total");
  assertCustomShares(shares);

  const allocatedMinor = shares.reduce(
    (sum, share) => sum + share.shareMinor,
    0,
  );

  if (!Number.isSafeInteger(allocatedMinor)) {
    throw new MoneyValidationError("Custom shares total is too large.");
  }

  const remainingMinor = totalMinor - allocatedMinor;
  return {
    allocatedMinor,
    remainingMinor,
    isReconciled: remainingMinor === 0,
  };
}

/**
 * Returns a confirmed custom split only when every paise has been explicitly
 * assigned. It never corrects a shortfall or overage.
 */
export function splitCustom(
  totalMinor: number,
  shares: readonly SplitShare[],
): SplitShare[] {
  const reconciliation = reconcileCustomSplit(totalMinor, shares);

  if (!reconciliation.isReconciled) {
    throw new MoneyValidationError(
      "Custom shares must add up to the total exactly.",
    );
  }

  return shares.map((share) => ({ ...share }));
}

export function sumSharesMinor(shares: readonly SplitShare[]): number {
  assertCustomShares(shares);
  const totalMinor = shares.reduce((sum, share) => sum + share.shareMinor, 0);
  assertMinorAmount(totalMinor, "sum of shares");
  return totalMinor;
}
