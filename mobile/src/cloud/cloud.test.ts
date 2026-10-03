import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { CloudRepository, CloudError, safeCloudError } from "./repository.ts";
import {
  decodeAmount,
  decodeSnapshot,
  decodePage,
  decodeGroup,
  decodeExpense,
  decodeEvent,
  type GroupSnapshot,
} from "./contracts.ts";
import { prepareExpense, type ExpenseDraft } from "./expenseDraft.ts";
import { validatePending, type RecoveryStorage } from "./recovery.ts";
import {
  GROUP_PURPOSES,
  assertGroupSetup,
  isISOCalendarDate,
} from "./groupSetup.ts";

const user = randomUUID(),
  g = randomUUID(),
  a = randomUUID(),
  b = randomUUID();
const timestamp = "2026-10-03T12:00:00.123456+00:00";
const group: GroupSnapshot = {
  id: g,
  name: "Trip",
  archived: false,
  created_at: timestamp,
  purpose: "trip",
  destination: null,
  start_date: null,
  end_date: null,
  people: [
    { id: a, name: "Same 😀", user_id: user, active: true, role: "admin" },
    { id: b, name: "Same 😀", user_id: null, active: true, role: "member" },
  ],
  balances: [
    { personId: a, balanceMinor: 0 },
    { personId: b, balanceMinor: 0 },
  ],
};
const draft = (): ExpenseDraft => ({
  description: "Dinner",
  total: "10.01",
  selected: [a, b],
  payerId: a,
  multiplePayers: false,
  paid: {},
  method: "equal",
  owed: {},
  pinned: {},
});
test("all group purposes share one validated setup; Trip dates are calendar dates", () => {
  for (const { id } of GROUP_PURPOSES) {
    assert.equal(
      assertGroupSetup({
        name: "Our group",
        purpose: id,
        destination: null,
        startDate: null,
        endDate: null,
        people: ["Sam", "Sam"],
      }).purpose,
      id,
    );
  }
  assert(isISOCalendarDate("2028-02-29"));
  for (const date of [
    "2027-02-29",
    "2026-13-01",
    "2026-00-01",
    "2026-04-31",
    "2026-1-1",
  ])
    assert.equal(isISOCalendarDate(date), false);
  const trip = {
    name: "Goa",
    purpose: "trip" as const,
    destination: "India",
    startDate: "2026-10-03",
    endDate: "2026-10-05",
    people: ["Sam"],
  };
  assert.deepEqual(assertGroupSetup(trip), trip);
  assert.throws(() => assertGroupSetup({ ...trip, endDate: "2026-10-02" }));
  assert.throws(() => assertGroupSetup({ ...trip, purpose: "family" }));
  assert.throws(() =>
    assertGroupSetup({ ...trip, people: Array(200).fill("Sam") }),
  );
  assert.throws(() => assertGroupSetup({ ...trip, destination: " " }));
});
function memory(): RecoveryStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  };
}
test("cloud amounts reject lossy numbers, fractional, signed, oversized and noncanonical strings", () => {
  assert.equal(decodeAmount("9007199254740991"), Number.MAX_SAFE_INTEGER);
  assert.equal(decodeAmount("0"), 0);
  for (const v of [
    9007199254740991,
    "9007199254740992",
    "1.0",
    "-1",
    "01",
    "1e2",
    " 1",
    null,
    {},
  ])
    assert.throws(() => decodeAmount(v));
});
test("snapshot checks membership/balance bijection, IDs, duplicate labels are allowed, money must conserve", () => {
  const dto = {
    ...group,
    balances: [
      { person_id: a, balance_minor: "1" },
      { person_id: b, balance_minor: "-1" },
    ],
  };
  assert.equal(decodeSnapshot(dto).people.length, 2);
  for (const v of [
    { ...dto, people: [group.people[0], group.people[0]] },
    { ...dto, balances: dto.balances.slice(0, 1) },
    {
      ...dto,
      balances: [
        { person_id: a, balance_minor: "0" },
        { person_id: randomUUID(), balance_minor: "0" },
      ],
    },
    { ...dto, people: [{ ...group.people[0], user_id: "bad" }] },
    { ...dto, archived: "false" },
  ])
    assert.throws(() => decodeSnapshot(v));
});
test("pages preserve microsecond cursor precision and reject oversized/duplicate responses", () => {
  const rows = Array.from({ length: 31 }, () => ({
    ...group,
    id: randomUUID(),
  }));
  const cursor = (r: typeof group) => ({ id: r.id, time: r.created_at });
  const p = decodePage(rows, decodeGroup, (r) => ({
    id: r.id,
    time: r.created_at,
  }));
  assert.equal(p.items.length, 30);
  assert.equal(p.next?.time, timestamp);
  assert.equal(p.next?.id, rows[29].id);
  assert.equal(
    decodePage(rows.slice(0, 30), decodeGroup, (r) => ({
      id: r.id,
      time: r.created_at,
    })).next,
    null,
  );
  assert.throws(() =>
    decodePage([...rows, rows[0]], decodeGroup, (r) => ({
      id: r.id,
      time: r.created_at,
    })),
  );
  assert.throws(() =>
    decodePage([rows[0], rows[0]], decodeGroup, (r) => ({
      id: r.id,
      time: r.created_at,
    })),
  );
  assert.equal(cursor(group).time, timestamp);
});
test("expense detail independently validates paid/share totals instead of trusting response totals", () => {
  const dto = {
    id: randomUUID(),
    description: "Dinner",
    total_minor: "100",
    created_by: user,
    reason: null,
    payments: [{ id: a, name: "A", amount_minor: "100" }],
    shares: [{ id: b, name: "B", amount_minor: "100" }],
  };
  assert.equal(decodeExpense(dto, g).totalMinor, 100);
  assert.throws(() =>
    decodeExpense(
      { ...dto, shares: [{ id: b, name: "B", amount_minor: "99" }] },
      g,
    ),
  );
  assert.throws(() =>
    decodeExpense({ ...dto, payments: [dto.payments[0], dto.payments[0]] }, g),
  );
});
test("history contract rejects invalid kinds, actors, labels and raw numeric money", () => {
  const dto = {
    id: randomUUID(),
    group_id: g,
    group_name: "Trip",
    created_at: timestamp,
    kind: "expense",
    title: "Dinner",
    amount_minor: "1",
    actor_id: user,
    corrected: false,
    reason: null,
    payer: "A",
    participant_count: 2,
  };
  assert.equal(decodeEvent(dto).amountMinor, 1);
  for (const delta of [
    { kind: "paid" },
    { actor_id: "A" },
    { title: "\u202eevil" },
    { amount_minor: 1 },
    { participant_count: 201 },
  ])
    assert.throws(() => decodeEvent({ ...dto, ...delta }));
});
test("group expense final boundary: deterministic odd paise, multipayer and payer with no share", () => {
  assert.deepEqual(
    prepareExpense(draft(), group, randomUUID()).shares.map(
      (s) => s.amountMinor,
    ),
    [501, 500],
  );
  const d = {
    ...draft(),
    selected: [b],
    multiplePayers: true,
    paid: { [a]: "7", [b]: "3.01" },
  };
  const result = prepareExpense(d, group, randomUUID());
  assert.deepEqual(
    result.payments.map((p) => p.amountMinor),
    [700, 301],
  );
  assert.deepEqual(result.shares, [{ personId: b, amountMinor: 1001 }]);
  assert.equal(d.paid[a], "7");
});
test("group custom boundary preserves exact explicit values including blank-as-zero", () => {
  const d: ExpenseDraft = {
    ...draft(),
    method: "custom",
    owed: { [a]: "", [b]: "10.01" },
    pinned: { [a]: true, [b]: true },
  };
  assert.deepEqual(
    prepareExpense(d, group, randomUUID()).shares.map((s) => s.amountMinor),
    [0, 1001],
  );
  for (const v of ["10", "10.02", "10.001", "-1", "NaN"])
    assert.throws(() =>
      prepareExpense({ ...d, owed: { [a]: "0", [b]: v } }, group, randomUUID()),
    );
});
test("stale/archived memberships, duplicate IDs, invalid totals and mismatched payer sums fail", () => {
  for (const total of ["0", "0.001", "-1", "1e9", "90071992547409.92"])
    assert.throws(() =>
      prepareExpense({ ...draft(), total }, group, randomUUID()),
    );
  assert.equal(
    prepareExpense({ ...draft(), total: "0.01" }, group, randomUUID())
      .totalMinor,
    1,
  );
  assert.equal(
    prepareExpense(
      { ...draft(), total: "90071992547409.91" },
      group,
      randomUUID(),
    ).totalMinor,
    Number.MAX_SAFE_INTEGER,
  );
  assert.throws(() =>
    prepareExpense({ ...draft(), selected: [a, a] }, group, randomUUID()),
  );
  assert.throws(() =>
    prepareExpense(draft(), { ...group, archived: true }, randomUUID()),
  );
  assert.throws(() =>
    prepareExpense(
      draft(),
      {
        ...group,
        people: group.people.map((p) =>
          p.id === b ? { ...p, active: false } : p,
        ),
      },
      randomUUID(),
    ),
  );
  assert.throws(() =>
    prepareExpense(
      { ...draft(), multiplePayers: true, paid: { [a]: "10" } },
      group,
      randomUUID(),
    ),
  );
  assert.throws(() =>
    prepareExpense(
      {
        ...draft(),
        multiplePayers: true,
        paid: { [a]: "10.01", [randomUUID()]: "1" },
      },
      group,
      randomUUID(),
    ),
  );
});
test("repository rejects malformed writes before any request and redacts provider/database errors", async () => {
  let calls = 0;
  const repo = new CloudRepository(user, async () => {
    calls++;
    throw { code: "42501", message: "private SQL and token material" };
  });
  await assert.rejects(repo.repay(g, randomUUID(), a, a, 1));
  await assert.rejects(repo.createGroup("", randomUUID()));
  await assert.rejects(
    repo.saveExpense(
      { ...prepareExpense(draft(), group, randomUUID()), totalMinor: 2 },
      [a, b],
      randomUUID(),
    ),
  );
  assert.equal(calls, 0);
  await assert.rejects(
    repo.group(g),
    (error) =>
      error instanceof CloudError &&
      error.code === "DENIED" &&
      !error.message.includes("private"),
  );
  assert(
    !safeCloudError(new Error("raw details"), true).message.includes("raw"),
  );
});
test("account scope aborts outstanding work, discards late results, and refuses new writes", async () => {
  let resolve!: (v: unknown) => void, signal!: AbortSignal;
  const repo = new CloudRepository(user, async (_name, _args, s) => {
    signal = s;
    return new Promise((r) => {
      resolve = r;
    });
  });
  const pending = repo.groups();
  repo.dispose();
  assert(signal.aborted);
  resolve([]);
  await assert.rejects(
    pending,
    (error) => error instanceof CloudError && error.code === "SESSION",
  );
  await assert.rejects(
    repo.createGroup("Late", randomUUID()),
    (error) => error instanceof CloudError && error.code === "SESSION",
  );
});
test("lost save response persists exact request before sending; restart retry reuses payload/key", async () => {
  const storage = memory(),
    calls: unknown[] = [],
    key = randomUUID();
  const repo = new CloudRepository(
    user,
    async (operation, args) => {
      assert.equal(storage.values.size, 1);
      calls.push({ operation, args });
      throw new Error("network lost after commit");
    },
    storage,
  );
  await assert.rejects(
    repo.createGroup("Trip", key),
    (error) => error instanceof CloudError && error.code === "UNCERTAIN",
  );
  await assert.rejects(
    repo.createGroup("Duplicate", randomUUID()),
    /Resolve your unconfirmed/,
  );
  repo.dispose();
  const restarted = new CloudRepository(
    user,
    async (operation, args) => {
      calls.push({ operation, args });
      return g;
    },
    storage,
  );
  assert.equal((await restarted.getPending())?.args.p_request_key, key);
  await restarted.retryPending();
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(storage.values.size, 0);
});
test("different accounts cannot recover each other's pending saves", async () => {
  const storage = memory(),
    repo = new CloudRepository(
      user,
      async () => {
        throw new Error("offline");
      },
      storage,
    );
  await assert.rejects(repo.createGroup("Private trip", randomUUID()));
  const other = new CloudRepository(
    randomUUID(),
    async () => {
      throw new Error("must not send");
    },
    storage,
  );
  assert.equal(await other.getPending(), null);
});
test("secure journal failure prevents sending and duplicate simultaneous saves send once", async () => {
  let calls = 0,
    release!: (v: unknown) => void;
  const broken = {
    ...memory(),
    setItem: async () => {
      throw new Error("keychain unavailable");
    },
  };
  const blocked = new CloudRepository(
    user,
    async () => {
      calls++;
      return g;
    },
    broken,
  );
  await assert.rejects(
    blocked.createGroup("Trip", randomUUID()),
    /Nothing was sent/,
  );
  assert.equal(calls, 0);
  const repo = new CloudRepository(user, async () => {
    calls++;
    return new Promise((r) => {
      release = r;
    });
  });
  const key = randomUUID(),
    first = repo.createGroup("Trip", key);
  await assert.rejects(repo.createGroup("Trip", key), /already in progress/);
  await new Promise((resolve) => setImmediate(resolve));
  release(g);
  await first;
  assert.equal(calls, 1);
});
test("server rejection clears recovery, but a logout race retains its uncertain outcome", async () => {
  const storage = memory();
  const rejected = new CloudRepository(
    user,
    async () => {
      throw { code: "23514" };
    },
    storage,
  );
  await assert.rejects(rejected.createGroup("Trip", randomUUID()));
  assert.equal(await rejected.getPending(), null);
  const raced = new CloudRepository(
    user,
    async () => {
      raced.dispose();
      return g;
    },
    storage,
  );
  await assert.rejects(
    raced.createGroup("Trip", randomUUID()),
    (error) => error instanceof CloudError && error.code === "SESSION",
  );
  assert.equal(storage.values.size, 1);
});
test("recovery allowlist rejects arbitrary operations, actor injection, invalid money and malformed journals", async () => {
  const key = randomUUID();
  assert.throws(() =>
    validatePending({ version: 1, operation: "split_change_member", args: {} }),
  );
  assert.throws(() =>
    validatePending({
      version: 1,
      operation: "split_create_group",
      args: { p_name: "Trip", p_request_key: key, actor: user },
    }),
  );
  assert.throws(() =>
    validatePending({
      version: 1,
      operation: "split_record_settlement",
      args: {
        p_group_id: g,
        p_request_key: key,
        p_from_person_id: a,
        p_to_person_id: b,
        p_amount_minor: 0.1,
      },
    }),
  );
  const storage = memory();
  storage.values.set(`dueshare-pending-${user}`, "not JSON");
  const repo = new CloudRepository(
    user,
    async () => {
      throw new Error("must not send");
    },
    storage,
  );
  await assert.rejects(repo.getPending(), /secure save-recovery/);
  await repo.discardPending();
  assert.equal(await repo.getPending(), null);
  assert.equal(storage.values.size, 0);
});
test("repository uses bounded cursor parameters and never silently fetches the next page", async () => {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const repo = new CloudRepository(user, async (name, args) => {
    calls.push({ name, args });
    return [];
  });
  await repo.history(g, { id: a, time: timestamp, kind: "expense" });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, {
    p_before: timestamp,
    p_before_id: a,
    p_limit: 30,
    p_group_id: g,
    p_kind: "expense",
  });
});
