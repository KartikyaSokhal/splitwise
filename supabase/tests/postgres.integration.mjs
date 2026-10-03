// Opt-in real multi-connection PostgreSQL tests. Requires the task-owned local
// Docker container; refuses networked containers. Never accepts a hosted DB URL.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
const exec = promisify(execFile);
const container = process.env.DUESHARE_QA_CONTAINER ?? "dueshare-qa-postgres-20261003";
assert(/^dueshare-qa-[a-z0-9-]+$/.test(container), "Only task-owned QA containers allowed");
const database = `dueshare_qa_${Date.now()}`;
const A = randomUUID(), B = randomUUID(), C = randomUUID();
function literal(v) { return v === null ? "null" : typeof v === "number" ? String(v) : `'${String(v).replaceAll("'", "''")}'`; }
async function sql(query, db = database) {
  const r = await exec("docker", ["exec", "-i", container, "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", db, "-c", query], { timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
  return r.stdout.trim();
}
const as = (actor, query, application = "dueshare_qa") => sql(`begin; set local role authenticated; set local request.jwt.claim.sub=${literal(actor)}; set local application_name=${literal(application)}; ${query}; commit;`);
const call = (actor, name, args = []) => as(actor, `select public.${name}(${args.map(literal).join(",")})`);
async function fixture() {
  const g = await call(A, "split_create_group", ["QA", randomUUID()]);
  const a = await sql(`select id from public.persons where group_id=${literal(g)} and user_id=${literal(A)}`);
  const b = await call(A, "split_add_guest_once", [g, "QA B", randomUUID()]);
  const invite = await call(A, "split_invite_member", [g, b, B]);
  await call(B, "split_accept_invite", [invite]);
  return { g, a, b };
}
const expenseArgs = (f, amount, key = randomUUID()) => [f.g, key, "QA expense", amount, JSON.stringify([{ payerId: f.a, amountMinor: amount }]), JSON.stringify([{ personId: f.b, amountMinor: amount }])];
const count = async (table, g) => Number(await sql(`select count(*) from public.${table} where group_id=${literal(g)}`));
const balances = async f => JSON.parse(await sql(`select json_agg(b) from public.split_get_balances(${literal(f.g)}) b`.replace("select json_agg", `set request.jwt.claim.sub=${literal(A)}; select json_agg`)));
async function assertConserved(f) {
  const b = await balances(f); assert.equal(b.reduce((sum, row) => sum + BigInt(row.balance_minor), 0n), 0n);
  assert.equal(await sql(`select count(*) from public.expenses e where e.group_id=${literal(f.g)} and
    ((select coalesce(sum(amount_minor),0) from public.payments where expense_id=e.id)<>e.total_minor or
    (select coalesce(sum(amount_minor),0) from public.shares where expense_id=e.id)<>e.total_minor)`), "0");
}
before(async () => {
  const metadata = JSON.parse((await exec("docker", ["inspect", container])).stdout)[0];
  assert.equal(metadata.HostConfig.NetworkMode, "none"); assert.equal(Object.keys(metadata.HostConfig.PortBindings ?? {}).length, 0);
  assert.match(metadata.Config.Image, /^postgres:17\.11-alpine$/);
  assert.match(await sql("show server_version", "postgres"), /^17\.11/);
  await sql(`create database ${database}`, "postgres");
  await sql(`do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
    if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; end$$;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter(f => f.endsWith(".sql")).sort()) await sql(readFileSync(new URL(f, dir), "utf8"));
  await sql(`insert into auth.users values(${literal(A)}),(${literal(B)}),(${literal(C)})`);
  console.log("Isolated PostgreSQL 17.11, actual parallel connections, test-only auth.uid shim; no hosted data.");
});

test("eight concurrent same-key expense saves commit exactly once", async () => {
  const f = await fixture(), args = expenseArgs(f, 101);
  const ids = await Promise.all(Array.from({ length: 8 }, () => call(A, "split_create_expense", args)));
  assert.equal(new Set(ids).size, 1); assert.equal(await count("expenses", f.g), 1);
  assert.equal(await count("payments", f.g), 1); assert.equal(await count("shares", f.g), 1); await assertConserved(f);
});
test("concurrent conflicting payloads on one key have exactly one winner", async () => {
  const f = await fixture(), key = randomUUID();
  const results = await Promise.allSettled([call(A, "split_create_expense", expenseArgs(f, 100, key)), call(A, "split_create_expense", expenseArgs(f, 101, key))]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1); assert.equal(await count("expenses", f.g), 1); await assertConserved(f);
});
test("eight distinct concurrent expense requests conserve all headers and children", async () => {
  const f = await fixture();
  await Promise.all(Array.from({ length: 8 }, () => call(A, "split_create_expense", expenseArgs(f, 1))));
  assert.equal(await count("expenses", f.g), 8); assert.equal(await count("payments", f.g), 8); assert.equal(await count("shares", f.g), 8); await assertConserved(f);
});
test("two full-debt repayments cannot over-settle; repeated same-key repayment is idempotent", async () => {
  const f = await fixture(); await call(A, "split_create_expense", expenseArgs(f, 100));
  const keys = [randomUUID(), randomUUID()];
  const attempts = await Promise.allSettled(keys.map(k => call(B, "split_record_settlement", [f.g, k, f.b, f.a, 100])));
  const index = attempts.findIndex(r => r.status === "fulfilled");
  assert.equal(attempts.filter(r => r.status === "fulfilled").length, 1);
  const replay = await Promise.all(Array.from({ length: 4 }, () => call(B, "split_record_settlement", [f.g, keys[index], f.b, f.a, 100])));
  assert.equal(new Set(replay).size, 1); assert.equal(await count("settlements", f.g), 1);
  assert((await balances(f)).every(b => b.balance_minor === "0")); await assertConserved(f);
});
test("concurrent last-admin demotions preserve one active linked admin", async () => {
  const f = await fixture(); await call(A, "split_change_member", [f.g, f.b, true, "admin"]);
  const results = await Promise.allSettled([call(A, "split_change_member", [f.g, f.a, true, "member"]), call(B, "split_change_member", [f.g, f.b, true, "member"])]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(await sql(`select count(*) from public.group_members where group_id=${literal(f.g)} and active and role='admin'`), "1");
});
test("a financial request blocked behind membership removal rechecks authorization after the lock", async () => {
  const f = await fixture();
  const removing = as(A, `select public.split_change_member(${literal(f.g)},${literal(f.b)},false,'member'); select pg_sleep(2)`, "dueshare_remove_lock");
  let observed = false;
  for (let i = 0; i < 20; i++) {
    if (await sql("select count(*) from pg_stat_activity where application_name='dueshare_remove_lock' and wait_event='PgSleep'") === "1") { observed = true; break; }
    await new Promise(r => setTimeout(r, 25));
  }
  assert(observed, "Removal must hold its transaction open");
  const waiting = call(B, "split_create_expense", expenseArgs(f, 100));
  await assert.rejects(waiting, /Not authorized/); await removing;
  assert.equal(await count("expenses", f.g), 0); await assertConserved(f);
});
test("concurrent aggregates at the safe integer limit roll back the losing expense entirely", async () => {
  const f = await fixture();
  const results = await Promise.allSettled(Array.from({ length: 2 }, () => call(A, "split_create_expense", expenseArgs(f, Number.MAX_SAFE_INTEGER))));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(await count("expenses", f.g), 1); assert.equal(await count("payments", f.g), 1); assert.equal(await count("shares", f.g), 1); await assertConserved(f);
});
test("invalid child allocation leaves no partial expense and deferred conservation also guards privileged inserts", async () => {
  const f = await fixture(), args = expenseArgs(f, 100); args[5] = JSON.stringify([{ personId: f.b, amountMinor: 99 }]);
  await assert.rejects(call(A, "split_create_expense", args), /Allocations/);
  assert.equal(await count("expenses", f.g), 0);
  await assert.rejects(sql(`begin; insert into public.expenses(group_id,description,total_minor,created_by,request_key,request_payload)
    values(${literal(f.g)},'Partial',100,${literal(A)},gen_random_uuid(),'{}'); commit;`), /allocations/i);
  assert.equal(await count("expenses", f.g), 0);
});
test("concurrent group creation cannot exceed the 100-group account quota", async () => {
  await as(C, "select public.split_create_group('Quota '||n,gen_random_uuid()) from generate_series(1,99) n");
  const results = await Promise.allSettled([call(C, "split_create_group", ["100", randomUUID()]), call(C, "split_create_group", ["101", randomUUID()])]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(await sql(`select count(*) from public.groups where created_by=${literal(C)}`), "100");
  const first = JSON.parse(await call(C, "split_list_groups"));
  assert.equal(first.length, 31);
  const last = first[29];
  const second = JSON.parse(await call(C, "split_list_groups", [last.created_at, last.id, 30]));
  assert.equal(second.length, 31); assert(!second.some(g => first.slice(0, 30).some(f => f.id === g.id)));
});
test("200 members and 200 payer/share rows work exactly; member 201 is rejected", async () => {
  const f = await fixture();
  await as(A, `select public.split_add_guest_once(${literal(f.g)},'Person '||n,gen_random_uuid()) from generate_series(1,198) n`);
  await assert.rejects(call(A, "split_add_guest_once", [f.g, "Over quota", randomUUID()]), /Member limit/);
  const ids = (await sql(`select id from public.persons where group_id=${literal(f.g)} order by id`)).split("\n");
  assert.equal(ids.length, 200);
  await call(A, "split_create_expense", [f.g, randomUUID(), "Everyone paid and owes one paise", 200,
    JSON.stringify(ids.map(payerId => ({ payerId, amountMinor: 1 }))),
    JSON.stringify(ids.map(personId => ({ personId, amountMinor: 1 })))]);
  assert.equal(await count("payments", f.g), 200); assert.equal(await count("shares", f.g), 200);
  const snapshot = JSON.parse(await call(A, "split_group_snapshot", [f.g]));
  assert.equal(snapshot.people.length, 200); assert.equal(snapshot.balances.length, 200);
  assert(snapshot.balances.every(b => b.balance_minor === "0")); await assertConserved(f);
});
test("10,000-expense group and 1,000 synthetic accounts: bounded history, exact balances, indexed cursor plan", async () => {
  const f = await fixture();
  await sql(`begin;
    insert into auth.users select gen_random_uuid() from generate_series(1,1000);
    create temporary table qa_seed as select gen_random_uuid() id,n from generate_series(1,10000) n;
    insert into public.expenses(id,group_id,description,total_minor,created_by,request_key,request_payload,created_at)
      select id,${literal(f.g)},'Synthetic scale fixture',1,${literal(A)},id,'{}','2020-01-01'::timestamptz+n*interval '1 second' from qa_seed;
    insert into public.payments select ${literal(f.g)},id,${literal(f.a)},1 from qa_seed;
    insert into public.shares select ${literal(f.g)},id,${literal(f.b)},1 from qa_seed;
    commit; analyze;`);
  const start = performance.now();
  const first = JSON.parse(await call(A, "split_history", [f.g]));
  const elapsed = performance.now() - start;
  assert.equal(first.length, 31); const last = first[29];
  const second = JSON.parse(await call(A, "split_history", [f.g, last.created_at, last.kind, last.id, 30]));
  assert.equal(second.length, 31); assert(!second.some(e => first.slice(0, 30).some(f => f.id === e.id)));
  const snapshot = JSON.parse(await call(A, "split_group_snapshot", [f.g]));
  assert.equal(snapshot.balances.find(b => b.person_id === f.a).balance_minor, "10000");
  const global = JSON.parse(await call(A, "split_history", [null]));
  assert.equal(global.length, 31);
  const globalLast = global[29];
  const globalNext = JSON.parse(await call(A, "split_history", [null, globalLast.created_at, globalLast.kind, globalLast.id, 30]));
  assert.equal(globalNext.length, 31);
  assert(!globalNext.some(e => global.slice(0, 30).some(f => f.id === e.id && f.kind === e.kind)));
  const plan = JSON.parse(await sql(`explain (analyze,buffers,format json) select id,created_at from public.expenses
    where group_id=${literal(f.g)} and (created_at,id)<(${literal(last.created_at)}::timestamptz,${literal(last.id)}::uuid)
    order by created_at desc,id desc limit 31`));
  assert.match(JSON.stringify(plan), /Index (Only )?Scan/);
  console.log(JSON.stringify({ scale: { accounts: 1003, groupExpenses: 10000, pageRowsIncludingLookahead: first.length,
    rpcWithLocalProcessOverheadMs: Math.round(elapsed), cursorPlanExecutionMs: plan[0]["Execution Time"],
    cursorIndexes: [...JSON.stringify(plan).matchAll(/"Index Name":"([^"]+)"/g)].map(m => m[1]) } }));
  await assertConserved(f);
});
