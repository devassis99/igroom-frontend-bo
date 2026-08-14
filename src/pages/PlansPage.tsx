import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusPill } from "@/components/ui/StatusPill";
import { Modal } from "@/components/ui/Modal";
import { Field, formInputClass } from "@/components/ui/FormField";
import { billingApi, type BillingInterval } from "@/lib/billing-api";

const CYCLE_OPTIONS: { value: BillingInterval; label: string }[] = [
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "half_year", label: "Bi-Annual" },
  { value: "year", label: "Annual" },
];
const CYCLE_LABEL = Object.fromEntries(
  CYCLE_OPTIONS.map((c) => [c.value, c.label]),
) as Record<BillingInterval, string>;

const CYCLE_FILTERS = ["All Billing Cycles", ...CYCLE_OPTIONS.map((c) => c.label)];
const STATUSES = ["All Statuses", "Active", "Archived", "No Prices Yet"];

const filterSelectClass =
  "rounded-[9px] border border-bo-input-border bg-bo-surface px-3 py-2 font-sans text-xs font-medium text-bo-ink-soft outline-none";

const modalCancelButtonClass =
  "rounded-[10px] border border-bo-input-border px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-ink-soft";
const modalSubmitButtonClass =
  "rounded-[10px] bg-bo-dark px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-on-dark disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Derives a stable internal `key` from the display name (e.g. "Solo Chair"
 * -> "solo_chair"). billing.validators.ts requires one — it's the
 * never-renamed identifier feature-gating code references directly — but
 * the New Product form (matching the mockup) only asks for a name, so we
 * generate it rather than making an admin think about an internal id.
 */
function slugifyKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatMoney(unitAmountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(unitAmountCents / 100);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Partially masks a Stripe id for display — e.g.
 * "price_1U4NoPDzGKc9rkctZITnu0Yn" -> "price_1U********u0Yn" — so the
 * full id isn't shown at a glance in the table. Left alone (returned
 * as-is) for the "—" placeholder and anything too short to usefully mask.
 */
function maskId(value: string): string {
  const visibleStart = 8;
  const visibleEnd = 4;
  if (value.length <= visibleStart + visibleEnd) return value;

  const start = value.slice(0, visibleStart);
  const end = value.slice(-visibleEnd);
  const maskedLength = Math.min(8, value.length - visibleStart - visibleEnd);
  return `${start}${"*".repeat(maskedLength)}${end}`;
}

interface PlanRow {
  rowKey: string;
  product: string;
  productId: string;
  productKey: string;
  /** Whether the parent product is active — false once it's been deleted (archived). Gates "+ Price". */
  productActive: boolean;
  /** Internal DB id for this row's price, or null for a "No Prices Yet" placeholder row. */
  priceDbId: string | null;
  cycle: string;
  priceId: string;
  price: string;
  seats: string;
  trialDays: string;
  status: "Active" | "Archived" | "No Prices Yet";
}

/**
 * Matches Backoffice.dc.html's B4b frame. "Create Product" calls
 * POST /billing/products (billing.service.ts createProduct), which
 * creates a real Stripe Product before writing the DB row — so a
 * successful submit here means it's already live in Stripe.
 */
function NewProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createProduct = useMutation({
    mutationFn: () =>
      billingApi.createProduct({
        key: slugifyKey(name),
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "admin-catalog"] });
      handleClose();
    },
  });

  function handleClose() {
    setName("");
    setDescription("");
    createProduct.reset();
    onClose();
  }

  const canSubmit = name.trim().length > 0 && !createProduct.isPending;

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">New Product</h1>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="font-sans text-xl text-bo-muted-5"
        >
          ×
        </button>
      </div>
      <p className="-mt-2.5 m-0 font-sans text-xs text-bo-muted-5">
        A product represents a plan tier (e.g. Studio). Add its billing-cycle prices afterward.
      </p>

      <Field label="PRODUCT NAME">
        <input
          type="text"
          placeholder="e.g. Studio"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={formInputClass}
        />
      </Field>

      <Field label="DESCRIPTION">
        <textarea
          placeholder="Internal note about this plan"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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

      {createProduct.isError && (
        <p className="m-0 font-sans text-xs text-bo-danger">
          {errorMessage(createProduct.error, "Failed to create product.")}
        </p>
      )}

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button type="button" onClick={handleClose} className={modalCancelButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => createProduct.mutate()}
          disabled={!canSubmit}
          className={modalSubmitButtonClass}
        >
          {createProduct.isPending ? "Creating…" : "Create Product"}
        </button>
      </div>
    </Modal>
  );
}

interface AddPriceTarget {
  product: string;
  productId: string;
  productKey: string;
}

