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
}

export interface CreatePriceInput {
  billingInterval: BillingInterval;
  unitAmount: number;
  currency?: string;
  trialDaysOverride?: number;
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

  createPrice: (productId: string, input: CreatePriceInput) =>
    apiRequest<{ price: BillingPrice }>(`/billing/products/${productId}/prices`, {
      method: "POST",
      body: input,
    }),

  archivePrice: (priceId: string) =>
    apiRequest<{ price: BillingPrice }>(`/billing/prices/${priceId}/archive`, {
      method: "PATCH",
    }),
};
