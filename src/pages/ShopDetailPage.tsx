import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuthStore } from "@/auth/auth-store";
import { SupportSessionSection } from "@/components/shops/SupportSessionSection";
import {
  ChangePlanModal,
  ChangeStatusModal,
  EditShopModal,
  errorMessage,
  modalCancelButtonClass,
  modalSubmitButtonClass,
} from "@/components/shops/ShopActionModals";
import {
  shopsApi,
  formatCents,
  BILLING_INTERVAL_LABEL,
  SHOP_STATUS_LABEL,
  SHOP_STATUS_TONE,
  type ShopDetail,
} from "@/lib/shops-api";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "locations", label: "Locations" },
  { key: "staff", label: "Staff" },
  { key: "plan", label: "Plan & Billing" },
  { key: "support", label: "Support" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function isTabKey(value: string | null): value is TabKey {
  return TABS.some((tab) => tab.key === value);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-bo-border bg-bo-surface p-5">
      {title && (
        <p className="m-0 mb-3.5 font-sans text-[11px] font-semibold tracking-[0.04em] text-bo-muted-4">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-sans text-[10px] font-semibold tracking-[0.04em] text-bo-muted-5">
        {label}
      </span>
      <span className="font-sans text-[13px] font-medium break-words text-bo-ink-soft">
        {value}
      </span>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-bo-border bg-bo-surface p-[18px]">
      <span className="font-sans text-xs text-bo-muted-4">{label}</span>
      <p className="m-0 mt-2 font-sans text-[26px] font-bold text-bo-ink">{value}</p>
    </div>
  );
}

/** The one-word summary of whether a shop is actually visible in the consumer app. */
function marketplaceSummary(shop: ShopDetail): string {
  if (!shop.isMarketplaceListed) return "Not listed";
  if (shop.status !== "active") return "Listed, but hidden (shop isn't active)";
  if (shop.locationCount === 0) return "Listed, but hidden (no active location)";
  return "Listed";
}

function OverviewTab({ shop }: { shop: ShopDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3.5">
        <StatTile label="Bookings, all time" value={String(shop.bookings.total)} />
        <StatTile label="Upcoming" value={String(shop.bookings.upcoming)} />
        <StatTile label="Last 30 days" value={String(shop.bookings.last30Days)} />
        <StatTile
          label="Revenue, last 30d"
          value={formatCents(shop.bookings.revenueLast30DaysCents)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="CONTACT">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="OWNER EMAIL" value={shop.email} />
            <DetailRow label="PHONE" value={shop.phone ?? "—"} />
            <DetailRow label="CATEGORY" value={shop.category ?? "—"} />
            <DetailRow label="ADDRESS" value={shop.address ?? "—"} />
          </div>
        </Card>

        <Card title="ACCOUNT">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="JOINED" value={formatDate(shop.createdAt)} />
            <DetailRow label="SEATS" value={`${shop.seats} active staff`} />
            <DetailRow label="LOCATIONS" value={`${shop.locationCount} active`} />
            <DetailRow
              label="URL SLUG"
              value={<code className="font-mono text-xs">{shop.slug}</code>}
            />
          </div>
        </Card>
      </div>

      <Card title="MARKETPLACE">
        <div className="grid grid-cols-2 gap-4">
          <DetailRow label="LISTING" value={marketplaceSummary(shop)} />
          <DetailRow
            label="PRICE TIER"
            value={shop.priceTier === null ? "Not set" : "$".repeat(shop.priceTier)}
          />
        </div>
        {shop.description && (
          <p className="m-0 mt-4 font-sans text-[13px] leading-relaxed text-bo-muted-2">
            {shop.description}
          </p>
        )}
      </Card>
    </div>
  );
}

function LocationsTab({ shop }: { shop: ShopDetail }) {
  if (shop.locations.length === 0) {
    return (
      <Card>
        <p className="m-0 font-sans text-sm text-bo-muted-3">
          This shop has no locations — unusual, since signup creates one.
        </p>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
      <div className="grid grid-cols-[1.2fr_2fr_1fr_0.8fr_0.7fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
        <span>NAME</span>
        <span>ADDRESS</span>
        <span>PHONE</span>
        <span>TIMEZONE</span>
        <span>STATUS</span>
      </div>
      {shop.locations.map((location, i) => (
        <div
          key={location.id}
          className={`grid grid-cols-[1.2fr_2fr_1fr_0.8fr_0.7fr] items-center gap-3 px-5 py-3 ${
            i < shop.locations.length - 1 ? "border-b border-bo-border-soft" : ""
          }`}
        >
          <span className="font-sans text-[13px] font-semibold text-bo-ink">
            {location.name}
            {location.isPrimary && (
              <span className="ml-1.5 font-sans text-[10px] font-medium text-bo-muted-5">
                (primary)
              </span>
            )}
          </span>
          <span className="font-sans text-xs text-bo-muted-2">{location.address}</span>
          <span className="font-sans text-xs text-bo-muted-2">{location.phone ?? "—"}</span>
          <span className="font-sans text-xs text-bo-muted-2">{location.timezone ?? "—"}</span>
          <StatusPill tone={location.status === "active" ? "success" : "neutral"}>
            {location.status}
          </StatusPill>
        </div>
      ))}
    </div>
  );
}

function StaffTab({ shop }: { shop: ShopDetail }) {
  if (shop.staff.length === 0) {
    return (
      <Card>
        <p className="m-0 font-sans text-sm text-bo-muted-3">Nobody on the roster yet.</p>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
      <div className="grid grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr_1fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
        <span>NAME</span>
        <span>EMAIL</span>
        <span>ROLE</span>
        <span>LOCATION</span>
        <span>STATUS</span>
        <span>LAST LOGIN</span>
      </div>
      {shop.staff.map((member, i) => (
        <div
          key={member.id}
          className={`grid grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr_1fr] items-center gap-3 px-5 py-3 ${
            i < shop.staff.length - 1 ? "border-b border-bo-border-soft" : ""
          }`}
        >
          <span className="font-sans text-[13px] font-semibold text-bo-ink">{member.name}</span>
          <span className="truncate font-sans text-xs text-bo-muted-2">{member.email}</span>
          <span className="font-sans text-xs text-bo-muted-2">{member.roleName ?? "—"}</span>
          <span className="font-sans text-xs text-bo-muted-2">{member.locationName ?? "—"}</span>
          <StatusPill tone={member.isActive ? "success" : "neutral"}>
            {member.isActive ? "Active" : "Deactivated"}
          </StatusPill>
          <span className="font-sans text-xs text-bo-muted-2">
            {formatDateTime(member.lastLoginAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PlanTab({
  shop,
  canManage,
  onChangePlan,
}: {
  shop: ShopDetail;
  canManage: boolean;
  onChangePlan: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3.5">
        <StatTile label="Plan" value={shop.planName} />
        <StatTile
          label="List price"
          value={`${formatCents(shop.unitAmountCents, shop.currency)} / ${BILLING_INTERVAL_LABEL[
            shop.billingInterval
          ].toLowerCase()}`}
        />
        <StatTile label="MRR" value={`${formatCents(shop.mrrCents, shop.currency)}/mo`} />
      </div>

      <Card title="SUBSCRIPTION">
        <div className="grid grid-cols-2 gap-4">
          <DetailRow label="STATUS" value={SHOP_STATUS_LABEL[shop.status]} />
          <DetailRow label="BILLING CADENCE" value={BILLING_INTERVAL_LABEL[shop.billingInterval]} />
          <DetailRow
            label="PRICE"
            value={
              shop.priceIsActive
                ? "On a currently sellable price"
                : "Grandfathered on an archived price"
            }
          />
          <DetailRow
            label="PRODUCT KEY"
            value={<code className="font-mono text-xs">{shop.productKey}</code>}
          />
          <DetailRow
            label="STRIPE CUSTOMER"
            value={
              shop.stripeCustomerId ? (
                <code className="font-mono text-xs">{shop.stripeCustomerId}</code>
              ) : (
                "None — checkout is still mocked"
              )
            }
          />
          <DetailRow
            label="STRIPE SUBSCRIPTION"
            value={
              shop.stripeSubscriptionId ? (
                <code className="font-mono text-xs">{shop.stripeSubscriptionId}</code>
              ) : (
                "None — checkout is still mocked"
              )
            }
          />
        </div>

        <p className="m-0 mt-4 font-sans text-[11px] leading-relaxed text-bo-muted-5">
          MRR is the monthly equivalent — an annual plan is divided by twelve — so shops on
          different cadences can be compared and summed. It reflects the plan's value regardless of
          whether the shop is currently paying.
        </p>

        {canManage && (
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={onChangePlan} className={modalSubmitButtonClass}>
              Change plan
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * A shop's full record, at /shops/:shopId.
 *
 * This used to be a modal on the list page, which meant scrolling a
 * ~700px dialog to reach the staff roster and losing the whole view on a
 * stray backdrop click. As a route it's linkable and bookmarkable, the
 * browser's back button does the obvious thing, and there's room to lay
 * the record out properly instead of stacking it into one column.
 *
 * The active tab lives in the query string rather than component state,
 * so a reload or a shared link lands on the same tab — worth the small
 * extra plumbing for a page support staff will paste at each other.
 */
export function ShopDetailPage() {
  const { shopId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPermission("shops.manage"));

  const tabParam = searchParams.get("tab");
  const tab: TabKey = isTabKey(tabParam) ? tabParam : "overview";

  const detailQuery = useQuery({
    queryKey: ["shops", "detail", shopId],
    queryFn: () => shopsApi.get(shopId),
    enabled: shopId.length > 0,
  });
  const plansQuery = useQuery({
    queryKey: ["shops", "plan-options"],
    queryFn: shopsApi.planOptions,
  });

  const shop = detailQuery.data?.shop;
  const plans = useMemo(() => plansQuery.data?.plans ?? [], [plansQuery.data]);

  // Which action modal is open. Each holds the shop rather than a boolean
  // so the modals can stay generic enough for the list page to reuse.
  const statusTarget = searchParams.get("action") === "status" ? (shop ?? null) : null;
  const planTarget = searchParams.get("action") === "plan" ? (shop ?? null) : null;
  const editTarget = searchParams.get("action") === "edit" ? (shop ?? null) : null;

  function setTab(next: TabKey) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("tab", next);
      params.delete("action");
      return params;
    });
  }

  function openAction(action: "status" | "plan" | "edit") {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("action", action);
      return params;
    });
  }

  function closeAction() {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete("action");
      return params;
    });
  }

  function onActionDone() {
    queryClient.invalidateQueries({ queryKey: ["shops"] });
    closeAction();
  }

  if (detailQuery.isLoading) {
    return <p className="font-sans text-sm text-bo-muted-3">Loading shop…</p>;
  }

  if (detailQuery.isError || !shop) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Link to="/shops" className="font-sans text-xs font-semibold text-bo-gold">
          ← Shops / Accounts
        </Link>
        <div className="rounded-[14px] border border-bo-border bg-bo-surface p-8">
          <h1 className="m-0 mb-1.5 font-sans text-xl font-semibold text-bo-ink">
            Couldn't load this shop
          </h1>
          <p className="m-0 font-sans text-sm text-bo-muted-5">
            {errorMessage(detailQuery.error, "It may have been removed, or the link is wrong.")}
          </p>
        </div>
      </div>
    );
  }

  const tabCount: Partial<Record<TabKey, number>> = {
    locations: shop.locations.length,
    staff: shop.staff.length,
  };

  return (
    <div>
      <Link to="/shops" className="font-sans text-xs font-semibold text-bo-gold">
        ← Shops / Accounts
      </Link>

      <div className="mt-3 mb-5 flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-sans text-2xl font-semibold text-bo-ink">{shop.name}</h1>
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusPill tone={SHOP_STATUS_TONE[shop.status]}>
              {SHOP_STATUS_LABEL[shop.status]}
            </StatusPill>
            <span className="font-sans text-[13px] text-bo-muted-4">
              {shop.planName} · {BILLING_INTERVAL_LABEL[shop.billingInterval]} ·{" "}
              {formatCents(shop.mrrCents, shop.currency)}/mo · {shop.seats} seats
            </span>
          </div>
        </div>

        {canManage && (
          <div className="flex shrink-0 gap-2.5">
            <button
              type="button"
              onClick={() => openAction("edit")}
              className={modalCancelButtonClass}
            >
              Edit details
            </button>
            <button
              type="button"
              onClick={() => openAction("status")}
              className={modalSubmitButtonClass}
            >
              Change status
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-1 border-b border-bo-border">
        {TABS.map((entry) => {
          const active = entry.key === tab;
          const count = tabCount[entry.key];
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-3.5 py-2.5 font-sans text-[13px] font-semibold ${
                active
                  ? "border-bo-dark text-bo-ink"
                  : "border-transparent text-bo-muted-5 hover:text-bo-ink-soft"
              }`}
            >
              {entry.label}
              {count !== undefined && (
                <span className="ml-1.5 font-sans text-[11px] font-medium opacity-60">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewTab shop={shop} />}
      {tab === "locations" && <LocationsTab shop={shop} />}
      {tab === "staff" && <StaffTab shop={shop} />}
      {tab === "plan" && (
        <PlanTab shop={shop} canManage={canManage} onChangePlan={() => openAction("plan")} />
      )}
      {tab === "support" && (
        <Card>
          <SupportSessionSection shopId={shop.id} shopName={shop.name} staff={shop.staff} />
        </Card>
      )}

      <ChangeStatusModal shop={statusTarget} onClose={closeAction} onDone={onActionDone} />
      <ChangePlanModal
        shop={planTarget}
        plans={plans}
        onClose={closeAction}
        onDone={onActionDone}
      />
      <EditShopModal shop={editTarget} onClose={closeAction} onDone={onActionDone} />
    </div>
  );
}

export default ShopDetailPage;
