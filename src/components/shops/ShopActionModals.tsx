import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, formInputClass } from "@/components/ui/FormField";
import {
  shopsApi,
  formatCents,
  BILLING_INTERVAL_LABEL,
  SETTABLE_SHOP_STATUSES,
  SHOP_STATUS_LABEL,
  type PlanOption,
  type SettableShopStatus,
  type Shop,
} from "@/lib/shops-api";

/**
 * The three write actions on a shop, extracted out of ShopsPage so the
 * list and the detail page can both open them without one importing the
 * other. The list keeps only the status shortcut; the detail page uses
 * all three.
 *
 * Each takes `shop | null` and treats non-null as "open", so a caller
 * just holds one piece of state per action instead of a boolean plus a
 * target.
 */
export const modalCancelButtonClass =
  "rounded-[10px] border border-bo-input-border px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-ink-soft";
export const modalSubmitButtonClass =
  "rounded-[10px] bg-bo-dark px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-on-dark disabled:cursor-not-allowed disabled:opacity-50";
export const modalDangerButtonClass =
  "rounded-[10px] bg-bo-danger px-[18px] py-[11px] font-sans text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function ChangeStatusModal({
  shop,
  onClose,
  onDone,
}: {
  shop: Shop | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<SettableShopStatus>("suspended");
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  // Re-seed the picker whenever the modal opens for a (possibly
  // different) shop — same open-time reset PlansPage/UsersPage use, which
  // avoids a useEffect that only ever needs to run on open.
  if (shop && openedFor !== shop.id) {
    setOpenedFor(shop.id);
    setStatus(shop.status === "active" ? "suspended" : "active");
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!shop) throw new Error("No shop selected.");
      return shopsApi.updateStatus(shop.id, status);
    },
    onSuccess: onDone,
  });

  function handleClose() {
    // Clear openedFor so reopening re-seeds from the shop's *current*
    // state — otherwise suspending a shop and reopening this would still
    // show "Suspended" preselected rather than offering to undo it.
    setOpenedFor(null);
    mutation.reset();
    onClose();
  }

  const destructive = status === "suspended" || status === "cancelled";

  return (
    <Modal open={shop !== null} onClose={handleClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">Change status</h1>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="font-sans text-xl text-bo-muted-5"
        >
          ×
        </button>
      </div>
      <p className="-mt-2.5 m-0 font-sans text-xs leading-relaxed text-bo-muted-5">
        {shop?.name} is currently{" "}
        <strong className="font-semibold text-bo-ink-soft">
          {shop ? SHOP_STATUS_LABEL[shop.status] : ""}
        </strong>
        . A shop can't be moved back to Trial — that's a signup-time state only.
      </p>

      <Field label="NEW STATUS">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as SettableShopStatus)}
          className={formInputClass}
        >
          {SETTABLE_SHOP_STATUSES.map((option) => (
            <option key={option} value={option}>
              {SHOP_STATUS_LABEL[option]}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-1.5 rounded-[10px] bg-bo-table-head p-3.5">
        <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
          WHAT THIS DOES
        </span>
        <span className="font-sans text-xs leading-relaxed text-bo-muted-4">
          {status === "active" &&
            "Marks the subscription healthy again — use this once a failed payment has cleared or a suspension is being lifted."}
          {status === "past_due" &&
            "Flags the last invoice as failed. Nothing sets this automatically yet: the Stripe webhook that should own it doesn't exist, so this is the manual stopgap."}
          {status === "suspended" &&
            "An admin-side switch-off, distinct from a bounced payment. The shop also drops out of marketplace search, which only lists active shops."}
          {status === "cancelled" &&
            "Ends the relationship. Nothing is deleted — the account, its locations and its booking history all stay queryable."}
        </span>
      </div>

      {mutation.isError && (
        <p className="m-0 font-sans text-xs text-bo-danger">
          {errorMessage(mutation.error, "Failed to change this shop's status.")}
        </p>
      )}

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button type="button" onClick={handleClose} className={modalCancelButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={destructive ? modalDangerButtonClass : modalSubmitButtonClass}
        >
          {mutation.isPending ? "Saving…" : `Set ${SHOP_STATUS_LABEL[status]}`}
        </button>
      </div>
    </Modal>
  );
}

export function ChangePlanModal({
  shop,
  plans,
  onClose,
  onDone,
}: {
  shop: Shop | null;
  plans: PlanOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [priceId, setPriceId] = useState("");
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  if (shop && openedFor !== shop.id) {
    setOpenedFor(shop.id);
    setPriceId(shop.priceId);
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!shop) throw new Error("No shop selected.");
      return shopsApi.updatePlan(shop.id, priceId);
    },
    onSuccess: onDone,
  });

  function handleClose() {
    setOpenedFor(null);
    mutation.reset();
    onClose();
  }

  const selected = plans
    .flatMap((plan) => plan.prices.map((price) => ({ plan, price })))
    .find((entry) => entry.price.priceId === priceId);

  const unchanged = shop !== null && priceId === shop.priceId;

  return (
    <Modal open={shop !== null} onClose={handleClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">Change plan</h1>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="font-sans text-xl text-bo-muted-5"
        >
          ×
        </button>
      </div>
      <p className="-mt-2.5 m-0 font-sans text-xs leading-relaxed text-bo-muted-5">
        {shop?.name} is on{" "}
        <strong className="font-semibold text-bo-ink-soft">
          {shop?.planName} · {shop ? BILLING_INTERVAL_LABEL[shop.billingInterval] : ""}
        </strong>
        {shop && !shop.priceIsActive && " (an archived price it's grandfathered onto)"}.
      </p>

      <Field label="NEW PLAN & CADENCE">
        <select
          value={priceId}
          onChange={(e) => setPriceId(e.target.value)}
          className={formInputClass}
        >
          {/* The shop's current price may be archived and therefore absent
              from plan-options — keep it selectable so the dropdown doesn't
              silently jump to some other plan on open. */}
          {shop && !plans.some((p) => p.prices.some((x) => x.priceId === shop.priceId)) && (
            <option value={shop.priceId}>
              {shop.planName} · {BILLING_INTERVAL_LABEL[shop.billingInterval]} (current, archived)
            </option>
          )}
          {plans.map((plan) =>
            plan.prices.map((price) => (
              <option key={price.priceId} value={price.priceId}>
                {plan.name} · {BILLING_INTERVAL_LABEL[price.billingInterval]} ·{" "}
                {formatCents(price.unitAmountCents, price.currency)}
              </option>
            )),
          )}
        </select>
      </Field>

      {selected && (
        <div className="flex flex-col gap-1.5 rounded-[10px] bg-bo-table-head p-3.5">
          <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
            NEW MRR
          </span>
          <span className="font-sans text-sm font-semibold text-bo-ink">
            {formatCents(selected.price.monthlyEquivalentCents, selected.price.currency)}/mo
            {shop && selected.price.monthlyEquivalentCents !== shop.mrrCents && (
              <span className="ml-2 font-sans text-xs font-medium text-bo-muted-4">
                was {formatCents(shop.mrrCents, shop.currency)}/mo
              </span>
            )}
          </span>
          <span className="font-sans text-[11px] leading-relaxed text-bo-muted-5">
            This re-points the account at the new price. No Stripe subscription is updated —
            checkout is still mocked, so no account has a live subscription to change yet.
          </span>
        </div>
      )}

      {mutation.isError && (
        <p className="m-0 font-sans text-xs text-bo-danger">
          {errorMessage(mutation.error, "Failed to change this shop's plan.")}
        </p>
      )}

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button type="button" onClick={handleClose} className={modalCancelButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || unchanged || priceId.length === 0}
          className={modalSubmitButtonClass}
        >
          {mutation.isPending ? "Saving…" : "Move to this plan"}
        </button>
      </div>
    </Modal>
  );
}

interface EditFormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  description: string;
  priceTier: string;
  isMarketplaceListed: boolean;
}

