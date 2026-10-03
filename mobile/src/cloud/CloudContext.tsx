import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useAuth, useAuthRuntime } from "../auth/AuthContext.tsx";
import { CloudError, CloudRepository } from "./repository.ts";

const Context = createContext<CloudRepository | null>(null);
export function CloudProvider({ children }: { children: React.ReactNode }) {
  const { user, generation } = useAuth();
  const runtime = useAuthRuntime();
  const owner = user?.id;
  const repository = useMemo(() => {
    if (!owner || !runtime) return null;
    return new CloudRepository(
      owner,
      async (name, args, signal) => {
        const assertOwner = () => {
          if (
            signal.aborted ||
            runtime.controller.getSnapshot().user?.id !== owner ||
            runtime.controller.getSnapshot().generation !== generation
          )
            throw new CloudError("SESSION", "Sign in again to continue.");
        };
        assertOwner();
        const { data, error } = await runtime.client.auth.getSession();
        assertOwner();
        if (error || data.session?.user.id !== owner)
          throw new CloudError("SESSION", "Sign in again to continue.");
        // Freeze the verified account's token for this request. Do not allow the
        // SDK's later token lookup to attach a newly switched account's token.
        const response = await runtime.client
          .rpc(name, args)
          .setHeader("Authorization", `Bearer ${data.session.access_token}`)
          .abortSignal(signal);
        assertOwner();
        if (response.error) throw response.error;
        return response.data;
      },
      runtime.recoveryStorage,
    );
  }, [owner, generation, runtime]);
  useEffect(() => {
    if (!repository || !runtime) return;
    // Immediate invalidation, even before React finishes rendering sign-out.
    const unsubscribe = runtime.controller.subscribe(() => {
      if (
        runtime.controller.getSnapshot().user?.id !== repository.userId ||
        runtime.controller.getSnapshot().generation !== generation
      )
        repository.dispose();
    });
    return () => {
      unsubscribe();
      repository.dispose();
    };
  }, [repository, runtime, generation]);
  return <Context.Provider value={repository}>{children}</Context.Provider>;
}
export function useCloud() {
  return useContext(Context);
}
