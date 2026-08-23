import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuthStore } from "@/auth/auth-store";
import { ChangeStatusModal, errorMessage } from "@/components/shops/ShopActionModals";
import {
  shopsApi,
  formatCents,
  BILLING_INTERVAL_LABEL,
  SHOP_STATUS_LABEL,
  SHOP_STATUS_TONE,
  type ListShopsParams,
  type Shop,
  type ShopSort,
  type ShopStatus,
} from "@/lib/shops-api";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const FILTERABLE_STATUSES: ShopStatus[] = ["trial", "active", "past_due", "suspended", "cancelled"];

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

/**
 * Shops / Accounts — Backoffice.dc.html's B3 frame, wired to
 * igroom-backend's /shops endpoints (src/modules/shops).
 *
 * Search, filtering, sorting and paging are all server-side round trips
 * rather than client-side array work: seats and MRR are computed in SQL
 * (staff counts, and price ÷ cadence), so filtering or sorting one page
 * of 25 in the browser would give the wrong answer for the other pages.
 * `keepPreviousData` is what keeps that from feeling worse than a local
 * filter — the table holds its last result while the next one loads
 * instead of blanking on every keystroke.
 *
 * A shop's full record lives at its own route (ShopDetailPage), not in a
 * dialog over this one. The only action left inline is the status
 * shortcut, which is the one thing frequently done straight off a list.
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
  const [statusTarget, setStatusTarget] = useState<Shop | null>(null);

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
              <Link to={`/shops/${shop.id}`} className="flex flex-col items-start text-left">
                <span className="font-sans text-[13px] font-semibold text-bo-ink hover:underline">
                  {shop.name}
                </span>
                <span className="font-sans text-[11px] text-bo-muted-5">
                  {shop.category ?? shop.email}
                  {shop.locationCount > 1 && ` · ${shop.locationCount} locations`}
                </span>
              </Link>
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
                {/* A shortcut for the single most common admin action.
                    Everything else — plan changes, edits, support sessions
                    — lives on the shop's own page, behind its name. */}
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

      <ChangeStatusModal
        shop={statusTarget}
        onClose={() => setStatusTarget(null)}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ["shops"] });
          setStatusTarget(null);
        }}
      />
    </div>
  );
}

export default ShopsPage;
