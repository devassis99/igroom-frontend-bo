import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { MiniLineChart } from "@/components/ui/MiniLineChart";
import { SAMPLE_SHOPS, SHOP_STATUS_TONE } from "@/lib/sample-data";

/**
 * Matches Backoffice.dc.html's B1 (Overview) frame layout exactly — stat
 * row, two chart cards, top-shops table. The NUMBERS are the mockup's own
 * illustrative figures, not live data: igroom-backend has no
 * metrics/reporting endpoint yet, so there's nothing real to fetch. Swap
 * SAMPLE_STATS/SAMPLE_SHOPS for a real query (TanStack Query, per
 * src/lib/query-client.ts) once that endpoint exists.
 */
const SAMPLE_STATS = [
  { label: "Total Revenue", value: "$68,240", delta: { text: "↑ 18%", tone: "success" as const } },
  { label: "MRR", value: "$41,860", delta: { text: "↑ 9%", tone: "success" as const } },
  { label: "Active Shops", value: "312", delta: { text: "↑ 5%", tone: "success" as const } },
  { label: "Churn", value: "1.4%", delta: { text: "↑ 0.2%", tone: "danger" as const } },
  { label: "Trial to Paid", value: "28", delta: { text: "↑ 12%", tone: "success" as const } },
];

const SAMPLE_STATS_2 = [
  { label: "New Shop Signups", value: "14", delta: { text: "↑ 22%", tone: "success" as const } },
  { label: "Bookings This Week", value: "4,812", delta: { text: "↑ 6%", tone: "success" as const } },
  { label: "Avg Seats / Shop", value: "3.4", delta: { text: "↑ 2%", tone: "success" as const } },
  { label: "Walk-ins via QR", value: "1,203", delta: { text: "↑ 31%", tone: "success" as const } },
  { label: "Support Tickets Open", value: "9", delta: { text: "↑ 3", tone: "danger" as const } },
];

export function DashboardPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="m-0 font-sans text-2xl font-semibold text-bo-ink">Overview</h1>
        <span className="inline-flex items-center gap-2 rounded-[10px] border border-bo-input-border bg-bo-surface px-3.5 py-2 font-sans text-[13px] font-medium text-bo-muted-1">
          Aug 07 2026 → Aug 13 2026
        </span>
      </div>

      <p className="mb-4 font-sans text-xs text-bo-muted-4">
        Sample data from the design reference — connect a real metrics endpoint to replace it.
      </p>

      <div className="mb-3.5 grid grid-cols-5 gap-3.5">
        {SAMPLE_STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="mb-6 grid grid-cols-5 gap-3.5">
        {SAMPLE_STATS_2.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-[14px] border border-bo-border bg-bo-surface p-5">
          <p className="m-0 mb-1 font-sans text-[15px] font-semibold text-bo-ink">Revenue breakdown</p>
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
          <p className="m-0 mb-1 font-sans text-[15px] font-semibold text-bo-ink">Bookings vs walk-ins</p>
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
          <p className="m-0 font-sans text-[15px] font-semibold text-bo-ink">Top shops by revenue</p>
        </div>
        <div className="grid grid-cols-[1.6fr_1fr_0.9fr_0.9fr_0.9fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
          <span>Shop</span>
          <span>Plan</span>
          <span>Seats</span>
          <span>MRR</span>
          <span>Status</span>
        </div>
        {SAMPLE_SHOPS.map((shop, i) => (
          <div
            key={shop.name}
            className={`grid grid-cols-[1.6fr_1fr_0.9fr_0.9fr_0.9fr] items-center px-5 py-3 ${
              i < SAMPLE_SHOPS.length - 1 ? "border-b border-bo-border-soft" : ""
            }`}
          >
            <span className="font-sans text-[13px] font-semibold text-bo-ink">{shop.name}</span>
            <span className="font-sans text-xs font-medium text-bo-muted-2">{shop.plan}</span>
            <span className="font-sans text-xs font-medium text-bo-muted-2">{shop.seats}</span>
            <span className="font-sans text-[13px] font-semibold text-bo-ink-soft">{shop.mrr}</span>
            <StatusPill tone={SHOP_STATUS_TONE[shop.status]}>{shop.status}</StatusPill>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
