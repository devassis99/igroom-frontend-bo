import { apiRequest } from "./api-client";

export type BillingInterval = "month" | "quarter" | "half_year" | "year";

export interface BillingPrice {
  id: string;
  productId: string;
  stripePriceId: string;
  billingInterval: BillingInterval;
  unitAmount: number;
  currency: string;
  trialDaysOverride: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingProduct {
  id: string;
  key: string;
  stripeProductId: string;
  name: string;
  description: string | null;
  features: string[];
  limits: Record<string, number>;
  trialDays: number;
  isActive: boolean;
  /** Independent of isActive — whether this plan appears in the public self-signup catalog (GET /billing/products). See billing-products.ts's schema comment. */
  showOnSignup: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** A product with its prices nested — what both catalog endpoints return. */
export interface CatalogEntry extends BillingProduct {
  prices: BillingPrice[];
}

export interface CreateProductInput {
  key: string;
  name: string;
  description?: string;
  features?: string[];
  limits?: Record<string, number>;
  trialDays?: number;
  sortOrder?: number;
  showOnSignup?: boolean;
}

export interface CreatePriceInput {
  billingInterval: BillingInterval;
  unitAmount: number;
  currency?: string;
  trialDaysOverride?: number;
}

export type PaymentLinkDiscountType = "percent" | "amount";

export interface BillingPaymentLink {
  id: string;
  productId: string;
  priceId: string;
  billingInterval: BillingInterval;
  url: string;
  isDefault: boolean;
  /** Metadata only — see billing.service.ts's createPaymentLinks doc comment. Not a checkout quantity. */
  seatOverride: number | null;
  trialDaysOverride: number | null;
  discountType: PaymentLinkDiscountType | null;
  discountValue: number | null;
  /** The buyer enters this at checkout to redeem the discount — Stripe Payment Links can't apply a coupon automatically. Null unless a discount was set. */
  promotionCode: string | null;
  /** Record-keeping only today — nothing auto-deactivates the Stripe link once this passes. */
  expiresAt: string | null;
  isActive: boolean;
}

export interface CreatePaymentLinkInput {
  productId: string;
  /** One link per cycle listed — see BillingPaymentLink's doc comment. */
  billingIntervals: BillingInterval[];
  seatOverride?: number;
  trialDaysOverride?: number;
  discountType?: PaymentLinkDiscountType;
  discountValue?: number;
  expiresInDays?: number | null;
}

/**
 * Thin, 1:1 wrappers around igroom-backend's /billing/* routes
 * (src/modules/billing/billing.routes.ts) — same pattern as
 * src/auth/auth-api.ts. Every call here goes through apiRequest, so it's
 * bearer-token authenticated and gets the automatic 401 refresh-and-retry;
 * that's true even for listAdminCatalog, unlike the public /billing/products
 * the (not-yet-built) pricing page would use, which this back office has no
 * reason to call.
 */
export const billingApi = {
  listAdminCatalog: () => apiRequest<{ products: CatalogEntry[] }>("/billing/products/admin"),

  createProduct: (input: CreateProductInput) =>
    apiRequest<{ product: BillingProduct }>("/billing/products", {
      method: "POST",
      body: input,
    }),

  archiveProduct: (productId: string) =>
    apiRequest<{ product: BillingProduct }>(`/billing/products/${productId}/archive`, {
      method: "PATCH",
    }),

  updateProductVisibility: (productId: string, showOnSignup: boolean) =>
    apiRequest<{ product: BillingProduct }>(`/billing/products/${productId}/visibility`, {
      method: "PATCH",
      body: { showOnSignup },
    }),

  createPrice: (productId: string, input: CreatePriceInput) =>
    apiRequest<{ price: BillingPrice }>(`/billing/products/${productId}/prices`, {
      method: "POST",
      body: input,
    }),

  archivePrice: (priceId: string) =>
    apiRequest<{ price: BillingPrice }>(`/billing/prices/${priceId}/archive`, {
      method: "PATCH",
    }),

  /** "Create Payment Link" modal — may return more than one link (one per selected cycle). */
  createPaymentLinks: (input: CreatePaymentLinkInput) =>
    apiRequest<{ paymentLinks: BillingPaymentLink[] }>("/billing/payment-links", {
      method: "POST",
      body: input,
    }),

  /** The price row's "Copy" action — idempotent, reuses the existing default link if there is one. */
  getOrCreateDefaultPaymentLink: (priceId: string) =>
    apiRequest<{ paymentLink: BillingPaymentLink }>(`/billing/prices/${priceId}/payment-link`, {
      method: "POST",
    }),
};
