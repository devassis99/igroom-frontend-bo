import { apiRequest } from "./api-client";
import { ApiError } from "./http";
import { env } from "./env";
import { useAuthStore } from "@/auth/auth-store";
import type { BillingInterval } from "./billing-api";

/**
 * igroom-backend's /sales surface (src/modules/sales) — the sales
 * pipeline. Types mirror what the services return; the backend's
 * sales.rules.ts is where every rule behind them is written down.
 */

export type LeadStatus =
  | "new"
  | "contacted"
  | "demo_booked"
  | "demo_done"
  | "onboarding"
  | "live"
  | "lost"
  | "not_now";

export const REP_STATUSES = ["new", "contacted", "demo_booked", "demo_done"] as const;
export type RepStatus = (typeof REP_STATUSES)[number];
export const PIPELINE_STATUSES: LeadStatus[] = [...REP_STATUSES, "onboarding", "live"];

export type LeadSource =
  | "walk_in"
  | "cold_call"
  | "referral"
  | "instagram"
  | "event"
  | "other"
  | "inbound_form"
  | "abandoned_signup"
  | "referral_program"
  | "csv_import";

export type RepType = "employee" | "agent";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  demo_booked: "Demo booked",
  demo_done: "Demo done",
  onboarding: "Onboarding",
  live: "Live",
  lost: "Lost",
  not_now: "Not now",
};

export const SOURCE_LABEL: Record<LeadSource, string> = {
  walk_in: "Walk-in visit",
  cold_call: "Cold call",
  referral: "Referral",
  instagram: "Instagram",
  event: "Event",
  other: "Other",
  inbound_form: "Inbound form",
  abandoned_signup: "Abandoned signup",
  referral_program: "Referral program",
  csv_import: "CSV import",
};

export interface RepRef {
  repId: string;
  userId: string;
  name: string;
  shortName: string;
  initials: string;
  type: RepType;
}

export interface Lead {
  id: string;
  shopName: string;
  phone: string | null;
  ownerName: string | null;
  email: string | null;
  address: string | null;
  postalCode: string | null;
  cityId: string | null;
  cityName: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  chairs: number | null;
  rentedChairs: number | null;
  currentTool: string | null;
  source: LeadSource;
  sourceLabel: string;
  isAuto: boolean;
  sourceDetail: string | null;
  notes: string | null;
  needsPhone: boolean;
  status: LeadStatus;
  statusLabel: string;
  rep: RepRef | null;
  territory: { id: string; name: string; ownerRepId: string | null } | null;
  awaitingFirstTouch: boolean;
  territoryClaimUntil: string | null;
  nextFollowUpAt: string | null;
  nextFollowUpNote: string | null;
  lastActivityAt: string;
  lastActivity: { type: string; summary: string | null; at: string } | null;
  lockUntil: string | null;
  snoozedUntil: string | null;
  returnToPoolAt: string | null;
  closedReason: string | null;
  closedTool: string | null;
  closedNote: string | null;
  closedAt: string | null;
  accountId: string | null;
  setupStep: string | null;
  setupStepSince: string | null;
  liveAt: string | null;
  createdAt: string;
}

export interface TimelineEntry {
  id: string;
  type: string;
  summary: string | null;
  body: string | null;
  occurredAt: string;
  scheduledAt: string | null;
  upcoming: boolean;
  by: { name: string; shortName: string } | null;
  data: Record<string, unknown> | null;
}

export interface InviteSummary {
  id: string;
  mode: "signup_invite" | "payment_link";
  status: "pending_approval" | "sent" | "opened" | "account_created" | "rejected" | "cancelled";
  ownerEmail: string | null;
  ownerPhone: string | null;
  trialDays: number | null;
  discountPct: number | null;
  discountMonths: number | null;
  url: string | null;
  sentAt: string | null;
  openedAt: string | null;
  createdAt: string;
  delivery: Record<string, string> | null;
}

export interface SetupState {
  accountId: string;
  accountName: string;
  accountStatus: string;
  step: "services" | "staff" | "hours" | "first_booking";
  checklist: Array<{ step: string; label: string; done: boolean; current: boolean }>;
  facts: { services: number; bookableStaff: number; openDays: number; onlineBookingOn: boolean };
}

