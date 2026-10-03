import test, { mock } from "node:test";
import assert from "node:assert/strict";
import React, { useSyncExternalStore } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { AuthController } from "../auth/controller.ts";
import type { CloudRepository } from "../cloud/repository.ts";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
let account = A,
  failRestore = false,
  sessionGate: (() => Promise<any>) | null = null;
const controller = new AuthController({
  restore: async () => {
    if (failRestore) throw new Error("revoked");
    return { id: account };
  },
  google: async () => ({ id: account }),
  apple: async () => ({ id: account }),
  logout: async () => {},
});
const calls: { authorization: string; aborted: boolean }[] = [];
const store = new Map<string, string>();
const runtime = {
  controller,
  recoveryStorage: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: async (k: string) => {
      store.delete(k);
    },
  },
  client: {
    auth: {
      getSession: async () =>
        sessionGate
          ? sessionGate()
          : {
              data: {
                session: {
                  user: { id: account },
                  access_token: `fixture-${account}`,
                },
              },
              error: null,
            },
    },
    rpc: () => {
      let authorization = "";
      const request = {
        setHeader: (_key: string, value: string) => {
          authorization = value;
          return request;
        },
        abortSignal: async (signal: AbortSignal) => {
          calls.push({ authorization, aborted: signal.aborted });
          return { data: [], error: null };
        },
      };
      return request;
    },
  },
};
mock.module("../auth/AuthContext.tsx", {
  exports: {
    useAuthRuntime: () => runtime,
    useAuth: () =>
      useSyncExternalStore(controller.subscribe, controller.getSnapshot),
  },
});
const { CloudProvider, useCloud } = await import("../cloud/CloudContext.tsx");
let repository: CloudRepository | null = null;
function Capture() {
  repository = useCloud();
  return null;
}
async function mount() {
  account = A;
  failRestore = false;
  sessionGate = null;
  calls.length = 0;
  await controller.signIn("google");
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(
      <CloudProvider>
        <Capture />
      </CloudProvider>,
    );
  });
  return root;
}
test("mounted account scope blocks delayed credential lookup from sending as a newly switched account", async () => {
  const root = await mount(),
    previous = repository!;
  let release!: (v: any) => void;
  sessionGate = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const pending = previous.groups();
  await act(async () => {
    await controller.logout();
  });
  assert.equal(repository, null);
  account = B;
  await act(async () => {
    await controller.signIn("google");
  });
  release({
    data: { session: { user: { id: A }, access_token: "fixture-old-account" } },
    error: null,
  });
  await assert.rejects(pending, /Sign in again/);
  assert.equal(calls.length, 0);
  sessionGate = null;
  await repository!.groups();
  assert.equal(calls[0].authorization, `Bearer fixture-${B}`);
  await act(async () => root.unmount());
});
test("mounted private state gets a fresh scope after logout/login of the same account, even when React batches", async () => {
  const root = await mount(),
    previous = repository!;
  await act(async () => {
    await controller.logout();
    await controller.signIn("google");
  });
  assert.notEqual(repository, previous);
  await assert.rejects(previous.groups(), /Sign in again/);
  await repository!.groups();
  assert.equal(calls.length, 1);
  await act(async () => root.unmount());
});
test("verified foreground revalidation preserves the scope; failure immediately removes it", async () => {
  const root = await mount(),
    previous = repository!;
  await act(async () => {
    await controller.restore();
  });
  assert.equal(repository, previous);
  failRestore = true;
  await act(async () => {
    await controller.restore();
  });
  assert.equal(repository, null);
  await assert.rejects(previous.groups(), /Sign in again/);
  await act(async () => root.unmount());
});
