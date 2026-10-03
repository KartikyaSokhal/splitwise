import assert from "node:assert/strict";
import test from "node:test";

import { MoneyValidationError } from "../utils/money.ts";
import {
  redistributeWithPinning,
  splitCustom,
  sumSharesMinor,
  type PinnedSplitShare,
} from "../utils/split.ts";
import {
  parsePinnedCustomShares,
  redistributeCustomShares,
  calculateEqualSplit,
} from "../state/splitLogic.ts";
import type { Person } from "../types/index.ts";

test("pin one participant above equal share: unpinned shares decrease and sum equals total", () => {
  const totalMinor = 100000; // ₹1,000.00
  const shares: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 40000, isPinned: true }, // ₹400.00 (above ~₹333.33)
    { personId: "p2", shareMinor: 33333, isPinned: false },
    { personId: "p3", shareMinor: 33333, isPinned: false },
  ];

  const result = redistributeWithPinning(totalMinor, shares);
  assert.equal(result.isValid, true);
  assert.equal(result.pinnedTotalMinor, 40000);
  assert.equal(result.remainingMinor, 0);

  // p1 remains 40000
  assert.equal(result.shares[0].personId, "p1");
  assert.equal(result.shares[0].shareMinor, 40000);
  assert.equal(result.shares[0].isPinned, true);

  // remaining 60000 split equally between p2 and p3 (30000 each)
  assert.equal(result.shares[1].personId, "p2");
  assert.equal(result.shares[1].shareMinor, 30000);
  assert.equal(result.shares[1].isPinned, false);

  assert.equal(result.shares[2].personId, "p3");
  assert.equal(result.shares[2].shareMinor, 30000);
  assert.equal(result.shares[2].isPinned, false);

  assert.equal(sumSharesMinor(result.shares), totalMinor);
  assert.doesNotThrow(() => splitCustom(totalMinor, result.shares));
});

test("pin one participant below equal share: unpinned shares increase and sum equals total", () => {
  const totalMinor = 100000; // ₹1,000.00
  const shares: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 20000, isPinned: true }, // ₹200.00 (below ~₹333.33)
    { personId: "p2", shareMinor: 33333, isPinned: false },
    { personId: "p3", shareMinor: 33333, isPinned: false },
  ];

  const result = redistributeWithPinning(totalMinor, shares);
  assert.equal(result.isValid, true);
  assert.equal(result.pinnedTotalMinor, 20000);
  assert.equal(result.remainingMinor, 0);

  assert.equal(result.shares[0].shareMinor, 20000);
  // remaining 80000 split equally between p2 and p3 (40000 each)
  assert.equal(result.shares[1].shareMinor, 40000);
  assert.equal(result.shares[2].shareMinor, 40000);

  assert.equal(sumSharesMinor(result.shares), totalMinor);
  assert.doesNotThrow(() => splitCustom(totalMinor, result.shares));
});

test("pin all participants with exact total: valid, all locked and exact sum", () => {
  const totalMinor = 100000;
  const shares: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 40000, isPinned: true },
    { personId: "p2", shareMinor: 35000, isPinned: true },
    { personId: "p3", shareMinor: 25000, isPinned: true },
  ];

  const result = redistributeWithPinning(totalMinor, shares);
  assert.equal(result.isValid, true);
  assert.equal(result.pinnedTotalMinor, 100000);
  assert.equal(result.remainingMinor, 0);
  assert.equal(result.shares[0].shareMinor, 40000);
  assert.equal(result.shares[1].shareMinor, 35000);
  assert.equal(result.shares[2].shareMinor, 25000);

  assert.equal(sumSharesMinor(result.shares), totalMinor);
  assert.doesNotThrow(() => splitCustom(totalMinor, result.shares));
});

test("pin all participants with incorrect total (under-allocation): marked invalid", () => {
  const totalMinor = 100000;
  const shares: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 40000, isPinned: true },
    { personId: "p2", shareMinor: 35000, isPinned: true },
    { personId: "p3", shareMinor: 20000, isPinned: true }, // Sum = 95000 != 100000
  ];

  const result = redistributeWithPinning(totalMinor, shares);
  assert.equal(result.isValid, false);
  assert.equal(result.pinnedTotalMinor, 95000);
  assert.equal(result.remainingMinor, 5000);
  assert.equal(result.error, "All shares are pinned but do not sum to total.");

  // Values must NOT be silently changed
  assert.equal(result.shares[0].shareMinor, 40000);
  assert.equal(result.shares[1].shareMinor, 35000);
  assert.equal(result.shares[2].shareMinor, 20000);
});

test("pin all participants with incorrect total (over-allocation): marked invalid", () => {
  const totalMinor = 100000;
  const shares: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 40000, isPinned: true },
    { personId: "p2", shareMinor: 40000, isPinned: true },
    { personId: "p3", shareMinor: 30000, isPinned: true }, // Sum = 110000 > 100000
  ];

  const result = redistributeWithPinning(totalMinor, shares);
  assert.equal(result.isValid, false);
  assert.equal(result.pinnedTotalMinor, 110000);
  assert.equal(result.remainingMinor, -10000);
  assert.equal(result.error, "Pinned amounts exceed total.");
});

