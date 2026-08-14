import { StatCard } from "@/components/ui/StatCard";

/** Matches Backoffice.dc.html's B7 frame. Sample data — see DashboardPage.tsx's note. */
const STATS = [
  { label: "Referral Credits Issued", value: "$3,420", delta: { text: "↑ 19%", tone: "success" as const } },
  { label: "Customers Referred", value: "342", delta: { text: "↑ 14%", tone: "success" as const } },
  { label: "Loyalty Stamps Redeemed", value: "218", delta: { text: "↑ 27%", tone: "success" as const } },
  { label: "Repeat Rate (Platform)", value: "64%", delta: { text: "↑ 3%", tone: "success" as const } },
];

export function ReferralsPage() {
  return (
    <div>
      <h1 className="m-0 mb-5 font-sans text-2xl font-semibold text-bo-ink">Referrals & Rewards</h1>
      <div className="grid grid-cols-4 gap-3.5">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  );
}

export default ReferralsPage;
