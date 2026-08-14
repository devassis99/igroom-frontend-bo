import { StatusPill } from "@/components/ui/StatusPill";

/** Matches Backoffice.dc.html's B6 frame. Sample data — see DashboardPage.tsx's note. */
const ROWS = [
  {
    shop: "Solo Chair — Ray O.",
    issue: "Payment method declined",
    opened: "2 hrs ago",
    status: "Open",
    tone: "danger" as const,
  },
  {
    shop: "Karachi Kutz",
    issue: "QR code not scanning",
    opened: "Yesterday",
    status: "In Progress",
    tone: "gold" as const,
  },
  {
    shop: "The Gentry Barbershop",
    issue: "Requesting data export",
    opened: "3 days ago",
    status: "Resolved",
    tone: "success" as const,
  },
];

export function SupportPage() {
  return (
    <div>
      <h1 className="m-0 mb-5 font-sans text-2xl font-semibold text-bo-ink">Support Tickets</h1>

      <div className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        <div className="grid grid-cols-[1.8fr_1fr_1fr_0.9fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
          <span>Shop</span>
          <span>Issue</span>
          <span>Opened</span>
          <span>Status</span>
        </div>
        {ROWS.map((row, i) => (
          <div
            key={row.shop}
            className={`grid grid-cols-[1.8fr_1fr_1fr_0.9fr] items-center px-5 py-3 ${
              i < ROWS.length - 1 ? "border-b border-bo-border-soft" : ""
            }`}
          >
            <span className="font-sans text-[13px] font-semibold text-bo-ink">{row.shop}</span>
            <span className="font-sans text-xs font-medium text-bo-muted-2">{row.issue}</span>
            <span className="font-sans text-xs font-medium text-bo-muted-2">{row.opened}</span>
            <StatusPill tone={row.tone}>{row.status}</StatusPill>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SupportPage;
