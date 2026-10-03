export type AuthConfig = {
  url: string;
  publishableKey: string;
  redirectUri: string;
};
export function readAuthConfig(
  url: unknown,
  key: unknown,
  scheme: unknown,
): AuthConfig | null {
  if (!url && !key) return null;
  if (
    typeof url !== "string" ||
    typeof key !== "string" ||
    typeof scheme !== "string"
  )
    throw new Error("Auth configuration is incomplete.");
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/" ||
    !/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key) ||
    !/^[a-z][a-z0-9.-]{2,80}$/.test(scheme)
  ) {
    throw new Error("Use HTTPS and a Supabase publishable client key only.");
  }
  return {
    url: parsed.origin,
    publishableKey: key,
    redirectUri: `${scheme}://auth/callback`,
  };
}

/** Only an active browser request may pass its response here. No implicit-flow tokens. */
export function parseOAuthCode(response: string, expected: string): string {
  const actual = new URL(response),
    target = new URL(expected);
  if (
    actual.protocol !== target.protocol ||
    actual.host !== target.host ||
    actual.pathname !== target.pathname ||
    actual.username ||
    actual.password ||
    actual.hash ||
    actual.searchParams.has("error") ||
    [...actual.searchParams.keys()].some((k) => k !== "code") ||
    actual.searchParams.getAll("code").length !== 1
  ) {
    throw new Error("Invalid authentication callback.");
  }
  const code = actual.searchParams.get("code");
  if (!code || code.length > 2048 || /\s/.test(code))
    throw new Error("Invalid authentication code.");
  return code;
}
