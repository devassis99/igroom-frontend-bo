import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloseLeadModal } from "@/components/sales/CloseLeadModal";
import { ImportCsvModal } from "@/components/sales/ImportCsvModal";
import { LogActivityModal } from "@/components/sales/ActivityComposer";
import { NewLeadModal } from "@/components/sales/NewLeadModal";
import {
  DueText,
  ErrorNote,
  Loading,
  RepAvatar,
  STATUS_CLASSES,
  Segmented,
  StatusBadge,
  primaryButtonClass,
  secondaryButtonClass,
  selectClass,
  useSalesMe,
} from "@/components/sales/SalesUi";
import {
  SOURCE_LABEL,
  STATUS_LABEL,
  chairsLabel,
  lastActivityLabel,
  salesApi,
  type BoardColumn,
  type Lead,
  type LeadListParams,
  type LeadSource,
  type LeadStatus,
} from "@/lib/sales-api";
import { ApiError } from "@/lib/http";

const PAGE_SIZE = 25;
const TABLE_GRID =
  "grid-cols-[minmax(0,1.8fr)_minmax(0,0.9fr)_minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(0,0.9fr)_minmax(0,0.45fr)_minmax(0,0.8fr)_minmax(0,0.95fr)_minmax(0,1.25fr)]";

type View = "board" | "table";

