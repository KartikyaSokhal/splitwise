import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

test("real pinned SDK default coordination coalesces refresh and does not restore a session after logout", async () => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const token = (expiry: number) =>
    [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
        "base64url",
      ),
      Buffer.from(
        JSON.stringify({ sub: id, exp: expiry, iss: "test-only" }),
      ).toString("base64url"),
      "fixture-signature",
    ].join(".");
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const session = {
    access_token: token(expires),
    refresh_token: "test-only-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expires,
    user: {
      id,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    },
  };
  const values = new Map([["sdk-session-fixture", JSON.stringify(session)]]);
  let refreshCalls = 0,
    release!: () => void;
  const client = createClient(
    "https://sdk-fixture.supabase.co",
    "sb_publishable_test_fixture",
    {
      auth: {
        storageKey: "sdk-session-fixture",
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: {
          getItem: async (k) => values.get(k) ?? null,
          setItem: async (k, v) => {
            values.set(k, v);
          },
          removeItem: async (k) => {
            values.delete(k);
          },
        },
      },
      global: {
        fetch: async (input) => {
          const url = String(input);
          if (url.includes("/token?")) {
            refreshCalls++;
            await new Promise<void>((r) => {
              release = r;
            });
            return new Response(
              JSON.stringify({
                ...session,
                access_token: token(expires + 100),
                refresh_token: "test-only-rotated",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }
          if (url.includes("/logout"))
            return new Response(null, { status: 204 });
          if (url.endsWith("/user"))
            return new Response(JSON.stringify(session.user), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          throw new Error("Unexpected fixture request");
        },
      },
    },
  );
  await client.auth.getSession();
  const first = client.auth.refreshSession(),
    second = client.auth.refreshSession();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(refreshCalls, 1);
  const signout = await client.auth.signOut({ scope: "local" });
  assert.equal(signout.error, null);
  release();
  await Promise.all([first, second]);
  assert.equal((await client.auth.getSession()).data.session, null);
  assert.equal(values.has("sdk-session-fixture"), false);
  client.auth.stopAutoRefresh();
});
