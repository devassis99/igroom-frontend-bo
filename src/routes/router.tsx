import { Navigate, createBrowserRouter } from "react-router";
import { ProtectedRoute } from "./ProtectedRoute";

/**
 * Route-level code splitting via react-router's `lazy` field: each page's
 * JS only downloads when its route is actually visited, instead of one
 * monolithic bundle shipping every screen upfront. AppShell (the
 * authenticated layout) and ProtectedRoute stay eagerly imported since
 * they're needed for almost every navigation anyway.
 */
export const router = createBrowserRouter([
  {
    path: "/login",
    lazy: () => import("@/pages/LoginPage").then((m) => ({ Component: m.default })),
  },
  {
    path: "/mfa/setup",
    lazy: () => import("@/pages/MfaSetupPage").then((m) => ({ Component: m.default })),
  },
  {
    path: "/mfa/challenge",
    lazy: () => import("@/pages/MfaChallengePage").then((m) => ({ Component: m.default })),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        lazy: () => import("@/components/layout/AppShell").then((m) => ({ Component: m.default })),
        children: [
          {
            index: true,
            lazy: () => import("@/pages/DashboardPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "usage",
            lazy: () => import("@/pages/UsagePage").then((m) => ({ Component: m.default })),
          },
          {
            path: "shops",
            lazy: () => import("@/pages/ShopsPage").then((m) => ({ Component: m.default })),
          },
          // One shop's full record. A sibling route rather than a child of
          // "shops" — it replaces the list rather than rendering inside it,
          // and AppShell's nav gate still matches it to the Shops tab
          // (see matchesNavItem's startsWith check), so shops.view covers
          // both without a second entry in NAV_ITEMS.
          {
            path: "shops/:shopId",
            lazy: () => import("@/pages/ShopDetailPage").then((m) => ({ Component: m.default })),
          },
          // Sales (Backoffice Sales Leads.dc.html). "/sales" on its own is
          // Today; AppShell's gate treats every path here as needing
          // sales.work or sales.manage, and Reps & Territories sales.manage.
          { path: "sales", element: <Navigate to="/sales/today" replace /> },
          {
            path: "sales/today",
            lazy: () =>
              import("@/pages/sales/SalesTodayPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "sales/pipeline",
            lazy: () =>
              import("@/pages/sales/SalesPipelinePage").then((m) => ({ Component: m.default })),
          },
          {
            path: "sales/leads/:leadId",
            lazy: () =>
              import("@/pages/sales/SalesLeadPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "sales/map",
            lazy: () =>
              import("@/pages/sales/SalesMapPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "sales/reps",
            lazy: () =>
              import("@/pages/sales/SalesRepsPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "sales/stats",
            lazy: () =>
              import("@/pages/sales/SalesStatsPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "plans",
            lazy: () => import("@/pages/PlansPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "billing",
            lazy: () => import("@/pages/BillingPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "bookings",
            lazy: () => import("@/pages/BookingsPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "support",
            lazy: () => import("@/pages/SupportPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "referrals",
            lazy: () => import("@/pages/ReferralsPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "users",
            lazy: () => import("@/pages/UsersPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "settings",
            lazy: () => import("@/pages/SettingsPage").then((m) => ({ Component: m.default })),
          },
          {
            path: "account",
            lazy: () => import("@/pages/AccountPage").then((m) => ({ Component: m.default })),
          },
        ],
      },
    ],
  },
  {
    path: "*",
    lazy: () => import("@/pages/NotFoundPage").then((m) => ({ Component: m.default })),
  },
]);
