export type SecureKeyValue = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

/** Bounded ASCII chunks stay below native per-item limits. No plaintext fallback.
 * Remove manifest before writing: crash/failure yields guest, never partial tokens.
 * Queue SDK refresh/read/logout operations to avoid torn sessions.
 */
export function createSecureStorage(native: SecureKeyValue) {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const result = queue.then(work, work);
    queue = result.catch(() => {});
    return result;
  };
  const prefix = (key: string) => {
    if (!/^[A-Za-z0-9._-]{1,180}$/.test(key))
      throw new Error("Invalid storage key.");
    return `split.${key}`;
  };
  async function count(base: string) {
    const value = await native.getItemAsync(`${base}.count`);
    if (value === null) return 0;
    if (!/^(?:[1-9]|[1-5][0-9]|6[0-4])$/.test(value))
      throw new Error("Invalid secure storage manifest.");
    return Number(value);
  }
  async function remove(base: string) {
    // Delete the authoritative pointer first, even if chunk cleanup fails.
    let n = 64;
    try {
      n = (await count(base)) || 64; // absent pointer may be an interrupted write
    } catch {
      // A corrupt/unreadable manifest is not a reason to retain token chunks.
      // The bounded namespace is ours; try all possible slots before success.
      n = 64;
    } finally {
      await native.deleteItemAsync(`${base}.count`);
    }
    for (let i = 0; i < n; i++) await native.deleteItemAsync(`${base}.${i}`);
  }
  return {
    getItem: (key: string) =>
      serial(async () => {
        const base = prefix(key),
          n = await count(base);
        if (!n) return null;
        let value = "";
        for (let i = 0; i < n; i++) {
          const chunk = await native.getItemAsync(`${base}.${i}`);
          if (chunk === null || chunk.length > 1800) {
            await remove(base);
            throw new Error("Incomplete secure session.");
          }
          value += chunk;
        }
        try {
          return decodeURIComponent(value);
        } catch {
          await remove(base);
          throw new Error("Invalid secure session encoding.");
        }
      }),
    setItem: (key: string, value: string) =>
      serial(async () => {
        const base = prefix(key),
          encoded = encodeURIComponent(value),
          n = Math.ceil(encoded.length / 1800);
        if (n < 1 || n > 64)
          throw new Error("Session exceeds secure storage limit.");
        await remove(base);
        try {
          for (let i = 0; i < n; i++)
            await native.setItemAsync(
              `${base}.${i}`,
              encoded.slice(i * 1800, (i + 1) * 1800),
            );
          await native.setItemAsync(`${base}.count`, String(n));
        } catch {
          await native.deleteItemAsync(`${base}.count`);
          for (let i = 0; i < n; i++)
            await native.deleteItemAsync(`${base}.${i}`).catch(() => {});
          throw new Error("Secure session storage failed.");
        }
      }),
    removeItem: (key: string) => serial(() => remove(prefix(key))),
  };
}
