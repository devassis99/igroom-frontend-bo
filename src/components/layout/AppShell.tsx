import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";
import { salesApi } from "@/lib/sales-api";

type Shape = "square" | "circle" | "gear";

interface NavItem {
  to: string;
  label: string;
  shape: Shape;
  /**
   * bo_permissions key(s) gating this tab — hides it from the sidebar and
   * blocks direct navigation into it (see accessAllowed below). An array
   * means any one of them will do: Sales is open to a rep (sales.work)
   * and to a sales manager (sales.manage) alike.
   */
  permission: string | string[];
  /** Other paths that belong to this tab, for highlighting and the gate — a lead's own page is part of Pipeline. */
  also?: string[];
  group?: "sales";
  /** Shown instead of `label` to someone who works leads but doesn't manage the team. */
  repLabel?: string;
}

const SALES_ANY = ["sales.work", "sales.manage"];

/** shape mirrors the exact icon placeholder each nav row uses in Backoffice.dc.html. */
const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Overview", shape: "square", permission: "overview.view" },
  { to: "/usage", label: "Usage & Notifications", shape: "square", permission: "usage.view" },
  { to: "/shops", label: "Shops / Accounts", shape: "square", permission: "shops.view" },
  // The SALES group — Backoffice Sales Leads.dc.html's sidebar (B9).
  {
    to: "/sales/today",
    label: "Today",
    shape: "square",
    permission: SALES_ANY,
    group: "sales",
    also: ["/sales"],
  },
  {
    to: "/sales/pipeline",
    label: "Pipeline",
    repLabel: "My Leads",
    shape: "square",
    permission: SALES_ANY,
    group: "sales",
    also: ["/sales/leads"],
  },
  { to: "/sales/map", label: "City Map", shape: "square", permission: SALES_ANY, group: "sales" },
  {
    to: "/sales/reps",
    label: "Reps & Territories",
    shape: "square",
    permission: "sales.manage",
    group: "sales",
  },
  {
    to: "/sales/stats",
    label: "Rep Stats",
    repLabel: "My Stats",
    shape: "square",
    permission: SALES_ANY,
    group: "sales",
  },
  { to: "/plans", label: "Plans", shape: "square", permission: "plans.view" },
  { to: "/billing", label: "Billing", shape: "square", permission: "billing.view" },
  { to: "/bookings", label: "Bookings & Waitlist", shape: "circle", permission: "bookings.view" },
  { to: "/support", label: "Support Tickets", shape: "square", permission: "support.view" },
  { to: "/referrals", label: "Referrals & Rewards", shape: "square", permission: "referrals.view" },
  { to: "/users", label: "User Management", shape: "square", permission: "users.view" },
  { to: "/settings", label: "Platform Settings", shape: "gear", permission: "settings.view" },
];

/** The phone's bottom tab bar for Sales (B9l): Today · Leads · Map · Me. */
const SALES_TABS: Array<{ to: string; label: string; also?: string[]; round?: boolean }> = [
  { to: "/sales/today", label: "Today", also: ["/sales"] },
  { to: "/sales/pipeline", label: "Leads", also: ["/sales/leads"] },
  { to: "/sales/map", label: "Map" },
  { to: "/sales/stats", label: "Me", round: true },
];

