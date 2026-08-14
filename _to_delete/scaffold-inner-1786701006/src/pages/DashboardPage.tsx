import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * Matches Backoffice.dc.html's B1 (Overview) frame layout exactly — stat
 * row, revenue chart, top-shops table. The NUMBERS are the mockup's own
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

const SAMPLE_SHOPS = [
  { name: "The Gentry Barbershop", plan: "Business", seats: 4, mrr: "$48", status: "Active" as const },
  { name: "Karachi Kutz", plan: "Empire", seats: 12, mrr: "$250", status: "Active" as const },
  { name: "Lahore Fade Studio", plan: "Studio", seats: 2, mrr: "$50", status: "Trial" as const },
  { name: "Solo Chair — Ray O.", plan: "Solo Chair", seats: 1, mrr: "$30", status: "Past Due" as const },
];

const STATUS_TONE = { Active: "success", Trial: "neutral", "Past Due": "danger" } as const;

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
            <StatusPill tone={STATUS_TONE[shop.status]}>{shop.status}</StatusPill>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
