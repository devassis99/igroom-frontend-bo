import { createBrowserRouter } from "react-router";
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
        ],
      },
    ],
  },
  {
    path: "*",
    lazy: () => import("@/pages/NotFoundPage").then((m) => ({ Component: m.default })),
  },
]);