/**
 * Matches Backoffice.dc.html's B4c frame, wired as a "+ Price" action on
 * each product row — clicking it opens this pre-scoped to that product.
 * "Create Price" calls POST /billing/products/:productId/prices, which
 * creates a real Stripe Price and archives whatever was previously active
 * for that same product+cadence (billing.service.ts createPrice).
 *
 * Note: SEAT LIMIT is collected but not sent — billing.validators.ts's
 * createPriceSchema has no such field yet (seat/location caps currently
 * live on the product's `limits`, not per price/cadence). Left in the
 * form to match the mockup; see the hint text under the field.
 */
function AddPriceModal({ target, onClose }: { target: AddPriceTarget | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [cycle, setCycle] = useState<BillingInterval>("month");
  const [priceInput, setPriceInput] = useState("");
  const [seatLimit, setSeatLimit] = useState("");
  const [trialDays, setTrialDays] = useState("");

  const createPrice = useMutation({
    mutationFn: () => {
      if (!target) throw new Error("No product selected.");
      const dollars = Number.parseFloat(priceInput);
      if (!Number.isFinite(dollars) || dollars <= 0) {
        throw new Error("Enter a valid price greater than $0.");
      }
      const trialDaysOverride = trialDays.trim() ? Number.parseInt(trialDays, 10) : undefined;
      if (
        trialDaysOverride !== undefined &&
        (!Number.isFinite(trialDaysOverride) || trialDaysOverride < 0)
      ) {
        throw new Error("Trial period must be a non-negative number of days.");
      }
      return billingApi.createPrice(target.productId, {
        billingInterval: cycle,
        unitAmount: Math.round(dollars * 100),
        trialDaysOverride,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "admin-catalog"] });
      handleClose();
    },
  });

  function handleClose() {
    setCycle("month");
    setPriceInput("");
    setSeatLimit("");
    setTrialDays("");
    createPrice.reset();
    onClose();
  }

  const canSubmit = priceInput.trim().length > 0 && !createPrice.isPending;

  return (
    <Modal open={target !== null} onClose={handleClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">Add Price</h1>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="font-sans text-xl text-bo-muted-5"
        >
          ×
        </button>
      </div>
      <p className="-mt-2.5 m-0 font-sans text-xs text-bo-muted-5">
        Adding a price to{" "}
        <span className="font-medium text-bo-ink-soft">{target?.product}</span> (
        {target?.productKey})
      </p>

      <Field label="BILLING CYCLE">
        <select
          value={cycle}
          onChange={(e) => setCycle(e.target.value as BillingInterval)}
          className={formInputClass}
        >
          {CYCLE_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="PRICE">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          className={formInputClass}
        />
      </Field>

      <Field label="SEAT LIMIT">
        <input
          type="text"
          placeholder="e.g. 3"
          value={seatLimit}
          onChange={(e) => setSeatLimit(e.target.value)}
          className={formInputClass}
        />
      </Field>
      <p className="-mt-3 m-0 font-sans text-[11px] text-bo-muted-5">
        Not saved yet — the API doesn't track a seat limit per price/cadence. Chair and location
        caps live on the product itself for now.
      </p>

      <Field label="TRIAL PERIOD (DAYS)">
        <input
          type="text"
          placeholder="e.g. 14 — leave blank for no trial"
          value={trialDays}
          onChange={(e) => setTrialDays(e.target.value)}
          className={formInputClass}
        />
      </Field>

      <div className="rounded-[10px] bg-bo-table-head p-3.5">
        <span className="font-sans text-xs leading-relaxed text-bo-muted-4">
          Prices are immutable in Stripe once created — to change an amount, seat limit, trial, or
          cycle later, archive this price and add a new one.
        </span>
      </div>

      {createPrice.isError && (
        <p className="m-0 font-sans text-xs text-bo-danger">
          {errorMessage(createPrice.error, "Failed to create price.")}
        </p>
      )}

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button type="button" onClick={handleClose} className={modalCancelButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => createPrice.mutate()}
          disabled={!canSubmit}
          className={modalSubmitButtonClass}
        >
          {createPrice.isPending ? "Creating…" : "Create Price"}
        </button>
      </div>
    </Modal>
  );
}

type DeleteTarget =
  | { kind: "price"; priceDbId: string; product: string; cycle: string }
  | { kind: "product"; productId: string; product: string };

const modalDangerButtonClass =
  "rounded-[10px] bg-bo-danger px-[18px] py-[11px] font-sans text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

/**
 * In-app replacement for a native confirm() dialog — same Modal shell as
 * New Product / Add Price, so it matches the rest of the app instead of
 * the browser's own unstyled prompt. Shows the mutation's error inline
 * and re-opens (stays mounted with the error visible) on failure instead
 * of closing; only a successful archive closes it, via the two
 * mutations' onSuccess in PlansPage.
 */
function DeleteConfirmModal({
  target,
  isPending,
  error,
  onConfirm,
  onClose,
}: {
  target: DeleteTarget | null;
  isPending: boolean;
  error: unknown;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const title = target?.kind === "price" ? `Delete the ${target.cycle} price?` : `Delete ${target?.product}?`;
  const body =
    target?.kind === "price"
      ? `This archives it in Stripe — existing subscribers of ${target.product} keep it, but it can no longer be offered to new signups. This can't be undone; Stripe prices can't be reactivated.`
      : "This archives the product in Stripe — it stops appearing as a plan tier. It has no prices yet, so nothing else is affected.";

  return (
    <Modal open={target !== null} onClose={onClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">{title}</h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="font-sans text-xl text-bo-muted-5"
        >
          ×
        </button>
      </div>
      <p className="-mt-2.5 m-0 font-sans text-xs leading-relaxed text-bo-muted-5">{body}</p>

      {error !== undefined && error !== null && (
        <p className="m-0 font-sans text-xs text-bo-danger">{errorMessage(error, "Failed to delete.")}</p>
      )}

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button type="button" onClick={onClose} className={modalCancelButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className={modalDangerButtonClass}
        >
          {isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}

export function PlansPage() {
  const queryClient = useQueryClient();
  const [productFilter, setProductFilter] = useState("All Products");
  const [cycleFilter, setCycleFilter] = useState("All Billing Cycles");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [addPriceTarget, setAddPriceTarget] = useState<AddPriceTarget | null>(null);

  // GET /billing/products/admin — every product/price, active or
  // archived, unlike the public /billing/products the pricing page uses.
  const catalogQuery = useQuery({
    queryKey: ["billing", "admin-catalog"],
    queryFn: billingApi.listAdminCatalog,
  });

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // "Delete" = archive, same as Stripe: a Price can never be truly
  // deleted once it exists, and a Product generally can't be either once
  // it has any price attached. Archiving flips isActive to false (in
  // Stripe and the DB) — existing subscribers keep whatever they're on,
  // it just stops being offered going forward. Only close the confirm
  // modal on success — on failure it stays open with the error visible
  // (see DeleteConfirmModal) so the admin can retry without re-opening it.
  const archivePriceMutation = useMutation({
    mutationFn: (priceId: string) => billingApi.archivePrice(priceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "admin-catalog"] });
      setDeleteTarget(null);
    },
  });
  const archiveProductMutation = useMutation({
    mutationFn: (productId: string) => billingApi.archiveProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing", "admin-catalog"] });
      setDeleteTarget(null);
    },
  });

  function closeDeleteModal() {
    setDeleteTarget(null);
    archivePriceMutation.reset();
    archiveProductMutation.reset();
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "price") {
      archivePriceMutation.mutate(deleteTarget.priceDbId);
    } else {
      archiveProductMutation.mutate(deleteTarget.productId);
    }
  }

  const products = catalogQuery.data?.products ?? [];

  const productFilterOptions = useMemo(
    () => ["All Products", ...products.map((p) => p.name)],
    [products],
  );

  // One row per Stripe price, same as the mockup — except a freshly
  // created product with no prices yet gets one placeholder row instead
  // of silently contributing nothing. Without this, "New Product" would
  // only be visible via the PRODUCT filter dropdown (built from `products`
  // directly, below) and the table itself would look untouched, which
  // reads as "did that actually work?" until a first price is added.
  //
  // Built with a plain loop rather than flatMap: the two branches return
  // objects whose `status` is a different string literal, and TS won't
  // unify flatMap's per-call return types into the right union on its
  // own — it infers `unknown[]`. Pushing onto an explicitly-typed
  // PlanRow[] sidesteps that.
  const rows = useMemo<PlanRow[]>(() => {
    const result: PlanRow[] = [];

    for (const product of products) {
      const seatLimit = product.limits.chairs ?? product.limits.locations;
      const seats = seatLimit !== undefined ? String(seatLimit) : "Unlimited";

      if (product.prices.length === 0) {
        result.push({
          rowKey: `product-${product.id}`,
          product: product.name,
          productId: product.id,
          productKey: product.key,
          productActive: product.isActive,
          priceDbId: null,
          cycle: "—",
          priceId: "—",
          price: "—",
          seats,
          trialDays: product.trialDays ? `${product.trialDays}d` : "—",
          // Once the product itself has been deleted there's nothing left
          // to call "no prices yet" — it's just archived.
          status: product.isActive ? "No Prices Yet" : "Archived",
        });
        continue;
      }

      for (const price of product.prices) {
        const trialDays = price.trialDaysOverride ?? product.trialDays;
        result.push({
          rowKey: price.id,
          product: product.name,
          productId: product.id,
          productKey: product.key,
          productActive: product.isActive,
          priceDbId: price.id,
          cycle: CYCLE_LABEL[price.billingInterval],
          priceId: price.stripePriceId,
          price: formatMoney(price.unitAmount, price.currency),
          seats,
          trialDays: trialDays ? `${trialDays}d` : "—",
          status: price.isActive ? "Active" : "Archived",
        });
      }
    }

    return result;
  }, [products]);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (productFilter === "All Products" || row.product === productFilter) &&
          (cycleFilter === "All Billing Cycles" || row.cycle === cycleFilter) &&
          (statusFilter === "All Statuses" || row.status === statusFilter),
      ),
    [rows, productFilter, cycleFilter, statusFilter],
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
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className={filterSelectClass}
        >
          {productFilterOptions.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          value={cycleFilter}
          onChange={(e) => setCycleFilter(e.target.value)}
          className={filterSelectClass}
        >
          {CYCLE_FILTERS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={filterSelectClass}
        >
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        <div className="grid grid-cols-[1.1fr_0.9fr_1fr_0.7fr_0.6fr_0.6fr_0.7fr_1fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
          <span>PRODUCT</span>
          <span>BILLING CYCLE</span>
          <span>PRICE ID</span>
          <span>PRICE</span>
          <span>SEATS</span>
          <span>TRIAL</span>
          <span>STATUS</span>
          <span />
        </div>
        {catalogQuery.isLoading ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">Loading plans…</p>
        ) : catalogQuery.isError ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-danger">
            Couldn't load plans: {errorMessage(catalogQuery.error, "unknown error")}
          </p>
        ) : filteredRows.length === 0 ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">No prices match these filters.</p>
        ) : (
          filteredRows.map((row, i) => {
            return (
              <div
                key={row.rowKey}
                className={`grid grid-cols-[1.1fr_0.9fr_1fr_0.7fr_0.6fr_0.6fr_0.7fr_1fr] items-center px-5 py-2.5 ${
                  i > 0 ? "border-t border-bo-border-soft" : ""
                }`}
              >
                <span className="font-sans text-[13px] font-semibold text-bo-ink">{row.product}</span>
                <span className="font-sans text-xs font-medium text-bo-muted-2">{row.cycle}</span>
                <span className="font-mono text-[11px] text-bo-muted-4" title={row.priceId}>
                  {maskId(row.priceId)}
                </span>
                <span className="font-sans text-xs font-medium text-bo-muted-2">{row.price}</span>
                <span className="font-sans text-xs font-medium text-bo-muted-2">{row.seats}</span>
                <span className="font-sans text-xs font-medium text-bo-muted-2">{row.trialDays}</span>
                <StatusPill
                  tone={
                    row.status === "Active" ? "success" : row.status === "No Prices Yet" ? "gold" : "neutral"
                  }
                >
                  {row.status}
                </StatusPill>
                <div className="flex items-center justify-end gap-2.5">
                  {row.productActive && (
                    <button
                      type="button"
                      onClick={() =>
                        setAddPriceTarget({
                          product: row.product,
                          productId: row.productId,
                          productKey: row.productKey,
                        })
                      }
                      className="font-sans text-xs font-semibold text-bo-gold"
                    >
                      + Price
                    </button>
                  )}
                  {row.priceDbId !== null && row.status === "Active" && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "price",
                          priceDbId: row.priceDbId as string,
                          product: row.product,
                          cycle: row.cycle,
                        })
                      }
                      className="font-sans text-xs font-semibold text-bo-danger"
                    >
                      Delete
                    </button>
                  )}
                  {row.priceDbId === null && row.status === "No Prices Yet" && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({ kind: "product", productId: row.productId, product: row.product })
                      }
                      className="font-sans text-xs font-semibold text-bo-danger"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <NewProductModal open={newProductOpen} onClose={() => setNewProductOpen(false)} />
      <AddPriceModal target={addPriceTarget} onClose={() => setAddPriceTarget(null)} />
      <DeleteConfirmModal
        target={deleteTarget}
        isPending={deleteTarget?.kind === "price" ? archivePriceMutation.isPending : archiveProductMutation.isPending}
        error={deleteTarget?.kind === "price" ? archivePriceMutation.error : archiveProductMutation.error}
        onConfirm={confirmDelete}
        onClose={closeDeleteModal}
      />
    </div>
  );
}

export default PlansPage;