test("pinned amount greater than total: marked invalid and values not modified", () => {
  const totalMinor = 100000;
  const shares: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 120000, isPinned: true }, // > 100000
    { personId: "p2", shareMinor: 30000, isPinned: false },
    { personId: "p3", shareMinor: 30000, isPinned: false },
  ];

  const result = redistributeWithPinning(totalMinor, shares);
  assert.equal(result.isValid, false);
  assert.equal(result.pinnedTotalMinor, 120000);
  assert.equal(result.remainingMinor, -20000);
  assert.equal(result.error, "Pinned amounts exceed total.");

  // Unpinned values are preserved without silent mutation
  assert.equal(result.shares[0].shareMinor, 120000);
  assert.equal(result.shares[1].shareMinor, 30000);
  assert.equal(result.shares[2].shareMinor, 30000);
});

test("pin one participant to the entire total: unpinned receive 0 without negative shares", () => {
  const totalMinor = 100000;
  const shares: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 100000, isPinned: true },
    { personId: "p2", shareMinor: 50000, isPinned: false },
    { personId: "p3", shareMinor: 50000, isPinned: false },
  ];

  const result = redistributeWithPinning(totalMinor, shares);
  assert.equal(result.isValid, true);
  assert.equal(result.pinnedTotalMinor, 100000);
  assert.equal(result.remainingMinor, 0);

  assert.equal(result.shares[0].shareMinor, 100000);
  assert.equal(result.shares[1].shareMinor, 0);
  assert.equal(result.shares[2].shareMinor, 0);

  assert.equal(sumSharesMinor(result.shares), totalMinor);
  assert.doesNotThrow(() => splitCustom(totalMinor, result.shares));
});

test("unpin participant: previously pinned participant participates in redistribution", () => {
  const totalMinor = 100000;
  // Initially, p1 and p2 were pinned
  const sharesBeforeUnpin: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 40000, isPinned: true },
    { personId: "p2", shareMinor: 35000, isPinned: true },
    { personId: "p3", shareMinor: 25000, isPinned: false },
  ];

  // User unpins p2
  const sharesAfterUnpin: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 40000, isPinned: true },
    { personId: "p2", shareMinor: 35000, isPinned: false }, // Now unpinned
    { personId: "p3", shareMinor: 25000, isPinned: false },
  ];

  const result = redistributeWithPinning(totalMinor, sharesAfterUnpin);
  assert.equal(result.isValid, true);
  assert.equal(result.pinnedTotalMinor, 40000);
  // remaining 60000 is distributed across unpinned p2 and p3 (30000 each)
  assert.equal(result.shares[0].shareMinor, 40000);
  assert.equal(result.shares[1].shareMinor, 30000);
  assert.equal(result.shares[2].shareMinor, 30000);

  assert.equal(sumSharesMinor(result.shares), totalMinor);
  assert.doesNotThrow(() => splitCustom(totalMinor, result.shares));
});

test("reset to equal: unpins everyone and yields standard deterministic equal split", () => {
  const totalMinor = 100000;
  const allUnpinnedShares: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 0, isPinned: false },
    { personId: "p2", shareMinor: 0, isPinned: false },
    { personId: "p3", shareMinor: 0, isPinned: false },
  ];

  const result = redistributeWithPinning(totalMinor, allUnpinnedShares);
  assert.equal(result.isValid, true);
  assert.equal(result.shares[0].shareMinor, 33334);
  assert.equal(result.shares[1].shareMinor, 33333);
  assert.equal(result.shares[2].shareMinor, 33333);
  assert.equal(sumSharesMinor(result.shares), totalMinor);
});

test("one-person split with pinning", () => {
  const totalMinor = 50000;

  // Unpinned one-person
  const unpinned: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 0, isPinned: false },
  ];
  const r1 = redistributeWithPinning(totalMinor, unpinned);
  assert.equal(r1.isValid, true);
  assert.equal(r1.shares[0].shareMinor, 50000);

  // Pinned to exact total
  const pinnedExact: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 50000, isPinned: true },
  ];
  const r2 = redistributeWithPinning(totalMinor, pinnedExact);
  assert.equal(r2.isValid, true);
  assert.equal(r2.shares[0].shareMinor, 50000);

  // Pinned to different amount (< total)
  const pinnedLess: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 40000, isPinned: true },
  ];
  const r3 = redistributeWithPinning(totalMinor, pinnedLess);
  assert.equal(r3.isValid, false);
  assert.equal(r3.error, "All shares are pinned but do not sum to total.");

  // Pinned to different amount (> total)
  const pinnedMore: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 60000, isPinned: true },
  ];
  const r4 = redistributeWithPinning(totalMinor, pinnedMore);
  assert.equal(r4.isValid, false);
  assert.equal(r4.error, "Pinned amounts exceed total.");
});

