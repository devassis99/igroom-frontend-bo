/**
 * Illustrative figures lifted from Backoffice.dc.html, not live data —
 * igroom-backend doesn't have metrics/shops/billing/support endpoints
 * yet. Shared here so Overview and Shops/Accounts (which show the same
 * 4 shops in the mockup) don't drift from each other. Replace with real
 * TanStack Query hooks once those endpoints exist.
 */
export interface SampleShop {
  name: string;
  plan: string;
  seats: number;
  mrr: string;
  status: "Active" | "Trial" | "Past Due";
}

export const SAMPLE_SHOPS: SampleShop[] = [
  { name: "The Gentry Barbershop", plan: "Business", seats: 4, mrr: "$48", status: "Active" },
  { name: "Karachi Kutz", plan: "Empire", seats: 12, mrr: "$250", status: "Active" },
  { name: "Lahore Fade Studio", plan: "Studio", seats: 2, mrr: "$50", status: "Trial" },
  { name: "Solo Chair — Ray O.", plan: "Solo Chair", seats: 1, mrr: "$30", status: "Past Due" },
];

export const SHOP_STATUS_TONE = { Active: "success", Trial: "neutral", "Past Due": "danger" } as const;

export interface SamplePrice {
  product: string;
  productId: string;
  cycle: string;
  priceId: string;
  price: string;
  seats: number;
  trialDays: string;
  status: "Active" | "Archived";
}

/** Matches Backoffice.dc.html's B4 (Plans) frame — one row per Stripe price. */
export const SAMPLE_PRICES: SamplePrice[] = [
  { product: "Solo Chair", productId: "prod_SoloChair", cycle: "Monthly", priceId: "price_1Nx...m0", price: "$30", seats: 1, trialDays: "14d", status: "Active" },
  { product: "Solo Chair", productId: "prod_SoloChair", cycle: "Quarterly", priceId: "price_1Nx...q1", price: "$81", seats: 1, trialDays: "14d", status: "Active" },
  { product: "Studio", productId: "prod_Studio", cycle: "Bi-Annual", priceId: "price_1Nx...b2", price: "$270", seats: 3, trialDays: "7d", status: "Active" },
  { product: "Studio", productId: "prod_Studio", cycle: "Annual", priceId: "price_1Nx...a3", price: "$480", seats: 3, trialDays: "—", status: "Archived" },
  { product: "Multi-Location", productId: "prod_MultiLocation", cycle: "Monthly", priceId: "price_1Nx...m2", price: "$90", seats: 6, trialDays: "—", status: "Active" },
];
