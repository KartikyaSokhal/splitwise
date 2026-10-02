import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateEqualSplit,
  evaluateCustomSplit,
} from "./splitLogic.ts";
import type { Person } from "../types/index.ts";

const samplePeople: Person[] = [
  { id: "1", name: "Kartikya", isYou: true },
  { id: "2", name: "Rahul" },
  { id: "3", name: "Aman" },
];

test("calculateEqualSplit: ₹1,000 (100000 paise) across 3 people produces ₹334.00, ₹333.00, ₹333.00", () => {
  const shares = calculateEqualSplit(100000, samplePeople);
  assert.equal(shares.length, 3);
  assert.equal(shares[0].shareMinor, 33334);
  assert.equal(shares[0].formattedShare, "333.34");
  assert.equal(shares[1].shareMinor, 33333);
  assert.equal(shares[1].formattedShare, "333.33");
  assert.equal(shares[2].shareMinor, 33333);
  assert.equal(shares[2].formattedShare, "333.33");

  const totalPaise = shares.reduce((acc, s) => acc + s.shareMinor, 0);
  assert.equal(totalPaise, 100000);
});

test("calculateEqualSplit: ₹1,240 (124000 paise) across 3 people produces ₹413.34, ₹413.33, ₹413.33", () => {
  const shares = calculateEqualSplit(124000, samplePeople);
  assert.equal(shares.length, 3);
  assert.equal(shares[0].shareMinor, 41334);
  assert.equal(shares[0].formattedShare, "413.34");
  assert.equal(shares[1].shareMinor, 41333);
  assert.equal(shares[1].formattedShare, "413.33");
  assert.equal(shares[2].shareMinor, 41333);
  assert.equal(shares[2].formattedShare, "413.33");

  const totalPaise = shares.reduce((acc, s) => acc + s.shareMinor, 0);
  assert.equal(totalPaise, 124000);
});

test("evaluateCustomSplit: ₹1,000 with 400, 350, 250 is fully reconciled", () => {
  const result = evaluateCustomSplit(100000, samplePeople, {
    "1": "400",
    "2": "350",
    "3": "250",
  });

  assert.equal(result.hasInvalidFormat, false);
  assert.ok(result.reconciliation);
  assert.equal(result.reconciliation.isReconciled, true);
  assert.equal(result.reconciliation.allocatedMinor, 100000);
  assert.equal(result.reconciliation.remainingMinor, 0);
  assert.equal(result.shares[0].formattedShare, "400.00");
  assert.equal(result.shares[1].formattedShare, "350.00");
  assert.equal(result.shares[2].formattedShare, "250.00");
});

test("evaluateCustomSplit: ₹1,000 with 400, 350, 200 has ₹50 remaining", () => {
  const result = evaluateCustomSplit(100000, samplePeople, {
    "1": "400",
    "2": "350",
    "3": "200",
  });

  assert.equal(result.hasInvalidFormat, false);
  assert.ok(result.reconciliation);
  assert.equal(result.reconciliation.isReconciled, false);
  assert.equal(result.reconciliation.allocatedMinor, 95000);
  assert.equal(result.reconciliation.remainingMinor, 5000); // 5000 paise = 50 INR remaining
});

test("evaluateCustomSplit: ₹1,000 with 400, 350, 300 has ₹50 over", () => {
  const result = evaluateCustomSplit(100000, samplePeople, {
    "1": "400",
    "2": "350",
    "3": "300",
  });

  assert.equal(result.hasInvalidFormat, false);
  assert.ok(result.reconciliation);
  assert.equal(result.reconciliation.isReconciled, false);
  assert.equal(result.reconciliation.allocatedMinor, 105000);
  assert.equal(result.reconciliation.remainingMinor, -5000); // -5000 paise = 50 INR over
});
