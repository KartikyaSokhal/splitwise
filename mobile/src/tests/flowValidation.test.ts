import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateEqualSplit,
  evaluateCustomSplit,
  parseCustomShares,
  redistributeCustomShares,
} from "../state/splitLogic.ts";
import { formatMinorAsInr, parseInrToMinor } from "../utils/money.ts";
import { generateShareText } from "../utils/share.ts";
import type { Person } from "../types/index.ts";

const threePeople: Person[] = [
  { id: "1", name: "Kartikya", isYou: true },
  { id: "2", name: "Rahul" },
  { id: "3", name: "Aman" },
];

test("Test 1: ₹1,000 across 3 people (Equal split)", () => {
  const totalMinor = parseInrToMinor("1000");
  assert.equal(totalMinor, 100000);

  const shares = calculateEqualSplit(totalMinor, threePeople);
  assert.equal(shares[0].shareMinor, 33334);
  assert.equal(shares[0].formattedShare, "333.34");
  assert.equal(shares[1].shareMinor, 33333);
  assert.equal(shares[1].formattedShare, "333.33");
  assert.equal(shares[2].shareMinor, 33333);
  assert.equal(shares[2].formattedShare, "333.33");

  const sum = shares.reduce((acc, s) => acc + s.shareMinor, 0);
  assert.equal(sum, totalMinor);
});

test("Test 2: ₹1,240 across 3 people (Equal split)", () => {
  const totalMinor = parseInrToMinor("1240");
  assert.equal(totalMinor, 124000);

  const shares = calculateEqualSplit(totalMinor, threePeople);
  assert.equal(shares[0].shareMinor, 41334);
  assert.equal(shares[0].formattedShare, "413.34");
  assert.equal(shares[1].shareMinor, 41333);
  assert.equal(shares[1].formattedShare, "413.33");
  assert.equal(shares[2].shareMinor, 41333);
  assert.equal(shares[2].formattedShare, "413.33");

  const sum = shares.reduce((acc, s) => acc + s.shareMinor, 0);
  assert.equal(sum, totalMinor);
});

test("Test 3: ₹1,000, 3 people, Custom (400, 350, 250) is valid and reconciled", () => {
  const totalMinor = parseInrToMinor("1000");
  const result = evaluateCustomSplit(totalMinor, threePeople, {
    "1": "400",
    "2": "350",
    "3": "250",
  });

  assert.equal(result.hasInvalidFormat, false);
  assert.ok(result.reconciliation);
  assert.equal(result.reconciliation.isReconciled, true);
  assert.equal(result.reconciliation.remainingMinor, 0);
  assert.equal(result.reconciliation.allocatedMinor, 100000);
});

test("Test 4: ₹1,000, 3 people, Custom (400, 350, 200) is invalid with ₹50 remaining", () => {
  const totalMinor = parseInrToMinor("1000");
  const result = evaluateCustomSplit(totalMinor, threePeople, {
    "1": "400",
    "2": "350",
    "3": "200",
  });

  assert.equal(result.hasInvalidFormat, false);
  assert.ok(result.reconciliation);
  assert.equal(result.reconciliation.isReconciled, false);
  assert.equal(result.reconciliation.remainingMinor, 5000); // 50.00 INR
  assert.equal(formatMinorAsInr(result.reconciliation.remainingMinor), "50.00");
});

test("Test 5: Removing a person updates participant count and recalculates shares", () => {
  const twoPeople = threePeople.filter((p) => p.id !== "3");
  assert.equal(twoPeople.length, 2);

  const totalMinor = parseInrToMinor("1000");
  const shares = calculateEqualSplit(totalMinor, twoPeople);
  assert.equal(shares.length, 2);
  assert.equal(shares[0].shareMinor, 50000);
  assert.equal(shares[0].formattedShare, "500.00");
  assert.equal(shares[1].shareMinor, 50000);
  assert.equal(shares[1].formattedShare, "500.00");
});

test("Test 6: Very large amount validation", () => {
  // Safe integer up to 999,999,999 INR (99.99 Crores)
  const largeAmountStr = "999999999.99";
  const minor = parseInrToMinor(largeAmountStr);
  assert.equal(minor, 99999999999);
  assert.equal(formatMinorAsInr(minor), "999999999.99");

  // Dangerously huge amount exceeding safe integer is rejected
  assert.throws(() => parseInrToMinor("90071992547409.92"));
});

