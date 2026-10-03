import test from "node:test";
import assert from "node:assert/strict";
import { decodeGroupBalances } from "./cloudMoney.ts";
test("database balances decode exactly, rejecting unsafe numbers and malformed identities", () => {
  assert.deepEqual(
    decodeGroupBalances([
      { person_id: "a", balance_minor: "9007199254740991" },
      { person_id: "b", balance_minor: "-9007199254740991" },
    ]),
    [
      { personId: "a", balanceMinor: Number.MAX_SAFE_INTEGER },
      { personId: "b", balanceMinor: -Number.MAX_SAFE_INTEGER },
    ],
  );
  for (const input of [
    null,
    {},
    [null],
    [{ person_id: "a", balance_minor: 0 }],
    [{ person_id: "a", balance_minor: "1.0" }],
    [{ person_id: "a", balance_minor: "9007199254740992" }],
    [{ person_id: "", balance_minor: "0" }],
    [
      { person_id: "a", balance_minor: "0" },
      { person_id: "a", balance_minor: "0" },
    ],
    [{ person_id: "a", balance_minor: "1" }],
  ])
    assert.throws(() => decodeGroupBalances(input));
});
