import { useEffect } from "react";
import { authApi } from "./auth-api";
import { useAuthStore } from "./auth-store";

/**
 * Runs once on app mount to turn a persisted refresh token (see
 * auth-store.ts's partialize) back into a live session, so a returning
 * user with a valid 30-day refresh token skips Google sign-in + TOTP
 * entirely. Mount this once near the root (see App.tsx) — every other
 * consumer should just read `status` off useAuthStore.
 */
export function useAuthBootstrap() {
  useEffect(() => {
    const { refreshToken, status } = useAuthStore.getState();

    if (status !== "unknown") return;

    if (!refreshToken) {
      useAuthStore.getState().clearSession();
      return;
    }

    authApi
      .refresh(refreshToken)
      .then(async (tokens) => {
        useAuthStore.getState().setTokens(tokens);
        const { user, role, permissions } = await authApi.me(tokens.accessToken);
        useAuthStore.getState().setUser(user, role, permissions);
      })
      .catch(() => {
        useAuthStore.getState().clearSession();
      });
  }, []);
}
