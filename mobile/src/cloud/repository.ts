import type { Expense } from "../types/expense.ts";
import { assertValidExpense } from "../utils/expense.ts";
import {
  assertMinorAmount,
  isValidLabel,
  MoneyValidationError,
} from "../utils/money.ts";
import {
  decodeExpense,
  decodeSettlement,
  decodeGroup,
  decodeInvite,
  decodePage,
  decodeEvent,
  decodeSnapshot,
  isUuid,
  PAGE_SIZE,
  type Cursor,
} from "./contracts.ts";
import {
  validatePending,
  type PendingSave,
  type RecoveryStorage,
} from "./recovery.ts";
import { assertGroupSetup, type GroupSetup } from "./groupSetup.ts";

export type Rpc = (
  name: string,
  args: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<unknown>;
export class CloudError extends Error {
  constructor(
    public code: "SESSION" | "DENIED" | "INVALID" | "UNAVAILABLE" | "UNCERTAIN",
    message: string,
  ) {
    super(message);
  }
}
export function safeCloudError(error: unknown, write = false): CloudError {
  if (error instanceof CloudError) return error;
  if (error instanceof MoneyValidationError)
    return new CloudError(
      "INVALID",
      "Check the names and amounts. Payments and shares must each match the total.",
    );
  const code =
    error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === "42501" || code === "PGRST301" || code === "PGRST303")
    return new CloudError(
      "DENIED",
      "Access changed or your session expired. Refresh or sign in again.",
    );
  if (
    ["22023", "22P02", "23502", "23503", "23505", "23514"].includes(
      String(code),
    )
  )
    return new CloudError(
      "INVALID",
      "This change was not accepted. Check amounts, member access and current balances, then refresh.",
    );
  return new CloudError(
    write ? "UNCERTAIN" : "UNAVAILABLE",
    write
      ? "Save was not confirmed. Retry this same request; do not add it again. If you leave, check History first."
      : "Could not load your saved data. Check your connection and try again. Quick Split still works offline.",
  );
}
function uuid(v: unknown) {
  if (!isUuid(v)) throw new MoneyValidationError("Invalid identifier.");
}
function name(v: unknown, max = 100) {
  if (!isValidLabel(v, max)) throw new MoneyValidationError("Invalid name.");
}
const pageArgs = (c: Cursor | null) => ({
  p_before: c?.time ?? null,
  p_before_id: c?.id ?? null,
  p_limit: PAGE_SIZE,
});

