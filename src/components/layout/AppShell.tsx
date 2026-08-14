import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { authApi } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";

/** shape mirrors the exact icon placeholder each nav row uses in Backoffice.dc.html. */
const NAV_ITEMS: Array<{
  to: string;
  label: string;
  shape: "square" | "circle" | "gear";
  /** bo_permissions key gating this tab — hides it from the sidebar and blocks direct navigation into it (see accessAllowed below). */
  permission: string;
}> = [
  { to: "/", label: "Overview", shape: "square", permission: "overview.view" },
  { to: "/usage", label: "Usage & Notifications", shape: "square", permission: "usage.view" },
  { to: "/shops", label: "Shops / Accounts", shape: "square", permission: "shops.view" },
  { to: "/plans", label: "Plans", shape: "square", permission: "plans.view" },
  { to: "/billing", label: "Billing", shape: "square", permission: "billing.view" },
  { to: "/bookings", label: "Bookings & Waitlist", shape: "circle", permission: "bookings.view" },
  { to: "/support", label: "Support Tickets", shape: "square", permission: "support.view" },
  { to: "/referrals", label: "Referrals & Rewards", shape: "square", permission: "referrals.view" },
  { to: "/users", label: "User Management", shape: "square", permission: "users.view" },
  { to: "/settings", label: "Platform Settings", shape: "gear", permission: "settings.view" },
];

function NavIcon({ shape, active }: { shape: "square" | "circle" | "gear"; active: boolean }) {
  if (shape === "gear") {
    return (
      <span className="font-sans text-[15px] leading-4" aria-hidden>
        ⚙
      </span>
    );
  }
  return (
    <span
      className={`block h-4 w-4 shrink-0 ${shape === "circle" ? "rounded-full" : "rounded"} ${
        active ? "bg-current" : "border-2 border-current"
      }`}
      aria-hidden
    />
  );
}

/** Matches a pathname against a nav item's `to`, the same way NavLink's own `end` matching works, for the direct-navigation permission gate below. */
function matchesNavItem(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * Layout for every authenticated route — matches Backoffice.dc.html's
 * B1–B8 sidebar exactly. Also the single place permission gating for
 * page-level routes lives: the sidebar only lists tabs the current
 * role has permission for, and typing a gated URL directly renders an
 * access-denied message instead of the page (the backend independently
 * enforces the same permission on every API call that page would make,
 * so this is a UX nicety, not the security boundary).
 */
export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const navigate = useNavigate();
  const location = useLocation();

  const visibleNavItems = NAV_ITEMS.filter((item) => permissions.includes(item.permission));

  const currentNavItem = NAV_ITEMS.find((item) => matchesNavItem(location.pathname, item.to));
  const accessAllowed = !currentNavItem || hasPermission(currentNavItem.permission);

  async function handleLogout() {
    const { refreshToken } = useAuthStore.getState();
    useAuthStore.getState().clearSession();
    if (refreshToken) {
      // Best-effort: the session is already cleared locally regardless of
      // whether this network call succeeds.
      authApi.logout(refreshToken).catch(() => {});
    }
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-bo-page">
      <aside className="flex w-56 shrink-0 flex-col border-r border-bo-sidebar-border bg-bo-surface py-[22px]">
        <p className="m-0 mb-6 px-6 font-serif text-[19px] font-semibold text-bo-ink">
          iGroom <span className="font-sans text-[11px] font-medium text-bo-muted-5">Backoffice</span>
        </p>

        <nav className="flex flex-col gap-0.5">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-2.5 font-sans text-[13px] ${
                  isActive
                    ? "bg-bo-dark font-semibold text-bo-on-dark"
                    : "font-medium text-bo-nav-inactive"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <NavIcon shape={item.shape} active={isActive} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex flex-col gap-2 px-6">
          <NavLink to="/account" className="flex items-center gap-2.5" title="Account & two-factor settings">
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-bo-dark font-sans text-xs font-semibold text-bo-on-dark">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <p className="m-0 truncate font-sans text-xs font-semibold text-bo-ink-soft hover:underline">
              {user?.email}
            </p>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="text-left font-sans text-xs text-bo-muted-5 hover:text-bo-ink"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto px-9 py-7">
        {accessAllowed ? (
          <Outlet />
        ) : (
          <div className="flex flex-col items-start gap-2 rounded-[14px] border border-bo-border bg-bo-surface p-8">
            <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">Access denied</h1>
            <p className="m-0 font-sans text-sm text-bo-muted-5">
              Your role doesn't have permission to view this page. Ask an admin to grant{" "}
              <code className="font-mono text-xs text-bo-muted-3">{currentNavItem?.permission}</code>{" "}
              if you believe this is a mistake.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AppShell;
