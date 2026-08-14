const ROWS = [
  "Default plans & pricing",
  "SMS/WhatsApp provider",
  "Payment gateways (region)",
  "Admin roles & permissions",
  "Feature flags",
];

/**
 * Matches Backoffice.dc.html's B8 frame. Rows are inert (no target screens
 * exist yet) — clicking one currently does nothing; wire each up once
 * there's a real settings screen behind it.
 */
export function SettingsPage() {
  return (
    <div>
      <h1 className="m-0 mb-5 font-sans text-2xl font-semibold text-bo-ink">Platform Settings</h1>
      <div className="flex max-w-[560px] flex-col overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        {ROWS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`flex items-center justify-between px-[18px] py-3.5 text-left font-sans text-sm font-medium text-bo-ink-soft hover:bg-bo-page/40 ${
              i < ROWS.length - 1 ? "border-b border-bo-border-soft" : ""
            }`}
          >
            {label}
            <span className="font-sans text-base text-bo-faint">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default SettingsPage;
