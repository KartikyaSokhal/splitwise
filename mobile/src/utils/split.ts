import { assertMinorAmount, isValidId, MoneyValidationError } from "./money.ts";

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

function assertParticipants(participants: readonly SplitParticipant[]): void {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new MoneyValidationError("At least one person is required.");
  }

  const ids = new Set<string>();
  for (const participant of participants) {
    if (typeof participant !== "object" || participant === null) {
      throw new MoneyValidationError(
        "Each person must be an object with an id.",
      );
    }
    if (!isValidId(participant.id)) {
      throw new MoneyValidationError("Each person must have a non-empty id.");
    }
    if (ids.has(participant.id)) {
      throw new MoneyValidationError("Each person id must be unique.");
    }
    ids.add(participant.id);
  }
}

function assertCustomShares(shares: readonly SplitShare[]): void {
  if (!Array.isArray(shares) || shares.length === 0) {
    throw new MoneyValidationError("At least one custom share is required.");
  }

  const ids = new Set<string>();
  for (const share of shares) {
    if (typeof share !== "object" || share === null) {
      throw new MoneyValidationError(
        "Each custom share must be an object with a person id and amount.",
      );
    }
    if (!isValidId(share.personId)) {
      throw new MoneyValidationError(
        "Each custom share must have a non-empty person id.",
      );
    }
    if (ids.has(share.personId)) {
      throw new MoneyValidationError(
        "Each custom share person id must be unique.",
      );
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

export type PinnedSplitShare = SplitShare & {
  isPinned: boolean;
};

export type PinningRedistributionResult = {
  shares: PinnedSplitShare[];
  isValid: boolean;
  pinnedTotalMinor: number;
  remainingMinor: number;
  error?: string;
};

/**
 * Redistributes remaining paise across unpinned participants when custom shares are edited.
 * Pinned shares remain fixed. Unpinned shares receive equal distribution of (total - pinnedTotal)
 * using deterministic remainder logic in stable order.
 */
export function redistributeWithPinning(
  totalMinor: number,
  shares: readonly PinnedSplitShare[],
): PinningRedistributionResult {
  assertMinorAmount(totalMinor, "total");
  assertCustomShares(shares);

  const pinnedShares = shares.filter((s) => s.isPinned);
  if (shares.some((s) => typeof s.isPinned !== "boolean")) {
    throw new MoneyValidationError("Every pin must be a boolean.");
  }
  const unpinnedShares = shares.filter((s) => !s.isPinned);

  const pinnedTotalMinor = pinnedShares.reduce(
    (sum, s) => sum + s.shareMinor,
    0,
  );

  if (!Number.isSafeInteger(pinnedTotalMinor)) {
    throw new MoneyValidationError("Pinned shares total is too large.");
  }

  const remainingMinor = totalMinor - pinnedTotalMinor;

  // Case 1: Pinned amounts exceed total
  if (remainingMinor < 0) {
    return {
      shares: shares.map((s) => ({ ...s })),
      isValid: false,
      pinnedTotalMinor,
      remainingMinor,
      error: "Pinned amounts exceed total.",
    };
  }

  // Case 2: All participants are pinned
  if (unpinnedShares.length === 0) {
    if (remainingMinor !== 0) {
      return {
        shares: shares.map((s) => ({ ...s })),
        isValid: false,
        pinnedTotalMinor,
        remainingMinor,
        error: "All shares are pinned but do not sum to total.",
      };
    }
    return {
      shares: shares.map((s) => ({ ...s })),
      isValid: true,
      pinnedTotalMinor,
      remainingMinor: 0,
    };
  }

  // Case 3: Distribute remainingMinor equally among unpinned participants
  const base = Math.floor(remainingMinor / unpinnedShares.length);
  const remainder = remainingMinor % unpinnedShares.length;

  let unpinnedIndex = 0;
  const resultShares = shares.map((share) => {
    if (share.isPinned) {
      return { ...share };
    }
    const shareMinor = base + (unpinnedIndex < remainder ? 1 : 0);
    unpinnedIndex += 1;
    return {
      ...share,
      shareMinor,
    };
  });

  return {
    shares: resultShares,
    isValid: true,
    pinnedTotalMinor,
    remainingMinor: 0,
  };
}
