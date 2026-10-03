import assert from "node:assert/strict";
import test from "node:test";

import type { Expense } from "../types/expense.ts";
import {
  assertValidExpense,
  calculateBalances,
  createExpense,
  ExpenseValidationError,
  validateExpense,
} from "./expense.ts";

const groupMembers = ["alice", "bob", "charlie", "david"];

test("1. Single payer covering entire expense", () => {
  const expense: Expense = {
    id: "exp-1",
    groupId: "grp-1",
    description: "Dinner",
    totalMinor: 100000, // ₹1,000
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 100000 }],
    shares: [
      { personId: "alice", amountMinor: 50000 },
      { personId: "bob", amountMinor: 50000 },
    ],
  };

  const validation = validateExpense(expense, groupMembers);
  assert.equal(validation.isValid, true);
  assert.equal(validation.errors.length, 0);

  const balances = calculateBalances(expense, ["alice", "bob"]);
  assert.deepEqual(balances, [
    { personId: "alice", balanceMinor: 50000 }, // Paid 1000, owes 500 -> receives 500
    { personId: "bob", balanceMinor: -50000 },  // Paid 0, owes 500 -> owes 500
  ]);
});

test("2. Two payers", () => {
  const expense: Expense = {
    id: "exp-2",
    groupId: "grp-1",
    description: "Groceries",
    totalMinor: 150000, // ₹1,500
    currency: "INR",
    payments: [
      { payerId: "alice", amountMinor: 100000 }, // ₹1,000
      { payerId: "bob", amountMinor: 50000 },    // ₹500
    ],
    shares: [
      { personId: "alice", amountMinor: 50000 },
      { personId: "bob", amountMinor: 50000 },
      { personId: "charlie", amountMinor: 50000 },
    ],
  };

  const balances = calculateBalances(expense, ["alice", "bob", "charlie"]);
  assert.deepEqual(balances, [
    { personId: "alice", balanceMinor: 50000 }, // +500
    { personId: "bob", balanceMinor: 0 },       // 0
    { personId: "charlie", balanceMinor: -50000 }, // -500
  ]);
});

test("3. Multiple payers", () => {
  const expense: Expense = {
    id: "exp-3",
    groupId: "grp-1",
    description: "Party",
    totalMinor: 300000, // ₹3,000
    currency: "INR",
    payments: [
      { payerId: "alice", amountMinor: 150000 },
      { payerId: "bob", amountMinor: 100000 },
      { payerId: "charlie", amountMinor: 50000 },
    ],
    shares: [
      { personId: "alice", amountMinor: 75000 },
      { personId: "bob", amountMinor: 75000 },
      { personId: "charlie", amountMinor: 75000 },
      { personId: "david", amountMinor: 75000 },
    ],
  };

  const balances = calculateBalances(expense, [
    "alice",
    "bob",
    "charlie",
    "david",
  ]);
  assert.deepEqual(balances, [
    { personId: "alice", balanceMinor: 75000 },   // +₹750
    { personId: "bob", balanceMinor: 25000 },     // +₹250
    { personId: "charlie", balanceMinor: -25000 }, // -₹250
    { personId: "david", balanceMinor: -75000 },  // -₹750
  ]);
});

test("4. Payment amounts exactly equal total", () => {
  const expense: Expense = {
    id: "exp-4",
    groupId: "grp-1",
    description: "Lunch",
    totalMinor: 120000,
    currency: "INR",
    payments: [
      { payerId: "alice", amountMinor: 60000 },
      { payerId: "bob", amountMinor: 60000 },
    ],
    shares: [
      { personId: "alice", amountMinor: 60000 },
      { personId: "bob", amountMinor: 60000 },
    ],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, true);
  const mismatchIssue = result.issues.find(
    (i) => i.code === "PAYMENTS_SUM_MISMATCH",
  );
  assert.equal(mismatchIssue, undefined);
});

test("5. Payment total too low", () => {
  const expense: Expense = {
    id: "exp-5",
    groupId: "grp-1",
    description: "Coffee",
    totalMinor: 50000, // ₹500
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 40000 }], // ₹400
    shares: [{ personId: "alice", amountMinor: 50000 }],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((i) => i.code === "PAYMENTS_SUM_MISMATCH"));
  assert.throws(
    () => calculateBalances(expense, ["alice"]),
    ExpenseValidationError,
  );
});

test("6. Payment total too high", () => {
  const expense: Expense = {
    id: "exp-6",
    groupId: "grp-1",
    description: "Coffee",
    totalMinor: 50000, // ₹500
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 60000 }], // ₹600
    shares: [{ personId: "alice", amountMinor: 50000 }],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((i) => i.code === "PAYMENTS_SUM_MISMATCH"));
});

