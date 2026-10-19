import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  ErrorNote,
  Loading,
  STATUS_CLASSES,
  selectClass,
  useSalesMe,
} from "@/components/sales/SalesUi";
import { formatMoney, salesApi, shortDate, type Kpi, type LeaderboardRow } from "@/lib/sales-api";

type Preset = "month" | "last30" | "lastMonth" | "quarter" | "custom";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
const pad = (n: number) => String(n).padStart(2, "0");

function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** [from, to) in local midnights — "Oct 1 → Oct 14" includes all of the 14th. */
function rangeFor(preset: Preset, custom: { from: string; to: string }): { from: Date; to: Date } {
  const today = startOfDay(new Date());
  switch (preset) {
    case "month":
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: addDays(today, 1) };
    case "last30":
      return { from: addDays(today, -29), to: addDays(today, 1) };
    case "lastMonth":
      return {
        from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        to: new Date(today.getFullYear(), today.getMonth(), 1),
      };
    case "quarter": {
      const q = Math.floor(today.getMonth() / 3) * 3;
      return { from: new Date(today.getFullYear(), q, 1), to: addDays(today, 1) };
    }
    case "custom": {
      const from = custom.from
        ? new Date(`${custom.from}T00:00:00`)
        : new Date(today.getFullYear(), today.getMonth(), 1);
      const to = custom.to ? addDays(new Date(`${custom.to}T00:00:00`), 1) : addDays(today, 1);
      return { from, to: to > from ? to : addDays(from, 1) };
    }
  }
}

function KpiTile({ kpi }: { kpi: Kpi }) {
  const value =
    kpi.value === null ? "—" : kpi.unit === "days" ? kpi.value.toFixed(1) : String(kpi.value);
  const delta =
    kpi.delta === null || kpi.delta === 0
      ? null
      : kpi.unit === "days"
        ? `${kpi.delta > 0 ? "↑" : "↓"} ${Math.abs(kpi.delta).toFixed(1)} days`
        : kpi.deltaPct !== null && Math.abs(kpi.deltaPct) >= 10 && (kpi.previous ?? 0) >= 5
          ? `${kpi.delta > 0 ? "↑" : "↓"} ${Math.abs(kpi.deltaPct)}%`
          : `${kpi.delta > 0 ? "↑" : "↓"} ${Math.abs(kpi.delta)}`;
  return (
    <Card className="p-4.5">
      <span className="font-sans text-xs text-bo-muted-4">{kpi.label}</span>
      <p className="my-2 font-sans text-[24px] font-bold text-bo-ink">{value}</p>
      {delta ? (
        <span
          className={`rounded-full px-[9px] py-[3px] font-sans text-[12px] font-semibold ${kpi.good ? "bg-bo-success-bg text-bo-success" : "bg-bo-danger-bg text-bo-danger"}`}
          title={`Previous period: ${kpi.previous ?? "—"}`}
        >
          {delta}
        </span>
      ) : (
        <span className="rounded-full bg-bo-neutral-bg px-[9px] py-[3px] font-sans text-[12px] font-semibold text-bo-muted-4">
          {kpi.previous === null ? "No earlier data" : "Same as before"}
        </span>
      )}
    </Card>
  );
}

function Bar({ label, n, max, color }: { label: string; n: number; max: number; color: string }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)_34px] items-center gap-2.5 sm:grid-cols-[150px_minmax(0,1fr)_34px]">
      <span className="truncate font-sans text-xs font-medium text-bo-muted-2" title={label}>
        {label}
      </span>
      <div className="h-4 rounded bg-[oklch(94%_0.01_65)]" aria-hidden>
        <div
          className={`h-full rounded ${color}`}
          style={{ width: `${max ? Math.max(n ? 2 : 0, Math.round((n / max) * 100)) : 0}%` }}
        />
      </div>
      <span className="text-right font-sans text-xs font-semibold text-bo-ink-soft">{n}</span>
    </div>
  );
}

const PAYOUT_LABEL = { with_payroll: "With payroll", pending: "Pending", paid: "Paid" } as const;

