import { useMemo, useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { Modal } from "@/components/ui/Modal";
import { Field, formInputClass } from "@/components/ui/FormField";
import { SAMPLE_PRICES, type SamplePrice } from "@/lib/sample-data";

const PRODUCTS = ["All Products", "Solo Chair", "Studio", "Multi-Location"];
const CYCLES = ["All Billing Cycles", "Monthly", "Quarterly", "Bi-Annual", "Annual"];
const STATUSES = ["All Statuses", "Active", "Archived"];

const filterSelectClass =
  "rounded-[9px] border border-bo-input-border bg-bo-surface px-3 py-2 font-sans text-xs font-medium text-bo-ink-soft outline-none";

/** `pay.igroom.io/c/<product-slug>` — mirrors the format Backoffice.dc.html's B4d frame shows. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Per-row payment link, scoped to that exact price. Displayed without a protocol (matches the
 * mockup's bare-host style); `https://` is prepended only when actually copied to the clipboard. */
function paymentLinkFor(row: SamplePrice): string {
  return `pay.igroom.io/c/${slugify(row.product)}?price=${row.priceId}`;
}

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
 * trigger explicitly, so it's wired here as a "+ Price" action under each
 * product's name — clicking it opens this pre-scoped to that product.
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

const PAYMENT_LINK_PRODUCTS = PRODUCTS.slice(1);
const PAYMENT_LINK_CYCLES = CYCLES.slice(1);
const DISCOUNT_TYPES = ["None", "% off", "$ off"];
const EXPIRY_OPTIONS = ["Never", "7 days", "30 days"];

/**
 * Matches Backoffice.dc.html's B4d frame — a top-level toolbar action (not
 * scoped to any one row), since the mockup's own trigger for it sits next
 * to "+ New Product". The preview link recomputes live from the form
 * (there's no backend to actually generate one against yet), and "Copy
 * Link" performs a real clipboard write.
 */
function CreatePaymentLinkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [product, setProduct] = useState(PAYMENT_LINK_PRODUCTS[0] ?? "");
  const [cycles, setCycles] = useState<string[]>(["Monthly", "Quarterly"]);
  const [seatOverride, setSeatOverride] = useState("");
  const [trialOverride, setTrialOverride] = useState("");
  const [discountType, setDiscountType] = useState(DISCOUNT_TYPES[0]);
  const [discountValue, setDiscountValue] = useState("");
  const [expires, setExpires] = useState(EXPIRY_OPTIONS[0]);
  const [copied, setCopied] = useState(false);

  function toggleCycle(cycle: string) {
    setCycles((current) =>
      current.includes(cycle) ? current.filter((c) => c !== cycle) : [...current, cycle],
    );
  }

  const link = useMemo(() => {
    const cycleParam = cycles.length > 0 ? cycles.map((c) => c.toLowerCase()).join(",") : "monthly";
    const seatsParam = seatOverride.trim() || "1";
    const trialParam = trialOverride.trim() || "14";
    return `pay.igroom.io/c/${slugify(product)}?cycles=${cycleParam}&seats=${seatsParam}&trial=${trialParam}`;
  }, [product, cycles, seatOverride, trialOverride]);

  function reset() {
    setProduct(PAYMENT_LINK_PRODUCTS[0] ?? "");
    setCycles(["Monthly", "Quarterly"]);
    setSeatOverride("");
    setTrialOverride("");
    setDiscountType(DISCOUNT_TYPES[0]);
    setDiscountValue("");
    setExpires(EXPIRY_OPTIONS[0]);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`https://${link}`);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the link text
      // above is still visible and selectable by hand.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="m-0 mb-1 font-sans text-xl font-semibold text-bo-ink">Create Payment Link</h1>
          <p className="m-0 font-sans text-xs text-bo-muted-5">
            Send a shop owner a checkout link with the exact terms you set
          </p>
        </div>
        <button type="button" onClick={handleClose} aria-label="Close" className="font-sans text-xl text-bo-muted-5">
          ×
        </button>
      </div>

      <Field label="PRODUCT">
        <select value={product} onChange={(e) => setProduct(e.target.value)} className={formInputClass}>
          {PAYMENT_LINK_PRODUCTS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-2">
        <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
          BILLING CYCLES TO INCLUDE
        </span>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_LINK_CYCLES.map((cycle) => {
            const active = cycles.includes(cycle);
            return (
              <button
                key={cycle}
                type="button"
                onClick={() => toggleCycle(cycle)}
                className={`flex items-center gap-1.5 rounded-[9px] border px-3 py-2 font-sans text-xs font-medium ${
                  active
                    ? "border-bo-stripe/50 bg-bo-stripe-bg text-bo-stripe"
                    : "border-bo-input-border bg-bo-surface text-bo-muted-2"
                }`}
              >
                <span className={`h-3.5 w-3.5 rounded ${active ? "bg-bo-stripe" : "border-[1.5px] border-bo-faint"}`} />
                {cycle}
              </button>
            );
          })}
        </div>
        <p className="m-0 font-sans text-[11px] text-bo-muted-5">
          Pick one for a single-offer link, or several so the shop can choose a cycle at checkout.
        </p>
      </div>

      <div className="flex gap-4">
        <Field label="SEAT OVERRIDE">
          <input
            type="text"
            placeholder="Default (1)"
            value={seatOverride}
            onChange={(e) => setSeatOverride(e.target.value)}
            className={formInputClass}
          />
        </Field>
        <Field label="TRIAL OVERRIDE (DAYS)">
          <input
            type="text"
            placeholder="Default (14)"
            value={trialOverride}
            onChange={(e) => setTrialOverride(e.target.value)}
            className={formInputClass}
          />
        </Field>
      </div>

      <Field label="DISCOUNT">
        <div className="flex gap-2.5">
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
            className={`${formInputClass} w-[120px]`}
          >
            {DISCOUNT_TYPES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="e.g. 20"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            disabled={discountType === "None"}
            className={`${formInputClass} flex-1 disabled:opacity-50`}
          />
        </div>
      </Field>

      <Field label="LINK EXPIRES">
        <select value={expires} onChange={(e) => setExpires(e.target.value)} className={formInputClass}>
          {EXPIRY_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </Field>

      <div className="flex items-center gap-2.5 rounded-[10px] bg-bo-table-head p-3.5">
        <span className="flex-1 truncate font-mono text-xs font-medium text-bo-muted-1">{link}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 whitespace-nowrap rounded-lg bg-bo-dark px-3.5 py-2 font-sans text-xs font-semibold text-bo-on-dark"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button
          type="button"
          onClick={handleClose}
          className="rounded-[10px] border border-bo-input-border px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-ink-soft"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-[10px] bg-bo-dark px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-on-dark"
        >
          Generate Link
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
  const [paymentLinkOpen, setPaymentLinkOpen] = useState(false);
  const [copiedPriceId, setCopiedPriceId] = useState<string | null>(null);

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

  async function handleCopyRowLink(row: SamplePrice) {
    try {
      await navigator.clipboard.writeText(`https://${paymentLinkFor(row)}`);
    } catch {
      // Clipboard API unavailable — nothing else to fall back to here.
    }
    setCopiedPriceId(row.priceId);
    window.setTimeout(() => setCopiedPriceId((current) => (current === row.priceId ? null : current)), 1500);
  }

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
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setPaymentLinkOpen(true)}
            className="rounded-[10px] border border-bo-stripe/40 bg-bo-stripe-bg px-3.5 py-2 font-sans text-xs font-semibold text-bo-stripe"
          >
            🔗 Create Payment Link
          </button>
          <button
            type="button"
            onClick={() => setNewProductOpen(true)}
            className="rounded-[10px] border border-bo-input-border bg-bo-surface px-3.5 py-2 font-sans text-xs font-semibold text-bo-ink-soft"
          >
            + New Product
          </button>
        </div>
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
        <div className="grid grid-cols-[1.1fr_0.9fr_1fr_0.7fr_0.6fr_0.6fr_0.7fr_0.5fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
          <span>PRODUCT</span>
          <span>BILLING CYCLE</span>
          <span>PRICE ID</span>
          <span>PRICE</span>
          <span>SEATS</span>
          <span>TRIAL</span>
          <span>STATUS</span>
          <span>LINK</span>
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">No prices match these filters.</p>
        ) : (
          rows.map((row, i) => (
            <div
              key={row.priceId}
              className={`grid grid-cols-[1.1fr_0.9fr_1fr_0.7fr_0.6fr_0.6fr_0.7fr_0.5fr] items-center px-5 py-2.5 ${
                i > 0 ? "border-t border-bo-border-soft" : ""
              }`}
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-sans text-[13px] font-semibold text-bo-ink">{row.product}</span>
                <button
                  type="button"
                  onClick={() => setAddPriceTarget({ product: row.product, productId: row.productId })}
                  className="font-sans text-[10px] font-semibold text-bo-gold"
                >
                  + Price
                </button>
              </div>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{row.cycle}</span>
              <span className="font-mono text-[11px] text-bo-muted-4">{row.priceId}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{row.price}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{row.seats}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{row.trialDays}</span>
              <StatusPill tone={row.status === "Active" ? "success" : "neutral"}>{row.status}</StatusPill>
              {row.status === "Active" ? (
                <button
                  type="button"
                  onClick={() => handleCopyRowLink(row)}
                  className="justify-self-end font-sans text-xs font-semibold text-bo-stripe"
                >
                  {copiedPriceId === row.priceId ? "Copied!" : "🔗 Copy"}
                </button>
              ) : (
                <span className="justify-self-end font-sans text-xs font-semibold text-bo-faint">—</span>
              )}
            </div>
          ))
        )}
      </div>

      <NewProductModal open={newProductOpen} onClose={() => setNewProductOpen(false)} />
      <AddPriceModal target={addPriceTarget} onClose={() => setAddPriceTarget(null)} />
      <CreatePaymentLinkModal open={paymentLinkOpen} onClose={() => setPaymentLinkOpen(false)} />
    </div>
  );
}

export default PlansPage;
