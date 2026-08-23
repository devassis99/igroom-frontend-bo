import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { Modal } from "@/components/ui/Modal";
import { Field, formInputClass } from "@/components/ui/FormField";
import { useAuthStore } from "@/auth/auth-store";
import {
  shopsApi,
  formatCents,
  BILLING_INTERVAL_LABEL,
  SETTABLE_SHOP_STATUSES,
  SHOP_STATUS_LABEL,
  SHOP_STATUS_TONE,
  type ListShopsParams,
  type PlanOption,
  type SettableShopStatus,
  type Shop,
  type ShopDetail,
  type ShopSort,
  type ShopStatus,
} from "@/lib/shops-api";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const FILTERABLE_STATUSES: ShopStatus[] = ["trial", "active", "past_due", "suspended", "cancelled"];

const modalCancelButtonClass =
  "rounded-[10px] border border-bo-input-border px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-ink-soft";
const modalSubmitButtonClass =
  "rounded-[10px] bg-bo-dark px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-on-dark disabled:cursor-not-allowed disabled:opacity-50";
const modalDangerButtonClass =
  "rounded-[10px] bg-bo-danger px-[18px] py-[11px] font-sans text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";
const chipClass = (active: boolean) =>
  `rounded-full px-3 py-1.5 font-sans text-[11px] font-semibold ${
    active
      ? "bg-bo-dark text-bo-on-dark"
      : "border border-bo-input-border bg-bo-surface text-bo-muted-2"
  }`;
const secondaryButtonClass =
  "rounded-[10px] border border-bo-input-border bg-bo-surface px-3.5 py-2 font-sans text-xs font-semibold text-bo-ink-soft disabled:cursor-not-allowed disabled:opacity-40";

/** Mockup's B3 column widths, plus a trailing actions column. */
const ROW_GRID = "grid-cols-[1.6fr_1fr_0.7fr_0.8fr_0.9fr_0.7fr]";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Sorting is server-side (seats and MRR are computed columns — see
 * shops.service.ts), so a header click just re-runs the query. Clicking
 * the active column flips direction; clicking a different one starts it
 * descending, which is the useful default for every numeric column here.
 */
function SortableHeader({
  label,
  column,
  sort,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  column: ShopSort;
  sort: ShopSort;
  direction: "asc" | "desc";
  onSort: (column: ShopSort) => void;
  align?: "left" | "right";
}) {
  const active = sort === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`flex items-center gap-1 font-sans text-[11px] font-semibold ${
        align === "right" ? "justify-end" : ""
      } ${active ? "text-bo-ink" : "text-bo-muted-4"}`}
      // Not aria-sort: that attribute belongs on a columnheader, and this
      // header row is a CSS grid of buttons rather than a real <table>.
      // The label carries the same information for a screen reader.
      aria-label={
        active
          ? `${label}, sorted ${direction === "asc" ? "ascending" : "descending"}. Reverse the order.`
          : `Sort by ${label}`
      }
    >
      {label}
      <span aria-hidden className={active ? "" : "opacity-0"}>
        {direction === "asc" ? "↑" : "↓"}
      </span>
    </button>
  );
}