/** One account-scoped lifetime. Disposal aborts IO and invalidates late results. */
export class CloudRepository {
  private active = true;
  private requests = new Set<AbortController>();
  private pending: PendingSave | null = null;
  private loaded: Promise<void> | null = null;
  private writing = false;
  constructor(
    readonly userId: string,
    private rpc: Rpc,
    private storage?: RecoveryStorage,
  ) {
    uuid(userId);
  }
  private get recoveryKey() {
    return `dueshare-pending-${this.userId}`;
  }
  async getPending(): Promise<PendingSave | null> {
    if (!this.loaded)
      this.loaded = (async () => {
        const raw = await this.storage?.getItem(this.recoveryKey);
        if (raw) {
          if (raw.length > 100000) throw new Error("Invalid pending save");
          this.pending = validatePending(JSON.parse(raw));
        }
      })().catch(() => {
        this.loaded = null;
        throw new CloudError(
          "UNAVAILABLE",
          "Could not read the secure save-recovery record. Try again before saving more data.",
        );
      });
    await this.loaded;
    return this.pending ? validatePending(this.pending) : null;
  }
  async discardPending() {
    await this.storage?.removeItem(this.recoveryKey);
    this.pending = null;
    this.loaded = null;
  }
  async retryPending() {
    const pending = await this.getPending();
    if (pending) await this.write(pending.operation, pending.args);
  }
  private async write(operation: string, args: Record<string, unknown>) {
    if (!this.active)
      throw new CloudError("SESSION", "Sign in again to continue.");
    if (this.writing)
      throw new CloudError("UNAVAILABLE", "A save is already in progress.");
    this.writing = true;
    try {
      const request = validatePending({ version: 1, operation, args });
      await this.getPending();
      if (
        this.pending &&
        JSON.stringify(this.pending) !== JSON.stringify(request)
      )
        throw new CloudError(
          "UNAVAILABLE",
          "Resolve your unconfirmed save from Groups before starting another one.",
        );
      // Save the exact key and payload BEFORE dispatch. This is recovery, not an
      // offline queue: replay always requires another explicit user action.
      try {
        await this.storage?.setItem(this.recoveryKey, JSON.stringify(request));
      } catch {
        throw new CloudError(
          "UNAVAILABLE",
          "Could not securely prepare this save. Nothing was sent. Try again.",
        );
      }
      this.pending = request;
      let result: unknown;
      try {
        result = await this.call(operation, request.args, true);
      } catch (error) {
        if (
          error instanceof CloudError &&
          (error.code === "INVALID" || error.code === "DENIED")
        )
          await this.discardPending();
        throw error;
      }
      // If cleanup fails, retain recovery: same-key replay remains harmless.
      try {
        await this.discardPending();
      } catch {
        /* Server confirmation is authoritative. */
      }
      return result;
    } finally {
      this.writing = false;
    }
  }
  dispose() {
    this.active = false;
    this.requests.forEach((r) => r.abort());
    this.requests.clear();
  }
  private async call(
    operation: string,
    args: Record<string, unknown>,
    write = false,
  ) {
    if (!this.active)
      throw new CloudError("SESSION", "Sign in again to continue.");
    const abort = new AbortController();
    this.requests.add(abort);
    try {
      const result = await this.rpc(operation, args, abort.signal);
      if (!this.active)
        throw new CloudError("SESSION", "Sign in again to continue.");
      return result;
    } catch (error) {
      throw safeCloudError(error, write);
    } finally {
      this.requests.delete(abort);
    }
  }
  async groups(cursor: Cursor | null = null) {
    return decodePage(
      await this.call("split_list_groups", pageArgs(cursor)),
      decodeGroup,
      (g) => ({ time: g.created_at, id: g.id }),
    );
  }
  async invites(cursor: Cursor | null = null) {
    return decodePage(
      await this.call("split_list_invites", pageArgs(cursor)),
      decodeInvite,
      (i) => ({ time: i.expires_at, id: i.id }),
    );
  }
  async group(groupId: string) {
    uuid(groupId);
    return decodeSnapshot(
      await this.call("split_group_snapshot", { p_group_id: groupId }),
    );
  }
  async history(groupId: string | null, cursor: Cursor | null = null) {
    if (groupId !== null) uuid(groupId);
    return decodePage(
      await this.call("split_history", {
        ...pageArgs(cursor),
        p_group_id: groupId,
        p_kind: cursor?.kind ?? null,
      }),
      decodeEvent,
      (e) => ({ time: e.created_at, id: e.id, kind: e.kind }),
    );
  }
  async expense(groupId: string, expenseId: string) {
    uuid(groupId);
    uuid(expenseId);
    return decodeExpense(
      await this.call("split_expense_detail", {
        p_group_id: groupId,
        p_expense_id: expenseId,
      }),
      groupId,
    );
  }
  async settlement(groupId: string, settlementId: string) {
    uuid(groupId);
    uuid(settlementId);
    return decodeSettlement(
      await this.call("split_settlement_detail", {
        p_group_id: groupId,
        p_settlement_id: settlementId,
      }),
    );
  }
  async createGroup(value: string, key: string) {
    name(value);
    uuid(key);
    const id = await this.write("split_create_group", {
      p_name: value,
      p_request_key: key,
    });
    uuid(id);
    return id as string;
  }
  async createConfiguredGroup(value: GroupSetup, key: string) {
    uuid(key);
    const setup = assertGroupSetup(value);
    const id = await this.write("split_create_group_v2", {
      p_name: setup.name,
      p_purpose: setup.purpose,
      p_destination: setup.destination,
      p_start_date: setup.startDate,
      p_end_date: setup.endDate,
      p_people: setup.people.map((person) => ({ name: person })),
      p_request_key: key,
    });
    uuid(id);
    return id as string;
  }
  async addPerson(groupId: string, value: string, key: string) {
    uuid(groupId);
    uuid(key);
    name(value);
    await this.write("split_add_guest_once", {
      p_group_id: groupId,
      p_name: value,
      p_request_key: key,
    });
  }
  async invite(groupId: string, personId: string, targetId: string) {
    [groupId, personId, targetId].forEach(uuid);
    await this.call(
      "split_invite_member",
      {
        p_group_id: groupId,
        p_person_id: personId,
        p_target_user_id: targetId,
      },
      true,
    );
  }
  async accept(inviteId: string) {
    uuid(inviteId);
    await this.call("split_accept_invite", { p_invite_id: inviteId }, true);
  }
  async changeMember(
    groupId: string,
    personId: string,
    active: boolean,
    role: "admin" | "member",
  ) {
    [groupId, personId].forEach(uuid);
    if (typeof active !== "boolean" || !["admin", "member"].includes(role))
      throw new MoneyValidationError("Invalid membership.");
    await this.call(
      "split_change_member",
      {
        p_group_id: groupId,
        p_person_id: personId,
        p_active: active,
        p_role: role,
      },
      true,
    );
  }
  async updateGroup(groupId: string, value: string, archive: boolean) {
    uuid(groupId);
    name(value);
    await this.call(
      "split_update_group",
      { p_group_id: groupId, p_name: value, p_archive: archive },
      true,
    );
  }
  async profile(value: string) {
    name(value);
    await this.call("split_update_profile", { p_name: value }, true);
  }
  async saveExpense(expense: Expense, activeIds: string[], key: string) {
    uuid(key);
    uuid(expense.groupId);
    activeIds.forEach(uuid);
    assertValidExpense(expense, activeIds);
    await this.write("split_create_expense", {
      p_group_id: expense.groupId,
      p_request_key: key,
      p_description: expense.description,
      p_total_minor: expense.totalMinor,
      p_payments: expense.payments,
      p_shares: expense.shares,
    });
  }
  async repay(
    groupId: string,
    key: string,
    from: string,
    to: string,
    amountMinor: number,
  ) {
    [groupId, key, from, to].forEach(uuid);
    assertMinorAmount(amountMinor);
    if (!amountMinor || from === to)
      throw new MoneyValidationError("Invalid repayment.");
    await this.write("split_record_settlement", {
      p_group_id: groupId,
      p_request_key: key,
      p_from_person_id: from,
      p_to_person_id: to,
      p_amount_minor: amountMinor,
    });
  }
  async correct(
    groupId: string,
    eventId: string,
    kind: "expense" | "repayment",
    reason: string,
  ) {
    [groupId, eventId].forEach(uuid);
    name(reason, 500);
    await this.call(
      kind === "expense" ? "split_void_expense" : "split_reverse_settlement",
      {
        p_group_id: groupId,
        [kind === "expense" ? "p_expense_id" : "p_settlement_id"]: eventId,
        p_reason: reason,
      },
      true,
    );
  }
}
