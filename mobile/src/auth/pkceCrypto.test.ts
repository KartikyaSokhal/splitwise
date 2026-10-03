import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomFillSync } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

let randomCalls = 0;
mock.module("expo-crypto", {
  exports: {
    CryptoDigestAlgorithm: { SHA256: "SHA-256" },
    getRandomValues: (bytes: Uint8Array) => {
      randomCalls++;
      return randomFillSync(bytes);
    },
    digest: async (_algorithm: string, data: ArrayBuffer) =>
      Uint8Array.from(
        createHash("sha256").update(new Uint8Array(data)).digest(),
      ).buffer,
  },
});
const { ensurePkceCrypto, clearPkceStorage } = await import("./pkceCrypto.ts");

test("real pinned SDK produces S256 PKCE with native crypto bridge when WebCrypto is absent", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const values = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  };
  try {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    ensurePkceCrypto();
    const client = createClient(
      "https://pkce-fixture.supabase.co",
      "sb_publishable_test_fixture",
      {
        auth: {
          storage,
          storageKey: "pkce-test",
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          fetch: async () => {
            throw new Error("This test must never call a network.");
          },
        },
      },
    );
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        skipBrowserRedirect: true,
        redirectTo: "split-auth://auth/callback",
      },
    });
    assert.equal(error, null);
    assert(data.url && data.flowId);
    const url = new URL(data.url);
    assert.equal(url.searchParams.get("code_challenge_method"), "s256");
    const verifier = JSON.parse(
      values.get(`pkce-test-flow-${data.flowId}-code-verifier`)!,
    );
    assert.equal(
      url.searchParams.get("code_challenge"),
      createHash("sha256").update(verifier).digest("base64url"),
    );
    assert(randomCalls > 0);
    await clearPkceStorage(storage, "pkce-test");
    assert.equal(values.size, 0);
    client.auth.stopAutoRefresh();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
    else Reflect.deleteProperty(globalThis, "crypto");
  }
});

test("PKCE cleanup removes flow slots and legacy verifier without trusting malformed slot names", async () => {
  const removed: string[] = [];
  await clearPkceStorage(
    {
      getItem: async () =>
        JSON.stringify(["validFlow123", "../foreign-key", null]),
      removeItem: async (key) => {
        removed.push(key);
      },
    },
    "session",
  );
  assert.deepEqual(removed, [
    "session-flow-validFlow123-code-verifier",
    "session-flows-code-verifier",
    "session-code-verifier",
  ]);
});