function ChangeStatusModal({
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

function ChangePlanModal({
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

function EditShopModal({
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-sans text-[10px] font-semibold tracking-[0.04em] text-bo-muted-5">
        {label}
      </span>
      <span className="font-sans text-[13px] font-medium text-bo-ink-soft">{value}</span>
    </div>
  );
}

function ShopDetailModal({
  shopId,
  onClose,
  onEdit,
  onChangePlan,
  onChangeStatus,
  canManage,
}: {
  shopId: string | null;
  onClose: () => void;
  onEdit: (shop: ShopDetail) => void;
  onChangePlan: (shop: ShopDetail) => void;
  onChangeStatus: (shop: ShopDetail) => void;
  canManage: boolean;
}) {
  const detailQuery = useQuery({
    queryKey: ["shops", "detail", shopId],
    queryFn: () => shopsApi.get(shopId!),
    enabled: shopId !== null,
  });

  const shop = detailQuery.data?.shop;

  return (
    <Modal open={shopId !== null} onClose={onClose}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">
            {shop?.name ?? "Shop"}
          </h1>
          {shop && (
            <div className="flex items-center gap-2">
              <StatusPill tone={SHOP_STATUS_TONE[shop.status]}>
                {SHOP_STATUS_LABEL[shop.status]}
              </StatusPill>
              <span className="font-sans text-xs text-bo-muted-5">
                {shop.planName} · {BILLING_INTERVAL_LABEL[shop.billingInterval]} ·{" "}
                {formatCents(shop.mrrCents, shop.currency)}/mo
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="font-sans text-xl text-bo-muted-5"
        >
          ×
        </button>
      </div>

      {detailQuery.isLoading && (
        <p className="m-0 font-sans text-sm text-bo-muted-3">Loading shop…</p>
      )}
      {detailQuery.isError && (
        <p className="m-0 font-sans text-sm text-bo-danger">
          {errorMessage(detailQuery.error, "Couldn't load this shop.")}
        </p>
      )}

      {shop && (
        <>
          <div className="grid grid-cols-2 gap-3 rounded-[10px] bg-bo-table-head p-3.5">
            <DetailRow label="OWNER EMAIL" value={shop.email} />
            <DetailRow label="PHONE" value={shop.phone ?? "—"} />
            <DetailRow label="CATEGORY" value={shop.category ?? "—"} />
            <DetailRow label="JOINED" value={formatDate(shop.createdAt)} />
            <DetailRow label="SEATS" value={String(shop.seats)} />
            <DetailRow
              label="MARKETPLACE"
              value={shop.isMarketplaceListed ? "Listed" : "Not listed"}
            />
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            <div className="rounded-[10px] border border-bo-border p-3">
              <span className="font-sans text-[10px] text-bo-muted-5">BOOKINGS</span>
              <p className="m-0 mt-1 font-sans text-lg font-bold text-bo-ink">
                {shop.bookings.total}
              </p>
            </div>
            <div className="rounded-[10px] border border-bo-border p-3">
              <span className="font-sans text-[10px] text-bo-muted-5">UPCOMING</span>
              <p className="m-0 mt-1 font-sans text-lg font-bold text-bo-ink">
                {shop.bookings.upcoming}
              </p>
            </div>
            <div className="rounded-[10px] border border-bo-border p-3">
              <span className="font-sans text-[10px] text-bo-muted-5">LAST 30D</span>
              <p className="m-0 mt-1 font-sans text-lg font-bold text-bo-ink">
                {shop.bookings.last30Days}
              </p>
            </div>
            <div className="rounded-[10px] border border-bo-border p-3">
              <span className="font-sans text-[10px] text-bo-muted-5">30D REVENUE</span>
              <p className="m-0 mt-1 font-sans text-lg font-bold text-bo-ink">
                {formatCents(shop.bookings.revenueLast30DaysCents)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
              LOCATIONS ({shop.locations.length})
            </span>
            {shop.locations.length === 0 ? (
              <p className="m-0 font-sans text-xs text-bo-muted-5">No locations yet.</p>
            ) : (
              shop.locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between rounded-[10px] border border-bo-border-soft px-3 py-2"
                >
                  <span className="flex flex-col">
                    <span className="font-sans text-[13px] font-semibold text-bo-ink">
                      {location.name}
                      {location.isPrimary && (
                        <span className="ml-1.5 font-sans text-[10px] font-medium text-bo-muted-5">
                          (primary)
                        </span>
                      )}
                    </span>
                    <span className="font-sans text-[11px] text-bo-muted-5">
                      {location.address}
                    </span>
                  </span>
                  <StatusPill tone={location.status === "active" ? "success" : "neutral"}>
                    {location.status}
                  </StatusPill>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
              STAFF ({shop.staff.length})
            </span>
            {shop.staff.length === 0 ? (
              <p className="m-0 font-sans text-xs text-bo-muted-5">No staff yet.</p>
            ) : (
              <div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
                {shop.staff.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-bo-page/40"
                  >
                    <span className="flex flex-col">
                      <span className="font-sans text-xs font-semibold text-bo-ink-soft">
                        {member.name}
                        <span className="ml-1.5 font-sans text-[10px] font-medium text-bo-muted-5">
                          {member.roleName ?? "no role"}
                        </span>
                      </span>
                      <span className="font-sans text-[11px] text-bo-muted-5">{member.email}</span>
                    </span>
                    <span className="font-sans text-[11px] text-bo-muted-5">
                      {member.isActive ? formatDate(member.lastLoginAt) : "Deactivated"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canManage && (
            <div className="flex justify-end gap-2.5 pt-1.5">
              <button type="button" onClick={() => onEdit(shop)} className={modalCancelButtonClass}>
                Edit details
              </button>
              <button
                type="button"
                onClick={() => onChangePlan(shop)}
                className={modalCancelButtonClass}
              >
                Change plan
              </button>
              <button
                type="button"
                onClick={() => onChangeStatus(shop)}
                className={modalSubmitButtonClass}
              >
                Change status
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

/**
 * Shops / Accounts — Backoffice.dc.html's B3 frame, wired to
 * igroom-backend's /shops endpoints (src/modules/shops).
 *
 * Search, filtering, sorting and paging are all server-side round trips
 * rather than client-side array work: seats and MRR are computed in SQL
 * (staff counts, and price ÷ cadence), so filtering or sorting one page
 * of 25 in the browser would give the wrong answer for the other pages.
 * `keepPreviousData` is what keeps that from feeling worse than the old
 * local filter — the table holds its last result while the next one
 * loads instead of blanking on every keystroke.
 *
 * Every mutation here is independently gated server-side on shops.manage
 * (see shops.routes.ts) — hiding the buttons is a UX nicety, not the
 * enforcement.
 */
export function ShopsPage() {
  const canManage = useAuthStore((s) => s.hasPermission("shops.manage"));

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<ShopStatus[]>([]);
  const [productId, setProductId] = useState("");
  const [sort, setSort] = useState<ShopSort>("mrr");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [detailShopId, setDetailShopId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<Shop | null>(null);
  const [planTarget, setPlanTarget] = useState<Shop | null>(null);
  const [editTarget, setEditTarget] = useState<Shop | null>(null);

  const queryClient = useQueryClient();

  // Debounce the search box so typing "Karachi" is one request, not seven.
  // Landing on a new search term also resets the page — page 4 of a
  // narrower result set is usually empty. Every other filter does the
  // same reset from its own handler rather than from an effect watching
  // the filter state, which would be a render-triggering-a-render loop.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo<ListShopsParams>(
    () => ({
      q: query || undefined,
      statuses: statuses.length > 0 ? statuses : undefined,
      productId: productId || undefined,
      sort,
      direction,
      page,
      pageSize: PAGE_SIZE,
    }),
    [query, statuses, productId, sort, direction, page],
  );

  const listQuery = useQuery({
    queryKey: ["shops", "list", params],
    queryFn: () => shopsApi.list(params),
    placeholderData: keepPreviousData,
  });
  const summaryQuery = useQuery({ queryKey: ["shops", "summary"], queryFn: shopsApi.summary });
  const plansQuery = useQuery({
    queryKey: ["shops", "plan-options"],
    queryFn: shopsApi.planOptions,
  });

  const shops = listQuery.data?.shops ?? [];
  const summary = summaryQuery.data?.summary;
  const plans = useMemo(() => plansQuery.data?.plans ?? [], [plansQuery.data]);
  const totalPages = listQuery.data?.totalPages ?? 1;
  const total = listQuery.data?.total ?? 0;

  function toggleStatus(status: ShopStatus) {
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
    setPage(1);
  }

  function selectProduct(nextProductId: string) {
    setProductId(nextProductId);
    setPage(1);
  }

  function clearFilters() {
    setStatuses([]);
    setProductId("");
    setSearchInput("");
    setPage(1);
  }

  function handleSort(column: ShopSort) {
    if (column === sort) {
      setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(column);
      // Descending is the useful default for every numeric column here
      // (biggest MRR / most seats first) and harmless for the rest.
      setDirection("desc");
    }
    setPage(1);
  }

  /** Every mutation touches the same three queries — the row, the stat row, and (for a plan change) nothing else. */
  function invalidateShops() {
    queryClient.invalidateQueries({ queryKey: ["shops"] });
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="m-0 font-sans text-2xl font-semibold text-bo-ink">Shops / Accounts</h1>
        <input
          type="search"
          placeholder="Search shops"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-60 rounded-lg border border-bo-input-border bg-bo-surface px-3.5 py-2.5 font-sans text-[13px] text-bo-ink outline-none focus:border-2 focus:border-bo-gold"
        />
      </div>

      <div className="mb-4 grid grid-cols-5 gap-3.5">
        <StatCard label="Total Shops" value={summary ? String(summary.totalShops) : "—"} />
        <StatCard
          label="MRR (active)"
          value={summary ? formatCents(summary.activeMrrCents) : "—"}
        />
        <StatCard
          label="Trials"
          value={summary ? String(summary.byStatus.trial) : "—"}
          delta={
            summary && summary.trialMrrCents > 0
              ? { text: `${formatCents(summary.trialMrrCents)} pending`, tone: "success" }
              : undefined
          }
        />
        <StatCard
          label="Past Due"
          value={summary ? String(summary.byStatus.past_due) : "—"}
          delta={
            summary && summary.pastDueMrrCents > 0
              ? { text: `${formatCents(summary.pastDueMrrCents)} at risk`, tone: "danger" }
              : undefined
          }
        />
        <StatCard label="Seats" value={summary ? String(summary.totalSeats) : "—"} />
      </div>

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        {FILTERABLE_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => toggleStatus(status)}
            className={chipClass(statuses.includes(status))}
          >
            {SHOP_STATUS_LABEL[status]}
            {summary && <span className="ml-1.5 opacity-60">{summary.byStatus[status]}</span>}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-bo-border" aria-hidden />
        <select
          value={productId}
          onChange={(e) => selectProduct(e.target.value)}
          aria-label="Filter by plan"
          className="rounded-[8px] border border-bo-input-border bg-bo-surface px-2.5 py-1.5 font-sans text-xs font-medium text-bo-ink-soft outline-none"
        >
          <option value="">All plans</option>
          {plans.map((plan) => (
            <option key={plan.productId} value={plan.productId}>
              {plan.name}
            </option>
          ))}
        </select>
        {(statuses.length > 0 || productId || query) && (
          <button
            type="button"
            onClick={clearFilters}
            className="font-sans text-xs font-semibold text-bo-gold"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto font-sans text-xs text-bo-muted-5">
          {listQuery.isFetching ? "Loading…" : `${total} shop${total === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        <div className={`grid ${ROW_GRID} items-center bg-bo-table-head px-5 py-2.5`}>
          <SortableHeader
            label="Shop"
            column="name"
            sort={sort}
            direction={direction}
            onSort={handleSort}
          />
          <SortableHeader
            label="Plan"
            column="plan"
            sort={sort}
            direction={direction}
            onSort={handleSort}
          />
          <SortableHeader
            label="Seats"
            column="seats"
            sort={sort}
            direction={direction}
            onSort={handleSort}
          />
          <SortableHeader
            label="MRR"
            column="mrr"
            sort={sort}
            direction={direction}
            onSort={handleSort}
          />
          <SortableHeader
            label="Status"
            column="status"
            sort={sort}
            direction={direction}
            onSort={handleSort}
          />
          <span />
        </div>

        {listQuery.isLoading ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">Loading shops…</p>
        ) : listQuery.isError ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-danger">
            Couldn't load shops: {errorMessage(listQuery.error, "unknown error")}
          </p>
        ) : shops.length === 0 ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">
            {query || statuses.length > 0 || productId
              ? "No shops match these filters."
              : "No shops have signed up yet."}
          </p>
        ) : (
          shops.map((shop, i) => (
            <div
              key={shop.id}
              className={`grid ${ROW_GRID} items-center px-5 py-3 ${
                i < shops.length - 1 ? "border-b border-bo-border-soft" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setDetailShopId(shop.id)}
                className="flex flex-col items-start text-left"
              >
                <span className="font-sans text-[13px] font-semibold text-bo-ink hover:underline">
                  {shop.name}
                </span>
                <span className="font-sans text-[11px] text-bo-muted-5">
                  {shop.category ?? shop.email}
                  {shop.locationCount > 1 && ` · ${shop.locationCount} locations`}
                </span>
              </button>
              <span className="flex flex-col">
                <span className="font-sans text-xs font-medium text-bo-muted-2">
                  {shop.planName}
                </span>
                <span className="font-sans text-[11px] text-bo-muted-5">
                  {BILLING_INTERVAL_LABEL[shop.billingInterval]}
                </span>
              </span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{shop.seats}</span>
              <span className="font-sans text-[13px] font-semibold text-bo-ink-soft">
                {formatCents(shop.mrrCents, shop.currency)}
              </span>
              <StatusPill tone={SHOP_STATUS_TONE[shop.status]}>
                {SHOP_STATUS_LABEL[shop.status]}
              </StatusPill>
              <div className="flex justify-end">
                {/* A shortcut to the single most common admin action.
                    Everything else — plan changes, edits — lives behind
                    the shop name, which opens the detail panel. */}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setStatusTarget(shop)}
                    className="font-sans text-xs font-semibold text-bo-gold"
                  >
                    Status
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-3.5 flex items-center justify-between">
          <span className="font-sans text-xs text-bo-muted-5">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={secondaryButtonClass}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={secondaryButtonClass}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <ShopDetailModal
        shopId={detailShopId}
        onClose={() => setDetailShopId(null)}
        onEdit={(shop) => {
          setDetailShopId(null);
          setEditTarget(shop);
        }}
        onChangePlan={(shop) => {
          setDetailShopId(null);
          setPlanTarget(shop);
        }}
        onChangeStatus={(shop) => {
          setDetailShopId(null);
          setStatusTarget(shop);
        }}
        canManage={canManage}
      />
      <ChangeStatusModal
        shop={statusTarget}
        onClose={() => setStatusTarget(null)}
        onDone={() => {
          invalidateShops();
          setStatusTarget(null);
        }}
      />
      <ChangePlanModal
        shop={planTarget}
        plans={plans}
        onClose={() => setPlanTarget(null)}
        onDone={() => {
          invalidateShops();
          setPlanTarget(null);
        }}
      />
      <EditShopModal
        shop={editTarget}
        onClose={() => setEditTarget(null)}
        onDone={() => {
          invalidateShops();
          setEditTarget(null);
        }}
      />
    </div>
  );
}

export default ShopsPage;
