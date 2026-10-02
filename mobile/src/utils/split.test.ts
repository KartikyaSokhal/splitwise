import assert from "node:assert/strict";
import test from "node:test";

import {
  formatMinorAsInr,
  MoneyValidationError,
  parseInrToMinor,
} from "./money.ts";
import {
  reconcileCustomSplit,
  splitCustom,
  splitEqually,
  sumSharesMinor,
} from "./split.ts";

const people = [{ id: "a" }, { id: "b" }, { id: "c" }];

test("parses and formats INR amounts without floating-point rounding", () => {
  assert.equal(parseInrToMinor("320"), 32000);
  assert.equal(parseInrToMinor("320.5"), 32050);
  assert.equal(parseInrToMinor("0.01"), 1);
  assert.equal(parseInrToMinor(" 12.34 "), 1234);
  assert.equal(formatMinorAsInr(32050), "320.50");
  assert.equal(formatMinorAsInr(1), "0.01");
});

test("rejects invalid INR input instead of rounding it", () => {
  for (const value of ["", "-1", "+1", "1.234", ".50", "1.", "1e2", "NaN"]) {
    assert.throws(() => parseInrToMinor(value), MoneyValidationError);
  }
  assert.throws(() => formatMinorAsInr(-1), MoneyValidationError);
  assert.throws(() => formatMinorAsInr(1.5), MoneyValidationError);
  assert.throws(() => parseInrToMinor("90071992547409.92"), MoneyValidationError);
});

test("equal split gives leftover paise to the first people in stable order", () => {
  const shares = splitEqually(10, people);

  assert.deepEqual(shares, [
    { personId: "a", shareMinor: 4 },
    { personId: "b", shareMinor: 3 },
    { personId: "c", shareMinor: 3 },
  ]);
  assert.equal(sumSharesMinor(shares), 10);
});

test("equal split assigns multiple leftover paise in stable order", () => {
  const shares = splitEqually(11, people);

  assert.deepEqual(shares, [
    { personId: "a", shareMinor: 4 },
    { personId: "b", shareMinor: 4 },
    { personId: "c", shareMinor: 3 },
  ]);
  assert.equal(sumSharesMinor(shares), 11);
});

test("equal split supports zero and one-person totals while preserving invariants", () => {
  const zeroShares = splitEqually(0, people);
  assert.deepEqual(zeroShares, [
    { personId: "a", shareMinor: 0 },
    { personId: "b", shareMinor: 0 },
    { personId: "c", shareMinor: 0 },
  ]);

  const onePerson = splitEqually(999, [{ id: "only" }]);
  assert.deepEqual(onePerson, [{ personId: "only", shareMinor: 999 }]);
  assert.equal(sumSharesMinor(zeroShares), 0);
  assert.equal(sumSharesMinor(onePerson), 999);
});

test("equal splitting rejects invalid totals and people", () => {
  assert.throws(() => splitEqually(-1, people), MoneyValidationError);
  assert.throws(() => splitEqually(1.5, people), MoneyValidationError);
  assert.throws(() => splitEqually(100, []), MoneyValidationError);
  assert.throws(() => splitEqually(100, [{ id: "a" }, { id: "a" }]), MoneyValidationError);
  assert.throws(() => splitEqually(100, [{ id: " " }]), MoneyValidationError);
  assert.throws(
    () => splitEqually(100, [null] as unknown as { id: string }[]),
    MoneyValidationError,
  );
});

test("custom reconciliation exposes positive remainder for an under-allocation", () => {
  const reconciliation = reconcileCustomSplit(1000, [
    { personId: "a", shareMinor: 400 },
    { personId: "b", shareMinor: 500 },
  ]);

  assert.deepEqual(reconciliation, {
    allocatedMinor: 900,
    remainingMinor: 100,
    isReconciled: false,
  });
  assert.throws(
    () =>
      splitCustom(1000, [
        { personId: "a", shareMinor: 400 },
        { personId: "b", shareMinor: 500 },
      ]),
    MoneyValidationError,
  );
  assert.throws(
    () =>
      sumSharesMinor([
        { personId: "a", shareMinor: Number.MAX_SAFE_INTEGER },
        { personId: "b", shareMinor: 1 },
      ]),
    MoneyValidationError,
  );
});

test("custom reconciliation exposes negative remainder for an over-allocation", () => {
  const reconciliation = reconcileCustomSplit(1000, [
    { personId: "a", shareMinor: 600 },
    { personId: "b", shareMinor: 500 },
  ]);

  assert.equal(reconciliation.remainingMinor, -100);
  assert.equal(reconciliation.isReconciled, false);
  assert.throws(
    () =>
      splitCustom(1000, [
        { personId: "a", shareMinor: 600 },
        { personId: "b", shareMinor: 500 },
      ]),
    MoneyValidationError,
  );
});

test("confirmed custom splitting preserves explicit allocations exactly", () => {
  const shares = splitCustom(1000, [
    { personId: "a", shareMinor: 333 },
    { personId: "b", shareMinor: 333 },
    { personId: "c", shareMinor: 334 },
  ]);

  assert.deepEqual(shares, [
    { personId: "a", shareMinor: 333 },
    { personId: "b", shareMinor: 333 },
    { personId: "c", shareMinor: 334 },
  ]);
  assert.equal(sumSharesMinor(shares), 1000);
});

test("custom splitting rejects invalid people, shares, and totals", () => {
  assert.throws(() => reconcileCustomSplit(100, []), MoneyValidationError);
  assert.throws(
    () => reconcileCustomSplit(-1, [{ personId: "a", shareMinor: 0 }]),
    MoneyValidationError,
  );
  assert.throws(
    () => reconcileCustomSplit(100, [{ personId: "a", shareMinor: -1 }]),
    MoneyValidationError,
  );
  assert.throws(
    () => reconcileCustomSplit(100, [{ personId: "a", shareMinor: 1.5 }]),
    MoneyValidationError,
  );
  assert.throws(
    () =>
      reconcileCustomSplit(100, [
        { personId: "a", shareMinor: 50 },
        { personId: "a", shareMinor: 50 },
      ]),
    MoneyValidationError,
  );
});

test("equal split invariant holds across totals and participant counts", () => {
  for (let count = 1; count <= 10; count += 1) {
    const participants = Array.from({ length: count }, (_, index) => ({
      id: `person-${index}`,
    }));

    for (let totalMinor = 0; totalMinor <= 500; totalMinor += 1) {
      const shares = splitEqually(totalMinor, participants);
      assert.equal(sumSharesMinor(shares), totalMinor);
    }
  }
});