test("7. Zero payment rejected", () => {
  const expense: Expense = {
    id: "exp-7",
    groupId: "grp-1",
    description: "Taxi",
    totalMinor: 50000,
    currency: "INR",
    payments: [
      { payerId: "alice", amountMinor: 50000 },
      { payerId: "bob", amountMinor: 0 },
    ],
    shares: [
      { personId: "alice", amountMinor: 25000 },
      { personId: "bob", amountMinor: 25000 },
    ],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((i) => i.code === "INVALID_PAYMENT_AMOUNT"));
});

test("8. Negative payment rejected", () => {
  const expense: Expense = {
    id: "exp-8",
    groupId: "grp-1",
    description: "Snacks",
    totalMinor: 50000,
    currency: "INR",
    payments: [
      { payerId: "alice", amountMinor: 60000 },
      { payerId: "bob", amountMinor: -10000 },
    ],
    shares: [{ personId: "alice", amountMinor: 50000 }],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((i) => i.code === "INVALID_PAYMENT_AMOUNT"));
});

test("9. Payer not in group rejected", () => {
  const expense: Expense = {
    id: "exp-9",
    groupId: "grp-1",
    description: "Movie",
    totalMinor: 100000,
    currency: "INR",
    payments: [{ payerId: "stranger", amountMinor: 100000 }],
    shares: [{ personId: "alice", amountMinor: 100000 }],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((i) => i.code === "PAYER_NOT_IN_GROUP"));
  assert.throws(
    () => calculateBalances(expense, groupMembers),
    ExpenseValidationError,
  );
});

test("10. Share total too low", () => {
  const expense: Expense = {
    id: "exp-10",
    groupId: "grp-1",
    description: "Dessert",
    totalMinor: 100000,
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 100000 }],
    shares: [
      { personId: "alice", amountMinor: 40000 },
      { personId: "bob", amountMinor: 40000 }, // sum 80000 !== 100000
    ],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((i) => i.code === "SHARES_SUM_MISMATCH"));
});

test("11. Share total too high", () => {
  const expense: Expense = {
    id: "exp-11",
    groupId: "grp-1",
    description: "Dessert",
    totalMinor: 100000,
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 100000 }],
    shares: [
      { personId: "alice", amountMinor: 60000 },
      { personId: "bob", amountMinor: 60000 }, // sum 120000 !== 100000
    ],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((i) => i.code === "SHARES_SUM_MISMATCH"));
});

test("12. Negative share rejected", () => {
  const expense: Expense = {
    id: "exp-12",
    groupId: "grp-1",
    description: "Supplies",
    totalMinor: 100000,
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 100000 }],
    shares: [
      { personId: "alice", amountMinor: 120000 },
      { personId: "bob", amountMinor: -20000 },
    ],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((i) => i.code === "INVALID_SHARE_AMOUNT"));
});

test("13. Share participant not in group rejected", () => {
  const expense: Expense = {
    id: "exp-13",
    groupId: "grp-1",
    description: "Hotel",
    totalMinor: 100000,
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 100000 }],
    shares: [{ personId: "stranger", amountMinor: 100000 }],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(
    result.issues.some((i) => i.code === "SHARE_PARTICIPANT_NOT_IN_GROUP"),
  );
});

test("14. Correct positive balance (creditor)", () => {
  const expense: Expense = {
    id: "exp-14",
    groupId: "grp-1",
    description: "Dinner",
    totalMinor: 100000,
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 100000 }],
    shares: [
      { personId: "alice", amountMinor: 40000 },
      { personId: "bob", amountMinor: 60000 },
    ],
  };

  const balances = calculateBalances(expense, ["alice", "bob"]);
  const aliceBalance = balances.find((b) => b.personId === "alice");
  assert.equal(aliceBalance?.balanceMinor, 60000); // +60000
});

test("15. Correct negative balance (debtor)", () => {
  const expense: Expense = {
    id: "exp-15",
    groupId: "grp-1",
    description: "Dinner",
    totalMinor: 100000,
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 100000 }],
    shares: [
      { personId: "alice", amountMinor: 40000 },
      { personId: "bob", amountMinor: 60000 },
    ],
  };

  const balances = calculateBalances(expense, ["alice", "bob"]);
  const bobBalance = balances.find((b) => b.personId === "bob");
  assert.equal(bobBalance?.balanceMinor, -60000); // -60000
});

