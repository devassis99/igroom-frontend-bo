import { useState, type ReactNode } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { Modal } from "@/components/ui/Modal";

/** Matches Backoffice.dc.html's B4 frame. Sample data — see DashboardPage.tsx's note. */
const STATS = [
  { label: "Failed Payments", value: "6", delta: { text: "↑ 2", tone: "danger" as const } },
  { label: "Upcoming Renewals (7d)", value: "44", delta: { text: "↑ 8%", tone: "success" as const } },
  { label: "Seat Upgrades This Month", value: "21", delta: { text: "↑ 15%", tone: "success" as const } },
  { label: "Cancellations This Month", value: "5", delta: { text: "↑ 1", tone: "danger" as const } },
];

const RENEWAL_ROWS = [
  {
    shop: "Solo Chair — Ray O.",
    plan: "Solo Chair · $30/mo",
    charge: "Aug 14, 2026",
    status: "Payment Failed",
    tone: "danger" as const,
  },
  {
    shop: "Lahore Fade Studio",
    plan: "Studio · $50/mo",
    charge: "Trial ends Aug 20",
    status: "Trial",
    tone: "neutral" as const,
  },
];

interface StripeProduct {
  name: string;
  productId: string;
  priceId: string;
  cycle: string;
  price: string;
  status: "Active" | "Archived";
}

const STRIPE_PRODUCTS: StripeProduct[] = [
  { name: "Solo Chair — Monthly", productId: "prod_SoloChair", priceId: "price_1Nx...m0", cycle: "Monthly", price: "$30", status: "Active" },
  { name: "Solo Chair — Quarterly", productId: "prod_SoloChair", priceId: "price_1Nx...q1", cycle: "Quarterly", price: "$81", status: "Active" },
  { name: "Studio — Bi-Annual", productId: "prod_Studio", priceId: "price_1Nx...b2", cycle: "Bi-Annual", price: "$270", status: "Active" },
  { name: "Studio — Annual", productId: "prod_Studio", priceId: "price_1Nx...a3", cycle: "Annual", price: "$480", status: "Archived" },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-[10px] border border-bo-input-border bg-bo-surface px-3.5 py-3 font-sans text-sm text-bo-ink outline-none focus:border-2 focus:border-bo-gold";

/**
 * Matches Backoffice.dc.html's B4b frame. igroom-backend has no Stripe
 * integration yet — "Create in Stripe" just closes the modal locally.
 * Wire it to a real endpoint (and drop this note) once one exists.
 */
function NewStripeProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">New Stripe Product</h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="font-sans text-xl text-bo-muted-5"
        >
          ×
        </button>
      </div>

      <Field label="PRODUCT NAME">
        <input type="text" placeholder="e.g. Studio — Monthly" className={inputClass} />
      </Field>

      <Field label="DESCRIPTION">
        <textarea
          placeholder="Internal note about this plan"
          rows={3}
          className={`${inputClass} resize-none font-sans`}
        />
      </Field>

      <div className="flex gap-4">
        <Field label="PLAN TIER">
          <select className={inputClass}>
            <option>Solo Chair</option>
            <option>Studio</option>
            <option>Multi-Location</option>
          </select>
        </Field>
        <Field label="BILLING CYCLE">
          <select className={inputClass}>
            <option>Monthly</option>
            <option>Quarterly</option>
            <option>Bi-Annual</option>
            <option>Annual</option>
          </select>
        </Field>
      </div>

      <div className="flex gap-4">
        <Field label="PRICE">
          <input type="text" placeholder="$ 0.00" className={inputClass} />
        </Field>
        <Field label="SEAT LIMIT">
          <input type="text" placeholder="e.g. 3" className={inputClass} />
        </Field>
      </div>

      <div className="flex flex-col gap-1.5 rounded-[10px] bg-bo-table-head p-3.5">
        <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
          STRIPE SYNC
        </span>
        <span className="font-sans text-xs leading-relaxed text-bo-muted-4">
          Saving will create this product and price in Stripe automatically. Product and Price
          IDs will populate once synced.
        </span>
      </div>

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[10px] border border-bo-input-border px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-ink-soft"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[10px] bg-bo-dark px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-on-dark"
        >
          Create in Stripe
        </button>
      </div>
    </Modal>
  );
}

export function BillingPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <h1 className="m-0 mb-5 font-sans text-2xl font-semibold text-bo-ink">Billing & Plans</h1>

      <div className="mb-4 grid grid-cols-4 gap-3.5">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mb-6 overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_0.9fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
          <span>Shop</span>
          <span>Plan</span>
          <span>Next Charge</span>
          <span>Status</span>
        </div>
        {RENEWAL_ROWS.map((row, i) => (
          <div
            key={row.shop}
            className={`grid grid-cols-[1.6fr_1fr_1fr_0.9fr] items-center px-5 py-3 ${
              i < RENEWAL_ROWS.length - 1 ? "border-b border-bo-border-soft" : ""
            }`}
          >
            <span className="font-sans text-[13px] font-semibold text-bo-ink">{row.shop}</span>
            <span className="font-sans text-xs font-medium text-bo-muted-2">{row.plan}</span>
            <span className="font-sans text-xs font-medium text-bo-muted-2">{row.charge}</span>
            <StatusPill tone={row.tone}>{row.status}</StatusPill>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="m-0 font-sans text-[15px] font-semibold text-bo-ink">Stripe Products</p>
            <span className="rounded-full bg-bo-stripe-bg px-2 py-0.5 font-sans text-[10px] font-semibold tracking-[0.02em] text-bo-stripe">
              SYNCED WITH STRIPE
            </span>
          </div>
          <p className="m-0 font-sans text-xs text-bo-muted-5">
            Plans and prices billed via Stripe, mapped to each subscription tier
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-[10px] border border-bo-input-border bg-bo-surface px-3.5 py-2 font-sans text-xs font-semibold text-bo-ink-soft"
        >
          + New Product
        </button>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_0.6fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
          <span>Product Name</span>
          <span>Stripe Product ID</span>
          <span>Price ID</span>
          <span>Billing Cycle</span>
          <span>Price</span>
          <span>Status</span>
        </div>
        {STRIPE_PRODUCTS.map((product, i) => (
          <div
            key={product.priceId}
            className={`grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_0.6fr] items-center px-5 py-3 ${
              i < STRIPE_PRODUCTS.length - 1 ? "border-b border-bo-border-soft" : ""
            }`}
          >
            <span className="font-sans text-[13px] font-semibold text-bo-ink">{product.name}</span>
            <span className="font-mono text-[11px] text-bo-muted-4">{product.productId}</span>
            <span className="font-mono text-[11px] text-bo-muted-4">{product.priceId}</span>
            <span className="font-sans text-xs font-medium text-bo-muted-2">{product.cycle}</span>
            <span className="font-sans text-xs font-medium text-bo-muted-2">{product.price}</span>
            <StatusPill tone={product.status === "Active" ? "success" : "neutral"}>
              {product.status}
            </StatusPill>
          </div>
        ))}
      </div>

      <NewStripeProductModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

export default BillingPage;
