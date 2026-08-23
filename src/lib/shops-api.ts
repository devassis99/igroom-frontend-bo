import { apiRequest } from "./api-client";
import type { BillingInterval } from "./billing-api";

/** Mirrors igroom-backend's account_status enum (db/schema/accounts.ts). */
export type ShopStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled";

/**
 * The four an admin can set by hand — "trial" is a signup-time state, so
 * the backend rejects it (shops.service.ts's ADMIN_SETTABLE_STATUSES).
 */
export const SETTABLE_SHOP_STATUSES = ["active", "past_due", "suspended", "cancelled"] as const;
export type SettableShopStatus = (typeof SETTABLE_SHOP_STATUSES)[number];

export interface Shop {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  status: ShopStatus;
  priceId: string;
  productId: string;
  productKey: string;
  planName: string;
  billingInterval: BillingInterval;
  /** What the shop is charged per `billingInterval`, in cents. */
  unitAmountCents: number;
  currency: string;
  /** False once the price the shop signed up on has been archived — it's grandfathered onto it. */
  priceIsActive: boolean;
  /** Monthly-equivalent contract value in cents — an annual plan divided by 12. Shown regardless of status. */
  mrrCents: number;
  /** Active staff across every location. */
  seats: number;
  locationCount: number;
  isMarketplaceListed: boolean;
  priceTier: number | null;
  coverPhotoUrl: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

export interface ShopLocation {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  timezone: string | null;
  status: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface ShopStaff {
  id: string;
  name: string;
  email: string;
  roleName: string | null;
  locationName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ShopDetail extends Shop {
  locations: ShopLocation[];
  staff: ShopStaff[];
  bookings: {
    total: number;
    upcoming: number;
    last30Days: number;
    revenueLast30DaysCents: number;
  };
}

export interface ShopsListResponse {
  shops: Shop[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ShopSummary {
  totalShops: number;
  byStatus: Record<ShopStatus, number>;
  /** Cents/month actually being collected — status "active" only. */
  activeMrrCents: number;
  /** Cents/month at risk because the last invoice failed. */
  pastDueMrrCents: number;
  /** Cents/month that lands if every trial converts. */
  trialMrrCents: number;
  totalSeats: number;
  newThisMonth: number;
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

export type ShopSort = "name" | "plan" | "seats" | "mrr" | "status" | "createdAt";

export interface ListShopsParams {
  q?: string;
  statuses?: ShopStatus[];
  productId?: string;
  isMarketplaceListed?: boolean;
  sort?: ShopSort;
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface UpdateShopDetailsInput {
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  category?: string | null;
  description?: string | null;
  priceTier?: number | null;
  coverPhotoUrl?: string | null;
  isMarketplaceListed?: boolean;
}

/**
 * Only keys with a real value make it into the query string — sending
 * `?q=` or `?productId=` would be a filter matching nothing rather than
 * "no filter", and the backend's status validator has to special-case an
 * empty string precisely because a naive builder produces one.
 */
function buildQuery(params: ListShopsParams): string {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.statuses && params.statuses.length > 0)
    search.set("status", params.statuses.join(","));
  if (params.productId) search.set("productId", params.productId);
  if (params.isMarketplaceListed !== undefined) {
    search.set("marketplace", String(params.isMarketplaceListed));
  }
  if (params.sort) search.set("sort", params.sort);
  if (params.direction) search.set("direction", params.direction);
  if (params.page !== undefined) search.set("page", String(params.page));
  if (params.pageSize !== undefined) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Thin, 1:1 wrappers around igroom-backend's /shops/* routes
 * (src/modules/shops/shops.routes.ts) — same pattern as
 * src/lib/users-api.ts. Every call is bearer-token authenticated via
 * apiRequest and is itself permission-gated server-side (shops.view for
 * reads, shops.manage for writes), so hiding a button on the page is a
 * UX nicety, not the enforcement.
 */
export const shopsApi = {
  list: (params: ListShopsParams = {}) =>
    apiRequest<ShopsListResponse>(`/shops${buildQuery(params)}`),

  summary: () => apiRequest<{ summary: ShopSummary }>("/shops/summary"),

  planOptions: () => apiRequest<{ plans: PlanOption[] }>("/shops/plan-options"),

  get: (shopId: string) => apiRequest<{ shop: ShopDetail }>(`/shops/${shopId}`),

  updateDetails: (shopId: string, patch: UpdateShopDetailsInput) =>
    apiRequest<{ shop: Shop }>(`/shops/${shopId}`, { method: "PATCH", body: patch }),

  updateStatus: (shopId: string, status: SettableShopStatus) =>
    apiRequest<{ shop: Shop }>(`/shops/${shopId}/status`, { method: "PATCH", body: { status } }),

  updatePlan: (shopId: string, priceId: string) =>
    apiRequest<{ shop: Shop }>(`/shops/${shopId}/plan`, { method: "PATCH", body: { priceId } }),
};

// --- Display helpers, shared by ShopsPage and the Overview table --------

/** Title-case label for a status, e.g. "past_due" -> "Past Due". Matches the Backoffice.dc.html B3 pills. */
export const SHOP_STATUS_LABEL: Record<ShopStatus, string> = {
  trial: "Trial",
  active: "Active",
  past_due: "Past Due",
  suspended: "Suspended",
  cancelled: "Cancelled",
};

/** StatusPill tones. Past Due is danger (a bounced payment needs attention); suspended/cancelled are neutral-but-off. */
export const SHOP_STATUS_TONE: Record<ShopStatus, "success" | "danger" | "neutral" | "gold"> = {
  trial: "neutral",
  active: "success",
  past_due: "danger",
  suspended: "gold",
  cancelled: "neutral",
};

export const BILLING_INTERVAL_LABEL: Record<BillingInterval, string> = {
  month: "Monthly",
  quarter: "Quarterly",
  half_year: "Bi-Annual",
  year: "Annual",
};

/**
 * Cents -> "$48" / "$1,234.50". Whole-dollar amounts drop the ".00" so
 * the table reads like the mockup ($48, $250) instead of $48.00 — plan
 * prices are almost always whole dollars, and the cents only show up when
 * a quarterly/annual price divides unevenly into a monthly equivalent.
 */
export function formatCents(cents: number, currency = "usd"): string {
  const hasFraction = cents % 100 !== 0;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(cents / 100);
}
