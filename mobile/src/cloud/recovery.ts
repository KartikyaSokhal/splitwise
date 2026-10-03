import { assertValidExpense } from "../utils/expense.ts";
import { assertMinorAmount, isValidLabel } from "../utils/money.ts";
import { isUuid } from "./contracts.ts";
import { assertGroupSetup } from "./groupSetup.ts";

export type RecoveryStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
export type PendingSave = {
  version: 1;
  operation: string;
  args: Record<string, unknown>;
};
export const recoverable = new Set([
  "split_create_group",
  "split_create_group_v2",
  "split_add_guest_once",
  "split_create_expense",
  "split_record_settlement",
]);
/** Secure storage is still untrusted input. Never replay an arbitrary RPC. */
export function validatePending(value: unknown): PendingSave {
  if (!value || typeof value !== "object")
    throw new Error("Invalid pending save");
  const v = value as PendingSave;
  if (
    v.version !== 1 ||
    !recoverable.has(v.operation) ||
    !v.args ||
    typeof v.args !== "object" ||
    Array.isArray(v.args)
  )
    throw new Error("Invalid pending save");
  const a = v.args;
  const expected: Record<string, string[]> = {
    split_create_group: ["p_name", "p_request_key"],
    split_create_group_v2: [
      "p_name",
      "p_purpose",
      "p_destination",
      "p_start_date",
      "p_end_date",
      "p_people",
      "p_request_key",
    ],
    split_add_guest_once: ["p_group_id", "p_name", "p_request_key"],
    split_create_expense: [
      "p_group_id",
      "p_request_key",
      "p_description",
      "p_total_minor",
      "p_payments",
      "p_shares",
    ],
    split_record_settlement: [
      "p_group_id",
      "p_request_key",
      "p_from_person_id",
      "p_to_person_id",
      "p_amount_minor",
    ],
  };
  if (
    Object.keys(a).sort().join() !== expected[v.operation].sort().join() ||
    !isUuid(a.p_request_key) ||
    (v.operation !== "split_create_group" &&
      v.operation !== "split_create_group_v2" &&
      !isUuid(a.p_group_id))
  )
    throw new Error("Invalid pending save");
  if (v.operation === "split_create_group_v2") {
    if (
      !Array.isArray(a.p_people) ||
      a.p_people.length > 199 ||
      a.p_people.some(
        (person) =>
          !person ||
          typeof person !== "object" ||
          Array.isArray(person) ||
          Object.keys(person).join() !== "name" ||
          !isValidLabel(person.name),
      )
    )
      throw new Error("Invalid pending save");
    assertGroupSetup({
      name: a.p_name,
      purpose: a.p_purpose,
      destination: a.p_destination,
      startDate: a.p_start_date,
      endDate: a.p_end_date,
      people: a.p_people.map((person) => person.name),
    } as Parameters<typeof assertGroupSetup>[0]);
  } else if (
    v.operation === "split_create_group" ||
    v.operation === "split_add_guest_once"
  ) {
    if (!isValidLabel(a.p_name)) throw new Error("Invalid pending save");
  } else if (v.operation === "split_create_expense") {
    if (
      !Array.isArray(a.p_payments) ||
      !Array.isArray(a.p_shares) ||
      a.p_payments.length > 200 ||
      a.p_shares.length > 200
    )
      throw new Error("Invalid pending save");
    const ids = [
      ...a.p_payments.map((p) => p?.payerId),
      ...a.p_shares.map((s) => s?.personId),
    ];
    if (ids.some((id) => !isUuid(id))) throw new Error("Invalid pending save");
    assertValidExpense(
      {
        id: a.p_request_key,
        groupId: a.p_group_id as string,
        description: a.p_description as string,
        totalMinor: a.p_total_minor as number,
        currency: "INR",
        payments: a.p_payments,
        shares: a.p_shares,
      },
      [...new Set(ids)],
    );
  } else {
    if (
      !isUuid(a.p_from_person_id) ||
      !isUuid(a.p_to_person_id) ||
      a.p_from_person_id === a.p_to_person_id
    )
      throw new Error("Invalid pending save");
    assertMinorAmount(a.p_amount_minor as number);
    if (!a.p_amount_minor) throw new Error("Invalid pending save");
  }
  return JSON.parse(JSON.stringify(v));
}
