import { type ComponentType } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/auth/auth-store";

interface SettingsNavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * bo_permissions key needed to see and open this section. Omitted means
   * every signed-in user — My Account is your own email, role and
   * two-factor, not something a role can be locked out of. The API checks
   * the same permission on every call these pages make.
   */
  permission?: string;
}

// Same outline-glyph family as the main sidebar (layout/NavIcons.tsx).
const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

/** Sliders: platform-wide switches and providers. */
function PlatformIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
      <circle cx="7" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}

/** A person inside a shield — the same glyph User Management had in the main sidebar. */
function UsersIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <circle cx="12" cy="9.5" r="2.5" />
      <path d="M8.5 16a3.5 3.5 0 0 1 7 0" />
    </svg>
  );
}

function AccountIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const SECTIONS: Array<{ title: string; items: SettingsNavItem[] }> = [
  {
    title: "PLATFORM",
    items: [
      {
        to: "/settings/platform",
        label: "Platform Settings",
        icon: PlatformIcon,
        permission: "settings.view",
      },
      {
        to: "/settings/users",
        label: "User Management",
        icon: UsersIcon,
        permission: "users.view",
      },
    ],
  },
  {
    title: "YOUR ACCOUNT",
    items: [{ to: "/settings/account", label: "My Account", icon: AccountIcon }],
  },
];

const ALL_ITEMS = SECTIONS.flatMap((section) => section.items);

function useVisibleItems() {
  const permissions = useAuthStore((s) => s.permissions);
  const can = (item: SettingsNavItem) => !item.permission || permissions.includes(item.permission);
  return { can, sections: SECTIONS.map((s) => ({ ...s, items: s.items.filter(can) })) };
}

/** /settings on its own: the first section you're allowed into. */
export function SettingsIndex() {
  const { sections } = useVisibleItems();
  const first = sections.flatMap((s) => s.items)[0];
  return <Navigate to={first?.to ?? "/settings/account"} replace />;
}

/**
 * The back office Settings area — the same shape as the tenant app's
 * SettingsLayout: a second sidebar beside the main one (which narrows to
 * its icon strip while you're in here — see AppShell), grouping
 * platform-wide settings and User Management, which used to be their own
 * main-menu rows, with your own account.
 *
 * AppShell's permission gate only knows "Settings", which everyone can
 * open (for My Account), so each section's own permission is checked
 * here: open one you can't see and you get the same access-denied panel.
 * Below the md breakpoint the sidebar becomes a row of tabs.
 */
export function SettingsLayout() {
  const location = useLocation();
  const { can, sections } = useVisibleItems();
  const current = ALL_ITEMS.find(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  );
  const denied = current !== undefined && !can(current);
  const visible = sections.filter((section) => section.items.length > 0);

  return (
    <div className="flex flex-col gap-5 md:-my-7 md:-ml-9 md:min-h-dvh md:flex-row md:gap-0">
      <nav
        aria-label="Settings"
        className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-[220px] md:flex-none md:flex-col md:gap-6 md:overflow-y-auto md:border-r md:border-bo-sidebar-border md:bg-white md:py-7"
      >
        <p className="m-0 px-5 font-sans text-[20px] font-semibold text-bo-ink">Settings</p>
        {visible.map((section) => (
          <div key={section.title}>
            <p className="m-0 mb-2 px-5 font-sans text-[11px] font-semibold tracking-[0.08em] text-bo-muted-5">
              {section.title}
            </p>
            <div className="flex flex-col gap-0.5 px-2.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[14px] transition-colors duration-150 ${
                      // Pure white menu with the selection in clay, as in the
                      // business app's Settings menu.
                      isActive
                        ? "bg-brand-clay/10 font-semibold text-brand-clay-deep"
                        : "font-medium text-bo-nav-inactive hover:bg-bo-page/60 hover:text-bo-ink"
                    }`
                  }
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Phones: the same sections as a row of tabs above the page. */}
      <nav aria-label="Settings" className="-mx-4 flex gap-2 overflow-x-auto px-4 md:hidden">
        {visible
          .flatMap((section) => section.items)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `shrink-0 rounded-full border px-3 py-1.5 font-sans text-[12px] font-semibold whitespace-nowrap ${
                  isActive
                    ? "border-transparent bg-bo-dark-gradient text-bo-on-dark"
                    : "border-bo-input-border bg-bo-surface text-bo-muted-2"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="min-w-0 flex-1 md:py-7 md:pl-9">
        {/* The sidebar stays put; only the section's page changes, and it
            eases in the same way a main-menu page does. */}
        <div key={location.pathname} className="bo-route-in">
          {denied ? (
            <div className="flex flex-col items-start gap-2 rounded-[14px] border border-bo-border bg-bo-surface p-8">
              <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">Access denied</h1>
              <p className="m-0 font-sans text-sm text-bo-muted-5">
                Your role doesn't have permission to view this page. Ask an admin to grant{" "}
                <code className="font-mono text-xs text-bo-muted-3">{current?.permission}</code> if
                you believe this is a mistake.
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsLayout;
