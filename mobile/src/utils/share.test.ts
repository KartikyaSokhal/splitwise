import assert from "node:assert/strict";
import test from "node:test";

import { generateShareText } from "./share.ts";

test("generates expected share text format matching prompt specification", () => {
  const result = generateShareText(124000, [
    { name: "Kartikya", shareMinor: 41334 },
    { name: "Rahul", shareMinor: 41333 },
    { name: "Aman", shareMinor: 41333 },
  ]);

  const expected = [
    "Bill split",
    "",
    "Total: ₹1240.00",
    "",
    "Kartikya: ₹413.34",
    "Rahul: ₹413.33",
    "Aman: ₹413.33",
  ].join("\n");

  assert.equal(result, expected);
});
