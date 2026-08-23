/**
 * Illustrative figures lifted from Backoffice.dc.html, not live data.
 *
 * The shop list that used to live here is gone — Shops/Accounts and
 * Overview both read the real thing now (igroom-backend's /shops
 * endpoints, via src/lib/shops-api.ts). What's left is the Plans page's
 * price table, which still has no backing endpoint of its own.
 */
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
  {
    product: "Solo Chair",
    productId: "prod_SoloChair",
    cycle: "Monthly",
    priceId: "price_1Nx...m0",
    price: "$30",
    seats: 1,
    trialDays: "14d",
    status: "Active",
  },
  {
    product: "Solo Chair",
    productId: "prod_SoloChair",
    cycle: "Quarterly",
    priceId: "price_1Nx...q1",
    price: "$81",
    seats: 1,
    trialDays: "14d",
    status: "Active",
  },
  {
    product: "Studio",
    productId: "prod_Studio",
    cycle: "Bi-Annual",
    priceId: "price_1Nx...b2",
    price: "$270",
    seats: 3,
    trialDays: "7d",
    status: "Active",
  },
  {
    product: "Studio",
    productId: "prod_Studio",
    cycle: "Annual",
    priceId: "price_1Nx...a3",
    price: "$480",
    seats: 3,
    trialDays: "—",
    status: "Archived",
  },
  {
    product: "Multi-Location",
    productId: "prod_MultiLocation",
    cycle: "Monthly",
    priceId: "price_1Nx...m2",
    price: "$90",
    seats: 6,
    trialDays: "—",
    status: "Active",
  },
];
