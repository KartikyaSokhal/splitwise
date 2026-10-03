import { useCallback, useEffect, useRef, useState } from "react";
import type { Cursor, Page } from "./contracts.ts";
import { safeCloudError } from "./repository.ts";

export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const version = useRef(0);
  const reload = useCallback(async () => {
    const v = ++version.current;
    setLoading(true);
    setError(null);
    try {
      const value = await load();
      if (v === version.current) setData(value);
    } catch (e) {
      if (v === version.current) {
        setData(null);
        setError(safeCloudError(e).message);
      }
    } finally {
      if (v === version.current) setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    void reload();
    return () => {
      ++version.current;
    };
  }, [reload]);
  return { data, error, loading, reload };
}

/** One bounded page, not an ever-growing lifetime cache. Cursors are opaque. */
export function usePage<T>(load: (cursor: Cursor | null) => Promise<Page<T>>) {
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const resource = useResource(useCallback(() => load(cursor), [load, cursor]));
  const next = () => {
    if (!resource.loading && resource.data?.next) setCursor(resource.data.next);
  };
  const newest = () => {
    if (cursor) setCursor(null);
    else void resource.reload();
  };
  return { ...resource, older: cursor !== null, next, newest };
}

/** Synchronous ref guard blocks duplicate taps before React updates disabled UI. */
export function useAction() {
  const locked = useRef(false),
    alive = useRef(true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function run(work: () => Promise<void>, done?: () => void) {
    if (locked.current || !alive.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await work();
      if (alive.current) done?.();
    } catch (e) {
      if (alive.current) setError(safeCloudError(e, true).message);
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return { busy, error, run, clearError: () => setError(null) };
}