export interface LeadDetail {
  lead: Lead;
  timeline: TimelineEntry[];
  invites: InviteSummary[];
  pendingReassignment: {
    id: string;
    toRepName: string | null;
    reason: string | null;
    requestedByName: string | null;
    createdAt: string;
  } | null;
  setup: SetupState | null;
  settings: { lockDays: number; approvalDiscountPct: number };
  permissions: {
    canWork: boolean;
    canClaim: boolean;
    canAssign: boolean;
    canConvert: boolean;
    canClose: boolean;
    canReopen: boolean;
    canRequestReassignment: boolean;
  };
}

export interface DuplicateMatch {
  kind: "lead" | "shop";
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  samePhone: boolean;
  sameAddress: boolean;
  distanceM: number | null;
  ownerName: string | null;
  statusLabel: string;
}

export interface City {
  id: string;
  name: string;
  region: string | null;
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface SalesSettings {
  exploreUnlockAt: number;
  lockDays: number;
  claimWindowHours: number;
  approvalDiscountPct: number;
  lostReturnMonths: number;
  stuckNudgeDays: number;
  duplicateRadiusM: number;
  updatedAt: string;
}

export interface RepOption {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  type: RepType;
}

export interface SalesMe {
  me: {
    userId: string;
    name: string;
    email: string;
    canWork: boolean;
    canManage: boolean;
    rep: { id: string; type: RepType; homeCityId: string | null } | null;
  };
  settings: SalesSettings;
  cities: City[];
  reps: RepOption[];
  vocab: {
    statuses: Record<LeadStatus, string>;
    sources: Record<LeadSource, string>;
    manualSources: LeadSource[];
    lostReasons: string[];
    notNowReasons: string[];
    bookingTools: string[];
  };
}

export interface Density {
  cityId: string;
  cityName: string;
  region: string | null;
  liveShops: number;
  onboarding: number;
  onboardingNames: string[];
  unlockAt: number;
  exploreOn: boolean;
  remaining: number;
}

export interface PendingInvite {
  id: string;
  leadId: string;
  shopName: string;
  requestedByName: string | null;
  offer: string;
  discountPct: number | null;
  createdAt: string;
}

export interface PendingReassignment {
  id: string;
  leadId: string;
  shopName: string;
  fromRepName: string | null;
  toRepName: string | null;
  reason: string | null;
  requestedByName: string | null;
  createdAt: string;
}

export interface TodayResponse {
  timeZone: string;
  today: string;
  rep: {
    id: string;
    name: string;
    type: RepType;
    territories: Array<{ id: string; name: string }>;
  } | null;
  scope: "mine" | "team" | "none";
  overdue: Lead[];
  dueToday: Lead[];
  newForYou: Lead[];
  claimable: Array<{ id: string; shopName: string }>;
  poolInMyTerritories: Array<{ id: string; shopName: string; territoryName: string }>;
  density: Density | null;
  week: {
    visits: number;
    demos: number;
    live: number;
    commissionPendingCents: number;
    currency: string;
  } | null;
  approvals: { invites: PendingInvite[]; reassignments: PendingReassignment[] } | null;
  dueCount: number;
}

export interface LeadListParams {
  cityId?: string;
  rep?: string;
  source?: LeadSource;
  status?: "open" | "closed" | "all" | LeadStatus;
  q?: string;
  sort?: "next_follow_up" | "last_activity" | "created" | "shop" | "status";
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface LeadListResponse {
  leads: Lead[];
  totalCount: number;
  page: number;
  pageSize: number;
  closed: { lost: number; notNow: number };
}

export interface BoardColumn {
  status: LeadStatus;
  label: string;
  count: number;
  cards: Lead[];
  acceptsDrop: boolean;
}

export interface BoardResponse {
  columns: BoardColumn[];
  closed: { lost: number; notNow: number };
}

export interface MapPin {
  kind: "lead" | "shop";
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: "live" | "onboarding" | "pipeline" | "new" | "closed";
  status: LeadStatus;
  statusLabel: string;
  address: string | null;
  chairs: number | null;
  repShortName: string | null;
  nextFollowUpAt: string | null;
  nextFollowUpNote: string | null;
}

export interface MapResponse {
  city: City;
  pins: MapPin[];
  density: Density;
  closestToLive: Array<{
    id: string;
    shopName: string;
    status: LeadStatus;
    statusLabel: string;
    line: string;
    stuck: boolean;
  }>;
  otherCities: Array<{
    id: string;
    name: string;
    region: string | null;
    liveShops: number;
    hasRep: boolean;
    unlockAt: number;
    exploreOn: boolean;
  }>;
}

export interface Kpi {
  label: string;
  value: number | null;
  previous: number | null;
  delta: number | null;
  deltaPct: number | null;
  good: boolean | null;
  unit: "count" | "days";
}

export interface LeaderboardRow {
  repId: string;
  name: string;
  shortName: string;
  initials: string;
  type: RepType;
  isActive: boolean;
  planLabel: string;
  leadsAdded: number;
  demos: number;
  live: number;
  conversionPct: number | null;
  commissionCents: number;
  currency: string;
  payout: {
    status: "with_payroll" | "pending" | "paid";
    on: string;
    amountCents: number;
    dates: Array<{ on: string; amountCents: number }>;
  } | null;
}

export interface StatsResponse {
  period: { from: string; to: string };
  previousPeriod: { from: string; to: string };
  kpis: Kpi[];
  funnel: Array<{ status: LeadStatus; label: string; count: number }>;
  lostReasons: Array<{ reason: string; count: number }>;
  lostNote: string | null;
  leaderboard: LeaderboardRow[];
}

export interface RepRow {
  id: string;
  userId: string;
  name: string;
  shortName: string;
  initials: string;
  email: string;
  type: RepType;
  isActive: boolean;
  claimed: boolean;
  plan: { liveBonusCents: number; mrrSharePct: number; mrrShareMonths: number };
  planLabel: string;
  territories: Array<{ id: string; name: string }>;
  openLeads: number;
  liveThisMonth: number;
}

export interface Territory {
  id: string;
  cityId: string;
  cityName: string;
  name: string;
  postalCodes: string[];
  ownerRepId: string | null;
  ownerName: string | null;
  ownerShortName: string | null;
  openLeads: number;
}

export interface PlanOption {
  productId: string;
  key: string;
  name: string;
  description: string | null;
  prices: Array<{
    priceId: string;
    billingInterval: BillingInterval;
    unitAmountCents: number;
    currency: string;
    monthlyEquivalentCents: number;
    trialDays: number;
  }>;
}

export interface CreateLeadInput {
  shopName: string;
  phone?: string | null;
  ownerName?: string | null;
  email?: string | null;
  address?: string | null;
  postalCode?: string | null;
  cityId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  chairs?: number | null;
  rentedChairs?: number | null;
  currentTool?: string | null;
  notes?: string | null;
  source: LeadSource;
  assignToRepId?: string | null;
  allowDuplicate?: boolean;
}

export interface LogActivityInput {
  type: "visit" | "call" | "note" | "email" | "sms" | "demo";
  body?: string | null;
  outcome?: string | null;
  scheduledAt?: string | null;
  nextFollowUpAt?: string | null;
  nextFollowUpNote?: string | null;
  status?: RepStatus;
}

export type CloseLeadInput =
  | {
      outcome: "lost";
      reason: string;
      tool?: string | null;
      note?: string | null;
      returnToPool?: boolean;
    }
  | { outcome: "not_now"; reason: string; note?: string | null; until: string };

export interface CreateInviteInput {
  mode: "signup_invite" | "payment_link";
  businessName: string;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  priceId: string;
  trialDays?: number | null;
  discountPct?: number | null;
  discountMonths?: number | null;
  seats?: number | null;
  sendEmail: boolean;
  sendSms: boolean;
}

export interface InviteResult {
  invite: InviteSummary & { leadId: string; businessName: string };
  url: string | null;
  qrDataUrl: string | null;
  lead?: LeadDetail;
}

export interface ImportRow {
  shopName?: string | null;
  phone?: string | null;
  address?: string | null;
  postalCode?: string | null;
  ownerName?: string | null;
  email?: string | null;
  notes?: string | null;
  chairs?: number | null;
  currentTool?: string | null;
}

export interface ImportSummary {
  total: number;
  newLeads: number;
  noPhone: number;
  duplicates: number;
  invalid: number;
  toImport: number;
  outsideTerritories: number;
}

export interface PlaceSuggestion {
  id: string;
  displayName: string;
}

function qs(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** The browser's own IANA zone — "due today" is the rep's today, not the server's. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export const salesApi = {
  me: () => apiRequest<SalesMe>("/sales/me"),
  badge: () => apiRequest<{ dueCount: number }>(`/sales/badge${qs({ tz: browserTimeZone() })}`),
  today: () => apiRequest<TodayResponse>(`/sales/today${qs({ tz: browserTimeZone() })}`),

  listLeads: (params: LeadListParams) => apiRequest<LeadListResponse>(`/sales/leads${qs(params)}`),
  board: (params: Omit<LeadListParams, "status" | "page" | "pageSize">) =>
    apiRequest<BoardResponse>(`/sales/leads/board${qs(params)}`),
  getLead: (id: string) => apiRequest<LeadDetail>(`/sales/leads/${id}`),
  checkDuplicates: (body: {
    phone?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    excludeLeadId?: string;
  }) =>
    apiRequest<{ duplicates: DuplicateMatch[] }>("/sales/leads/duplicates", {
      method: "POST",
      body,
    }),
  createLead: (body: CreateLeadInput) =>
    apiRequest<LeadDetail>("/sales/leads", { method: "POST", body }),
  updateLead: (id: string, body: Partial<CreateLeadInput>) =>
    apiRequest<LeadDetail>(`/sales/leads/${id}`, { method: "PATCH", body }),
  logActivity: (id: string, body: LogActivityInput) =>
    apiRequest<LeadDetail>(`/sales/leads/${id}/activities`, { method: "POST", body }),
  changeStatus: (id: string, status: LeadStatus, note?: string) =>
    apiRequest<LeadDetail>(`/sales/leads/${id}/status`, { method: "POST", body: { status, note } }),
  closeLead: (id: string, body: CloseLeadInput) =>
    apiRequest<LeadDetail>(`/sales/leads/${id}/close`, { method: "POST", body }),
  reopenLead: (id: string) =>
    apiRequest<LeadDetail>(`/sales/leads/${id}/reopen`, { method: "POST" }),
  claimLead: (id: string) => apiRequest<LeadDetail>(`/sales/leads/${id}/claim`, { method: "POST" }),
  assignLeads: (leadIds: string[], repId: string | null) =>
    apiRequest<{ assigned: number }>("/sales/leads/assign", {
      method: "POST",
      body: { leadIds, repId },
    }),
  requestReassignment: (id: string, body: { toRepId?: string | null; reason?: string | null }) =>
    apiRequest<LeadDetail>(`/sales/leads/${id}/reassignment-requests`, { method: "POST", body }),
  decideReassignment: (id: string, approve: boolean) =>
    apiRequest<{ id: string; status: string }>(`/sales/reassignment-requests/${id}/decision`, {
      method: "POST",
      body: { approve },
    }),

  inviteOptions: () =>
    apiRequest<{ plans: PlanOption[]; approvalDiscountPct: number }>("/sales/invite-options"),
  createInvite: (leadId: string, body: CreateInviteInput) =>
    apiRequest<InviteResult>(`/sales/leads/${leadId}/invites`, { method: "POST", body }),
  inviteLink: (inviteId: string) =>
    apiRequest<{ url: string; qrDataUrl: string }>(`/sales/invites/${inviteId}/link`),
  decideInvite: (inviteId: string, approve: boolean, note?: string) =>
    apiRequest<InviteResult>(`/sales/invites/${inviteId}/decision`, {
      method: "POST",
      body: { approve, note },
    }),

  map: (cityId: string) => apiRequest<MapResponse>(`/sales/map${qs({ cityId })}`),
  stats: (params: { cityId?: string; repId?: string; from: string; to: string }) =>
    apiRequest<StatsResponse>(`/sales/stats${qs(params)}`),
  markPayout: (repId: string, payoutOn: string) =>
    apiRequest<{ lines: number; amountCents: number }>("/sales/payouts", {
      method: "POST",
      body: { repId, payoutOn },
    }),

  previewImport: (body: { rows: ImportRow[]; cityId?: string | null }) =>
    apiRequest<{ summary: ImportSummary; rows: unknown[] }>("/sales/import/preview", {
      method: "POST",
      body,
    }),
  commitImport: (body: {
    rows: ImportRow[];
    cityId?: string | null;
    assign: "territory" | "rep" | "pool";
    repId?: string | null;
    fileName?: string | null;
  }) =>
    apiRequest<{
      imported: number;
      flaggedNoPhone: number;
      skippedDuplicates: number;
      invalid: number;
      toPool: number;
      byRep: Array<{ repId: string; name: string; count: number }>;
    }>("/sales/import", { method: "POST", body }),

  reps: () =>
    apiRequest<{ reps: RepRow[]; pool: { openLeads: number; citiesWithoutRep: string[] } }>(
      "/sales/reps",
    ),
  inviteRep: (body: {
    name: string;
    email: string;
    type: RepType;
    liveBonusCents?: number;
    mrrSharePct?: number;
    mrrShareMonths?: number;
    territoryIds?: string[];
  }) => apiRequest<{ rep: unknown }>("/sales/reps", { method: "POST", body }),
  updateRep: (
    id: string,
    body: Partial<{
      type: RepType;
      isActive: boolean;
      liveBonusCents: number;
      mrrSharePct: number;
      mrrShareMonths: number;
    }>,
  ) => apiRequest<{ rep: unknown }>(`/sales/reps/${id}`, { method: "PATCH", body }),

  createCity: (body: {
    name: string;
    region?: string | null;
    latitude: number;
    longitude: number;
    radiusKm?: number;
  }) => apiRequest<{ city: City }>("/sales/cities", { method: "POST", body }),
  territories: (cityId?: string) =>
    apiRequest<{ territories: Territory[] }>(`/sales/territories${qs({ cityId })}`),
  createTerritory: (body: {
    cityId: string;
    name: string;
    postalCodes: string[];
    ownerRepId?: string | null;
  }) => apiRequest<{ territory: unknown }>("/sales/territories", { method: "POST", body }),
  updateTerritory: (
    id: string,
    body: Partial<{ name: string; postalCodes: string[]; ownerRepId: string | null }>,
  ) => apiRequest<{ territory: unknown }>(`/sales/territories/${id}`, { method: "PATCH", body }),
  deleteTerritory: (id: string) =>
    apiRequest<void>(`/sales/territories/${id}`, { method: "DELETE" }),
  updateSettings: (body: Partial<Omit<SalesSettings, "updatedAt">>) =>
    apiRequest<{ settings: SalesSettings }>("/sales/settings", { method: "PATCH", body }),

  geocode: (q: string, session: string, near?: { latitude: number; longitude: number }) =>
    apiRequest<{ suggestions: PlaceSuggestion[] }>(
      `/sales/geocode${qs({ q, session, lat: near?.latitude, lng: near?.longitude })}`,
    ),
  geocodeRetrieve: (id: string, session: string) =>
    apiRequest<{ place: { latitude: number; longitude: number; displayName: string } }>(
      `/sales/geocode/retrieve${qs({ id, session })}`,
    ),
  reverseGeocode: (latitude: number, longitude: number) =>
    apiRequest<{ displayName: string }>(
      `/sales/reverse-geocode${qs({ lat: latitude, lng: longitude })}`,
    ),

  /**
   * The CSV is a download, not JSON, so this goes around apiRequest's
   * JSON handling — with the same bearer token, and one refresh-and-retry
   * through apiRequest if the token has just expired.
   */
  async exportCsv(params: LeadListParams): Promise<Blob> {
    const fetchCsv = () =>
      fetch(`${env.VITE_API_BASE_URL}/sales/leads/export${qs(params)}`, {
        headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken ?? ""}` },
      });
    let response = await fetchCsv();
    if (response.status === 401) {
      await apiRequest("/sales/badge").catch(() => undefined);
      response = await fetchCsv();
    }
    if (!response.ok) throw new ApiError(response.status, "Couldn't export the leads");
    return response.blob();
  },
};

/** The 409 body for a likely duplicate — see the backend's DuplicateLeadError. */
export function duplicatesFrom(error: unknown): DuplicateMatch[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = error.body as { code?: string; duplicates?: DuplicateMatch[] } | undefined;
  return body?.code === "DUPLICATE" && Array.isArray(body.duplicates) ? body.duplicates : null;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatMoney(cents: number, currency = "usd"): string {
  const hasFraction = cents % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(cents / 100);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole calendar days from today to `iso`, in the browser's zone: 0 today, -1 yesterday, 1 tomorrow. */
export function dayOffset(iso: string, now = new Date()): number {
  return Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / 86_400_000);
}

export type DueTone = "overdue" | "today" | "soon" | "none";

/**
 * How a follow-up reads in a list: "3:00 PM" when it's today with a time
 * that means something, "Today", "Tomorrow", or "Oct 12" — and whether it
 * is late. Midnight is treated as "no particular time".
 */
export function dueLabel(
  iso: string | null,
  now = new Date(),
  opts: { long?: boolean } = {},
): { text: string; tone: DueTone } {
  if (!iso) return { text: "—", tone: "none" };
  const at = new Date(iso);
  const offset = dayOffset(iso, now);
  const hasTime = at.getHours() !== 0 || at.getMinutes() !== 0;
  if (offset < 0) return { text: shortDate(at), tone: "overdue" };
  if (offset === 0) {
    if (hasTime) {
      return {
        text: opts.long ? `Today ${timeOfDay(at)}` : timeOfDay(at),
        tone: at.getTime() < now.getTime() - 3_600_000 ? "overdue" : "today",
      };
    }
    return { text: "Today", tone: "today" };
  }
  if (offset === 1) return { text: "Tomorrow", tone: "soon" };
  return { text: shortDate(at), tone: "soon" };
}

export function shortDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function timeOfDay(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "Today · 3:00 PM", "Oct 12 · 4:10 PM" — the timeline's meta line. */
export function dayAndTime(iso: string, now = new Date()): string {
  const offset = dayOffset(iso, now);
  const day =
    offset === 0
      ? "Today"
      : offset === -1
        ? "Yesterday"
        : offset === 1
          ? "Tomorrow"
          : shortDate(iso);
  return `${day} · ${timeOfDay(iso)}`;
}

/** "2h ago", "3d ago", "2w ago", then a date. */
export function relativeAgo(iso: string, now = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86_400);
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return shortDate(iso);
}

const ACTIVITY_SHORT: Record<string, string> = {
  visit: "Visit",
  call: "Call",
  note: "Note",
  email: "Email",
  sms: "SMS",
  demo: "Demo",
  created: "Created",
  edited: "Edited",
  status_change: "Moved",
  assigned: "Assigned",
  claimed: "Claimed",
  returned_to_pool: "Back to pool",
  invite_sent: "Invite sent",
  invite_opened: "Invite opened",
  invite_pending_approval: "Offer pending",
  invite_rejected: "Offer declined",
  account_created: "Signed up",
  setup_progress: "Setup",
  went_live: "First booking",
  closed: "Closed",
  reopened: "Reopened",
  reassignment_requested: "Reassignment asked",
  reassignment_decided: "Reassignment decided",
};

/** The table's "Last activity" column: "Call · 3d ago". */
export function lastActivityLabel(lead: Lead, now = new Date()): string {
  const a = lead.lastActivity;
  if (!a) return relativeAgo(lead.lastActivityAt, now);
  const what =
    a.type === "setup_progress" && a.summary
      ? a.summary.split(" · ")[0]
      : (ACTIVITY_SHORT[a.type] ?? "Activity");
  return `${what} · ${relativeAgo(a.at, now)}`;
}

/** How long since `iso`, in whole days: "today", "1 day", "3 days". */
export function sinceLabel(iso: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** "4 chairs", "1 chair". */
export function chairsLabel(n: number | null): string | null {
  if (n === null || n === undefined) return null;
  return `${n} chair${n === 1 ? "" : "s"}`;
}

/** A follow-up `days` from now at 10:00 local — a sensible hour to call a shop. */
export function followUpInDays(days: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 10, 0, 0);
  return d.toISOString();
}

/** Next Monday at 10:00 local. */
export function nextWeek(now = new Date()): string {
  const day = now.getDay();
  const add = (8 - day) % 7 || 7;
  return followUpInDays(add, now);
}

/** `tel:` link digits — keeps a leading + for international numbers. */
export function telHref(phone: string): string {
  const trimmed = phone.trim();
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
}

export function directionsHref(lead: {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}): string | null {
  if (lead.latitude !== null && lead.longitude !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lead.latitude},${lead.longitude}`;
  }
  if (lead.address)
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lead.address)}`;
  return null;
}
