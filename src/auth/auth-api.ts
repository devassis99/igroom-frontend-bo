import { request } from "@/lib/http";
import type { GoogleLoginOutcome, MeDetails, MfaSetupDetails, TokenPair } from "./types";

/**
 * Thin, 1:1 wrappers around igroom-backend's /auth/* routes
 * (src/routes/auth.routes.ts). Kept separate from the resource-level API
 * client because these calls happen *before* an access token exists (or,
 * for the MFA steps, are authenticated with a short-lived flow token
 * instead of a real session) — see src/lib/http.ts for why.
 */
export const authApi = {
  loginWithGoogle: (idToken: string) =>
    request<GoogleLoginOutcome>("/auth/google", { method: "POST", body: { idToken } }),

  beginMfaSetup: (setupToken: string) =>
    request<MfaSetupDetails>("/auth/mfa/setup", {
      method: "POST",
      headers: { Authorization: `Bearer ${setupToken}` },
    }),

  completeMfaSetup: (setupToken: string, code: string) =>
    request<TokenPair>("/auth/mfa/verify-setup", {
      method: "POST",
      headers: { Authorization: `Bearer ${setupToken}` },
      body: { code },
    }),

  verifyMfaChallenge: (challengeToken: string, code: string) =>
    request<TokenPair>("/auth/mfa/challenge", {
      method: "POST",
      headers: { Authorization: `Bearer ${challengeToken}` },
      body: { code },
    }),

  refresh: (refreshToken: string) =>
    request<TokenPair>("/auth/refresh", { method: "POST", body: { refreshToken } }),

  logout: (refreshToken: string) =>
    request<void>("/auth/logout", { method: "POST", body: { refreshToken } }),

  me: (accessToken: string) =>
    request<MeDetails>("/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};
