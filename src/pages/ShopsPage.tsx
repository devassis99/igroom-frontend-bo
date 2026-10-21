import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { Select, type SelectOption } from "@/components/ui/Select";
import { PAGE_SIZE_OPTIONS, PageRange, Pagination } from "@/components/ui/Pagination";
import { AutoHeight } from "@/components/ui/AutoHeight";
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

const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * How the rows come in when they change — the same three motions as the
 * Plans table (index.css): a fade-and-rise for a search, filter, sort or
 * page size, a slide from the right for a later page and from the left
 * for an earlier one.
 */
type RowsMotion = "fade" | "forward" | "back";
const ROWS_MOTION_CLASS: Record<RowsMotion, string> = {
  fade: "bo-content-in",
  forward: "bo-page-in-forward",
  back: "bo-page-in-back",
};

const FILTERABLE_STATUSES: ShopStatus[] = ["trial", "active", "past_due", "suspended", "cancelled"];

// Same height either way (the active chip's border is just dark), so
// toggling one never nudges the row.
const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1.5 font-sans text-[12px] font-semibold transition-colors duration-150 ${
    active
      ? "border-transparent bg-bo-dark-gradient text-bo-on-dark"
      : "border-bo-input-border bg-bo-surface text-bo-muted-2 hover:bg-bo-page"
  }`;

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

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
      className={`flex items-center gap-1 font-sans text-[12px] font-semibold ${
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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // Which way the rows should come in once the request just made lands.
  const [nextMotion, setNextMotion] = useState<RowsMotion>("fade");
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
      setNextMotion("fade");
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
      pageSize,
    }),
    [query, statuses, productId, sort, direction, page, pageSize],
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
  const total = listQuery.data?.total ?? 0;
  const data = listQuery.data;

  const planOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "", label: "All plans" },
      ...plans.map((plan) => ({ value: plan.productId, label: plan.name })),
    ],
    [plans],
  );

  // A page can empty under you — change the last shop on the last page to a
  // status the filter leaves out, say. Step back to the last page that
  // still has rows, once this page's own data is in.
  if (data && data.page === page && data.shops.length === 0 && page > data.totalPages) {
    setNextMotion("back");
    setPage(data.totalPages);
  }

  /**
   * Which search, filters, sort and page the rows on screen belong to, and
   * how they came in. Moves on only when the new result has landed — not
   * when it's asked for — so the animation plays on the new rows, not over
   * the old ones still showing (dimmed). A refetch of the same view (after
   * a status change) keeps the key, so nothing replays.
   */
  const viewKey = JSON.stringify(params);
  const [shown, setShown] = useState<{ key: string; motion: RowsMotion }>({
    key: "",
    motion: "fade",
  });
  if (data && !listQuery.isPlaceholderData && shown.key !== viewKey) {
    setShown({ key: viewKey, motion: nextMotion });
  }

  // Every change other than paging starts again from page 1 — page 4 of a
  // narrower or re-sorted list is usually somewhere else entirely.
  function restart() {
    setNextMotion("fade");
    setPage(1);
  }

  function goToPage(next: number) {
    if (next === page) return;
    setNextMotion(next > page ? "forward" : "back");
    setPage(next);
  }

  function changePageSize(next: number) {
    setPageSize(next);
    restart();
  }

  function toggleStatus(status: ShopStatus) {
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
    restart();
  }

  function selectProduct(nextProductId: string) {
    setProductId(nextProductId);
    restart();
  }

  function clearFilters() {
    setStatuses([]);
    setProductId("");
    setSearchInput("");
    restart();
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
    restart();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="m-0 font-sans text-2xl font-semibold text-bo-ink">Shops / Accounts</h1>
        {/* Same field look as the dropdowns: gold border and hairline ring
            on focus (no 1px jump), a search glyph, and our own clear button
            in place of the browser's blue one. */}
        <div className="relative w-64">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-bo-muted-5">
            <SearchIcon />
          </span>
          <input
            type="search"
            placeholder="Search shops"
            aria-label="Search shops"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && searchInput) setSearchInput("");
            }}
            className="w-full rounded-[10px] border border-bo-input-border bg-bo-field py-2.5 pr-9 pl-9 font-sans text-[14px] text-bo-ink outline-none transition-colors duration-150 placeholder:text-bo-faint focus:border-bo-gold focus:ring-1 focus:ring-bo-gold [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md font-sans text-[16px] leading-none text-bo-muted-5 hover:bg-bo-page hover:text-bo-ink"
            >
              ×
            </button>
          )}
        </div>
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
        <Select
          label="Filter by plan"
          size="sm"
          value={productId}
          options={planOptions}
          onChange={selectProduct}
        />
        {(statuses.length > 0 || productId || query) && (
          <button
            type="button"
            onClick={clearFilters}
            className="font-sans text-xs font-semibold text-bo-gold"
          >
            Clear filters
          </button>
        )}
        <PageRange
          page={page}
          pageSize={pageSize}
          totalCount={total}
          noun={total === 1 ? "shop" : "shops"}
          className="ml-auto"
        />
      </div>

      <div
        aria-busy={listQuery.isPlaceholderData}
        className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface"
      >
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

        {/* The header stays put; only the rows below it change, ease to
            their new height, and dim while the next result loads. */}
        <AutoHeight className={listQuery.isPlaceholderData ? "opacity-60" : ""}>
          {listQuery.isLoading ? (
            <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">Loading shops…</p>
          ) : listQuery.isError && !data ? (
            <p className="px-5 py-6 font-sans text-sm text-bo-danger">
              Couldn't load shops: {errorMessage(listQuery.error, "unknown error")}
            </p>
          ) : (
            <div key={shown.key} className={ROWS_MOTION_CLASS[shown.motion]}>
              {shops.length === 0 ? (
                <p className="m-0 px-5 py-6 font-sans text-sm text-bo-muted-3">
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
                      <span className="font-sans text-[14px] font-semibold text-bo-ink hover:underline">
                        {shop.name}
                      </span>
                      <span className="font-sans text-[12px] text-bo-muted-5">
                        {shop.category ?? shop.email}
                        {shop.locationCount > 1 && ` · ${shop.locationCount} locations`}
                      </span>
                    </Link>
                    <span className="flex flex-col">
                      <span className="font-sans text-xs font-medium text-bo-muted-2">
                        {shop.planName}
                      </span>
                      <span className="font-sans text-[12px] text-bo-muted-5">
                        {BILLING_INTERVAL_LABEL[shop.billingInterval]}
                      </span>
                    </span>
                    <span className="font-sans text-xs font-medium text-bo-muted-2">
                      {shop.seats}
                    </span>
                    <span className="font-sans text-[14px] font-semibold text-bo-ink-soft">
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
          )}
        </AutoHeight>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        totalCount={total}
        onPageChange={goToPage}
        onPageSizeChange={changePageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
      />

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
