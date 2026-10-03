import { decodeGroupBalances } from "../utils/cloudMoney.ts";
import { isValidLabel, MoneyValidationError } from "../utils/money.ts";
import { assertValidExpense } from "../utils/expense.ts";
import type { ParticipantBalance } from "../types/expense.ts";
import {
  isGroupPurpose,
  isISOCalendarDate,
  type GroupPurpose,
} from "./groupSetup.ts";

export const PAGE_SIZE = 30;
export const isUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v);
export type Group = {
  id: string;
  name: string;
  archived: boolean;
  created_at: string;
  purpose: GroupPurpose;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
};
export type Member = {
  id: string;
  name: string;
  user_id: string | null;
  active: boolean;
  role: "admin" | "member";
};
export type GroupSnapshot = Group & {
  people: Member[];
  balances: ParticipantBalance[];
};
export type HistoryKind = "expense" | "repayment" | "void" | "reversal";
export type HistoryEvent = {
  id: string;
  group_id: string;
  group_name: string;
  created_at: string;
  kind: HistoryKind;
  title: string;
  amountMinor: number;
  actor_id: string;
  corrected: boolean;
  reason: string | null;
  payer: string | null;
  participant_count: number;
};
export type Invite = {
  id: string;
  group_name: string;
  person_name: string;
  expires_at: string;
};
export type Cursor = { time: string; id: string; kind?: HistoryKind };
export type Page<T> = { items: T[]; next: Cursor | null };
export type Allocation = { id: string; name: string; amountMinor: number };
export type ExpenseDetail = {
  id: string;
  description: string;
  totalMinor: number;
  created_by: string;
  reason: string | null;
  payments: Allocation[];
  shares: Allocation[];
};
export type SettlementDetail = {
  id: string;
  from_name: string;
  to_name: string;
  amountMinor: number;
  recorded_by: string;
  reason: string | null;
};