function Filters({
  params,
  set,
  view,
  isManager,
  onExport,
  exporting,
}: {
  params: URLSearchParams;
  set: (key: string, value: string | null) => void;
  view: View;
  isManager: boolean;
  onExport: () => void;
  exporting: boolean;
}) {
  const me = useSalesMe();
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) set("q", q || null);
    }, 300);
    return () => clearTimeout(t);
  }, [q, params, set]);

  const cities = me.data?.cities ?? [];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={params.get("city") ?? ""}
        onChange={(e) => set("city", e.target.value || null)}
        className={selectClass}
        aria-label="City"
      >
        <option value="">City: All</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            City: {c.name}
          </option>
        ))}
      </select>
      <select
        value={params.get("rep") ?? (isManager ? "" : "me")}
        onChange={(e) => set("rep", e.target.value || null)}
        className={selectClass}
        aria-label="Rep"
      >
        {isManager && <option value="">Rep: All</option>}
        {me.data?.me.rep && <option value="me">Rep: Me</option>}
        {!isManager && me.data?.me.rep?.type === "employee" && (
          <option value="">Rep: Everyone</option>
        )}
        <option value="pool">Rep: Unassigned pool</option>
        {isManager &&
          (me.data?.reps ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              Rep: {r.name}
            </option>
          ))}
      </select>
      {view === "board" ? (
        <select
          value={params.get("source") ?? ""}
          onChange={(e) => set("source", e.target.value || null)}
          className={selectClass}
          aria-label="Source"
        >
          <option value="">Source: All</option>
          {(Object.keys(SOURCE_LABEL) as LeadSource[]).map((s) => (
            <option key={s} value={s}>
              Source: {SOURCE_LABEL[s]}
            </option>
          ))}
        </select>
      ) : (
        <>
          <select
            value={params.get("status") ?? "open"}
            onChange={(e) => set("status", e.target.value === "open" ? null : e.target.value)}
            className={selectClass}
            aria-label="Status"
          >
            <option value="open">Status: Open</option>
            <option value="closed">Status: Closed</option>
            <option value="all">Status: Open + closed</option>
            {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>
                Status: {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            value={params.get("sort") ?? "next_follow_up"}
            onChange={(e) =>
              set("sort", e.target.value === "next_follow_up" ? null : e.target.value)
            }
            className={selectClass}
            aria-label="Sort"
          >
            <option value="next_follow_up">Sort: Next follow-up</option>
            <option value="last_activity">Sort: Last activity</option>
            <option value="created">Sort: Newest</option>
            <option value="shop">Sort: Shop name</option>
            <option value="status">Sort: Stage</option>
          </select>
        </>
      )}
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search shop, owner or phone"
        className="w-full rounded-lg border border-bo-input-border bg-bo-surface px-3 py-[7px] font-sans text-xs text-bo-ink outline-none focus:border-bo-gold sm:w-[220px]"
        aria-label="Search leads"
      />
      <div className="hidden flex-1 sm:block" />
      {view === "table" && (
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="font-sans text-xs font-semibold text-bo-gold hover:underline disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      )}
    </div>
  );
}

function BoardCard({
  lead,
  draggable,
  onDragStart,
}: {
  lead: Lead;
  draggable: boolean;
  onDragStart: () => void;
}) {
  return (
    <Link
      to={`/sales/leads/${lead.id}`}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      className={`flex flex-col gap-2 rounded-[10px] border border-[oklch(90%_0.012_62)] bg-bo-surface p-3 hover:border-bo-muted-6 ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div>
        <p className="m-0 mb-0.5 font-sans text-[14px] font-semibold text-bo-ink">
          {lead.shopName}
        </p>
        <p className="m-0 font-sans text-[12px] text-bo-muted-4">
          {[lead.area, chairsLabel(lead.chairs)].filter(Boolean).join(" · ")}
        </p>
      </div>
      {(lead.currentTool || lead.isAuto || lead.needsPhone) && (
        <div className="flex flex-wrap gap-1">
          {lead.currentTool && (
            <span className="rounded-md bg-[oklch(94%_0.012_70)] px-[7px] py-[2px] font-sans text-[11px] font-medium text-bo-muted-2">
              {lead.currentTool}
            </span>
          )}
          {lead.isAuto && (
            <span className="rounded-md bg-bo-gold-tint px-[7px] py-[2px] font-sans text-[11px] font-semibold text-bo-gold">
              Auto · {lead.sourceLabel}
            </span>
          )}
          {lead.needsPhone && (
            <span className="rounded-md bg-bo-danger-bg px-[7px] py-[2px] font-sans text-[11px] font-semibold text-bo-red">
              No phone
            </span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between">
        <DueText at={lead.nextFollowUpAt} className="text-[12px]" long />
        <RepAvatar rep={lead.rep} />
      </div>
    </Link>
  );
}

function Board({
  params,
  onMoreClick,
}: {
  params: LeadListParams;
  onMoreClick: (status: LeadStatus) => void;
}) {
  const queryClient = useQueryClient();
  const me = useSalesMe();
  const board = useQuery({
    queryKey: ["sales", "board", params],
    queryFn: () => salesApi.board(params),
    placeholderData: keepPreviousData,
  });
  const [dragging, setDragging] = useState<Lead | null>(null);
  const [over, setOver] = useState<LeadStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const move = useMutation({
    mutationFn: ({ lead, status }: { lead: Lead; status: LeadStatus }) =>
      salesApi.changeStatus(lead.id, status),
    onMutate: async ({ lead, status }) => {
      // Optimistic: move the card now, put it back if the server says no.
      const key = ["sales", "board", params];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ columns: BoardColumn[] }>(key);
      if (previous) {
        queryClient.setQueryData(key, {
          ...previous,
          columns: previous.columns.map((c) =>
            c.status === lead.status
              ? { ...c, count: c.count - 1, cards: c.cards.filter((x) => x.id !== lead.id) }
              : c.status === status
                ? {
                    ...c,
                    count: c.count + 1,
                    cards: [{ ...lead, status, statusLabel: STATUS_LABEL[status] }, ...c.cards],
                  }
                : c,
          ),
        });
      }
      return { previous, key };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
      setNotice(error instanceof ApiError ? error.message : "Couldn't move that lead.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["sales"] }),
  });

  const canDrag = (lead: Lead) =>
    (me.data?.me.canManage || (me.data?.me.rep && lead.rep?.repId === me.data.me.rep.id)) &&
    ["new", "contacted", "demo_booked", "demo_done"].includes(lead.status);

  if (board.isLoading) return <Loading />;
  if (board.error) return <ErrorNote error={board.error} fallback="Couldn't load the board." />;
  const columns = board.data?.columns ?? [];

  return (
    <>
      {notice && (
        <div
          aria-live="polite"
          className="flex items-center justify-between rounded-[10px] bg-bo-danger-bg px-3 py-2 font-sans text-xs font-medium text-bo-red"
        >
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="font-semibold">
            Dismiss
          </button>
        </div>
      )}
      <div className="-mx-5 flex min-h-0 flex-1 snap-x gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0">
        {columns.map((col) => {
          const droppable = col.acceptsDrop && dragging !== null && dragging.status !== col.status;
          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                if (!droppable) return;
                e.preventDefault();
                setOver(col.status);
              }}
              onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (dragging && droppable) move.mutate({ lead: dragging, status: col.status });
                setDragging(null);
              }}
              className={`flex w-[78vw] max-w-[300px] shrink-0 snap-start flex-col gap-2 rounded-[14px] p-2.5 md:w-auto md:max-w-none ${
                over === col.status
                  ? "bg-bo-gold-bg outline-2 outline-dashed outline-bo-gold-soft"
                  : "bg-bo-column"
              } ${dragging && !col.acceptsDrop ? "opacity-60" : ""}`}
              aria-label={`${col.label}, ${col.count} leads`}
            >
              <div className="flex items-center gap-2 px-1 pt-1 pb-1.5">
                <span className={`h-2 w-2 rounded-full ${STATUS_CLASSES[col.status].dot}`} />
                <span className="flex-1 font-sans text-xs font-semibold text-bo-ink-soft">
                  {col.label}
                </span>
                <span className="font-sans text-[12px] font-semibold text-bo-muted-4">
                  {col.count}
                </span>
              </div>
              <div className="flex max-h-[calc(100dvh-300px)] flex-col gap-2 overflow-y-auto md:max-h-[calc(100dvh-290px)]">
                {col.cards.map((lead) => (
                  <BoardCard
                    key={lead.id}
                    lead={lead}
                    draggable={!!canDrag(lead)}
                    onDragStart={() => setDragging(lead)}
                  />
                ))}
                {col.cards.length === 0 && (
                  <p className="m-0 px-1 py-2 font-sans text-[12px] text-bo-muted-5">
                    Nothing here
                  </p>
                )}
              </div>
              {col.count > col.cards.length && (
                <button
                  type="button"
                  onClick={() => onMoreClick(col.status)}
                  className="mx-1 mt-0.5 text-left font-sans text-xs font-medium text-bo-muted-3 hover:underline"
                >
                  + {col.count - col.cards.length} more
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4.5 gap-y-1.5">
        <span className="flex items-center gap-1.5 font-sans text-[12px] text-bo-muted-3">
          <RepAvatar type="employee" size={14} /> Employee
        </span>
        <span className="flex items-center gap-1.5 font-sans text-[12px] text-bo-muted-3">
          <RepAvatar type="agent" size={14} /> Commission agent
        </span>
        <span className="flex items-center gap-1.5 font-sans text-[12px] text-bo-muted-3">
          <RepAvatar size={14} /> Unassigned pool
        </span>
        <span className="font-sans text-[12px] text-bo-muted-3">
          Drag a card to change status. Onboarding and Live update on their own from the shop's
          account.
        </span>
      </div>
    </>
  );
}

function Table({
  params,
  page,
  setPage,
  cityName,
}: {
  params: LeadListParams;
  page: number;
  setPage: (n: number) => void;
  cityName: string | null;
}) {
  const list = useQuery({
    queryKey: ["sales", "leads", params, page],
    queryFn: () => salesApi.listLeads({ ...params, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  if (list.isLoading) return <Loading />;
  if (list.error) return <ErrorNote error={list.error} fallback="Couldn't load the leads." />;
  const data = list.data!;
  const pages = Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE));

  return (
    <>
      {/* Desktop table — B9c */}
      <div className="hidden overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface md:block">
        <div
          className={`grid ${TABLE_GRID} gap-2.5 bg-bo-table-head px-5 py-2.5 font-sans text-[12px] font-semibold text-bo-muted-4`}
        >
          <span>Shop</span>
          <span>Area</span>
          <span>Status</span>
          <span>Source</span>
          <span>Current tool</span>
          <span>Chairs</span>
          <span>Rep</span>
          <span>Next follow-up</span>
          <span>Last activity</span>
        </div>
        {data.leads.map((l) => (
          <Link
            key={l.id}
            to={`/sales/leads/${l.id}`}
            className={`grid ${TABLE_GRID} items-center gap-2.5 border-b border-bo-border-soft px-5 py-[11px] last:border-b-0 hover:bg-bo-well`}
          >
            <span className="truncate font-sans text-[14px] font-semibold text-bo-ink">
              {l.shopName}
            </span>
            <span className="truncate font-sans text-xs text-bo-muted-2">{l.area ?? "—"}</span>
            <StatusBadge status={l.status} label={l.statusLabel} />
            <span className="flex min-w-0 items-center gap-1.5 font-sans text-xs text-bo-muted-2">
              <span className="truncate">{l.sourceLabel}</span>
              {l.isAuto && (
                <span className="shrink-0 rounded bg-bo-gold-tint px-[5px] py-px font-sans text-[11px] font-semibold tracking-[0.04em] text-bo-gold">
                  AUTO
                </span>
              )}
            </span>
            <span className="truncate font-sans text-xs text-bo-muted-2">
              {l.currentTool ?? "—"}
            </span>
            <span className="font-sans text-xs font-medium text-bo-muted-2">{l.chairs ?? "—"}</span>
            <span className="flex min-w-0 items-center gap-1.5 font-sans text-xs font-medium text-bo-ink-soft">
              <RepAvatar rep={l.rep} size={20} />
              <span className="truncate">{l.rep?.shortName ?? "Pool"}</span>
            </span>
            <DueText at={l.nextFollowUpAt} long />
            <span className="truncate font-sans text-xs text-bo-muted-4">
              {lastActivityLabel(l)}
            </span>
          </Link>
        ))}
        {data.leads.length === 0 && (
          <p className="m-0 px-5 py-6 font-sans text-sm text-bo-muted-4">
            No leads match these filters.
          </p>
        )}
      </div>

      {/* Phone list */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {data.leads.map((l) => (
          <Link
            key={l.id}
            to={`/sales/leads/${l.id}`}
            className="flex flex-col gap-1.5 rounded-2xl border border-bo-border bg-bo-surface p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={l.status} label={l.statusLabel} />
              <DueText at={l.nextFollowUpAt} long />
            </div>
            <p className="m-0 font-sans text-[16px] font-semibold text-bo-ink">{l.shopName}</p>
            <p className="m-0 font-sans text-xs text-bo-muted-3">
              {[l.area, chairsLabel(l.chairs), l.currentTool, l.rep?.shortName ?? "Pool"]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </Link>
        ))}
        {data.leads.length === 0 && (
          <p className="m-0 py-4 font-sans text-sm text-bo-muted-4">
            No leads match these filters.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 font-sans text-xs text-bo-muted-4">
          Showing {data.leads.length} of {data.totalCount} lead{data.totalCount === 1 ? "" : "s"}
          {cityName ? ` in ${cityName}` : ""}
        </p>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className="font-sans text-xs text-bo-muted-3">
              {page} / {pages}
            </span>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * B9b/B9c — the pipeline, as a board or a table, and a rep's "My Leads"
 * (the same page, filtered to them). Every filter lives in the URL, so a
 * filtered view can be bookmarked or pasted to a colleague.
 */
export function SalesPipelinePage() {
  const me = useSalesMe();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isManager = me.data?.me.canManage ?? false;
  const view: View = (searchParams.get("view") as View) ?? (isManager ? "board" : "table");
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [logFor, setLogFor] = useState<Lead | null>(null);
  const [closeFor, setCloseFor] = useState<Lead | null>(null);
  const [exporting, setExporting] = useState(false);

  const set = useMemo(
    () => (key: string, value: string | null) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === null) next.delete(key);
          else next.set(key, value);
          if (key !== "page") next.delete("page");
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const repParam =
    searchParams.get("rep") ?? (isManager ? undefined : me.data?.me.rep ? "me" : undefined);
  const params: LeadListParams = {
    cityId: searchParams.get("city") ?? undefined,
    rep: repParam || undefined,
    source: (searchParams.get("source") as LeadSource) ?? undefined,
    status: (searchParams.get("status") as LeadListParams["status"]) ?? undefined,
    q: searchParams.get("q") ?? undefined,
    sort: (searchParams.get("sort") as LeadListParams["sort"]) ?? undefined,
  };
  const boardParams = { ...params, status: undefined, sort: undefined };
  const closedCounts = useQuery({
    queryKey: ["sales", "leads", "closed-counts", boardParams],
    queryFn: () => salesApi.listLeads({ ...boardParams, status: "closed", pageSize: 1 }),
    enabled: view === "board",
  });
  const cityName = me.data?.cities.find((c) => c.id === params.cityId)?.name ?? null;

  async function exportCsv() {
    setExporting(true);
    try {
      const blob = await salesApi.exportCsv(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const title = isManager ? "Pipeline" : "My Leads";
  const closed = closedCounts.data?.closed;

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-sans text-2xl font-semibold text-bo-ink">{title}</h1>
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmented
            value={view}
            onChange={(v) => set("view", v)}
            options={[
              { value: "board", label: "Board" },
              { value: "table", label: "Table" },
            ]}
          />
          {isManager && (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => setImportOpen(true)}
            >
              Import CSV
            </button>
          )}
          <button
            type="button"
            className={`${primaryButtonClass} hidden sm:inline-block`}
            onClick={() => setNewOpen(true)}
          >
            + New lead
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex-1">
          <Filters
            params={searchParams}
            set={set}
            view={view}
            isManager={isManager}
            onExport={exportCsv}
            exporting={exporting}
          />
        </div>
        {view === "board" && closed && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="font-sans text-xs font-semibold text-bo-gold hover:underline"
              onClick={() =>
                setSearchParams((p) => {
                  const n = new URLSearchParams(p);
                  n.set("view", "table");
                  n.set("status", "lost");
                  return n;
                })
              }
            >
              Lost {closed.lost}
            </button>
            <span className="text-bo-faint">·</span>
            <button
              type="button"
              className="font-sans text-xs font-semibold text-bo-gold hover:underline"
              onClick={() =>
                setSearchParams((p) => {
                  const n = new URLSearchParams(p);
                  n.set("view", "table");
                  n.set("status", "not_now");
                  return n;
                })
              }
            >
              Not now {closed.notNow}
            </button>
          </div>
        )}
      </div>

      {view === "board" ? (
        <Board
          params={boardParams}
          onMoreClick={(status) =>
            setSearchParams((p) => {
              const n = new URLSearchParams(p);
              n.set("view", "table");
              n.set("status", status);
              return n;
            })
          }
        />
      ) : (
        <Table
          params={params}
          page={page}
          setPage={(n) => set("page", String(n))}
          cityName={cityName}
        />
      )}

      <button
        type="button"
        onClick={() => setNewOpen(true)}
        className="fixed right-5 bottom-[88px] z-30 flex h-14 items-center rounded-full bg-bo-dark px-5.5 font-sans text-[16px] font-semibold text-bo-on-dark shadow-[0_10px_24px_-8px_rgba(20,15,5,0.5)] sm:hidden"
      >
        + Lead
      </button>

      <NewLeadModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(detail, logVisit) => {
          setNewOpen(false);
          if (logVisit) setLogFor(detail.lead);
          else navigate(`/sales/leads/${detail.lead.id}`);
        }}
      />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
      <LogActivityModal
        lead={logFor}
        onClose={() => setLogFor(null)}
        onWantsClose={() => {
          setCloseFor(logFor);
          setLogFor(null);
        }}
        // Only opened from "Save & log visit" on this page.
        justSaved
      />
      <CloseLeadModal lead={closeFor} onClose={() => setCloseFor(null)} />
    </div>
  );
}

export default SalesPipelinePage;
