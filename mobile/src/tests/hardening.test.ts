import test from "node:test";
import assert from "node:assert/strict";
import {
  MoneyValidationError,
  parseInrToMinor,
  formatMinorAsInr,
} from "../utils/money.ts";
import {
  splitEqually,
  splitCustom,
  redistributeWithPinning,
} from "../utils/split.ts";
import {
  calculateBalances,
  createExpense,
  validateExpense,
  ExpenseValidationError,
} from "../utils/expense.ts";
import {
  suggestSettlements,
  SettlementValidationError,
} from "../utils/settlement.ts";
import { generateShareText } from "../utils/share.ts";
import { prepareBillShare, shareCurrentBill } from "../state/shareBoundary.ts";
import type { Expense } from "../types/expense.ts";

const M = Number.MAX_SAFE_INTEGER;
const expense: Expense = {
  id: "e",
  groupId: "g",
  description: "Dinner",
  currency: "INR",
  totalMinor: 10,
  payments: [{ payerId: "a", amountMinor: 10 }],
  shares: [{ personId: "b", amountMinor: 10 }],
};
const balances = (xs: number[]) =>
  xs.map((balanceMinor, i) => ({ personId: `p${i}`, balanceMinor }));
function assertSettled(xs: number[]) {
  const input = balances(xs);
  const before = structuredClone(input);
  const transfers = suggestSettlements(input);
  const rest = new Map(input.map((b) => [b.personId, BigInt(b.balanceMinor)]));
  for (const t of transfers) {
    assert(Number.isSafeInteger(t.amountMinor) && t.amountMinor > 0);
    assert.notEqual(t.fromPersonId, t.toPersonId);
    rest.set(t.fromPersonId, rest.get(t.fromPersonId)! + BigInt(t.amountMinor));
    rest.set(t.toPersonId, rest.get(t.toPersonId)! - BigInt(t.amountMinor));
  }
  assert([...rest.values()].every((v) => v === 0n));
  assert.equal(
    transfers.reduce((s, t) => s + BigInt(t.amountMinor), 0n),
    xs.filter((x) => x > 0).reduce((s, x) => s + BigInt(x), 0n),
  );
  assert(transfers.length <= Math.max(0, xs.filter((x) => x !== 0).length - 1));
  assert.deepEqual(input, before);
}