function bad(): never {
  throw new MoneyValidationError(
    "The saved data could not be verified. Refresh and try again.",
  );
}
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) bad();
  return v as Record<string, unknown>;
}
function id(v: unknown): string {
  if (!isUuid(v)) bad();
  return v;
}
function label(v: unknown, max = 100): string {
  if (!isValidLabel(v, max)) bad();
  return v;
}
function bool(v: unknown): boolean {
  if (typeof v !== "boolean") bad();
  return v;
}
function timestamp(v: unknown): string {
  // Preserve PostgreSQL microseconds in cursors; Date.toISOString would lose them.
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(
      v,
    ) ||
    !Number.isFinite(Date.parse(v))
  )
    bad();
  return v;
}
export function decodeAmount(v: unknown): number {
  if (typeof v !== "string" || !/^(0|[1-9][0-9]{0,15})$/.test(v)) bad();
  const n = BigInt(v);
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) bad();
  return Number(n);
}
function array<T>(v: unknown, max: number, decode: (row: unknown) => T): T[] {
  if (!Array.isArray(v) || v.length > max) bad();
  return v.map(decode);
}
function unique<T>(items: T[], key: (v: T) => string): T[] {
  if (new Set(items.map(key)).size !== items.length) bad();
  return items;
}
export function decodeGroup(v: unknown): Group {
  const r = object(v);
  if (!isGroupPurpose(r.purpose)) bad();
  const destination = r.destination === null ? null : label(r.destination);
  const start = r.start_date === null ? null : r.start_date;
  const end = r.end_date === null ? null : r.end_date;
  if (
    (start !== null && !isISOCalendarDate(start)) ||
    (end !== null && !isISOCalendarDate(end)) ||
    (start !== null && end !== null && start > end) ||
    (r.purpose !== "trip" &&
      (destination !== null || start !== null || end !== null))
  )
    bad();
  return {
    id: id(r.id),
    name: label(r.name),
    archived: bool(r.archived),
    created_at: timestamp(r.created_at),
    purpose: r.purpose,
    destination,
    start_date: start,
    end_date: end,
  };
}
export function decodeSnapshot(v: unknown): GroupSnapshot {
  const r = object(v);
  const people = unique(
    array(r.people, 200, (x) => {
      const p = object(x);
      if (p.role !== "admin" && p.role !== "member") bad();
      return {
        id: id(p.id),
        name: label(p.name),
        user_id: p.user_id === null ? null : id(p.user_id),
        active: bool(p.active),
        role: p.role,
      } as Member;
    }),
    (p) => p.id,
  );
  const balances = decodeGroupBalances(r.balances);
  if (
    balances.length !== people.length ||
    balances.some((b) => !people.some((p) => p.id === b.personId))
  )
    bad();
  return { ...decodeGroup(r), people, balances };
}
export function decodeEvent(v: unknown): HistoryEvent {
  const r = object(v);
  if (
    !["expense", "repayment", "void", "reversal"].includes(r.kind as string) ||
    !Number.isInteger(r.participant_count) ||
    (r.participant_count as number) < 0 ||
    (r.participant_count as number) > 200
  )
    bad();
  return {
    id: id(r.id),
    group_id: id(r.group_id),
    group_name: label(r.group_name),
    created_at: timestamp(r.created_at),
    kind: r.kind as HistoryKind,
    title: label(r.title, 500),
    amountMinor: decodeAmount(r.amount_minor),
    actor_id: id(r.actor_id),
    corrected: bool(r.corrected),
    reason: r.reason === null ? null : label(r.reason, 500),
    payer: r.payer === null ? null : label(r.payer, 20400),
    participant_count: r.participant_count as number,
  };
}
export function decodeInvite(v: unknown): Invite {
  const r = object(v);
  return {
    id: id(r.id),
    group_name: label(r.group_name),
    person_name: label(r.person_name),
    expires_at: timestamp(r.expires_at),
  };
}
export function decodePage<T>(
  v: unknown,
  decode: (v: unknown) => T,
  cursor: (v: T) => Cursor,
): Page<T> {
  const all = unique(array(v, PAGE_SIZE + 1, decode), (row) => {
    const c = cursor(row);
    return `${c.kind ?? ""}:${c.id}`;
  });
  const items = all.slice(0, PAGE_SIZE);
  return {
    items,
    next: all.length > PAGE_SIZE ? cursor(items[items.length - 1]) : null,
  };
}
export function decodeExpense(v: unknown, groupId: string): ExpenseDetail {
  const r = object(v);
  const allocation = (x: unknown): Allocation => {
    const a = object(x);
    return {
      id: id(a.id),
      name: label(a.name),
      amountMinor: decodeAmount(a.amount_minor),
    };
  };
  const result = {
    id: id(r.id),
    description: label(r.description, 500),
    totalMinor: decodeAmount(r.total_minor),
    created_by: id(r.created_by),
    reason: r.reason === null ? null : label(r.reason, 500),
    payments: array(r.payments, 200, allocation),
    shares: array(r.shares, 200, allocation),
  };
  assertValidExpense(
    {
      id: result.id,
      groupId,
      description: result.description,
      totalMinor: result.totalMinor,
      currency: "INR",
      payments: result.payments.map((p) => ({
        payerId: p.id,
        amountMinor: p.amountMinor,
      })),
      shares: result.shares.map((p) => ({
        personId: p.id,
        amountMinor: p.amountMinor,
      })),
    },
    [...new Set([...result.payments, ...result.shares].map((p) => p.id))],
  );
  return result;
}
export function decodeSettlement(v: unknown): SettlementDetail {
  const r = object(v),
    amountMinor = decodeAmount(r.amount_minor);
  if (!amountMinor) bad();
  return {
    id: id(r.id),
    from_name: label(r.from_name),
    to_name: label(r.to_name),
    amountMinor,
    recorded_by: id(r.recorded_by),
    reason: r.reason === null ? null : label(r.reason, 500),
  };
}
