import { authApi } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";
import { ApiError, request as rawRequest, type RequestOptions } from "./http";

/**
 * De-dupes concurrent 401s into a single /auth/refresh call: refresh
 * tokens are single-use/rotating on the backend (auth.service.ts), so two
 * requests racing to refresh independently would have the second one fail
 * with an already-revoked token instead of just waiting for the first.
 */
let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) throw new ApiError(401, "No refresh token available");

  refreshInFlight = authApi
    .refresh(refreshToken)
    .then((tokens) => {
      useAuthStore.getState().setTokens(tokens);
      return tokens.accessToken;
    })
    .catch((err) => {
      useAuthStore.getState().clearSession();
      throw err;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

/**
 * Authenticated request client for every resource endpoint beyond
 * /auth/*. Attaches the current access token, and on a 401 transparently
 * refreshes once and retries — callers never see the intermediate 401
 * unless the refresh itself fails (expired/revoked refresh token), in
 * which case the session is cleared and the error propagates so route
 * guards can redirect to /login.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;

  try {
    return await rawRequest<T>(path, {
      ...options,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && accessToken) {
      const newAccessToken = await refreshAccessToken();
      return rawRequest<T>(path, {
        ...options,
        headers: { Authorization: `Bearer ${newAccessToken}`, ...options.headers },
      });
    }
    throw err;
  }
}