test("16. Correct zero balance (settled)", () => {
  const expense: Expense = {
    id: "exp-16",
    groupId: "grp-1",
    description: "Tickets",
    totalMinor: 100000,
    currency: "INR",
    payments: [
      { payerId: "alice", amountMinor: 50000 },
      { payerId: "bob", amountMinor: 50000 },
    ],
    shares: [
      { personId: "alice", amountMinor: 50000 },
      { personId: "bob", amountMinor: 50000 },
    ],
  };

  const balances = calculateBalances(expense, ["alice", "bob"]);
  assert.deepEqual(balances, [
    { personId: "alice", balanceMinor: 0 },
    { personId: "bob", balanceMinor: 0 },
  ]);
});

test("17. Multiple payers + multiple shares", () => {
  const expense: Expense = {
    id: "exp-17",
    groupId: "grp-1",
    description: "Resort Stay",
    totalMinor: 600000, // ₹6,000
    currency: "INR",
    payments: [
      { payerId: "alice", amountMinor: 350000 }, // ₹3,500
      { payerId: "bob", amountMinor: 200000 },   // ₹2,000
      { payerId: "charlie", amountMinor: 50000 },// ₹500
    ],
    shares: [
      { personId: "alice", amountMinor: 100000 },   // owes ₹1,000 -> balance +₹2,500
      { personId: "bob", amountMinor: 150000 },     // owes ₹1,500 -> balance +₹500
      { personId: "charlie", amountMinor: 200000 }, // owes ₹2,000 -> balance -₹1,500
      { personId: "david", amountMinor: 150000 },   // owes ₹1,500 -> balance -₹1,500
    ],
  };

  const balances = calculateBalances(expense, [
    "alice",
    "bob",
    "charlie",
    "david",
  ]);
  assert.deepEqual(balances, [
    { personId: "alice", balanceMinor: 250000 },
    { personId: "bob", balanceMinor: 50000 },
    { personId: "charlie", balanceMinor: -150000 },
    { personId: "david", balanceMinor: -150000 },
  ]);
});

test("18. Balance conservation: sum(balances) === 0 (INV-B2)", () => {
  const expense: Expense = {
    id: "exp-18",
    groupId: "grp-1",
    description: "Road Trip Fuel",
    totalMinor: 489733,
    currency: "INR",
    payments: [
      { payerId: "alice", amountMinor: 300000 },
      { payerId: "bob", amountMinor: 189733 },
    ],
    shares: [
      { personId: "alice", amountMinor: 122433 },
      { personId: "bob", amountMinor: 122433 },
      { personId: "charlie", amountMinor: 122433 },
      { personId: "david", amountMinor: 122434 },
    ],
  };

  const balances = calculateBalances(expense, groupMembers);
  const sumBalances = balances.reduce((sum, b) => sum + b.balanceMinor, 0);
  assert.equal(sumBalances, 0);
});

test("19. Deterministic participant ordering", () => {
  const expense: Expense = {
    id: "exp-19",
    groupId: "grp-1",
    description: "Dinner",
    totalMinor: 150000,
    currency: "INR",
    payments: [
      { payerId: "alice", amountMinor: 100000 },
      { payerId: "bob", amountMinor: 50000 },
    ],
    shares: [
      { personId: "alice", amountMinor: 50000 },
      { personId: "bob", amountMinor: 50000 },
      { personId: "charlie", amountMinor: 50000 },
    ],
  };

  const order1 = ["charlie", "bob", "alice"];
  const balances1 = calculateBalances(expense, order1);
  assert.deepEqual(
    balances1.map((b) => b.personId),
    ["charlie", "bob", "alice"],
  );

  const order2 = ["bob", "alice", "charlie"];
  const balances2 = calculateBalances(expense, order2);
  assert.deepEqual(
    balances2.map((b) => b.personId),
    ["bob", "alice", "charlie"],
  );
});

test("20. Zero-total edge case, according to existing money rules", () => {
  // A zero total bill is valid only when every final share is zero
  const zeroExpense: Expense = {
    id: "exp-20",
    groupId: "grp-1",
    description: "Zero Expense",
    totalMinor: 0,
    currency: "INR",
    payments: [],
    shares: [
      { personId: "alice", amountMinor: 0 },
      { personId: "bob", amountMinor: 0 },
    ],
  };

  const result = validateExpense(zeroExpense, groupMembers);
  assert.equal(result.isValid, true);

  const balances = calculateBalances(zeroExpense, ["alice", "bob"]);
  assert.deepEqual(balances, [
    { personId: "alice", balanceMinor: 0 },
    { personId: "bob", balanceMinor: 0 },
  ]);
  assert.equal(
    balances.reduce((s, b) => s + b.balanceMinor, 0),
    0,
  );

  // If a zero-total expense has a positive payment, it must be rejected
  const invalidZeroExpense: Expense = {
    id: "exp-20-bad",
    groupId: "grp-1",
    description: "Zero with payment",
    totalMinor: 0,
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 100 }],
    shares: [{ personId: "alice", amountMinor: 0 }],
  };
  const invalidResult = validateExpense(invalidZeroExpense, groupMembers);
  assert.equal(invalidResult.isValid, false);
  assert.ok(
    invalidResult.issues.some((i) => i.code === "PAYMENTS_SUM_MISMATCH"),
  );
});