test("Test 7: More than two decimal places is rejected without silent rounding", () => {
  assert.throws(() => parseInrToMinor("1240.505"));
  assert.throws(() => parseInrToMinor("100.999"));
  assert.throws(() => parseInrToMinor("1.0001"));
});

test("Test 8: Continuing with no people is rejected", () => {
  const totalMinor = parseInrToMinor("1000");
  const emptyPeople: Person[] = [];
  const shares = calculateEqualSplit(totalMinor, emptyPeople);
  assert.equal(shares.length, 0);

  const customResult = evaluateCustomSplit(totalMinor, emptyPeople, {});
  assert.equal(customResult.reconciliation, null);
  assert.equal(customResult.shares.length, 0);
});

test("Test 9: Complete custom split pinning flow (pin, redistribute, unpin, reset)", () => {
  const totalMinor = parseInrToMinor("1000"); // 100000 paise
  const equalShares = calculateEqualSplit(totalMinor, threePeople);
  let inputs: Record<string, string> = {};
  for (const s of equalShares) {
    inputs[s.personId] = s.formattedShare;
  }
  let pinnedIds: Record<string, boolean> = {};

  // 1. Initially unpinned
  assert.equal(inputs["1"], "333.34");
  assert.equal(inputs["2"], "333.33");
  assert.equal(inputs["3"], "333.33");

  // 2. Commit edit for person "1" to 400.00
  inputs["1"] = "400.00";
  pinnedIds["1"] = true;
  const step1 = redistributeCustomShares(totalMinor, threePeople, inputs, pinnedIds);
  assert.equal(step1.redistribution.isValid, true);
  inputs = step1.newInputs;
  assert.equal(inputs["1"], "400.00");
  assert.equal(inputs["2"], "300.00");
  assert.equal(inputs["3"], "300.00");

  const eval1 = evaluateCustomSplit(totalMinor, threePeople, inputs, pinnedIds);
  assert.equal(eval1.reconciliation?.isReconciled, true);
  assert.equal(eval1.shares[0].isPinned, true);
  assert.equal(eval1.shares[1].isPinned, false);
  assert.equal(eval1.shares[2].isPinned, false);

  // 3. Commit edit for person "2" to 350.00
  inputs["2"] = "350.00";
  pinnedIds["2"] = true;
  const step2 = redistributeCustomShares(totalMinor, threePeople, inputs, pinnedIds);
  assert.equal(step2.redistribution.isValid, true);
  inputs = step2.newInputs;
  assert.equal(inputs["1"], "400.00");
  assert.equal(inputs["2"], "350.00");
  assert.equal(inputs["3"], "250.00");

  const eval2 = evaluateCustomSplit(totalMinor, threePeople, inputs, pinnedIds);
  assert.equal(eval2.reconciliation?.isReconciled, true);
  assert.equal(eval2.shares[0].isPinned, true);
  assert.equal(eval2.shares[1].isPinned, true);
  assert.equal(eval2.shares[2].isPinned, false);

  // 4. Unpin person "2"
  delete pinnedIds["2"];
  const step3 = redistributeCustomShares(totalMinor, threePeople, inputs, pinnedIds);
  assert.equal(step3.redistribution.isValid, true);
  inputs = step3.newInputs;
  assert.equal(inputs["1"], "400.00");
  assert.equal(inputs["2"], "300.00");
  assert.equal(inputs["3"], "300.00");

  // 5. Reset to equal
  pinnedIds = {};
  const equalAgain = calculateEqualSplit(totalMinor, threePeople);
  inputs = {};
  for (const s of equalAgain) {
    inputs[s.personId] = s.formattedShare;
  }
  assert.equal(inputs["1"], "333.34");
  assert.equal(inputs["2"], "333.33");
  assert.equal(inputs["3"], "333.33");
});

test("Test 10: Complete flow share text summary generation", () => {
  const totalMinor = 124000;
  const shares = calculateEqualSplit(totalMinor, threePeople);
  const text = generateShareText(
    totalMinor,
    shares.map((s) => ({ name: s.name, shareMinor: s.shareMinor })),
  );

  assert.ok(text.includes("Bill split"));
  assert.ok(text.includes("Total: ₹1240.00"));
  assert.ok(text.includes("Kartikya: ₹413.34"));
  assert.ok(text.includes("Rahul: ₹413.33"));
  assert.ok(text.includes("Aman: ₹413.33"));
});
