import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

// Real PostgreSQL SQL/RLS execution in WASM. This auth shim supplies the identity
// normally established by Supabase's verified JWT gateway; it does NOT test JWTs.
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const migrationsDir = new URL("../migrations/", import.meta.url);
const migration = readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort()
  .map(f => readFileSync(new URL(f, migrationsDir), "utf8")).join("\n");
let db, ga, gb, pa, pb, guest;
async function as(user, sql, args = []) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    user ?? "",
  ]);
  await db.exec(user ? "set role authenticated" : "set role anon");
  try {
    return await db.query(sql, args);
  } finally {
    await db.exec("reset role");
  }
}
async function rpc(user, name, args) {
  const r = await as(
    user,
    `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
    args,
  );
  return r.rows[0].result;
}
async function payExpense(
  user = A,
  g = ga,
  payer = pa,
  owed = guest,
  total = 100,
  key = randomUUID(),
) {
  return rpc(user, "split_create_expense", [
    g,
    key,
    "Dinner",
    total,
    JSON.stringify([{ payerId: payer, amountMinor: total }]),
    JSON.stringify([{ personId: owed, amountMinor: total }]),
  ]);
}
async function joinC() {
  const invite = await rpc(A, "split_invite_member", [ga, guest, C]);
  await rpc(C, "split_accept_invite", [invite]);
  return invite;
}
async function balance(user = A, g = ga) {
  return (await as(user, "select * from public.split_get_balances($1)", [g]))
    .rows;
}
beforeEach(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(migration);
  await db.query("insert into auth.users values($1),($2),($3)", [A, B, C]);
  ga = await rpc(A, "split_create_group", ["Group A", randomUUID()]);
  gb = await rpc(B, "split_create_group", ["Group B", randomUUID()]);
  pa = (await as(A, "select id from public.persons where user_id=$1", [A]))
    .rows[0].id;
  pb = (await as(B, "select id from public.persons where user_id=$1", [B]))
    .rows[0].id;
  guest = await rpc(A, "split_add_guest", [ga, "Guest"]);
});
afterEach(async () => {
  await db.close();
});

test("additive read APIs deny anon, foreign groups and missing identities", async () => {
  for (const [name, args] of [
    ["split_list_groups", []], ["split_list_invites", []], ["split_history", []],
    ["split_group_snapshot", [ga]], ["split_expense_detail", [ga, randomUUID()]],
    ["split_settlement_detail", [ga, randomUUID()]],
    ["split_add_guest_once", [ga, "Another", randomUUID()]],
  ]) await assert.rejects(rpc(null, name, args), /permission denied/);
  await assert.rejects(rpc(B, "split_group_snapshot", [ga]), /Not authorized/);
  await assert.rejects(rpc(B, "split_history", [ga]), /Not authorized/);
  assert.deepEqual(await rpc(B, "split_history", []), []);
  assert.deepEqual((await rpc(A, "split_list_groups", [])).map(g => g.id), [ga]);
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await assert.rejects(db.query("select public.split_list_groups()"), /Not authorized/);
  await db.exec("reset role");
});

test("group snapshot is exact, scoped, includes retained inactive people and rejects revoked reads", async () => {
  await payExpense();
  let snapshot = await rpc(A, "split_group_snapshot", [ga]);
  assert.equal(snapshot.people.length, 2);
  assert.equal(snapshot.balances.find(b => b.person_id === pa).balance_minor, "100");
  await joinC();
  await rpc(A, "split_change_member", [ga, guest, false, "member"]);
  snapshot = await rpc(A, "split_group_snapshot", [ga]);
  assert.equal(snapshot.people.find(p => p.id === guest).active, false);
  assert.equal(snapshot.balances.find(b => b.person_id === guest).balance_minor, "-100");
  await assert.rejects(rpc(C, "split_group_snapshot", [ga]), /Not authorized/);
  assert.deepEqual(await rpc(C, "split_list_groups", []), []);
});

test("new guest creation retries and original group creation survive duplicate requests and renames", async () => {
  const key = randomUUID();
  const person = await rpc(A, "split_add_guest_once", [ga, "Unicode 😀", key]);
  assert.equal(await rpc(A, "split_add_guest_once", [ga, "Unicode 😀", key]), person);
  await assert.rejects(rpc(A, "split_add_guest_once", [ga, "Changed", key]), /Conflicting/);
  await assert.rejects(rpc(B, "split_add_guest_once", [ga, "X", key]), /Not authorized/);
  await assert.rejects(rpc(A, "split_add_guest_once", [ga, "X", null]), /Request key/);
  const groupKey = randomUUID(), g = await rpc(A, "split_create_group", ["Original", groupKey]);
  await rpc(A, "split_update_group", [g, "Renamed", false]);
  assert.equal(await rpc(A, "split_create_group", ["Original", groupKey]), g);
  await assert.rejects(rpc(A, "split_create_group", ["Renamed", groupKey]), /Conflicting/);
});

test("all purposes create the same Group ledger; Trip metadata and people are atomic", async () => {
  const purposes = ["general", "trip", "family", "home", "car_pool", "couple", "office", "college", "event", "other"];
  for (const purpose of purposes) {
    const trip = purpose === "trip";
    const id = await rpc(A, "split_create_group_v2", [purpose, purpose,
      trip ? "Goa" : null, trip ? "2026-10-03" : null, trip ? "2026-10-05" : null,
      JSON.stringify([{name: "Sam"}]), randomUUID()]);
    const snapshot = await rpc(A, "split_group_snapshot", [id]);
    assert.equal(snapshot.purpose, purpose);
    assert.equal(snapshot.destination, trip ? "Goa" : null);
    assert.equal(snapshot.people.length, 2);
    assert.equal(snapshot.balances.length, 2);
    const owner = snapshot.people.find(p => p.user_id === A).id;
    const sam = snapshot.people.find(p => p.name === "Sam").id;
    await payExpense(A, id, owner, sam, 101);
    assert.equal((await balance(A, id)).find(b => b.person_id === sam).balance_minor, "-101");
    assert.equal((await rpc(A, "split_history", [id])).length, 1);
    await assert.rejects(rpc(B, "split_group_snapshot", [id]), /Not authorized/);
  }
  const list = await rpc(A, "split_list_groups", []);
  assert.equal(list.length, 11);
  assert.equal(list.find(x => x.purpose === "trip").destination, "Goa");
  assert.equal((await rpc(A, "split_group_snapshot", [ga])).purpose, "general");
});

test("Trip creation denies malformed or foreign requests, and exact replay survives a rename", async () => {
  const key = randomUUID();
  const args = ["Goa", "trip", "India", "2026-10-03", "2026-10-05",
    JSON.stringify([{name: "Friend"}]), key];
  const id = await rpc(A, "split_create_group_v2", args);
  await rpc(A, "split_update_group", [id, "Renamed", false]);
  assert.equal(await rpc(A, "split_create_group_v2", args), id);
  await assert.rejects(rpc(A, "split_create_group_v2", ["Altered", ...args.slice(1)]), /Conflicting/);
  await assert.rejects(rpc(B, "split_group_snapshot", [id]), /Not authorized/);
  await assert.rejects(rpc(null, "split_create_group_v2", args), /permission denied/);
  const before = (await as(A, "select count(*)::int as n from public.groups")).rows[0].n;
  for (const invalid of [
    ["Goa", "unknown", null, null, null, "[]", randomUUID()],
    ["Home", "home", "Goa", null, null, "[]", randomUUID()],
    ["Goa", "trip", null, "2026-10-05", "2026-10-03", "[]", randomUUID()],
    ["Goa", "trip", null, null, null, JSON.stringify([{name: "X", user_id: B}]), randomUUID()],
    ["Goa", "trip", null, null, null, JSON.stringify(Array(200).fill({name: "X"})), randomUUID()],
  ]) await assert.rejects(rpc(A, "split_create_group_v2", invalid));
  assert.equal((await as(A, "select count(*)::int as n from public.groups")).rows[0].n, before);
});

test("invitation previews reveal only targeted valid invitations, never grant membership", async () => {
  const invitation = await rpc(A, "split_invite_member", [ga, guest, C]);
  assert.deepEqual(await rpc(B, "split_list_invites", []), []);
  const list = await rpc(C, "split_list_invites", []);
  assert.equal(list.length, 1); assert.equal(list[0].id, invitation);
  assert.equal(list[0].group_name, "Group A"); assert.equal(list[0].person_name, "Guest");
  await assert.rejects(rpc(C, "split_group_snapshot", [ga]), /Not authorized/);
  await rpc(C, "split_accept_invite", [invitation]);
  assert.deepEqual(await rpc(C, "split_list_invites", []), []);
});

test("history cursor preserves timestamp ties across all event kinds without duplicates or skipped rows", async () => {
  await joinC();
  await db.exec("begin");
  const expense = await payExpense();
  const settlement = await rpc(C, "split_record_settlement", [ga, randomUUID(), guest, pa, 40]);
  await rpc(A, "split_void_expense", [ga, expense, "Wrong bill"]);
  await rpc(C, "split_reverse_settlement", [ga, settlement, "Wrong record"]);
  await db.exec("commit");
  const all = await rpc(A, "split_history", [ga]);
  assert.equal(all.length, 4);
  assert.deepEqual(new Set(all.map(e => e.kind)), new Set(["expense", "repayment", "void", "reversal"]));
  assert(all.every(e => e.corrected));
  const collected = [];
  let cursor = [null, null, null];
  for (let i = 0; i < 5; i++) {
    const page = await rpc(A, "split_history", [ga, ...cursor, 1]);
    if (!page.length) break;
    collected.push(page[0]);
    if (page.length === 1) break;
    cursor = [page[0].created_at, page[0].kind, page[0].id];
  }
  assert.deepEqual(collected, all);
  const detail = await rpc(A, "split_expense_detail", [ga, expense]);
  assert.equal(detail.total_minor, "100"); assert.equal(detail.reason, "Wrong bill");
  assert.equal(detail.payments[0].amount_minor, "100");
  const repayment = await rpc(A, "split_settlement_detail", [ga, settlement]);
  assert.equal(repayment.amount_minor, "40"); assert.equal(repayment.reason, "Wrong record");
  await assert.rejects(rpc(B, "split_settlement_detail", [gb, settlement]), /unavailable/);
  await assert.rejects(rpc(B, "split_expense_detail", [gb, expense]), /unavailable/);
});

test("history is bounded; invalid and partial cursors fail and newer inserts do not duplicate older pages", async () => {
  for (let i = 0; i < 35; i++) await payExpense();
  const first = await rpc(A, "split_history", [ga]);
  assert.equal(first.length, 31);
  const anchor = first[29];
  await payExpense();
  const older = await rpc(A, "split_history", [ga, anchor.created_at, anchor.kind, anchor.id, 30]);
  assert.equal(older.length, 5);
  assert(!older.some(e => first.slice(0, 30).some(f => e.id === f.id)));
  for (const args of [[ga, null, null, null, 0], [ga, null, null, null, 51],
    [ga, anchor.created_at, null, anchor.id, 30], [ga, anchor.created_at, "bad", anchor.id, 30]]) {
    await assert.rejects(rpc(A, "split_history", args), /Invalid page/);
  }
  await assert.rejects(rpc(A, "split_list_groups", [anchor.created_at, null, 30]), /Invalid page/);
  await assert.rejects(rpc(A, "split_list_invites", [null, null, null]), /Invalid page/);
});

test("migration enables RLS on every application table; exposed functions have controlled search path", async () => {
  const tables = (
    await db.query(
      "select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r'",
    )
  ).rows;
  assert.equal(tables.length, 11);
  assert(tables.every((t) => t.relrowsecurity));
  const functions = (
    await db.query(
      "select proname,proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','split_private') and prosecdef",
    )
  ).rows;
  assert(functions.length >= 12);
  assert(functions.every((f) => f.proconfig?.includes('search_path=""')));
  await assert.rejects(
    as(A, "select split_private.balances($1)", [gb]),
    /permission denied/,
  );
});
test("profiles are private; no global email or provider directory", async () => {
  assert.equal((await as(A, "select * from public.profiles")).rows.length, 1);
  assert.equal(
    (await as(B, "select * from public.profiles where id=$1", [A])).rows.length,
    0,
  );
  assert.equal((await as(A, "select * from public.profiles")).rows[0].id, A);
  assert(!("email" in (await as(A, "select * from public.profiles")).rows[0]));
});
test("A and B can read only their group and its financial children", async () => {
  await payExpense();
  await payExpense(B, gb, pb, pb);
  for (const table of [
    "groups",
    "persons",
    "group_members",
    "expenses",
    "payments",
    "shares",
  ]) {
    const field = table === "groups" ? "id" : "group_id";
    assert.equal(
      (await as(A, `select * from public.${table} where ${field}=$1`, [gb]))
        .rows.length,
      0,
    );
    assert.equal(
      (await as(B, `select * from public.${table} where ${field}=$1`, [ga]))
        .rows.length,
      0,
    );
    assert(
      (await as(A, `select * from public.${table} where ${field}=$1`, [ga]))
        .rows.length > 0,
    );
  }
  await assert.rejects(balance(A, gb), /Not authorized/);
});
test("anonymous table and RPC access is denied", async () => {
  for (const table of [
    "profiles",
    "groups",
    "persons",
    "group_members",
    "member_invites",
    "expenses",
    "payments",
    "shares",
    "expense_voids",
    "settlements",
    "settlement_reversals",
  ])
    await assert.rejects(
      as(null, `select * from public.${table}`),
      /permission denied/,
    );
  await assert.rejects(
    rpc(null, "split_create_group", ["Attack", randomUUID()]),
    /permission denied/,
  );
});
test("no direct INSERT, UPDATE, DELETE or self-membership escalation", async () => {
  await assert.rejects(
    as(B, "insert into public.group_members values($1,$2,'admin',true,now())", [
      ga,
      pb,
    ]),
    /permission denied/,
  );
  await assert.rejects(
    as(A, "update public.persons set user_id=$1 where id=$2", [B, guest]),
    /permission denied/,
  );
  for (const table of [
    "profiles",
    "groups",
    "persons",
    "group_members",
    "expenses",
    "payments",
    "shares",
    "settlements",
    "expense_voids",
    "settlement_reversals",
  ]) {
    await assert.rejects(
      as(A, `delete from public.${table}`),
      /permission denied/,
    );
  }
  await assert.rejects(
    as(A, "update public.group_members set role='admin'"),
    /permission denied/,
  );
});
test("RLS itself denies writes even if an accidental table grant is introduced", async () => {
  await db.exec("grant insert,update,delete on public.groups to authenticated");
  const changed = await as(
    B,
    "update public.groups set name='hijacked' where id=$1 returning id",
    [ga],
  );
  assert.equal(changed.rows.length, 0);
  assert.equal(
    (await as(A, "delete from public.groups where id=$1 returning id", [ga]))
      .rows.length,
    0,
  );
  await assert.rejects(
    as(
      A,
      "insert into public.groups(name,created_by,request_key) values($1,$2,$3)",
      ["bad", A, randomUUID()],
    ),
    /row-level security/,
  );
});
test("ID tampering cannot modify foreign group or financial objects", async () => {
  const e = await payExpense();
  await assert.rejects(
    rpc(B, "split_update_group", [ga, "hijacked", false]),
    /Not authorized/,
  );
  await assert.rejects(
    rpc(B, "split_add_guest", [ga, "hijacked"]),
    /Not authorized/,
  );
  await assert.rejects(
    rpc(B, "split_void_expense", [gb, e, "wrong group"]),
    /Not authorized/,
  );
  await assert.rejects(
    rpc(B, "split_void_expense", [ga, e, "outsider"]),
    /Not authorized/,
  );
  await assert.rejects(payExpense(A, gb, pa, guest), /Not authorized/);
});
test("identity linking requires a targeted invite and target consent, not ID knowledge", async () => {
  const invitation = await rpc(A, "split_invite_member", [ga, guest, C]);
  assert.equal(
    (await as(C, "select * from public.groups where id=$1", [ga])).rows.length,
    0,
  );
  await assert.rejects(
    rpc(B, "split_accept_invite", [invitation]),
    /Not authorized/,
  );
  assert.equal(await rpc(C, "split_accept_invite", [invitation]), guest);
  assert.equal(await rpc(C, "split_accept_invite", [invitation]), guest); // safe retry
  assert.equal(
    (await as(C, "select * from public.groups where id=$1", [ga])).rows.length,
    1,
  );
  assert.equal((await as(C, "select * from public.profiles")).rows.length, 1);
  await assert.rejects(
    rpc(C, "split_invite_member", [ga, pa, B]),
    /Not authorized/,
  );
  await assert.rejects(
    rpc(C, "split_change_member", [ga, guest, true, "admin"]),
    /Not authorized/,
  );
});
test("expired/replaced invites fail and a linked person cannot be reassigned", async () => {
  const old = await rpc(A, "split_invite_member", [ga, guest, C]);
  const next = await rpc(A, "split_invite_member", [ga, guest, C]);
  await assert.rejects(rpc(C, "split_accept_invite", [old]), /Not authorized/);
  await db.query(
    "update public.member_invites set expires_at=now()-interval '1 second' where id=$1",
    [next],
  );
  await assert.rejects(rpc(C, "split_accept_invite", [next]), /unavailable/);
  await joinC();
  await assert.rejects(
    rpc(A, "split_invite_member", [ga, guest, B]),
    /cannot be linked/,
  );
});
test("member removal immediately removes access, preserves history, and cannot remove last admin", async () => {
  await joinC();
  await payExpense();
  await assert.rejects(
    rpc(A, "split_change_member", [ga, pa, false, "member"]),
    /active admin/,
  );
  await rpc(A, "split_change_member", [ga, guest, false, "member"]);
  assert.equal((await as(C, "select * from public.expenses")).rows.length, 0);
  await assert.rejects(payExpense(C, ga, guest, pa), /Not authorized/);
  assert.equal(
    (await balance()).find((b) => b.person_id === guest).balance_minor,
    "-100",
  );
});
test("expense creation is atomic, reconciled and idempotent with payload conflict protection", async () => {
  const key = randomUUID();
  const e = await payExpense(A, ga, pa, guest, 100, key);
  assert.equal(await payExpense(A, ga, pa, guest, 100, key), e);
  await assert.rejects(
    payExpense(A, ga, pa, guest, 101, key),
    /Conflicting request/,
  );
  assert.equal((await as(A, "select * from public.expenses")).rows.length, 1);
  assert.equal(
    (await balance()).find((b) => b.person_id === pa).balance_minor,
    "100",
  );
  assert.equal(
    (await balance()).find((b) => b.person_id === guest).balance_minor,
    "-100",
  );
});
test("mismatched payments/shares, duplicates, negative/fractional/unsafe values and malformed arrays reject", async () => {
  const goodPay = [{ payerId: pa, amountMinor: 100 }],
    goodShare = [{ personId: guest, amountMinor: 100 }];
  const cases = [
    [-1, goodPay, goodShare],
    [100, [], goodShare],
    [100, goodPay, []],
    [100, [{ payerId: pa, amountMinor: 99 }], goodShare],
    [100, goodPay, [{ personId: guest, amountMinor: 101 }]],
    [100, [{ payerId: pa, amountMinor: -1 }], goodShare],
    [100, [{ payerId: pa, amountMinor: 1.5 }], goodShare],
    [100, [{ payerId: pa, amountMinor: 9007199254740992 }], goodShare],
    [
      100,
      [
        { payerId: pa, amountMinor: 50 },
        { payerId: pa, amountMinor: 50 },
      ],
      goodShare,
    ],
    [
      100,
      goodPay,
      [
        { personId: guest, amountMinor: 50 },
        { personId: guest, amountMinor: 50 },
      ],
    ],
    [100, null, goodShare],
    [100, goodPay, {}],
    [100, [null], goodShare],
    [100, [{ payerId: pa, amountMinor: "100" }], goodShare],
    [100, [{ payerId: pa, amountMinor: 100, admin: true }], goodShare],
    [100, [{ payerId: "not-uuid", amountMinor: 100 }], goodShare],
  ];
  for (const [total, pay, shares] of cases)
    await assert.rejects(
      rpc(A, "split_create_expense", [
        ga,
        randomUUID(),
        "Bad",
        total,
        JSON.stringify(pay),
        JSON.stringify(shares),
      ]),
    );
  assert.equal((await as(A, "select * from public.expenses")).rows.length, 0);
  assert.equal((await as(A, "select * from public.payments")).rows.length, 0);
});
test("wrong-group, unknown and inactive participants cannot be expense endpoints", async () => {
  await assert.rejects(payExpense(A, ga, pb, guest), /not active/);
  await assert.rejects(payExpense(A, ga, pa, randomUUID()), /not active/);
  await rpc(A, "split_change_member", [ga, guest, false, "member"]);
  await assert.rejects(payExpense(), /not active/);
});
test("safe maximum is supported; overflowing aggregate causes full rollback", async () => {
  await payExpense(A, ga, pa, guest, Number.MAX_SAFE_INTEGER);
  await assert.rejects(payExpense(A, ga, pa, guest, 1), /Unsupported/);
  assert.equal((await as(A, "select * from public.expenses")).rows.length, 1);
  assert.equal((await as(A, "select * from public.payments")).rows.length, 1);
  assert.equal(
    (await balance()).find((b) => b.person_id === pa).balance_minor,
    String(Number.MAX_SAFE_INTEGER),
  );
});
test("zero-total expense supports empty allocations without manufacturing balances", async () => {
  await rpc(A, "split_create_expense", [
    ga,
    randomUUID(),
    "Zero",
    0,
    "[]",
    "[]",
  ]);
  assert((await balance()).every((b) => b.balance_minor === "0"));
});
test("deferred database constraint rejects partial privileged expense insertion at commit", async () => {
  await assert.rejects(
    db.query(
      "insert into public.expenses(group_id,description,total_minor,created_by,request_key,request_payload) values($1,'Partial',10,$2,$3,'{}')",
      [ga, A, randomUUID()],
    ),
    /must equal total/,
  );
  assert.equal((await as(A, "select * from public.expenses")).rows.length, 0);
});
test("composite foreign keys defend same-group relationships even below RPC layer", async () => {
  const e = await payExpense();
  await assert.rejects(
    db.query("insert into public.payments values($1,$2,$3,1)", [ga, e, pb]),
    /foreign key/,
  );
});
test("expense correction is an authorized idempotent void, not destructive editing", async () => {
  await joinC();
  const e = await payExpense();
  await assert.rejects(
    rpc(C, "split_void_expense", [ga, e, "other author"]),
    /Not authorized/,
  );
  await rpc(A, "split_void_expense", [ga, e, "Correction"]);
  await rpc(A, "split_void_expense", [ga, e, "Correction"]);
  assert((await balance()).every((b) => b.balance_minor === "0"));
  assert.equal((await as(A, "select * from public.expenses")).rows.length, 1);
  assert.equal(
    (await as(A, "select * from public.expense_voids")).rows.length,
    1,
  );
  await assert.rejects(
    rpc(A, "split_void_expense", [ga, e, "rewrite"]),
    /Conflicting/,
  );
});
test("only the linked sender may record repayment; not a suggestion or third-party claim", async () => {
  await joinC();
  await payExpense();
  await assert.rejects(
    rpc(A, "split_record_settlement", [ga, randomUUID(), guest, pa, 100]),
    /Only the sender/,
  );
  for (const amount of [-1, 0, 101, 9007199254740992])
    await assert.rejects(
      rpc(C, "split_record_settlement", [ga, randomUUID(), guest, pa, amount]),
    );
  await assert.rejects(
    rpc(C, "split_record_settlement", [ga, randomUUID(), guest, guest, 1]),
    /Invalid transfer/,
  );
  await assert.rejects(
    rpc(C, "split_record_settlement", [ga, randomUUID(), guest, pb, 1]),
    /Invalid transfer/,
  );
  const key = randomUUID(),
    id = await rpc(C, "split_record_settlement", [ga, key, guest, pa, 100]);
  assert.equal(
    await rpc(C, "split_record_settlement", [ga, key, guest, pa, 100]),
    id,
  );
  await assert.rejects(
    rpc(C, "split_record_settlement", [ga, key, guest, pa, 99]),
    /Conflicting/,
  );
  assert((await balance()).every((b) => b.balance_minor === "0"));
});
test("settlement reversal is append-only, authorized, idempotent and has correct signs", async () => {
  await joinC();
  await payExpense();
  const s = await rpc(C, "split_record_settlement", [
    ga,
    randomUUID(),
    guest,
    pa,
    100,
  ]);
  await assert.rejects(
    rpc(B, "split_reverse_settlement", [gb, s, "attack"]),
    /Not authorized/,
  );
  await assert.rejects(
    as(C, "update public.settlements set amount_minor=1 where id=$1", [s]),
    /permission denied/,
  );
  await rpc(C, "split_reverse_settlement", [ga, s, "Mistake"]);
  await rpc(C, "split_reverse_settlement", [ga, s, "Mistake"]);
  assert.equal(
    (await balance()).find((b) => b.person_id === guest).balance_minor,
    "-100",
  );
  assert.equal(
    (await as(A, "select * from public.settlements")).rows.length,
    1,
  );
  assert.equal(
    (await as(B, "select * from public.settlements")).rows.length,
    0,
  );
  assert.equal(
    (await as(B, "select * from public.settlement_reversals")).rows.length,
    0,
  );
});
test("archive preserves reads and rejects future writes; SQL-shaped text is only data", async () => {
  const name = "Group'); drop table public.groups; --";
  await rpc(A, "split_update_group", [ga, name, true]);
  assert.equal(
    (await as(A, "select name from public.groups where id=$1", [ga])).rows[0]
      .name,
    name,
  );
  await assert.rejects(payExpense(), /archived/);
  await assert.rejects(rpc(A, "split_add_guest", [ga, "Guest"]), /archived/);
});

test("ledger immutability also guards privileged accidental updates and deletes", async () => {
  const e = await payExpense();
  await assert.rejects(
    db.query("update public.expenses set description='rewrite' where id=$1", [
      e,
    ]),
    /immutable/,
  );
  await assert.rejects(
    db.query("delete from public.payments where expense_id=$1", [e]),
    /immutable/,
  );
});
test("membership role, malformed IDs, oversized entries and null fields fail safely", async () => {
  await assert.rejects(rpc(A, "split_update_profile", ["Spoof\u202ename"]));
  await assert.rejects(
    rpc(A, "split_change_member", [ga, guest, true, "owner"]),
    /Invalid membership/,
  );
  await assert.rejects(
    rpc(A, "split_change_member", [ga, guest, true, "admin"]),
    /requires an account/,
  );
  await assert.rejects(rpc(A, "split_update_profile", [""]));
  await assert.rejects(
    rpc(A, "split_update_group", ["not-a-uuid", "bad", false]),
  );
  await assert.rejects(
    rpc(A, "split_create_expense", [ga, randomUUID(), "Bad", 1.5, "[]", "[]"]),
  );
  await assert.rejects(
    rpc(A, "split_create_expense", [ga, null, "Bad", 0, "[]", "[]"]),
  );
  await assert.rejects(
    rpc(A, "split_create_expense", [
      ga,
      randomUUID(),
      "Bad",
      0,
      JSON.stringify(Array(201).fill({ payerId: pa, amountMinor: 1 })),
      "[]",
    ]),
    /Too many/,
  );
  assert.equal((await as(A, "select * from public.expenses")).rows.length, 0);
});

test("revoked inviter cannot leave a usable pending link; authenticated role without identity gains nothing", async () => {
  await joinC();
  await rpc(A, "split_change_member", [ga, guest, true, "admin"]);
  const pendingPerson = await rpc(A, "split_add_guest", [ga, "Pending"]);
  const invite = await rpc(A, "split_invite_member", [ga, pendingPerson, B]);
  await rpc(C, "split_change_member", [ga, pa, false, "member"]);
  await assert.rejects(
    rpc(B, "split_accept_invite", [invite]),
    /Invitation unavailable/,
  );
  assert.equal(
    (await as(B, "select * from public.groups where id=$1", [ga])).rows.length,
    0,
  );
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await db.exec("set role authenticated");
  try {
    assert.equal(
      (await db.query("select * from public.groups")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.split_get_balances($1)", [ga]),
      /Not authorized/,
    );
  } finally {
    await db.exec("reset role");
  }
});
