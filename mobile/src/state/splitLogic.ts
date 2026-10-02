import { formatMinorAsInr, parseInrToMinor } from "../utils/money.ts";
import {
  reconcileCustomSplit,
  splitCustom,
  splitEqually,
  type CustomSplitReconciliation,
  type SplitParticipant,
  type SplitShare,
} from "../utils/split.ts";
import type { Person, PersonShareResult, SplitMethod } from "../types/index.ts";

export type CustomSharesInput = Record<string, string>;

export function calculateEqualSplit(
  totalMinor: number,
  people: readonly Person[],
): PersonShareResult[] {
  if (people.length === 0) return [];
  const participants: SplitParticipant[] = people.map((p) => ({ id: p.id }));
  const shares = splitEqually(totalMinor, participants);

  return shares.map((share) => {
    const person = people.find((p) => p.id === share.personId);
    return {
      personId: share.personId,
      name: person ? person.name : share.personId,
      isYou: person?.isYou,
      shareMinor: share.shareMinor,
      formattedShare: formatMinorAsInr(share.shareMinor),
    };
  });
}

export function parseCustomShares(
  people: readonly Person[],
  inputs: CustomSharesInput,
): { shares: SplitShare[]; hasInvalidFormat: boolean } {
  let hasInvalidFormat = false;
  const shares: SplitShare[] = [];

  for (const person of people) {
    const raw = inputs[person.id] ?? "0";
    const trimmed = raw.trim();
    if (trimmed === "") {
      shares.push({ personId: person.id, shareMinor: 0 });
      continue;
    }
    try {
      const minor = parseInrToMinor(trimmed);
      shares.push({ personId: person.id, shareMinor: minor });
    } catch {
      hasInvalidFormat = true;
      shares.push({ personId: person.id, shareMinor: 0 });
    }
  }

  return { shares, hasInvalidFormat };
}

export function evaluateCustomSplit(
  totalMinor: number,
  people: readonly Person[],
  inputs: CustomSharesInput,
): {
  reconciliation: CustomSplitReconciliation | null;
  hasInvalidFormat: boolean;
  shares: PersonShareResult[];
} {
  if (people.length === 0) {
    return {
      reconciliation: null,
      hasInvalidFormat: false,
      shares: [],
    };
  }

  const { shares: splitShares, hasInvalidFormat } = parseCustomShares(
    people,
    inputs,
  );

  let reconciliation: CustomSplitReconciliation | null = null;
  try {
    reconciliation = reconcileCustomSplit(totalMinor, splitShares);
  } catch {
    reconciliation = null;
  }

  const shares: PersonShareResult[] = splitShares.map((s) => {
    const person = people.find((p) => p.id === s.personId);
    return {
      personId: s.personId,
      name: person ? person.name : s.personId,
      isYou: person?.isYou,
      shareMinor: s.shareMinor,
      formattedShare: formatMinorAsInr(s.shareMinor),
    };
  });

  return {
    reconciliation,
    hasInvalidFormat,
    shares,
  };
}