test("exact settlement rejects false conservation and accepts cancellation beyond safe aggregate", () => {
  assert.throws(
    () => suggestSettlements(balances([M, 2, -M, -1])),
    SettlementValidationError,
  );
  for (const xs of [
    [M, 2, -M, -2],
    [M, M, -M, -M],
    [-M, M],
    [M, -M + 1, -1],
    [],
  ]) {
    for (let i = 0; i <= xs.length; i++)
      assertSettled([...xs.slice(i), ...xs.slice(0, i)]);
  }
});
test("settlement exact oracle across seeded large combinations and permutations", () => {
  for (let i = 1; i <= 500; i++) {
    const x = M - i * 179,
      y = M - i * 397;
    assertSettled([x, y, -x, -y, 1, -1]);
    assertSettled([-y, x, -1, y, 1, -x]);
    assert.throws(
      () => suggestSettlements(balances([x, y, -x, -y + 1])),
      SettlementValidationError,
    );
  }
});
test("money is exact at max boundary and rejects malformed runtime text", () => {
  assert.equal(parseInrToMinor("90071992547409.91"), M);
  for (let i = 0; i < 300; i++)
    assert.equal(parseInrToMinor(formatMinorAsInr(M - i)), M - i);
  for (const value of [
    null,
    undefined,
    1,
    {},
    [],
    "90071992547409.92",
    "1e3",
    "-1",
    "1.001",
    "9".repeat(129),
  ]) {
    assert.throws(() => parseInrToMinor(value as string), MoneyValidationError);
  }
});
test("split and pin APIs fail deliberately on malformed shapes, ids and values", () => {
  for (const value of [
    null,
    undefined,
    {},
    "a",
    1,
    [null],
    [{}],
    [{ id: " " }],
    [{ id: " a" }],
  ]) {
    assert.throws(() => splitEqually(1, value as never), MoneyValidationError);
  }
  for (const value of [NaN, Infinity, -Infinity, -1, 1.5, M + 1]) {
    assert.throws(
      () => splitEqually(value, [{ id: "a" }]),
      MoneyValidationError,
    );
    assert.throws(
      () => splitCustom(1, [{ personId: "a", shareMinor: value }]),
      MoneyValidationError,
    );
  }
  for (const pin of [undefined, null, 1, "false"])
    assert.throws(
      () =>
        redistributeWithPinning(1, [
          { personId: "a", shareMinor: 1, isPinned: pin as unknown as boolean },
        ]),
      MoneyValidationError,
    );
  assert.throws(
    () =>
      splitCustom(M, [
        { personId: "a", shareMinor: M },
        { personId: "b", shareMinor: M },
      ]),
    MoneyValidationError,
  );
});
test("settlement runtime boundaries deliberately reject wrong arrays, IDs and numbers", () => {
  for (const value of [
    null,
    undefined,
    {},
    "bad",
    [null],
    [{}],
    [{ personId: " a", balanceMinor: 0 }],
    [{ personId: "a", balanceMinor: NaN }],
    [{ personId: "a", balanceMinor: Infinity }],
    [{ personId: "a", balanceMinor: 1.2 }],
    [
      { personId: "a", balanceMinor: 0 },
      { personId: "a", balanceMinor: 0 },
    ],
  ]) {
    assert.throws(
      () => suggestSettlements(value as never),
      SettlementValidationError,
    );
  }
});
test("expense malformed runtime boundaries return issues or domain errors, never TypeError", () => {
  for (const value of [
    null,
    undefined,
    1,
    [],
    {},
    { ...expense, payments: null },
    { ...expense, shares: [null] },
    { ...expense, id: "" },
    { ...expense, groupId: " g" },
    { ...expense, description: "" },
    { ...expense, currency: Symbol("bad") },
    { ...expense, totalMinor: Object.create(null) },
    {
      ...expense,
      payments: [{ payerId: Symbol("bad"), amountMinor: Symbol("bad") }],
    },
  ]) {
    assert.equal(validateExpense(value as Expense, ["a", "b"]).isValid, false);
    assert.throws(
      () => calculateBalances(value as Expense),
      ExpenseValidationError,
    );
  }
  for (const ids of [null, {}, [""], ["a", "a"], [" a"], [1]]) {
    assert.equal(validateExpense(expense, ids as never).isValid, false);
    assert.throws(
      () => calculateBalances(expense, ids as never),
      ExpenseValidationError,
    );
  }
  assert.equal(
    validateExpense(
      {
        ...expense,
        payments: [
          { payerId: "a", amountMinor: M },
          { payerId: "b", amountMinor: M },
        ],
      },
      ["a", "b"],
    ).isValid,
    false,
  );
});
test("expense factory always validates and detaches caller arrays", () => {
  assert.throws(
    () => createExpense({ ...expense, currency: null } as never),
    ExpenseValidationError,
  );
  assert.throws(
    () => createExpense({ ...expense, totalMinor: 11 }),
    ExpenseValidationError,
  );
  const copy = createExpense(expense);
  copy.payments[0].amountMinor = 9;
  assert.equal(expense.payments[0].amountMinor, 10);
});
const bill = {
  totalInput: "100",
  people: [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ],
  splitMethod: "custom" as const,
  customShares: { a: "50", b: "50" },
};
test("final sharing independently rejects unreconciled, malformed or substituted state", async () => {
  for (const invalid of [
    { ...bill, customShares: { a: "150", b: "50" } },
    { ...bill, customShares: { a: "bad", b: "100" } },
    { ...bill, customShares: { a: "-1", b: "101" } },
    { ...bill, customShares: { a: "50" } },
    { ...bill, people: [bill.people[0], bill.people[0]] },
    { ...bill, totalInput: "0" },
    { ...bill, customShares: { ...bill.customShares, c: "0" } },
  ]) {
    let called = false;
    await assert.rejects(
      shareCurrentBill(
        () => invalid as typeof bill,
        async () => {
          called = true;
          return { action: "sharedAction" };
        },
      ),
      MoneyValidationError,
    );
    assert.equal(called, false);
  }
  assert.throws(
    () => generateShareText(10000, [{ name: "A", shareMinor: 1 }]),
    MoneyValidationError,
  );
  assert.throws(
    () => generateShareText(1, [{ name: "A\nTotal: 0", shareMinor: 1 }]),
    MoneyValidationError,
  );
  assert.match(prepareBillShare(bill), /Total: ₹100.00/);
});
test("native boundary handles dismissal and errors without claiming success", async () => {
  assert.equal(
    await shareCurrentBill(
      () => bill,
      async () => ({ action: "dismissedAction" }),
    ),
    false,
  );
  assert.equal(
    await shareCurrentBill(
      () => bill,
      async () => ({ action: "sharedAction" }),
    ),
    true,
  );
  await assert.rejects(
    shareCurrentBill(
      () => bill,
      async () => {
        throw new Error("native failure");
      },
    ),
  );
});
