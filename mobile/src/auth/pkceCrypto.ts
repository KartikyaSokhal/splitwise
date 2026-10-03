import * as Crypto from "expo-crypto";

/** Minimal native bridge for the SDK's PKCE primitives, not a general WebCrypto shim.
 * The SDK otherwise falls back to Math.random/plain PKCE on some native runtimes.
 */
export function ensurePkceCrypto() {
  const runtime = globalThis as unknown as {
    crypto?: {
      getRandomValues?: typeof Crypto.getRandomValues;
      subtle?: {
        digest: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer>;
      };
    };
  };
  runtime.crypto ??= {};
  runtime.crypto.getRandomValues ??= Crypto.getRandomValues;
  runtime.crypto.subtle ??= {
    digest: async (algorithm, data) => {
      if (algorithm !== "SHA-256") throw new Error("Unsupported digest.");
      return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
    },
  };
  if (typeof TextEncoder === "undefined" || typeof btoa !== "function")
    throw new Error("Secure PKCE runtime unavailable.");
}

export async function clearPkceStorage(
  storage: {
    getItem: (key: string) => Promise<string | null>;
    removeItem: (key: string) => Promise<void>;
  },
  key: string,
) {
  const indexKey = `${key}-flows-code-verifier`;
  const raw = await storage.getItem(indexKey);
  if (raw) {
    let ids: unknown;
    try {
      ids = JSON.parse(raw);
    } catch {
      ids = [];
    }
    if (Array.isArray(ids))
      for (const id of ids.slice(0, 16))
        if (typeof id === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(id))
          await storage.removeItem(`${key}-flow-${id}-code-verifier`);
  }
  await storage.removeItem(indexKey);
  await storage.removeItem(`${key}-code-verifier`);
}