function PayoutCell({ row, canManage }: { row: LeaderboardRow; canManage: boolean }) {
  const queryClient = useQueryClient();
  const pay = useMutation({
    mutationFn: () => salesApi.markPayout(row.repId, row.payout!.on),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sales"] }),
  });
  if (!row.payout) return <span className="font-sans text-xs text-bo-muted-3">—</span>;
  const p = row.payout;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs text-bo-muted-3">
      <span>
        {PAYOUT_LABEL[p.status]} · {shortDate(`${p.on}T12:00:00`)}
        {p.status !== "paid" && p.amountCents
          ? ` · ${formatMoney(p.amountCents, row.currency)}`
          : ""}
      </span>
      {canManage && p.status !== "paid" && (
        <button
          type="button"
          onClick={() => pay.mutate()}
          disabled={pay.isPending}
          className="font-semibold text-bo-gold hover:underline disabled:opacity-50"
        >
          Mark paid
        </button>
      )}
    </span>
  );
}

const TYPE_PILL = {
  employee: "bg-bo-neutral-bg text-bo-muted-2",
  agent: "bg-bo-gold-tint text-bo-gold",
} as const;

/**
 * B9k — Rep Stats & commission (a rep's own "My Stats" is the same page,
 * filtered to them by the API). Every figure compares against the period
 * of the same length just before it.
 */
