/** Mirrors igroom-backend's req.boUser shape (src/middleware/require-auth.ts). */
export interface BoUser {
  id: string;
  roleId: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Response shape of POST /auth/google (igroom-backend LoginOutcome). */
export type GoogleLoginOutcome =
  | { status: "mfa_setup_required"; setupToken: string }
  | { status: "mfa_challenge_required"; challengeToken: string };

export interface MfaSetupDetails {
  otpAuthUrl: string;
  qrCodeDataUrl: string;
}
