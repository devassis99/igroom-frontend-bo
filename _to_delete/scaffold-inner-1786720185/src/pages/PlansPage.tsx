import { useMemo, useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { Modal } from "@/components/ui/Modal";
import { Field, formInputClass } from "@/components/ui/FormField";
import { SAMPLE_PRICES } from "@/lib/sample-data";

const PRODUCTS = ["All Products", "Solo Chair", "Studio", "Multi-Location"];
const CYCLES = ["All Billing Cycles", "Monthly", "Quarterly", "Bi-Annual", "Annual"];
const STATUSES = ["All Statuses", "Active", "Archived"];

const filterSelectClass =
  "rounded-[9px] border border-bo-input-border bg-bo-surface px-3 py-2 font-sans text-xs font-medium text-bo-ink-soft outline-none";

/**
 * Matches Backoffice.dc.html's B4b frame — as of this revision, "New
 * Product" only creates the product shell (name + description); prices
 * are added afterward per-product via Add Price (B4c). igroom-backend has
 * no Stripe integration yet, so "Create Product" just closes the modal.
 */
function NewProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">New Product</h1>
        <button type="button" onClick={onClose} aria-label="Close" className="font-sans text-xl text-bo-muted-5">
          ×
        </button>
      </div>
      <p className="-mt-2.5 m-0 font-sans text-xs text-bo-muted-5">
        A product represents a plan tier (e.g. Studio). Add its billing-cycle prices afterward.
      </p>

      <Field label="PRODUCT NAME">
        <input type="text" placeholder="e.g. Studio" className={formInputClass} />
      </Field>

      <Field label="DESCRIPTION">
        <textarea
          placeholder="Internal note about this plan"
          rows={3}
          className={`${formInputClass} resize-none font-sans`}
        />
      </Field>

      <div className="flex flex-col gap-1.5 rounded-[10px] bg-bo-table-head p-3.5">
        <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
          STRIPE SYNC
        </span>
        <span className="font-sans text-xs leading-relaxed text-bo-muted-4">
          Saving creates this product in Stripe. Add one or more prices to it next — each price is
          a billing cycle (Monthly, Quarterly, Bi-Annual, Annual) with its own seat limit and trial
          period.
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
          Create Product
        </button>
      </div>
    </Modal>
  );
}

interface AddPriceTarget {
  product: string;
  productId: string;
}

/**
 * Matches Backoffice.dc.html's B4c frame. The mockup doesn't show the
 * trigger explicitly, so it's wired here as a "+ Price" action on each
 * product row — clicking it opens this pre-scoped to that product.
 */
function AddPriceModal({ target, onClose }: { target: AddPriceTarget | null; onClose: () => void }) {
  return (
    <Modal open={target !== null} onClose={onClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">Add Price</h1>
        <button type="button" onClick={onClose} aria-label="Close" className="font-sans text-xl text-bo-muted-5">
          ×
        </button>
      </div>
      <p className="-mt-2.5 m-0 font-sans text-xs text-bo-muted-5">
        Adding a price to{" "}
        <span className="font-medium text-bo-ink-soft">{target?.product}</span> (
        {target?.productId})
      </p>

      <Field label="BILLING CYCLE">
        <select className={formInputClass}>
          <option>Monthly</option>
          <option>Quarterly</option>
          <option>Bi-Annual</option>
          <option>Annual</option>
        </select>
      </Field>

      <Field label="PRICE">
        <input type="text" placeholder="$ 0.00" className={formInputClass} />
      </Field>

      <Field label="SEAT LIMIT">
        <input type="text" placeholder="e.g. 3" className={formInputClass} />
      </Field>

      <Field label="TRIAL PERIOD (DAYS)">
        <input type="text" placeholder="e.g. 14 — leave blank for no trial" className={formInputClass} />
      </Field>

      <div className="rounded-[10px] bg-bo-table-head p-3.5">
        <span className="font-sans text-xs leading-relaxed text-bo-muted-4">
          Prices are immutable in Stripe once created — to change an amount, seat limit, trial, or
          cycle later, archive this price and add a new one.
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
          Create Price
        </button>
      </div>
    </Modal>
  );
}

export function PlansPage() {
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [cycle, setCycle] = useState(CYCLES[0]);
  const [status, setStatus] = useState(STATUSES[0]);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [addPriceTarget, setAddPriceTarget] = useState<AddPriceTarget | null>(null);

  const rows = useMemo(
    () =>
      SAMPLE_PRICES.filter(
        (p) =>
          (product === "All Products" || p.product === product) &&
          (cycle === "All Billing Cycles" || p.cycle === cycle) &&
          (status === "All Statuses" || p.status === status),
      ),
    [product, cycle, status],
  );

  return (
    <div>
      <h1 className="m-0 mb-5 font-sans text-2xl font-semibold text-bo-ink">Plans</h1>

      <div className="mb-3.5 flex items-end justify-between">
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
          onClick={() => setNewProductOpen(true)}
          className="rounded-[10px] border border-bo-input-border bg-bo-surface px-3.5 py-2 font-sans text-xs font-semibold text-bo-ink-soft"
        >
          + New Product
        </button>
      </div>

      <div className="mb-3.5 flex gap-2.5">
        <select value={product} onChange={(e) => setProduct(e.target.value)} className={filterSelectClass}>
          {PRODUCTS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select value={cycle} onChange={(e) => setCycle(e.target.value)} className={filterSelectClass}>
          {CYCLES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={filterSelectClass}>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        <div className="grid grid-cols-[1.1fr_0.9fr_1fr_0.7fr_0.6fr_0.6fr_0.7fr_0.6fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
          <span>PRODUCT</span>
          <span>BILLING CYCLE</span>
          <span>PRICE ID</span>
          <span>PRICE</span>
          <span>SEATS</span>
          <span>TRIAL</span>
          <span>STATUS</span>
          <span />
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">No prices match these filters.</p>
        ) : (
          rows.map((row, i) => (
            <div
              key={row.priceId}
              className={`grid grid-cols-[1.1fr_0.9fr_1fr_0.7fr_0.6fr_0.6fr_0.7fr_0.6fr] items-center px-5 py-2.5 ${
                i > 0 ? "border-t border-bo-border-soft" : ""
              }`}
            >
              <span className="font-sans text-[13px] font-semibold text-bo-ink">{row.product}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{row.cycle}</span>
              <span className="font-mono text-[11px] text-bo-muted-4">{row.priceId}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{row.price}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{row.seats}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{row.trialDays}</span>
              <StatusPill tone={row.status === "Active" ? "success" : "neutral"}>{row.status}</StatusPill>
              <button
                type="button"
                onClick={() => setAddPriceTarget({ product: row.product, productId: row.productId })}
                className="justify-self-end font-sans text-xs font-semibold text-bo-gold"
              >
                + Price
              </button>
            </div>
          ))
        )}
      </div>

      <NewProductModal open={newProductOpen} onClose={() => setNewProductOpen(false)} />
      <AddPriceModal target={addPriceTarget} onClose={() => setAddPriceTarget(null)} />
    </div>
  );
}

export default PlansPage;
