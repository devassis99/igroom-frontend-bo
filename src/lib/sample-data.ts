/**
 * Illustrative figures lifted from Backoffice.dc.html, not live data —
 * igroom-backend doesn't have metrics/shops/support endpoints yet.
 * Shared here so Overview and Shops/Accounts (which show the same 4 shops
 * in the mockup) don't drift from each other. Replace with real TanStack
 * Query hooks once those endpoints exist. (Plans/Billing no longer uses
 * sample data — see src/lib/billing-api.ts and PlansPage.tsx.)
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
