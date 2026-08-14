import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BoRole, BoUser } from "./types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: BoUser | null;
  role: BoRole | null;
  /** Permission keys granted to `role`, from GET /auth/me — drives nav filtering and route gating in AppShell. */
  permissions: string[];
  /**
   * "unknown" until the initial silent-refresh bootstrap (see
   * use-auth-bootstrap.ts) resolves, so route guards can show a loading
   * state instead of flashing a login screen on every hard page load.
   */
  status: "unknown" | "authenticated" | "anonymous";
  setSession: (session: {
    accessToken: string;
    refreshToken: string;
    user: BoUser;
    role: BoRole | null;
    permissions: string[];
  }) => void;
  /**
   * Refresh rotates *both* tokens (backend revokes the presented refresh
   * token and issues a new one — see auth.service.ts refreshSession).
   * Deliberately leaves `user`/`role`/`permissions`/`status` untouched:
   * during the silent bootstrap refresh on app load, those aren't known
   * yet and get filled in by a follow-up setUser() once /auth/me resolves.
   */
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: BoUser, role: BoRole | null, permissions: string[]) => void;
  clearSession: () => void;
  /** Convenience check used throughout — AppShell's nav filter, route gating, and per-action gating (e.g. PlansPage's mutating buttons). */
  hasPermission: (key: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      // Deliberate trade-off: igroom-backend issues the refresh token in
      // the JSON body rather than an httpOnly cookie (see auth.controller.ts),
      // so there is no XSS-proof place to put it client-side. Persisting it
      // is what lets a returning user skip re-authenticating with Google +
      // TOTP on every page load; the access token itself is kept out of
      // storage and only ever lives in memory to shrink the exposure window.
      // If that trade-off isn't acceptable, the fix belongs on the backend
      // (issue the refresh token as an httpOnly, SameSite cookie instead).
      refreshToken: null,
      user: null,
      role: null,
      permissions: [],
      status: "unknown",
      setSession: ({ accessToken, refreshToken, user, role, permissions }) =>
        set({ accessToken, refreshToken, user, role, permissions, status: "authenticated" }),
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      setUser: (user, role, permissions) => set({ user, role, permissions, status: "authenticated" }),
      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          role: null,
          permissions: [],
          status: "anonymous",
        }),
      hasPermission: (key) => get().permissions.includes(key),
    }),
    {
      name: "igroom-bo-auth",
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    },
  ),
);
