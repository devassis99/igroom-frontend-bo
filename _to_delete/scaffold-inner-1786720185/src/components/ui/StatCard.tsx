interface StatCardProps {
  label: string;
  value: string;
  delta?: { text: string; tone: "success" | "danger" };
}

/** Matches the stat-tile pattern used throughout Backoffice.dc.html (B1–B7). */
export function StatCard({ label, value, delta }: StatCardProps) {
  return (
    <div className="rounded-[14px] border border-bo-border bg-bo-surface p-[18px]">
      <span className="font-sans text-xs text-bo-muted-4">{label}</span>
      <p className="my-2 font-sans text-[26px] font-bold text-bo-ink">{value}</p>
      {delta && (
        <span
          className={`rounded-full px-[9px] py-[3px] font-sans text-[11px] font-semibold ${
            delta.tone === "success"
              ? "bg-bo-success-bg text-bo-success"
              : "bg-bo-danger-bg text-bo-danger"
          }`}
        >
          {delta.text}
        </span>
      )}
    </div>
  );
}

export default StatCard;
