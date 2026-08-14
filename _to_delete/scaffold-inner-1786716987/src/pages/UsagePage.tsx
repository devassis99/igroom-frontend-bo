import { StatCard } from "@/components/ui/StatCard";
import { MiniLineChart } from "@/components/ui/MiniLineChart";
import { DonutChart } from "@/components/ui/DonutChart";

/** Matches Backoffice.dc.html's B2 frame. Sample data — see DashboardPage.tsx's note. */
const STATS = [
  { label: "SMS & WhatsApp Sent", value: "18,900", delta: { text: "↓ 53%", tone: "danger" as const } },
  { label: "Notification Cost", value: "$169.50", delta: { text: "↑ 769%", tone: "success" as const } },
  { label: "QR Waitlist Scans", value: "1,203", delta: { text: "↑ 31%", tone: "success" as const } },
  { label: "Avg Cost / Booking", value: "$0.21", delta: { text: "↑ 100%", tone: "success" as const } },
  { label: "Payment Gateway Fees", value: "$1,842", delta: { text: "↑ 12%", tone: "danger" as const } },
];

const SPENDING_LEGEND = [
  { label: "SMS & WhatsApp", value: "$101.70 (60%)", color: "var(--color-bo-gold)" },
  { label: "Push Notifications", value: "$37.30 (22%)", color: "var(--color-bo-muted-6)" },
  { label: "Email", value: "$30.50 (18%)", color: "var(--color-bo-faint)" },
];

export function UsagePage() {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="m-0 font-sans text-2xl font-semibold text-bo-ink">Usage & Notifications</h1>
        <span className="inline-flex items-center gap-2 rounded-[10px] border border-bo-input-border bg-bo-surface px-3.5 py-2 font-sans text-[13px] font-medium text-bo-muted-1">
          Jul 13 2026 → Aug 13 2026
        </span>
      </div>
      <p className="mb-4 flex items-center gap-2 font-sans text-[13px] text-bo-muted-3">
        <span className="text-bo-warning">⚠</span>
        Costs from SMS/WhatsApp reminders, QR waitlist alerts, and email notifications across all
        shops.
      </p>

      <div className="mb-3.5 grid grid-cols-5 gap-3.5">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <div className="rounded-[14px] border border-bo-border bg-bo-surface p-5">
          <p className="m-0 mb-1 font-sans text-[15px] font-semibold text-bo-ink">Volume over time</p>
          <p className="m-0 mb-3 font-sans text-xs text-bo-muted-3">
            Notification spend across all shops, selected date range.
          </p>
          <MiniLineChart
            series={[
              {
                points: "0,130 40,128 80,20 120,125 160,60 200,118 240,115 280,25 320,100 360,110 400,130",
                stroke: "var(--color-bo-gold)",
                fill: "var(--color-bo-gold-bg)",
              },
            ]}
          />
        </div>

        <div className="flex flex-col gap-3.5 rounded-[14px] border border-bo-border bg-bo-surface p-5">
          <p className="m-0 font-sans text-[15px] font-semibold text-bo-ink">Spending Breakdown</p>
          <div className="flex items-center justify-center py-1.5">
            <DonutChart
              slices={[
                { color: "var(--color-bo-gold)", from: 0, to: 60 },
                { color: "var(--color-bo-muted-6)", from: 60, to: 82 },
                { color: "var(--color-bo-faint)", from: 82, to: 100 },
              ]}
              centerLabel="Total"
              centerValue="$169.50"
            />
          </div>
          <div className="flex flex-col gap-2">
            {SPENDING_LEGEND.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-sans text-xs font-medium text-bo-muted-1">
                  <span
                    className="h-[9px] w-[9px] rounded-full"
                    style={{ background: item.color }}
                  />
                  {item.label}
                </span>
                <span className="font-sans text-xs font-semibold text-bo-ink">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UsagePage;
