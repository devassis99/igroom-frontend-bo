/** Mirrors igroom-backend's req.boUser shape (src/middleware/require-auth.ts). */
export interface BoUser {
  id: string;
  roleId: string;
  email: string;
}

/** The current user's role — just enough for display; full role management lives in src/lib/users-api.ts's BoRole. */
export interface BoRole {
  id: string;
  name: string;
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

/** Response shape of GET /auth/me — the frontend's source of truth for who's logged in and what they can do. */
export interface MeDetails {
  user: BoUser;
  role: BoRole | null;
  permissions: string[];
}
