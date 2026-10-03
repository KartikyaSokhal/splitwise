import assert from "node:assert/strict";
import test from "node:test";

import type { ParticipantBalance } from "../types/expense.ts";
import {
  SettlementValidationError,
  suggestSettlements,
} from "./settlement.ts";

/**
 * Helper to apply suggested transfers to a copy of balances and assert that all net balances become 0.
 */
function assertTransfersSettleBalances(
  balances: readonly ParticipantBalance[],
): void {
  const transfers = suggestSettlements(balances);
  const net = new Map<string, number>();

  for (const b of balances) {
    net.set(b.personId, b.balanceMinor);
  }

  for (const t of transfers) {
    assert.ok(t.amountMinor > 0, "Transfer amount must be strictly positive");
    assert.notEqual(
      t.fromPersonId,
      t.toPersonId,
      "Self-transfers are forbidden",
    );
    net.set(t.fromPersonId, (net.get(t.fromPersonId) ?? 0) + t.amountMinor);
    net.set(t.toPersonId, (net.get(t.toPersonId) ?? 0) - t.amountMinor);
  }

  for (const [personId, balance] of net.entries()) {
    assert.equal(
      balance,
      0,
      `Balance for '${personId}' was not settled to 0 (remaining: ${balance})`,
    );
  }
}

// -----------------------------------------------------------------------------
// Section 5 Examples from Specification
// -----------------------------------------------------------------------------

test("Example 1: 1 creditor (+₹1,000) and 2 debtors (-₹600, -₹400)", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 100000 },
    { personId: "B", balanceMinor: -60000 },
    { personId: "C", balanceMinor: -40000 },
  ];

  const transfers = suggestSettlements(balances);
  assert.deepEqual(transfers, [
    { fromPersonId: "B", toPersonId: "A", amountMinor: 60000 },
    { fromPersonId: "C", toPersonId: "A", amountMinor: 40000 },
  ]);
  assertTransfersSettleBalances(balances);
});

test("Example 2: 1 debtor (-₹1,000) and 2 creditors (+₹700, +₹300)", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: -100000 },
    { personId: "B", balanceMinor: 70000 },
    { personId: "C", balanceMinor: 30000 },
  ];

  const transfers = suggestSettlements(balances);
  assert.deepEqual(transfers, [
    { fromPersonId: "A", toPersonId: "B", amountMinor: 70000 },
    { fromPersonId: "A", toPersonId: "C", amountMinor: 30000 },
  ]);
  assertTransfersSettleBalances(balances);
});

test("Example 3: A +₹700, B -₹400, C -₹300", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 70000 },
    { personId: "B", balanceMinor: -40000 },
    { personId: "C", balanceMinor: -30000 },
  ];

  const transfers = suggestSettlements(balances);
  assert.deepEqual(transfers, [
    { fromPersonId: "B", toPersonId: "A", amountMinor: 40000 },
    { fromPersonId: "C", toPersonId: "A", amountMinor: 30000 },
  ]);
  assertTransfersSettleBalances(balances);
});

test("Example 4: A +₹500, B +₹300, C -₹600, D -₹200 (stable order)", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 50000 },
    { personId: "B", balanceMinor: 30000 },
    { personId: "C", balanceMinor: -60000 },
    { personId: "D", balanceMinor: -20000 },
  ];

  const transfers = suggestSettlements(balances);
  assert.deepEqual(transfers, [
    { fromPersonId: "C", toPersonId: "A", amountMinor: 50000 },
    { fromPersonId: "C", toPersonId: "B", amountMinor: 10000 },
    { fromPersonId: "D", toPersonId: "B", amountMinor: 20000 },
  ]);
  assertTransfersSettleBalances(balances);
});

// -----------------------------------------------------------------------------
// Section 6 Edge Cases
// -----------------------------------------------------------------------------

test("1. Empty balances returns empty array", () => {
  assert.deepEqual(suggestSettlements([]), []);
});

test("2. All zero balances returns empty array", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 0 },
    { personId: "B", balanceMinor: 0 },
    { personId: "C", balanceMinor: 0 },
  ];
  assert.deepEqual(suggestSettlements(balances), []);
});

test("3. One positive and one negative balance", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 25000 },
    { personId: "B", balanceMinor: -25000 },
  ];

  const transfers = suggestSettlements(balances);
  assert.deepEqual(transfers, [
    { fromPersonId: "B", toPersonId: "A", amountMinor: 25000 },
  ]);
  assertTransfersSettleBalances(balances);
});