test("deterministic remainder distribution: leftover paise go to first unpinned in stable order", () => {
  const totalMinor = 100000; // 100000 paise
  // Pin p1 to 33335. Remaining = 66665 paise across 2 unpinned (p2, p3).
  // 66665 / 2 = 33332 base, remainder 1.
  // First unpinned in order (p2) gets 33332 + 1 = 33333.
  // Second unpinned (p3) gets 33332.
  const shares: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 33335, isPinned: true },
    { personId: "p2", shareMinor: 0, isPinned: false },
    { personId: "p3", shareMinor: 0, isPinned: false },
  ];

  const result = redistributeWithPinning(totalMinor, shares);
  assert.equal(result.isValid, true);
  assert.equal(result.shares[0].shareMinor, 33335);
  assert.equal(result.shares[1].shareMinor, 33333);
  assert.equal(result.shares[2].shareMinor, 33332);
  assert.equal(sumSharesMinor(result.shares), totalMinor);

  // Stable order preserved when pinned person is in the middle
  const sharesMiddlePinned: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 0, isPinned: false },
    { personId: "p2", shareMinor: 33335, isPinned: true },
    { personId: "p3", shareMinor: 0, isPinned: false },
  ];
  const resultMiddle = redistributeWithPinning(totalMinor, sharesMiddlePinned);
  assert.equal(resultMiddle.isValid, true);
  // Unpinned in stable order: p1 is first, p3 is second
  assert.equal(resultMiddle.shares[0].personId, "p1");
  assert.equal(resultMiddle.shares[0].shareMinor, 33333); // gets remainder
  assert.equal(resultMiddle.shares[1].personId, "p2");
  assert.equal(resultMiddle.shares[1].shareMinor, 33335); // pinned
  assert.equal(resultMiddle.shares[2].personId, "p3");
  assert.equal(resultMiddle.shares[2].shareMinor, 33332);
  assert.equal(sumSharesMinor(resultMiddle.shares), totalMinor);
});

test("no negative shares: guarantees non-negative shares even when total is 0 or remaining is 0", () => {
  const zeroTotal = 0;
  const zeroShares: PinnedSplitShare[] = [
    { personId: "p1", shareMinor: 0, isPinned: true },
    { personId: "p2", shareMinor: 0, isPinned: false },
  ];
  const rZero = redistributeWithPinning(zeroTotal, zeroShares);
  assert.equal(rZero.isValid, true);
  assert.equal(rZero.shares[0].shareMinor, 0);
  assert.equal(rZero.shares[1].shareMinor, 0);

  // Negative minor amounts throw MoneyValidationError
  assert.throws(
    () =>
      redistributeWithPinning(1000, [
        { personId: "p1", shareMinor: -500, isPinned: true },
      ]),
    MoneyValidationError,
  );
});

test("total invariant holds across arbitrary participant counts and pin combinations", () => {
  const testTotals = [1, 2, 3, 10, 100, 999, 10000, 123456];
  const participantCounts = [2, 3, 4, 5, 8];

  for (const total of testTotals) {
    for (const count of participantCounts) {
      const participants: PinnedSplitShare[] = Array.from(
        { length: count },
        (_, i) => ({
          personId: `person-${i}`,
          shareMinor: 0,
          isPinned: i === 0, // Pin first person to a fraction of total
        }),
      );

      // Pin first participant to floor(total / 2)
      participants[0].shareMinor = Math.floor(total / 2);

      const result = redistributeWithPinning(total, participants);
      assert.equal(result.isValid, true);
      assert.equal(sumSharesMinor(result.shares), total);
      assert.doesNotThrow(() => splitCustom(total, result.shares));

      // Check non-negative
      for (const s of result.shares) {
        assert.ok(s.shareMinor >= 0);
      }
    }
  }
});

test("redistributeCustomShares integration with string inputs and pinnedIds map", () => {
  const people: Person[] = [
    { id: "1", name: "Alice" },
    { id: "2", name: "Bob" },
    { id: "3", name: "Charlie" },
  ];
  const totalMinor = 120000; // ₹1,200.00
  const inputs = {
    "1": "500.00", // Pinned: ₹500.00
    "2": "350.00",
    "3": "350.00",
  };
  const pinnedIds = { "1": true };

  const { newInputs, redistribution, hasInvalidFormat } =
    redistributeCustomShares(totalMinor, people, inputs, pinnedIds);

  assert.equal(hasInvalidFormat, false);
  assert.equal(redistribution.isValid, true);
  assert.equal(newInputs["1"], "500.00");
  // Remaining 70000 paise / 2 = 35000 each -> "350.00"
  assert.equal(newInputs["2"], "350.00");
  assert.equal(newInputs["3"], "350.00");
});
