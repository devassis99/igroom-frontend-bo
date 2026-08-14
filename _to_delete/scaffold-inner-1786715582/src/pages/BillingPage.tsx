import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";

/** Matches Backoffice.dc.html's B4 frame. Sample data — see DashboardPage.tsx's note. */
const STATS = [
  { label: "Failed Payments", value: "6", delta: { text: "↑ 2", tone: "danger" as const } },
  { label: "Upcoming Renewals (7d)", value: "44", delta: { text: "↑ 8%", tone: "success" as const } },
  { label: "Seat Upgrades This Month", value: "21", delta: { text: "↑ 15%", tone: "success" as const } },
  { label: "Cancellations This Month", value: "5", delta: { text: "↑ 1", tone: "danger" as const } },
];

const ROWS = [
  {
    shop: "Solo Chair — Ray O.",
    plan: "Solo Chair · $30/mo",
    charge: "Aug 14, 2026",
    status: "Payment Failed",
    tone: "danger" as const,
  },
  {
    shop: "Lahore Fade Studio",
    plan: "Studio · $50/mo",
    charge: "Trial ends Aug 20",
    status: "Trial",
    tone: "neutral" as const,
  },
];

export function BillingPage() {
  return (
    <div>
      <h1 className="m-0 mb-5 font-sans text-2xl font-semibold text-bo-ink">Billing & Plans</h1>

      <div className="mb-4 grid grid-cols-4 gap-3.5">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_0.9fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
          <span>Shop</span>
          <span>Plan</span>
          <span>Next Charge</span>
          <span>Status</span>
        </div>
        {ROWS.map((row, i) => (
          <div
            key={row.shop}
            className={`grid grid-cols-[1.6fr_1fr_1fr_0.9fr] items-center px-5 py-3 ${
              i < ROWS.length - 1 ? "border-b border-bo-border-soft" : ""
            }`}
          >
            <span className="font-sans text-[13px] font-semibold text-bo-ink">{row.shop}</span>
            <span className="font-sans text-xs font-medium text-bo-muted-2">{row.plan}</span>
            <span className="font-sans text-xs font-medium text-bo-muted-2">{row.charge}</span>
            <StatusPill tone={row.tone}>{row.status}</StatusPill>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BillingPage;