function toFormState(shop: Shop): EditFormState {
  return {
    name: shop.name,
    email: shop.email,
    phone: shop.phone ?? "",
    address: shop.address ?? "",
    category: shop.category ?? "",
    description: shop.description ?? "",
    priceTier: shop.priceTier === null ? "" : String(shop.priceTier),
    isMarketplaceListed: shop.isMarketplaceListed,
  };
}

export function EditShopModal({
  shop,
  onClose,
  onDone,
}: {
  shop: Shop | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<EditFormState | null>(null);
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  if (shop && openedFor !== shop.id) {
    setOpenedFor(shop.id);
    setForm(toFormState(shop));
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!shop || !form) throw new Error("No shop selected.");
      // Send only what actually changed. An empty text field means "clear
      // it" (null), not an empty string — the backend distinguishes the
      // two, and storing "" would make every downstream `?? "—"` fallback
      // stop working.
      const blankToNull = (value: string) => (value.trim().length > 0 ? value.trim() : null);
      return shopsApi.updateDetails(shop.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: blankToNull(form.phone),
        address: blankToNull(form.address),
        category: blankToNull(form.category),
        description: blankToNull(form.description),
        priceTier: form.priceTier === "" ? null : Number(form.priceTier),
        isMarketplaceListed: form.isMarketplaceListed,
      });
    },
    onSuccess: onDone,
  });

  function handleClose() {
    setOpenedFor(null);
    mutation.reset();
    onClose();
  }

  function update<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  const canSubmit =
    form !== null &&
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    !mutation.isPending;

  return (
    <Modal open={shop !== null} onClose={handleClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">Edit shop</h1>
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
        The URL slug (<code className="font-mono text-[11px]">{shop?.slug}</code>) isn't editable —
        it's the shop's public marketplace identifier.
      </p>

      {form && (
        <>
          <Field label="SHOP NAME">
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={formInputClass}
            />
          </Field>
          <Field label="OWNER EMAIL">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={formInputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="PHONE">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={formInputClass}
              />
            </Field>
            <Field label="CATEGORY">
              <input
                type="text"
                placeholder="e.g. Barbershop"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className={formInputClass}
              />
            </Field>
          </div>
          <Field label="ADDRESS">
            <input
              type="text"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className={formInputClass}
            />
          </Field>
          <Field label="DESCRIPTION (MARKETPLACE PROFILE)">
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={`${formInputClass} resize-none font-sans`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="PRICE TIER">
              <select
                value={form.priceTier}
                onChange={(e) => update("priceTier", e.target.value)}
                className={formInputClass}
              >
                <option value="">Not set</option>
                <option value="1">$</option>
                <option value="2">$$</option>
                <option value="3">$$$</option>
                <option value="4">$$$$</option>
              </select>
            </Field>
            <label className="flex cursor-pointer items-center gap-2.5 self-end pb-3">
              <input
                type="checkbox"
                checked={form.isMarketplaceListed}
                onChange={(e) => update("isMarketplaceListed", e.target.checked)}
              />
              <span className="font-sans text-xs font-medium text-bo-ink-soft">
                Listed on the marketplace
              </span>
            </label>
          </div>
          <p className="m-0 -mt-2 font-sans text-[11px] leading-relaxed text-bo-muted-5">
            Listing requires the shop to be active with at least one active location — otherwise the
            listing would never appear in search, and the save is rejected.
          </p>
        </>
      )}

      {mutation.isError && (
        <p className="m-0 font-sans text-xs text-bo-danger">
          {errorMessage(mutation.error, "Failed to save this shop.")}
        </p>
      )}

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button type="button" onClick={handleClose} className={modalCancelButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
          className={modalSubmitButtonClass}
        >
          {mutation.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}
