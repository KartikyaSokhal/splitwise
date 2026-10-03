// Explicit opt-in, read-only hosted gateway checks. Never print config values.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const env = readFileSync(new URL("../../mobile/.env", import.meta.url), "utf8");
const read = key => env.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const base = read("EXPO_PUBLIC_SUPABASE_URL"), key = read("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const linked = readFileSync(new URL("../.temp/project-ref", import.meta.url), "utf8").trim();
assert(base && key?.startsWith("sb_publishable_"), "Public test configuration missing");
const url = new URL(base);
assert(url.protocol === "https:" && url.hostname === `${linked}.supabase.co`, "Linked staging project mismatch");
for (const [path, method, body] of [["/rest/v1/groups?select=id&limit=1", "GET"], ["/rest/v1/rpc/split_list_groups", "POST", "{}"],
  ["/rest/v1/rpc/split_create_group_v2", "POST", JSON.stringify({p_name:"QA",p_purpose:"trip",p_destination:null,p_start_date:null,p_end_date:null,p_people:[],p_request_key:"11111111-1111-4111-8111-111111111111"})]]) {
  const response = await fetch(base + path, { method, body, headers: { apikey: key, "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000) });
  assert([401, 403].includes(response.status), "Anonymous gateway request unexpectedly allowed");
  console.log(`${method === "GET" ? "Table read" : path.includes("_v2") ? "Trip creation RPC" : "Read RPC"}: anonymous denied (HTTP ${response.status})`);
}
console.log("PASS: 3 anonymous hosted gateway checks. This does not verify signed-in JWT isolation.");
