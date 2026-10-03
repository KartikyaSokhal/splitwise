import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { AppState } from "react-native";
import { createAuthRuntime } from "./client.ts";
import { AuthController } from "./controller.ts";

const Context = createContext<AuthController | null>(null);
const RuntimeContext = createContext<ReturnType<typeof createAuthRuntime>>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [runtime] = useState(() => {
    try {
      return createAuthRuntime();
    } catch {
      return null;
    }
  });
  const [disabled] = useState(() => new AuthController(null));
  const controller = runtime?.controller ?? disabled;
  useEffect(() => {
    if (!runtime) return;
    void controller.restore();
    const {
      data: { subscription },
    } = runtime.client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !controller.getSnapshot().busy)
        controller.signedOut();
      // Keep SDK callbacks synchronous; schedule revalidation outside them.
      if (event === "TOKEN_REFRESHED")
        setTimeout(() => void controller.restore(), 0);
      if (event === "SIGNED_IN" && AppState.currentState === "active")
        setTimeout(() => void runtime.client.auth.startAutoRefresh(), 0);
    });
    const refresh = (state: string) => {
      if (state === "active") {
        runtime.client.auth.startAutoRefresh();
        void controller.restore();
      } else runtime.client.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const listener = AppState.addEventListener("change", refresh);
    return () => {
      subscription.unsubscribe();
      listener.remove();
      runtime.client.auth.stopAutoRefresh();
    };
  }, [runtime, controller]);
  return <RuntimeContext.Provider value={runtime}><Context.Provider value={controller}>{children}</Context.Provider></RuntimeContext.Provider>;
}
/** Internal integration boundary, never import this into pure money modules. */
export function useAuthRuntime() { return useContext(RuntimeContext); }
export function useAuth() {
  const controller = useContext(Context);
  if (!controller) throw new Error("AuthProvider missing.");
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  return {
    ...state,
    signIn: (provider: "google" | "apple") => controller.signIn(provider),
    logout: () => controller.logout(),
  };
}
