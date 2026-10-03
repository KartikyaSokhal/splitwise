import { isValidId, MoneyValidationError } from "./money.ts";
import type { ParticipantBalance } from "../types/expense.ts";

/** PostgreSQL numeric/BIGINT aggregates cross the boundary as decimal strings. */
export function decodeGroupBalances(value: unknown): ParticipantBalance[] {
  if (!Array.isArray(value))
    throw new MoneyValidationError("Invalid balance response.");
  const ids = new Set<string>();
  let total = 0n;
  const balances = value.map((row) => {
    if (
      !row ||
      !isValidId(row.person_id) ||
      ids.has(row.person_id) ||
      typeof row.balance_minor !== "string" ||
      !/^-?(0|[1-9][0-9]{0,15})$/.test(row.balance_minor)
    )
      throw new MoneyValidationError("Invalid balance response.");
    ids.add(row.person_id);
    const exact = BigInt(row.balance_minor),
      max = BigInt(Number.MAX_SAFE_INTEGER);
    if (exact > max || exact < -max)
      throw new MoneyValidationError("Unsupported balance range.");
    total += exact;
    return { personId: row.person_id, balanceMinor: Number(exact) };
  });
  if (total !== 0n)
    throw new MoneyValidationError("Unconserved balance response.");
  return balances;
}
