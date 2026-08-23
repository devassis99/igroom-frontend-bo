import { apiRequest } from "./api-client";

/**
 * The staff identity a support session will assume. `isOwner` marks the
 * holder of the account's one system role — the default target, since it
 * always has every permission and so can't fail to reproduce a bug for a
 * reason unrelated to the bug.
 */
export interface SupportTarget {
  id: string;
  name: string;
  email: string;
  roleName: string | null;
  isOwner: boolean;
}

export interface StartedSupportSession {
  sessionId: string;
  /** Returned exactly once — only its hash is stored server-side. */
  ticket: string;
  /** Where to send the browser. The backend builds this so the back office needs no copy of the tenant app's URL. */
  redeemUrl: string;
  ticketExpiresAt: string;
  expiresAt: string;
  staffUser: SupportTarget;
  shopName: string;
}

export type SupportSessionState = "pending" | "abandoned" | "active" | "ended";

export interface SupportSessionAuditEntry {
  id: string;
  boUserName: string;
  boUserEmail: string;
  staffUserName: string;
  staffUserEmail: string;
  reason: string | null;
  startedAt: string;
  redeemedAt: string | null;
  expiresAt: string;
  endedAt: string | null;
  state: SupportSessionState;
  startedIp: string | null;
  redeemedIp: string | null;
}

export interface StartSupportSessionInput {
  /** Omit for the shop's Owner. */
  staffUserId?: string;
  reason?: string;
}

/**
 * Thin, 1:1 wrappers around igroom-backend's support-session routes
 * (src/modules/support-sessions). Starting and ending take the
 * shops.impersonate permission server-side; reading the audit trail only
 * takes shops.view, deliberately — the log is the accountability
 * mechanism, so it should be easier to read than to add to.
 */
export const supportSessionsApi = {
  start: (shopId: string, input: StartSupportSessionInput = {}) =>
    apiRequest<StartedSupportSession>(`/shops/${shopId}/support-session`, {
      method: "POST",
      body: input,
    }),

  list: (shopId: string) =>
    apiRequest<{ sessions: SupportSessionAuditEntry[] }>(`/shops/${shopId}/support-sessions`),

  end: (shopId: string, sessionId: string) =>
    apiRequest<void>(`/shops/${shopId}/support-sessions/${sessionId}/end`, { method: "POST" }),
};

export const SUPPORT_SESSION_STATE_LABEL: Record<SupportSessionState, string> = {
  pending: "Link not opened yet",
  abandoned: "Link expired unused",
  active: "Active now",
  ended: "Ended",
};

export const SUPPORT_SESSION_STATE_TONE: Record<
  SupportSessionState,
  "success" | "danger" | "neutral" | "gold"
> = {
  pending: "gold",
  abandoned: "neutral",
  active: "success",
  ended: "neutral",
};
