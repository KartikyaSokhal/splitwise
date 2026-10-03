export type AuthUser = { id: string };
export type AuthState = {
  user: AuthUser | null;
  busy: boolean;
  message: string | null;
  configured: boolean;
  generation: number;
};
export class LoginCancelled extends Error {}
export class RevocationUnconfirmed extends Error {}
export interface AuthPort {
  restore(): Promise<AuthUser | null>;
  google(): Promise<AuthUser>;
  apple(): Promise<AuthUser>;
  logout(): Promise<void>;
}

/** UI session state is not authorization. RLS independently checks every request. */
export class AuthController {
  private state: AuthState;
  private listeners = new Set<() => void>();
  private epoch = 0;
  private inFlight = false;
  constructor(private port: AuthPort | null) {
    this.state = {
      user: null,
      busy: false,
      message: null,
      configured: port !== null,
      generation: 0,
    };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(next: Partial<AuthState>) {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }
  async restore() {
    await this.run(() => this.port!.restore(), true);
  }
  async signIn(provider: "google" | "apple") {
    await this.run(() => this.port![provider]());
  }
  private async run(work: () => Promise<AuthUser | null>, revalidate = false) {
    if (!this.port || this.state.busy || this.inFlight) return;
    this.inFlight = true;
    const epoch = ++this.epoch;
    // Revalidation keeps an already verified identity mounted; failure clears it.
    // RLS still authorizes every cloud operation. Cold start has no trusted user.
    this.publish({ busy: true, message: null, ...(revalidate ? {} : { user: null, generation: this.state.generation + 1 }) });
    try {
      const user = await work();
      if (
        user &&
        (typeof user.id !== "string" ||
          !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(user.id))
      )
        throw new Error("Invalid user.");
      if (epoch === this.epoch) this.publish({ user });
      else await this.port.logout(); // a late login must not undo logout
    } catch (error) {
      if (epoch === this.epoch)
        this.publish({
          user: null,
          message:
            error instanceof LoginCancelled
              ? null
              : "Sign-in is unavailable. Try again online; Quick Split still works.",
        });
    } finally {
      this.inFlight = false;
      if (epoch === this.epoch) this.publish({ busy: false });
    }
  }
  async logout() {
    ++this.epoch;
    this.publish({ user: null, busy: true, message: null, generation: this.state.generation + 1 });
    try {
      await this.port?.logout();
    } catch (error) {
      this.publish({
        message:
          error instanceof RevocationUnconfirmed
            ? "Signed out on this device. Server session revocation could not be confirmed."
            : "Device session cleanup failed. Retry sign out before sharing this device.",
      });
    } finally {
      this.publish({ busy: false });
    }
  }
  signedOut = () => {
    ++this.epoch;
    this.publish({ user: null, busy: false, generation: this.state.generation + 1 });
  };
}
