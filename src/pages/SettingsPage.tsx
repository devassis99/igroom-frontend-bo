import { useNavigate } from "react-router";

const ROWS = [
  "Default plans & pricing",
  "SMS/WhatsApp provider",
  "Payment gateways (region)",
  "Admin roles & permissions",
  "Feature flags",
];

/** Rows without a real screen behind them yet route nowhere. */
const ROW_TARGETS: Record<string, string> = {
  "Admin roles & permissions": "/users",
};

/**
 * Matches Backoffice.dc.html's B8 frame. Most rows are still inert (no
 * target screen exists yet); "Admin roles & permissions" now links to
 * the new User Management tab's Roles & Permissions sub-tab.
 */
export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="m-0 mb-5 font-sans text-2xl font-semibold text-bo-ink">Platform Settings</h1>
      <div className="flex max-w-[560px] flex-col overflow-hidden rounded-[14px] border border-bo-border bg-bo-surface">
        {ROWS.map((label, i) => {
          const target = ROW_TARGETS[label];
          return (
            <button
              key={label}
              type="button"
              onClick={target ? () => navigate(target) : undefined}
              disabled={!target}
              className={`flex items-center justify-between px-[18px] py-3.5 text-left font-sans text-sm font-medium text-bo-ink-soft hover:bg-bo-page/40 disabled:cursor-default disabled:hover:bg-transparent ${
                i < ROWS.length - 1 ? "border-b border-bo-border-soft" : ""
              }`}
            >
              {label}
              <span className="font-sans text-base text-bo-faint">›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SettingsPage;