export function SalesStatsPage() {
  const me = useSalesMe();
  const canManage = me.data?.me.canManage ?? false;
  const [cityId, setCityId] = useState("");
  const [repId, setRepId] = useState("");
  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const range = useMemo(() => rangeFor(preset, custom), [preset, custom]);

  const stats = useQuery({
    queryKey: ["sales", "stats", cityId, repId, range.from.toISOString(), range.to.toISOString()],
    queryFn: () =>
      salesApi.stats({
        cityId: cityId || undefined,
        repId: repId || undefined,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      }),
    placeholderData: keepPreviousData,
  });
  const data = stats.data;
  const funnelMax = Math.max(...(data?.funnel.map((f) => f.count) ?? [0]), 1);
  const lostMax = Math.max(...(data?.lostReasons.map((f) => f.count) ?? [0]), 1);
  const rangeLabel = `${shortDate(range.from)} → ${shortDate(addDays(range.to, -1))}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-sans text-2xl font-semibold text-bo-ink">
          {canManage ? "Rep Stats" : "My Stats"}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className={selectClass}
            aria-label="City"
          >
            <option value="">All cities</option>
            {(me.data?.cities ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                All {c.name}
              </option>
            ))}
          </select>
          {canManage && (
            <select
              value={repId}
              onChange={(e) => setRepId(e.target.value)}
              className={selectClass}
              aria-label="Rep"
            >
              <option value="">Every rep</option>
              {(me.data?.reps ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as Preset)}
            className={selectClass}
            aria-label="Period"
          >
            <option value="month">This month · {preset === "month" ? rangeLabel : ""}</option>
            <option value="last30">Last 30 days</option>
            <option value="lastMonth">Last month</option>
            <option value="quarter">This quarter</option>
            <option value="custom">Custom…</option>
          </select>
          {preset === "custom" && (
            <>
              <input
                type="date"
                value={custom.from}
                onChange={(e) => setCustom({ ...custom, from: e.target.value })}
                className={selectClass}
                aria-label="From"
                max={isoDate(new Date())}
              />
              <span className="text-bo-muted-4">→</span>
              <input
                type="date"
                value={custom.to}
                onChange={(e) => setCustom({ ...custom, to: e.target.value })}
                className={selectClass}
                aria-label="To"
              />
            </>
          )}
        </div>
      </div>

      <ErrorNote error={stats.error} fallback="Couldn't load the stats." />
      {stats.isLoading && <Loading />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {data.kpis.map((k) => (
              <KpiTile key={k.label} kpi={k} />
            ))}
          </div>
          <p className="-mt-1 m-0 font-sans text-[12px] text-bo-muted-5">
            {rangeLabel}, compared with {shortDate(data.previousPeriod.from)} →{" "}
            {shortDate(addDays(new Date(data.previousPeriod.to), -1))}.
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="px-5 py-4.5">
              <p className="m-0 mb-3.5 font-sans text-[16px] font-semibold text-bo-ink">Funnel</p>
              <div className="flex flex-col gap-2">
                {data.funnel.map((f) => (
                  <Bar
                    key={f.status}
                    label={f.label}
                    n={f.count}
                    max={funnelMax}
                    color={STATUS_CLASSES[f.status].dot}
                  />
                ))}
              </div>
              <p className="m-0 mt-3 font-sans text-[12px] text-bo-muted-5">
                Leads added in the period, by the furthest stage each has reached.
              </p>
            </Card>
            <Card className="px-5 py-4.5">
              <p className="m-0 mb-3.5 font-sans text-[16px] font-semibold text-bo-ink">
                Why leads are lost
              </p>
              {data.lostReasons.length === 0 ? (
                <p className="m-0 font-sans text-xs text-bo-muted-4">
                  No leads lost in this period.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.lostReasons.slice(0, 6).map((r) => (
                    <Bar
                      key={r.reason}
                      label={r.reason}
                      n={r.count}
                      max={lostMax}
                      color="bg-[oklch(70%_0.1_25)]"
                    />
                  ))}
                </div>
              )}
              {data.lostNote && (
                <p className="m-0 mt-3.5 font-sans text-xs text-bo-muted-4">{data.lostNote}</p>
              )}
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="hidden grid-cols-[1.4fr_1fr_0.7fr_0.6fr_0.5fr_0.7fr_0.8fr_1.3fr] gap-2.5 bg-bo-table-head px-5 py-2.5 font-sans text-[12px] font-semibold text-bo-muted-4 md:grid">
              <span>Rep</span>
              <span>Type</span>
              <span>Leads added</span>
              <span>Demos</span>
              <span>Live</span>
              <span>Lead → Live</span>
              <span>Commission</span>
              <span>Payout</span>
            </div>
            {data.leaderboard.map((r) => (
              <div
                key={r.repId}
                className="grid grid-cols-2 items-center gap-2.5 border-b border-bo-border-soft px-5 py-3 md:grid-cols-[1.4fr_1fr_0.7fr_0.6fr_0.5fr_0.7fr_0.8fr_1.3fr]"
              >
                <span className="font-sans text-[14px] font-semibold text-bo-ink">
                  {r.name}
                  {!r.isActive ? (
                    <span className="font-normal text-bo-muted-5"> · deactivated</span>
                  ) : null}
                </span>
                <span
                  className={`w-fit rounded-full px-[9px] py-[3px] font-sans text-[12px] font-semibold whitespace-nowrap ${TYPE_PILL[r.type]}`}
                >
                  {r.type === "agent" ? "Commission agent" : "Employee"}
                </span>
                <span className="font-sans text-[14px] font-medium text-bo-muted-1">
                  <span className="md:hidden">Added </span>
                  {r.leadsAdded}
                </span>
                <span className="font-sans text-[14px] font-medium text-bo-muted-1">
                  <span className="md:hidden">Demos </span>
                  {r.demos}
                </span>
                <span className="font-sans text-[14px] font-semibold text-bo-ink">
                  <span className="font-normal md:hidden">Live </span>
                  {r.live}
                </span>
                <span className="font-sans text-[14px] font-medium text-bo-muted-1">
                  {r.conversionPct === null ? "—" : `${r.conversionPct}%`}
                </span>
                <span className="font-sans text-[14px] font-semibold text-bo-ink">
                  {formatMoney(r.commissionCents, r.currency)}
                </span>
                <PayoutCell row={r} canManage={canManage} />
              </div>
            ))}
            {data.leaderboard.length === 0 && (
              <p className="m-0 px-5 py-4 font-sans text-sm text-bo-muted-4">No reps yet.</p>
            )}
            <div className="bg-bo-footer px-5 py-2.5 font-sans text-xs text-bo-muted-3">
              Commission is earned when a shop takes its first online booking. Employees are paid
              with payroll; agent payouts run on the last day of each month.
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default SalesStatsPage;