test("4. One creditor and multiple debtors", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 90000 },
    { personId: "B", balanceMinor: -30000 },
    { personId: "C", balanceMinor: -40000 },
    { personId: "D", balanceMinor: -20000 },
  ];

  const transfers = suggestSettlements(balances);
  assert.deepEqual(transfers, [
    { fromPersonId: "B", toPersonId: "A", amountMinor: 30000 },
    { fromPersonId: "C", toPersonId: "A", amountMinor: 40000 },
    { fromPersonId: "D", toPersonId: "A", amountMinor: 20000 },
  ]);
  assertTransfersSettleBalances(balances);
});

test("5. Multiple creditors and one debtor", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: -90000 },
    { personId: "B", balanceMinor: 30000 },
    { personId: "C", balanceMinor: 40000 },
    { personId: "D", balanceMinor: 20000 },
  ];

  const transfers = suggestSettlements(balances);
  assert.deepEqual(transfers, [
    { fromPersonId: "A", toPersonId: "B", amountMinor: 30000 },
    { fromPersonId: "A", toPersonId: "C", amountMinor: 40000 },
    { fromPersonId: "A", toPersonId: "D", amountMinor: 20000 },
  ]);
  assertTransfersSettleBalances(balances);
});

test("6. Multiple creditors and multiple debtors", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 100000 },
    { personId: "B", balanceMinor: 50000 },
    { personId: "C", balanceMinor: -80000 },
    { personId: "D", balanceMinor: -70000 },
  ];

  const transfers = suggestSettlements(balances);
  assert.deepEqual(transfers, [
    { fromPersonId: "C", toPersonId: "A", amountMinor: 80000 },
    { fromPersonId: "D", toPersonId: "A", amountMinor: 20000 },
    { fromPersonId: "D", toPersonId: "B", amountMinor: 50000 },
  ]);
  assertTransfersSettleBalances(balances);
});

test("7. Exact equal matching (1-to-1 pairing)", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 50000 },
    { personId: "B", balanceMinor: -50000 },
    { personId: "C", balanceMinor: 30000 },
    { personId: "D", balanceMinor: -30000 },
  ];

  const transfers = suggestSettlements(balances);
  assert.deepEqual(transfers, [
    { fromPersonId: "B", toPersonId: "A", amountMinor: 50000 },
    { fromPersonId: "D", toPersonId: "C", amountMinor: 30000 },
  ]);
  assertTransfersSettleBalances(balances);
});

test("8. One side reaching zero before the other", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 100000 }, // Creditor
    { personId: "B", balanceMinor: -40000 },  // Debtor (exhausts first)
    { personId: "C", balanceMinor: -60000 },  // Debtor (exhausts second, matches remaining A)
  ];

  const transfers = suggestSettlements(balances);
  assert.equal(transfers.length, 2);
  assert.equal(transfers[0].amountMinor, 40000);
  assert.equal(transfers[1].amountMinor, 60000);
  assertTransfersSettleBalances(balances);
});

test("9. Both sides reaching zero simultaneously", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 50000 },
    { personId: "B", balanceMinor: -50000 },
    { personId: "C", balanceMinor: 20000 },
    { personId: "D", balanceMinor: -20000 },
  ];

  const transfers = suggestSettlements(balances);
  assert.equal(transfers.length, 2);
  assert.deepEqual(transfers, [
    { fromPersonId: "B", toPersonId: "A", amountMinor: 50000 },
    { fromPersonId: "D", toPersonId: "C", amountMinor: 20000 },
  ]);
  assertTransfersSettleBalances(balances);
});

test("10. Stable ordering without balance sorting", () => {
  // If sorted by magnitude, D (-₹100) or C (-₹400) would be first.
  // In stable order, B (-₹200) must be processed first.
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 70000 },
    { personId: "B", balanceMinor: -20000 },
    { personId: "C", balanceMinor: -40000 },
    { personId: "D", balanceMinor: -10000 },
  ];

  const transfers = suggestSettlements(balances);
  assert.deepEqual(
    transfers.map((t) => t.fromPersonId),
    ["B", "C", "D"],
  );
  assertTransfersSettleBalances(balances);
});

test("11. Input order affects deterministic output", () => {
  const order1: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 50000 },
    { personId: "B", balanceMinor: 30000 },
    { personId: "C", balanceMinor: -60000 },
    { personId: "D", balanceMinor: -20000 },
  ];

  // Reversing debtors: D before C
  const order2: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 50000 },
    { personId: "B", balanceMinor: 30000 },
    { personId: "D", balanceMinor: -20000 },
    { personId: "C", balanceMinor: -60000 },
  ];

  const transfers1 = suggestSettlements(order1);
  const transfers2 = suggestSettlements(order2);

  // In order1, C (-600) is matched first: C -> A ₹500
  assert.equal(transfers1[0].fromPersonId, "C");
  // In order2, D (-200) is matched first: D -> A ₹200
  assert.equal(transfers2[0].fromPersonId, "D");
  assert.equal(transfers2[0].amountMinor, 20000);

  assertTransfersSettleBalances(order1);
  assertTransfersSettleBalances(order2);
});

