import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Apple from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { readAuthConfig, parseOAuthCode } from "./config.ts";
import { createSecureStorage } from "./secureStorage.ts";
import {
  AuthController,
  LoginCancelled,
  RevocationUnconfirmed,
} from "./controller.ts";
import { ensurePkceCrypto, clearPkceStorage } from "./pkceCrypto.ts";

export function createAuthRuntime() {
  // Expo inlines only explicit EXPO_PUBLIC references. Never read privileged env values.
  const config = readAuthConfig(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.EXPO_PUBLIC_AUTH_SCHEME ?? "split-auth",
  );
  if (!config || Platform.OS === "web") return null; // native-only foundation
  ensurePkceCrypto();
  const storage = createSecureStorage({
    getItemAsync: SecureStore.getItemAsync,
    setItemAsync: (key, value) =>
      SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    deleteItemAsync: SecureStore.deleteItemAsync,
  });
  const storageKey = `sb-${new URL(config.url).hostname.split(".")[0]}-auth-token`;
  const client = createClient(config.url, config.publishableKey, {
    auth: {
      storage: {
        ...storage,
        setItem: async (key, value) => {
          if (key === storageKey) {
            const session = JSON.parse(value);
            delete session.provider_token;
            delete session.provider_refresh_token;
            value = JSON.stringify(session);
          }
          await storage.setItem(key, value);
        },
      },
      storageKey,
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      // Pinned auth-js uses refresh single-flight + commit guards by default.
      // Explicit locks are deprecated; storage serialization remains independent.
    },
    global: {
      fetch: async (input, init) => {
        const abort = new AbortController();
        const timeout = setTimeout(() => abort.abort(), 15000);
        const onAbort = () => abort.abort();
        init?.signal?.addEventListener("abort", onAbort, { once: true });
        if (init?.signal?.aborted) abort.abort();
        try {
          return await fetch(input, { ...init, signal: abort.signal });
        } finally {
          clearTimeout(timeout);
          init?.signal?.removeEventListener("abort", onAbort);
        }
      },
    },
  });
  async function verifiedUser() {
    const { data, error } = await client.auth.getUser();
    if (
      error ||
      !data.user ||
      typeof data.user.id !== "string" ||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data.user.id)
    )
      throw new Error("Session could not be verified.");
    return { id: data.user.id };
  }
  async function clearLocal() {
    client.auth.stopAutoRefresh();
    let revoked = false;
    try {
      const result = await client.auth.signOut({ scope: "local" });
      revoked = !result.error;
    } finally {
      await storage.removeItem(storageKey);
      await clearPkceStorage(storage, storageKey);
    }
    if (!revoked) throw new RevocationUnconfirmed();
  }
  const controller = new AuthController({
    restore: async () => {
      // Cold-start callbacks are deliberately not resumed. Start a fresh login.
      await clearPkceStorage(storage, storageKey);
      const { data, error } = await client.auth.getSession();
      if (error) {
        await clearLocal();
        throw new Error("Session restoration failed.");
      }
      if (!data.session) return null;
      // Never render a persisted user as authenticated until verified by Auth.
      try {
        return await verifiedUser();
      } catch {
        await clearLocal();
        throw new Error("Session expired or unavailable.");
      }
    },
    google: async () => {
      try {
        const { data, error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: config.redirectUri,
            skipBrowserRedirect: true,
          },
        });
        if (error || !data.url) throw new Error("Login unavailable.");
        const url = new URL(data.url);
        if (
          url.origin !== config.url ||
          url.pathname !== "/auth/v1/authorize" ||
          url.searchParams.get("code_challenge_method") !== "s256" ||
          !/^[A-Za-z0-9_-]{43}$/.test(
            url.searchParams.get("code_challenge") ?? "",
          ) ||
          typeof data.flowId !== "string" ||
          !/^[a-zA-Z0-9_-]{8,64}$/.test(data.flowId)
        )
          throw new Error("Secure provider URL unavailable.");
        const response = await WebBrowser.openAuthSessionAsync(
          data.url,
          config.redirectUri,
        );
        if (response.type !== "success") throw new LoginCancelled();
        const code = parseOAuthCode(response.url, config.redirectUri);
        const exchanged = await client.auth.exchangeCodeForSession(code, {
          flowId: data.flowId,
        });
        if (exchanged.error || !exchanged.data.session)
          throw new Error("Invalid auth response.");
        return await verifiedUser();
      } catch (error) {
        await clearLocal();
        throw error;
      } finally {
        await clearPkceStorage(storage, storageKey);
      }
    },
    apple: async () => {
      try {
        if (Platform.OS !== "ios" || !(await Apple.isAvailableAsync()))
          throw new Error("Apple unavailable.");
        const nonce = Crypto.randomUUID(),
          state = Crypto.randomUUID();
        const hashed = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          nonce,
        );
        const response = await Apple.signInAsync({
          nonce: hashed,
          state,
          requestedScopes: [Apple.AppleAuthenticationScope.EMAIL],
        });
        if (!response.identityToken || response.state !== state)
          throw new Error("Invalid Apple response.");
        const { error, data } = await client.auth.signInWithIdToken({
          provider: "apple",
          token: response.identityToken,
          nonce,
        });
        if (error || !data.session) throw new Error("Invalid auth response.");
        return await verifiedUser();
      } catch (error) {
        await clearLocal();
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ERR_REQUEST_CANCELED"
        )
          throw new LoginCancelled();
        throw error;
      }
    },
    logout: clearLocal,
  });
  return { controller, client, recoveryStorage: storage };
}
