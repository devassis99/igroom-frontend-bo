import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { MiniLineChart } from "@/components/ui/MiniLineChart";
import { shopsApi, formatCents, SHOP_STATUS_LABEL, SHOP_STATUS_TONE } from "@/lib/shops-api";

/**
 * Matches Backoffice.dc.html's B1 (Overview) frame layout exactly — stat
 * row, two chart cards, top-shops table.
 *
 * The bottom half is real: "Top shops by revenue" and the shop-derived
 * stat tiles come from GET /shops (sorted by MRR) and GET /shops/summary.
 * The rest — revenue trend, bookings, churn, walk-ins, support tickets —
 * is still the mockup's own illustrative figures, because igroom-backend
 * has no metrics/reporting endpoint behind them yet. Each one is labelled
 * so nobody mistakes a placeholder for a measurement.
 */
const SAMPLE_STATS = [
  { label: "Total Revenue", value: "$68,240", delta: { text: "↑ 18%", tone: "success" as const } },
  { label: "Churn", value: "1.4%", delta: { text: "↑ 0.2%", tone: "danger" as const } },
  {
    label: "Bookings This Week",
    value: "4,812",
    delta: { text: "↑ 6%", tone: "success" as const },
  },
  { label: "Walk-ins via QR", value: "1,203", delta: { text: "↑ 31%", tone: "success" as const } },
  { label: "Support Tickets Open", value: "9", delta: { text: "↑ 3", tone: "danger" as const } },
];

export function DashboardPage() {
  const summaryQuery = useQuery({ queryKey: ["shops", "summary"], queryFn: shopsApi.summary });
  const topShopsQuery = useQuery({
    queryKey: ["shops", "list", { sort: "mrr", direction: "desc", pageSize: 5 }],
    queryFn: () => shopsApi.list({ sort: "mrr", direction: "desc", pageSize: 5 }),
  });

  const summary = summaryQuery.data?.summary;
  const topShops = topShopsQuery.data?.shops ?? [];

  const avgSeats =
    summary && summary.totalShops > 0 ? (summary.totalSeats / summary.totalShops).toFixed(1) : "—";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="m-0 font-sans text-2xl font-semibold text-bo-ink">Overview</h1>
        <span className="inline-flex items-center gap-2 rounded-[10px] border border-bo-input-border bg-bo-surface px-3.5 py-2 font-sans text-[13px] font-medium text-bo-muted-1">
          Aug 07 2026 → Aug 13 2026
        </span>
      </div>

      {/* Live, from /shops/summary. */}
      <div className="mb-3.5 grid grid-cols-5 gap-3.5">
        <StatCard label="MRR" value={summary ? formatCents(summary.activeMrrCents) : "—"} />
        <StatCard label="Active Shops" value={summary ? String(summary.byStatus.active) : "—"} />
        <StatCard label="Trials" value={summary ? String(summary.byStatus.trial) : "—"} />
        <StatCard
          label="Past Due"
          value={summary ? String(summary.byStatus.past_due) : "—"}
          delta={
            summary && summary.pastDueMrrCents > 0
              ? { text: `${formatCents(summary.pastDueMrrCents)} at risk`, tone: "danger" }
              : undefined
          }
        />
        <StatCard label="New This Month" value={summary ? String(summary.newThisMonth) : "—"} />
      </div>

      <p className="mb-2 font-sans text-xs text-bo-muted-4">
        Everything below is sample data from the design reference — connect a metrics endpoint to
        replace it. Average seats per shop ({avgSeats}) is live.
      </p>

      <div className="mb-6 grid grid-cols-5 gap-3.5">
        {SAMPLE_STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-[14px] border border-bo-border bg-bo-surface p-5">
          <p className="m-0 mb-1 font-sans text-[15px] font-semibold text-bo-ink">
            Revenue breakdown
          </p>
          <div className="my-3 mb-4 flex gap-7">
            <div>
              <span className="font-sans text-[11px] text-bo-muted-4">Total Revenue</span>
              <p className="m-0 mt-0.5 font-sans text-lg font-bold text-bo-ink">$68,240</p>
            </div>
            <div>
              <span className="font-sans text-[11px] text-bo-muted-4">New Subscriptions</span>
              <p className="m-0 mt-0.5 font-sans text-lg font-bold text-bo-ink">$4,120</p>
            </div>
            <div>
              <span className="font-sans text-[11px] text-bo-muted-4">Recurring</span>
              <p className="m-0 mt-0.5 font-sans text-lg font-bold text-bo-ink">$64,120</p>
            </div>
          </div>
          <MiniLineChart
            series={[
              {
                points: "0,110 50,100 100,60 150,95 200,105 250,70 300,90 350,40 400,15",
                stroke: "var(--color-bo-gold)",
                fill: "var(--color-bo-gold-bg)",
              },
            ]}
          />
        </div>

        <div className="rounded-[14px] border border-bo-border bg-bo-surface p-5">
          <p className="m-0 mb-1 font-sans text-[15px] font-semibold text-bo-ink">
            Bookings vs walk-ins
          </p>
          <div className="my-3 mb-4 flex gap-7">
            <div>
              <span className="font-sans text-[11px] text-bo-muted-4">Booked</span>
              <p className="m-0 mt-0.5 font-sans text-lg font-bold text-bo-ink">3,609</p>
            </div>
            <div>
              <span className="font-sans text-[11px] text-bo-muted-4">Walk-in QR</span>
              <p className="m-0 mt-0.5 font-sans text-lg font-bold text-bo-ink">1,203</p>
            </div>
          </div>
          <MiniLineChart
            series={[
              {
                points: "0,90 50,70 100,80 150,50 200,60 250,30 300,45 350,20 400,10",
                stroke: "var(--color-bo-dark)",
              },
              {
                points: "0,120 50,115 100,118 150,105 200,110 250,95 300,100 350,85 400,80",
                stroke: "var(--color-bo-muted-6)",
                strokeWidth: 2,
              },
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        <div className="flex items-center justify-between border-b border-bo-sidebar-border px-5 py-4">
          <p className="m-0 font-sans text-[15px] font-semibold text-bo-ink">
            Top shops by revenue
          </p>
        </div>
        <div className="grid grid-cols-[1.6fr_1fr_0.9fr_0.9fr_0.9fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
          <span>Shop</span>
          <span>Plan</span>
          <span>Seats</span>
          <span>MRR</span>
          <span>Status</span>
        </div>
        {topShopsQuery.isLoading ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">Loading shops…</p>
        ) : topShopsQuery.isError ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-danger">
            Couldn't load shops:{" "}
            {topShopsQuery.error instanceof Error ? topShopsQuery.error.message : "unknown error"}
          </p>
        ) : topShops.length === 0 ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">
            No shops have signed up yet.
          </p>
        ) : (
          topShops.map((shop, i) => (
            <div
              key={shop.id}
              className={`grid grid-cols-[1.6fr_1fr_0.9fr_0.9fr_0.9fr] items-center px-5 py-3 ${
                i < topShops.length - 1 ? "border-b border-bo-border-soft" : ""
              }`}
            >
              <span className="font-sans text-[13px] font-semibold text-bo-ink">{shop.name}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{shop.planName}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{shop.seats}</span>
              <span className="font-sans text-[13px] font-semibold text-bo-ink-soft">
                {formatCents(shop.mrrCents, shop.currency)}
              </span>
              <StatusPill tone={SHOP_STATUS_TONE[shop.status]}>
                {SHOP_STATUS_LABEL[shop.status]}
              </StatusPill>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
