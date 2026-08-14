import { apiRequest } from "./api-client";

export interface MfaResetResponse {
  /** Pass to authApi.beginMfaSetup / authApi.completeMfaSetup, exactly like first-time enrollment. */
  setupToken: string;
}

/**
 * Self-service account settings for the *currently logged-in* user —
 * distinct from src/lib/users-api.ts, which is an admin managing
 * *other* people's accounts. Every call here is bearer-token
 * authenticated via apiRequest, same as billing-api.ts/users-api.ts.
 */
export const accountApi = {
  /**
   * Wraps POST /auth/mfa/reset — requires the account's current TOTP
   * code (unless a previous reset was already abandoned mid-flow, in
   * which case omit it — see auth.service.ts's requestMfaReset), then
   * clears MFA and returns a fresh mfa_setup flow token. Hand that
   * token straight to MfaSetupPage (via router state) to finish
   * re-enrollment through the existing first-time-setup screen.
   */
  resetMfa: (currentCode?: string) =>
    apiRequest<MfaResetResponse>("/auth/mfa/reset", { method: "POST", body: { code: currentCode } }),
};
