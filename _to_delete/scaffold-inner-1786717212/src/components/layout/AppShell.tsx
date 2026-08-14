import { NavLink, Outlet, useNavigate } from "react-router";
import { authApi } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";

/** shape mirrors the exact icon placeholder each nav row uses in Backoffice.dc.html. */
const NAV_ITEMS: Array<{ to: string; label: string; shape: "square" | "circle" | "gear" }> = [
  { to: "/", label: "Overview", shape: "square" },
  { to: "/usage", label: "Usage & Notifications", shape: "square" },
  { to: "/shops", label: "Shops / Accounts", shape: "square" },
  { to: "/billing", label: "Billing & Plans", shape: "square" },
  { to: "/bookings", label: "Bookings & Waitlist", shape: "circle" },
  { to: "/support", label: "Support Tickets", shape: "square" },
  { to: "/referrals", label: "Referrals & Rewards", shape: "square" },
  { to: "/settings", label: "Platform Settings", shape: "gear" },
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

/** Layout for every authenticated route — matches Backoffice.dc.html's B1–B8 sidebar exactly. */
export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

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
          {NAV_ITEMS.map((item) => (
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
          <div className="flex items-center gap-2.5">
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-bo-dark font-sans text-xs font-semibold text-bo-on-dark">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <p className="m-0 truncate font-sans text-xs font-semibold text-bo-ink-soft">
              {user?.email}
            </p>
          </div>
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
        <Outlet />
      </div>
    </div>
  );
}

export default AppShell;
