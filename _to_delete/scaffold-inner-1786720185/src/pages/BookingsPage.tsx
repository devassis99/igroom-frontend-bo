import { StatCard } from "@/components/ui/StatCard";
import { MiniLineChart } from "@/components/ui/MiniLineChart";

/** Matches Backoffice.dc.html's B5 frame. Sample data — see DashboardPage.tsx's note. */
const STATS = [
  { label: "Bookings Today", value: "742", delta: { text: "↑ 4%", tone: "success" as const } },
  { label: "No-show Rate", value: "3.1%", delta: { text: "↑ 0.4%", tone: "danger" as const } },
  { label: "Active Waitlists", value: "86", delta: { text: "↑ 11%", tone: "success" as const } },
  { label: "Avg Wait Time", value: "22 min", delta: { text: "↓ 3 min", tone: "success" as const } },
  { label: "Cancellations Today", value: "31", delta: { text: "↑ 3", tone: "danger" as const } },
];

export function BookingsPage() {
  return (
    <div>
      <h1 className="m-0 mb-5 font-sans text-2xl font-semibold text-bo-ink">Bookings & Waitlist</h1>

      <div className="mb-4 grid grid-cols-5 gap-3.5">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="rounded-[14px] border border-bo-border bg-bo-surface p-5">
        <p className="m-0 mb-1 font-sans text-[15px] font-semibold text-bo-ink">
          Bookings by hour, today
        </p>
        <MiniLineChart
          height={120}
          series={[
            {
              points: "0,110 40,95 80,60 120,45 160,55 200,30 240,20 280,35 320,60 360,90 400,105",
              stroke: "var(--color-bo-dark)",
              fill: "var(--color-bo-gold-bg)",
            },
          ]}
        />
      </div>
    </div>
  );
}

export default BookingsPage;
