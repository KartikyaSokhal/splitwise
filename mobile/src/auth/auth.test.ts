import test from "node:test";
import assert from "node:assert/strict";
import { readAuthConfig, parseOAuthCode } from "./config.ts";
import { createSecureStorage, type SecureKeyValue } from "./secureStorage.ts";
import { AuthController, LoginCancelled, type AuthPort } from "./controller.ts";
const user = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
const port = (changes: Partial<AuthPort> = {}): AuthPort => ({
  restore: async () => user,
  google: async () => user,
  apple: async () => user,
  logout: async () => {},
  ...changes,
});
test("auth is optional and public config rejects privileged/implicit credentials", () => {
  assert.equal(readAuthConfig(undefined, undefined, "split-auth"), null);
  for (const [url, key] of [
    ["http://example.com", "sb_publishable_" + "a".repeat(24)],
    ["https://example.com", "sb_secret_test"],
    ["https://example.com", "eyJservice-role"],
    ["https://user:pass@example.com", "sb_publishable_" + "a".repeat(24)],
  ])
    assert.throws(() => readAuthConfig(url, key, "split-auth"));
  assert.equal(
    readAuthConfig(
      "https://example.supabase.co",
      "sb_publishable_" + "a".repeat(24),
      "split-auth",
    )!.redirectUri,
    "split-auth://auth/callback",
  );
});
test("callback accepts only the bound route with one code, no implicit tokens", () => {
  const expected = "split-auth://auth/callback";
  assert.equal(parseOAuthCode(expected + "?code=abc", expected), "abc");
  for (const value of [
    "evil://auth/callback?code=abc",
    expected + "/evil?code=abc",
    expected + "?code=a&code=b",
    expected + "#access_token=x",
    expected + "?error=denied",
    expected + "?code=a&next=evil",
    expected + "?code=",
  ])
    assert.throws(() => parseOAuthCode(value, expected));
});
function memory() {
  const values = new Map<string, string>();
  const native: SecureKeyValue = {
    getItemAsync: async (k) => values.get(k) ?? null,
    setItemAsync: async (k, v) => {
      values.set(k, v);
    },
    deleteItemAsync: async (k) => {
      values.delete(k);
    },
  };
  return { values, native };
}
test("secure storage chunks large unicode sessions, serializes writes, restores and removes", async () => {
  const { values, native } = memory(),
    storage = createSecureStorage(native),
    value = "₹token".repeat(1000);
  await storage.setItem("auth", value);
  assert.equal(await storage.getItem("auth"), value);
  assert([...values.values()].every((v) => v.length <= 1800));
  await Promise.all([
    storage.setItem("auth", "old"),
    storage.setItem("auth", "new"),
  ]);
  assert.equal(await storage.getItem("auth"), "new");
  await storage.removeItem("auth");
  assert.equal(await storage.getItem("auth"), null);
  assert.equal(values.size, 0);
  values.set("split.auth.63", "crash-orphan-without-manifest");
  await storage.removeItem("auth");
  assert.equal(values.size, 0);
});
test("storage failure and interrupted write fail closed without plaintext fallback", async () => {
  const { values, native } = memory();
  const storage = createSecureStorage({
    ...native,
    setItemAsync: async (k, v) => {
      if (k.endsWith(".1")) throw new Error("locked");
      await native.setItemAsync(k, v);
    },
  });
  await assert.rejects(storage.setItem("auth", "x".repeat(4000)));
  assert.equal(await storage.getItem("auth"), null);
  values.set("split.auth.count", "2");
  values.set("split.auth.0", "partial");
  await assert.rejects(storage.getItem("auth"));
  assert.equal(await storage.getItem("auth"), null);
  await assert.rejects(storage.setItem("auth", "x".repeat(120000)));
  values.set("split.auth.count", "corrupt");
  values.set("split.auth.63", "orphaned-token");
  await storage.removeItem("auth");
  assert.equal(values.size, 0);
  values.set("split.auth.count", "1");
  values.set("split.auth.0", "%bad-encoding");
  await assert.rejects(storage.getItem("auth"));
  assert.equal(values.size, 0);
});
test("session controller covers absent/verified/revoked sessions, cancellation, failure and logout", async () => {
  const disabled = new AuthController(null);
  await disabled.signIn("google");
  assert.equal(disabled.getSnapshot().user, null);
  const controller = new AuthController(port());
  await controller.restore();
  assert.deepEqual(controller.getSnapshot().user, user);
  await controller.logout();
  assert.equal(controller.getSnapshot().user, null);
  await controller.signIn("apple");
  assert.deepEqual(controller.getSnapshot().user, user);
  controller.signedOut();
  assert.equal(controller.getSnapshot().user, null);
  for (const action of [
    async () => null,
    async () => {
      throw new Error("expired secret must not leak");
    },
    async () => ({ id: "bad" }),
  ]) {
    const c = new AuthController(port({ restore: action }));
    await c.restore();
    assert.equal(c.getSnapshot().user, null);
    assert(!c.getSnapshot().message?.includes("secret"));
  }
  const cancelled = new AuthController(
    port({
      google: async () => {
        throw new LoginCancelled();
      },
    }),
  );
  await cancelled.signIn("google");
  assert.equal(cancelled.getSnapshot().message, null);
});
test("logout wins against late authentication and concurrent login is suppressed", async () => {
  let resolve!: (u: typeof user) => void;
  let calls = 0,
    logouts = 0;
  const c = new AuthController(
    port({
      google: async () => {
        calls++;
        return new Promise((r) => (resolve = r));
      },
      logout: async () => {
        logouts++;
      },
    }),
  );
  const pending = c.signIn("google");
  await c.signIn("google");
  assert.equal(calls, 1);
  await c.logout();
  resolve(user);
  await pending;
  assert.equal(c.getSnapshot().user, null);
  assert.equal(logouts, 2);
});