test("12. Input array is not mutated", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 50000 },
    { personId: "B", balanceMinor: -50000 },
  ];
  const originalLength = balances.length;
  const firstItem = balances[0];

  suggestSettlements(balances);

  assert.equal(balances.length, originalLength);
  assert.equal(balances[0], firstItem);
});

test("13. Input balance objects are not mutated", () => {
  const b1 = { personId: "A", balanceMinor: 50000 };
  const b2 = { personId: "B", balanceMinor: -50000 };
  const balances = [b1, b2];

  suggestSettlements(balances);

  assert.equal(b1.balanceMinor, 50000);
  assert.equal(b2.balanceMinor, -50000);
});

test("14. Conservation violation is rejected", () => {
  // sum is +1000, not 0
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 50000 },
    { personId: "B", balanceMinor: -49000 },
  ];

  assert.throws(() => suggestSettlements(balances), SettlementValidationError);
});

test("15. Unsafe or non-integer balance values are rejected", () => {
  const floatBalance: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 50.5 },
    { personId: "B", balanceMinor: -50.5 },
  ];
  assert.throws(
    () => suggestSettlements(floatBalance),
    SettlementValidationError,
  );

  const unsafeBalance: ParticipantBalance[] = [
    { personId: "A", balanceMinor: Number.MAX_SAFE_INTEGER + 1 },
    { personId: "B", balanceMinor: -(Number.MAX_SAFE_INTEGER + 1) },
  ];
  assert.throws(
    () => suggestSettlements(unsafeBalance),
    SettlementValidationError,
  );
});

test("16. Invariant INV-S2: No self-transfers", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 100000 },
    { personId: "B", balanceMinor: -40000 },
    { personId: "C", balanceMinor: -60000 },
  ];

  const transfers = suggestSettlements(balances);
  for (const t of transfers) {
    assert.notEqual(t.fromPersonId, t.toPersonId);
  }
});

test("17. Invariant INV-S1: Every transfer amount is > 0", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 100000 },
    { personId: "B", balanceMinor: -100000 },
    { personId: "C", balanceMinor: 0 },
  ];

  const transfers = suggestSettlements(balances);
  assert.equal(transfers.length, 1);
  assert.ok(transfers[0].amountMinor > 0);
});

test("18. Invariant INV-SS1: Total transferred equals sum of positive balances and abs(negative balances)", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 350000 },
    { personId: "B", balanceMinor: 150000 },
    { personId: "C", balanceMinor: -200000 },
    { personId: "D", balanceMinor: -300000 },
  ];

  const totalPositive = balances
    .filter((b) => b.balanceMinor > 0)
    .reduce((sum, b) => sum + b.balanceMinor, 0);

  const totalNegativeAbs = balances
    .filter((b) => b.balanceMinor < 0)
    .reduce((sum, b) => sum + Math.abs(b.balanceMinor), 0);

  const transfers = suggestSettlements(balances);
  const totalTransferred = transfers.reduce(
    (sum, t) => sum + t.amountMinor,
    0,
  );

  assert.equal(totalTransferred, totalPositive);
  assert.equal(totalTransferred, totalNegativeAbs);
  assert.equal(totalTransferred, 500000);
});

test("19. Invariant INV-SS2: Applying transfers results in all zero balances", () => {
  const balances: ParticipantBalance[] = [
    { personId: "P1", balanceMinor: 12345 },
    { personId: "P2", balanceMinor: 67890 },
    { personId: "P3", balanceMinor: -30000 },
    { personId: "P4", balanceMinor: -50235 },
  ];

  assertTransfersSettleBalances(balances);
});

test("20. Invariant INV-SS3: Transfer count is at most n - 1 for n non-zero participants", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 10000 },
    { personId: "B", balanceMinor: 20000 },
    { personId: "C", balanceMinor: 30000 },
    { personId: "D", balanceMinor: -15000 },
    { personId: "E", balanceMinor: -25000 },
    { personId: "F", balanceMinor: -20000 },
  ];

  const nonZeroCount = balances.filter((b) => b.balanceMinor !== 0).length;
  const transfers = suggestSettlements(balances);

  assert.ok(
    transfers.length <= nonZeroCount - 1,
    `Transfers count (${transfers.length}) must be <= ${nonZeroCount - 1}`,
  );
  assertTransfersSettleBalances(balances);
});

test("21. Reject duplicate participant IDs in balances", () => {
  const balances: ParticipantBalance[] = [
    { personId: "A", balanceMinor: 10000 },
    { personId: "A", balanceMinor: -10000 },
  ];

  assert.throws(() => suggestSettlements(balances), SettlementValidationError);
});
