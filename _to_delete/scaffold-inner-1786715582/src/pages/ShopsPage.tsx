import { useMemo, useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { SAMPLE_SHOPS, SHOP_STATUS_TONE } from "@/lib/sample-data";

/** Matches Backoffice.dc.html's B3 frame. Sample data — see DashboardPage.tsx's note. */
export function ShopsPage() {
  const [query, setQuery] = useState("");
  const shops = useMemo(
    () => SAMPLE_SHOPS.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="m-0 font-sans text-2xl font-semibold text-bo-ink">Shops / Accounts</h1>
        <input
          type="text"
          placeholder="Search shops"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-60 rounded-lg border border-bo-input-border bg-bo-surface px-3.5 py-2.5 font-sans text-[13px] text-bo-ink outline-none focus:border-2 focus:border-bo-gold"
        />
      </div>

      <div className="overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        <div className="grid grid-cols-[1.6fr_1fr_0.9fr_0.9fr_0.9fr] bg-bo-table-head px-5 py-2.5 font-sans text-[11px] font-semibold text-bo-muted-4">
          <span>Shop</span>
          <span>Plan</span>
          <span>Seats</span>
          <span>MRR</span>
          <span>Status</span>
        </div>
        {shops.length === 0 ? (
          <p className="px-5 py-6 font-sans text-sm text-bo-muted-3">No shops match "{query}".</p>
        ) : (
          shops.map((shop, i) => (
            <div
              key={shop.name}
              className={`grid grid-cols-[1.6fr_1fr_0.9fr_0.9fr_0.9fr] items-center px-5 py-3 ${
                i < shops.length - 1 ? "border-b border-bo-border-soft" : ""
              }`}
            >
              <span className="font-sans text-[13px] font-semibold text-bo-ink">{shop.name}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{shop.plan}</span>
              <span className="font-sans text-xs font-medium text-bo-muted-2">{shop.seats}</span>
              <span className="font-sans text-[13px] font-semibold text-bo-ink-soft">{shop.mrr}</span>
              <StatusPill tone={SHOP_STATUS_TONE[shop.status]}>{shop.status}</StatusPill>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ShopsPage;