function NavIcon({ shape, active }: { shape: Shape; active: boolean }) {
  if (shape === "gear") {
    return (
      <span className="font-sans text-[16px] leading-4" aria-hidden>
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
function matchesPath(pathname: string, to: string, exactOnly = false): boolean {
  if (to === "/") return pathname === "/";
  if (exactOnly) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

function matchesNavItem(pathname: string, item: { to: string; also?: string[] }): boolean {
  if (matchesPath(pathname, item.to)) return true;
  // "/sales" on its own is Today; "/sales/leads/…" is Pipeline.
  return (item.also ?? []).some((p) => matchesPath(pathname, p, p === "/sales"));
}

function prettyRole(name: string | undefined): string | null {
  if (!name) return null;
  if (name === "superadmin") return "SuperAdmin";
  return name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Layout for every authenticated route — matches Backoffice.dc.html's
 * B1–B8 sidebar, plus the SALES group from Backoffice Sales Leads.dc.html.
 * Also the single place permission gating for page-level routes lives: the
 * sidebar only lists tabs the current role has permission for, and typing
 * a gated URL directly renders an access-denied message instead of the
 * page (the backend independently enforces the same permission on every
 * API call that page would make, so this is a UX nicety, not the security
 * boundary).
 *
 * Below the md breakpoint the sidebar becomes a drawer behind a menu
 * button, and anyone with Sales gets the phone's bottom tab bar (B9l) —
 * a rep spends their day in a barbershop doorway, not at a desk.
 */
export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const permissions = useAuthStore((s) => s.permissions);
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allowed = (p: string | string[]) =>
    Array.isArray(p) ? p.some((k) => permissions.includes(k)) : permissions.includes(p);
  const hasSales = allowed(SALES_ANY);
  const salesManager = permissions.includes("sales.manage");

  const badge = useQuery({
    queryKey: ["sales", "badge"],
    queryFn: salesApi.badge,
    enabled: hasSales,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
  const salesMe = useQuery({
    queryKey: ["sales", "me"],
    queryFn: salesApi.me,
    enabled: hasSales,
    staleTime: 5 * 60_000,
  });

  // The drawer closes itself on navigation.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const visibleNavItems = NAV_ITEMS.filter((item) => allowed(item.permission));
  const plain = visibleNavItems.filter((i) => !i.group);
  const firstPlain = plain.filter(
    (i) => NAV_ITEMS.indexOf(i) < NAV_ITEMS.findIndex((n) => n.group === "sales"),
  );
  const lastPlain = plain.filter((i) => !firstPlain.includes(i));
  const sales = visibleNavItems.filter((i) => i.group === "sales");

  const currentNavItem = NAV_ITEMS.find((item) => matchesNavItem(location.pathname, item));
  const accessAllowed = !currentNavItem || allowed(currentNavItem.permission);

  const rep = salesMe.data?.me.rep;
  const displayName = salesMe.data?.me.name ?? user?.email;
  const subtitle = rep
    ? `Sales Rep · ${rep.type === "agent" ? "Commission agent" : "Employee"}`
    : prettyRole(role?.name);

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

  const renderItem = (item: NavItem) => {
    const active = matchesNavItem(location.pathname, item);
    const label = item.repLabel && !salesManager ? item.repLabel : item.label;
    const count = item.to === "/sales/today" ? (badge.data?.dueCount ?? 0) : 0;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={`flex items-center gap-3 px-6 py-2.5 font-sans text-[14px] ${
          active ? "bg-bo-dark font-semibold text-bo-on-dark" : "font-medium text-bo-nav-inactive"
        }`}
        aria-current={active ? "page" : undefined}
      >
        <NavIcon shape={item.shape} active={active} />
        <span className="flex-1">{label}</span>
        {count > 0 && (
          <span
            className={`rounded-full px-[7px] py-[2px] font-sans text-[11px] font-semibold ${
              active ? "bg-bo-gold-soft text-bo-ink" : "bg-bo-gold-tint text-bo-gold"
            }`}
            aria-label={`${count} due`}
          >
            {count}
          </span>
        )}
      </NavLink>
    );
  };

  const sidebar = (
    <aside className="flex h-full w-56 shrink-0 flex-col overflow-y-auto border-r border-bo-sidebar-border bg-bo-surface py-[22px]">
      <p className="m-0 mb-6 px-6 font-sans text-[18px] font-semibold text-bo-ink">
        iGroom <span className="font-sans text-[12px] font-medium text-bo-muted-5">Backoffice</span>
      </p>

      <nav className="flex flex-col gap-0.5">
        {firstPlain.map(renderItem)}
        {sales.length > 0 && (
          <>
            <p
              className={`m-0 mb-1.5 px-6 font-sans text-[11px] font-semibold tracking-[0.1em] text-bo-muted-5 ${firstPlain.length ? "mt-3" : "mt-1"}`}
            >
              SALES
            </p>
            {sales.map(renderItem)}
            {lastPlain.length > 0 && <div className="h-3" />}
          </>
        )}
        {lastPlain.map(renderItem)}
      </nav>

      <div className="min-h-6 flex-1" />

      <div className="flex flex-col gap-2 px-6">
        <NavLink
          to="/account"
          className="flex items-center gap-2.5"
          title="Account & two-factor settings"
        >
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-bo-dark font-sans text-xs font-semibold text-bo-on-dark">
            {displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="m-0 truncate font-sans text-xs font-semibold text-bo-ink-soft hover:underline">
              {displayName}
            </p>
            {subtitle && (
              <p className="m-0 truncate font-sans text-[12px] text-bo-muted-5">{subtitle}</p>
            )}
          </div>
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
  );

  return (
    <div className="flex min-h-dvh bg-bo-page">
      <div className="sticky top-0 hidden h-dvh md:block">{sidebar}</div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          // Not a <dialog>, for the same reason Modal.tsx gives: its UA
          // styles fight the slide-in layout.
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-bo-backdrop"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative h-full w-56 shadow-xl">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-bo-sidebar-border bg-bo-surface px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-[3px] rounded-lg border border-bo-input-border"
            aria-label="Open menu"
          >
            <span className="h-0.5 w-4 rounded bg-bo-ink-soft" />
            <span className="h-0.5 w-4 rounded bg-bo-ink-soft" />
            <span className="h-0.5 w-4 rounded bg-bo-ink-soft" />
          </button>
          <p className="m-0 font-sans text-[18px] font-semibold text-bo-ink">iGroom</p>
          <span className="w-9" />
        </header>

        <main
          className={`flex-1 overflow-x-hidden px-4 py-5 md:px-9 md:py-7 ${hasSales ? "pb-28 md:pb-7" : ""}`}
        >
          {accessAllowed ? (
            <Outlet />
          ) : location.pathname === "/" && visibleNavItems[0] ? (
            // Landing on "/" without Overview (a sales rep, say) goes to
            // the first tab they do have, rather than a wall.
            <Navigate to={visibleNavItems[0].to} replace />
          ) : (
            <div className="flex flex-col items-start gap-2 rounded-[14px] border border-bo-border bg-bo-surface p-8">
              <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">Access denied</h1>
              <p className="m-0 font-sans text-sm text-bo-muted-5">
                Your role doesn't have permission to view this page. Ask an admin to grant{" "}
                <code className="font-mono text-xs text-bo-muted-3">
                  {Array.isArray(currentNavItem?.permission)
                    ? currentNavItem.permission.join(" or ")
                    : currentNavItem?.permission}
                </code>{" "}
                if you believe this is a mistake.
              </p>
            </div>
          )}
        </main>

        {hasSales && (
          <nav
            className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-bo-sidebar-border bg-bo-surface pt-2.5 pb-[max(env(safe-area-inset-bottom),14px)] md:hidden"
            aria-label="Sales"
          >
            {SALES_TABS.map((tab) => {
              const active = matchesNavItem(location.pathname, tab);
              const count = tab.to === "/sales/today" ? (badge.data?.dueCount ?? 0) : 0;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={`relative flex flex-col items-center gap-1 ${active ? "text-bo-ink" : "text-bo-muted-5"}`}
                >
                  <span
                    className={`h-[22px] w-[22px] ${tab.round ? "rounded-full" : "rounded-md"} ${active ? "bg-current" : "border-2 border-current"}`}
                    aria-hidden
                  />
                  <span
                    className={`font-sans text-[12px] ${active ? "font-semibold" : "font-medium"}`}
                  >
                    {tab.label}
                  </span>
                  {count > 0 && (
                    <span className="absolute -top-1 left-1/2 ml-2 rounded-full bg-bo-gold-soft px-1.5 font-sans text-[11px] font-semibold text-bo-ink">
                      {count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}

export default AppShell;
