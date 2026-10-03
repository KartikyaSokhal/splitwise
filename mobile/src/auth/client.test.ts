import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let returnedSession: unknown = null,
  revocationError: unknown = null;
let userError: unknown = null;
let appleInvalidState = false;
let browserResult: { type: string; url?: string } = { type: "cancel" };
let appleOptions: { nonce?: string; state?: string } = {};
let exchangeCode: string | undefined,
  idTokenOptions: Record<string, unknown> | undefined,
  clientOptions: any;
const stored = new Map<string, string>();
const sdk = {
  auth: {
    getSession: async () => ({
      data: { session: returnedSession },
      error: null,
    }),
    getUser: async () => ({
      data: { user: userError ? null : { id } },
      error: userError,
    }),
    signOut: async () => ({ error: revocationError }),
    stopAutoRefresh: () => {},
    signInWithOAuth: async () => ({
      data: {
        url:
          "https://example.supabase.co/auth/v1/authorize?provider=google&code_challenge_method=s256&code_challenge=" +
          "a".repeat(43),
        flowId: "testFlow123456",
      },
      error: null,
    }),
    exchangeCodeForSession: async (code: string) => {
      exchangeCode = code;
      return { data: { session: { user: { id } } }, error: null };
    },
    signInWithIdToken: async (options: Record<string, unknown>) => {
      idTokenOptions = options;
      return { data: { session: { user: { id } } }, error: null };
    },
  },
};
mock.module("react-native-url-polyfill/auto", { exports: {} });
mock.module("@supabase/supabase-js", {
  exports: {
    createClient: (_url: string, _key: string, options: unknown) => {
      clientOptions = options;
      return sdk;
    },
    processLock: () => {},
  },
});
mock.module("react-native", { exports: { Platform: { OS: "ios" } } });
mock.module("expo-secure-store", {
  exports: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
    getItemAsync: async (k: string) => stored.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => {
      stored.set(k, v);
    },
    deleteItemAsync: async (k: string) => {
      stored.delete(k);
    },
  },
});
mock.module("expo-web-browser", {
  exports: { openAuthSessionAsync: async () => browserResult },
});
mock.module("expo-apple-authentication", {
  exports: {
    isAvailableAsync: async () => true,
    AppleAuthenticationScope: { EMAIL: 0 },
    signInAsync: async (options: typeof appleOptions) => {
      appleOptions = options;
      return {
        identityToken: "mock-provider-token",
        state: appleInvalidState ? "wrong-state" : options.state,
      };
    },
  },
});
mock.module("expo-crypto", {
  exports: {
    randomUUID,
    CryptoDigestAlgorithm: { SHA256: "SHA256" },
    digestStringAsync: async (_alg: string, s: string) =>
      createHash("sha256").update(s).digest("hex"),
  },
});
const { createAuthRuntime } = await import("./client.ts");
function runtime() {
  // Deliberate test-only public-config fixtures, not working credentials.
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_" + "test".repeat(8);
  process.env.EXPO_PUBLIC_AUTH_SCHEME = "split-auth";
  returnedSession = null;
  revocationError = null;
  userError = null;
  appleInvalidState = false;
  stored.clear();
  return createAuthRuntime()!;
}
test("native auth adapter: Google code exchange, cancellation and invalid callback", async () => {
  const r = runtime();
  assert.equal(clientOptions.auth.flowType, "pkce");
  assert.equal(clientOptions.auth.detectSessionInUrl, false);
  assert.equal(Object.hasOwn(clientOptions.auth, "lock"), false);
  browserResult = { type: "cancel" };
  await r.controller.signIn("google");
  assert.equal(r.controller.getSnapshot().user, null);
  assert.equal(r.controller.getSnapshot().message, null);
  browserResult = { type: "success", url: "evil://auth/callback?code=bad" };
  await r.controller.signIn("google");
  assert.equal(r.controller.getSnapshot().user, null);
  browserResult = {
    type: "success",
    url: "split-auth://auth/callback?code=bound-code",
  };
  await r.controller.signIn("google");
  assert.equal(exchangeCode, "bound-code");
  assert.deepEqual(r.controller.getSnapshot().user, { id });
});
test("native auth adapter: Apple hashes nonce for Apple and sends raw nonce to Supabase", async () => {
  const r = runtime();
  await r.controller.signIn("apple");
  assert.equal(idTokenOptions!.provider, "apple");
  assert.equal(
    appleOptions.nonce,
    createHash("sha256")
      .update(idTokenOptions!.nonce as string)
      .digest("hex"),
  );
  assert(appleOptions.state);
  assert.deepEqual(r.controller.getSnapshot().user, { id });
  appleInvalidState = true;
  await r.controller.signIn("apple");
  assert.equal(r.controller.getSnapshot().user, null);
  assert.match(r.controller.getSnapshot().message!, /unavailable/);
});
test("native auth adapter: restore, remove provider tokens, and local logout despite revocation failure", async () => {
  const r = runtime();
  await r.controller.restore();
  assert.equal(r.controller.getSnapshot().user, null);
  returnedSession = { user: { id } };
  await r.controller.restore();
  assert.deepEqual(r.controller.getSnapshot().user, { id });
  const key = clientOptions.auth.storageKey;
  await clientOptions.auth.storage.setItem(
    key,
    JSON.stringify({
      access_token: "mock-access",
      refresh_token: "mock-refresh",
      provider_token: "unneeded",
    }),
  );
  assert(
    !JSON.parse(await clientOptions.auth.storage.getItem(key)).provider_token,
  );
  revocationError = { status: 503 };
  await r.controller.logout();
  assert.equal(r.controller.getSnapshot().user, null);
  assert.equal(await clientOptions.auth.storage.getItem(key), null);
  assert.match(
    r.controller.getSnapshot().message!,
    /revocation could not be confirmed/,
  );
  revocationError = null;
  userError = new Error("revoked or offline - raw details must not leak");
  returnedSession = { user: { id } };
  await r.controller.restore();
  assert.equal(r.controller.getSnapshot().user, null);
  assert.equal(await clientOptions.auth.storage.getItem(key), null);
  assert(!r.controller.getSnapshot().message!.includes("raw details"));
});