test("21. Reject duplicate payment entries for the same payer", () => {
  const expense: Expense = {
    id: "exp-21",
    groupId: "grp-1",
    description: "Duplicate payer",
    totalMinor: 100000,
    currency: "INR",
    payments: [
      { payerId: "alice", amountMinor: 60000 },
      { payerId: "alice", amountMinor: 40000 },
    ],
    shares: [{ personId: "alice", amountMinor: 100000 }],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((i) => i.code === "DUPLICATE_PAYER"));
});

test("22. Reject duplicate share entries for the same participant", () => {
  const expense: Expense = {
    id: "exp-22",
    groupId: "grp-1",
    description: "Duplicate share",
    totalMinor: 100000,
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 100000 }],
    shares: [
      { personId: "alice", amountMinor: 50000 },
      { personId: "alice", amountMinor: 50000 },
    ],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((i) => i.code === "DUPLICATE_SHARE_PARTICIPANT"));
});

test("23. Reject unsupported currency", () => {
  const expense = {
    id: "exp-23",
    groupId: "grp-1",
    description: "USD expense",
    totalMinor: 100000,
    currency: "USD" as unknown as "INR",
    payments: [{ payerId: "alice", amountMinor: 100000 }],
    shares: [{ personId: "alice", amountMinor: 100000 }],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((i) => i.code === "INVALID_CURRENCY"));
});

test("24. Reject non-integer float amounts", () => {
  const expense: Expense = {
    id: "exp-24",
    groupId: "grp-1",
    description: "Float amount",
    totalMinor: 100000,
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 100000.5 }],
    shares: [{ personId: "alice", amountMinor: 100000 }],
  };

  const result = validateExpense(expense, groupMembers);
  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((i) => i.code === "INVALID_PAYMENT_AMOUNT"));
});

test("25. Group member with no payment and no share is included in balances with 0 balance", () => {
  const expense: Expense = {
    id: "exp-25",
    groupId: "grp-1",
    description: "Activity",
    totalMinor: 100000,
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 100000 }],
    shares: [
      { personId: "alice", amountMinor: 50000 },
      { personId: "bob", amountMinor: 50000 },
    ],
  };

  // charlie is in the group but not part of this expense
  const balances = calculateBalances(expense, ["alice", "bob", "charlie"]);
  assert.deepEqual(balances, [
    { personId: "alice", balanceMinor: 50000 },
    { personId: "bob", balanceMinor: -50000 },
    { personId: "charlie", balanceMinor: 0 },
  ]);
});

test("26. assertValidExpense and createExpense factory enforce validation", () => {
  const valid = createExpense(
    {
      id: "exp-26",
      groupId: "grp-1",
      description: "Team Lunch",
      totalMinor: 200000,
      payments: [{ payerId: "alice", amountMinor: 200000 }],
      shares: [
        { personId: "alice", amountMinor: 100000 },
        { personId: "bob", amountMinor: 100000 },
      ],
    },
    groupMembers,
  );
  assert.equal(valid.currency, "INR");
  assert.equal(valid.totalMinor, 200000);

  assert.throws(
    () =>
      createExpense(
        {
          id: "exp-26-bad",
          groupId: "grp-1",
          description: "Bad",
          totalMinor: 100000,
          payments: [{ payerId: "alice", amountMinor: 50000 }], // Underpaid
          shares: [{ personId: "alice", amountMinor: 100000 }],
        },
        groupMembers,
      ),
    ExpenseValidationError,
  );
});

test("27. Reject duplicate IDs in participantOrder", () => {
  const expense: Expense = {
    id: "exp-27",
    groupId: "grp-1",
    description: "Test",
    totalMinor: 100000,
    currency: "INR",
    payments: [{ payerId: "alice", amountMinor: 100000 }],
    shares: [{ personId: "alice", amountMinor: 100000 }],
  };

  assert.throws(
    () => calculateBalances(expense, ["alice", "alice"]),
    ExpenseValidationError,
  );
});
