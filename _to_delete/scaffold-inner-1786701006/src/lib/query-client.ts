import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./http";

/**
 * Defaults tuned for an internal admin/back-office app rather than
 * TanStack Query's out-of-the-box public-website defaults:
 *  - staleTime > 0 so navigating between screens that share a query
 *    doesn't re-fetch instantly on every mount — the default of 0 makes
 *    every remount a network round trip.
 *  - retry skips 401/403/404: those are never transient, so retrying
 *    them just delays the user seeing the real error (and 401s are
 *    already handled by src/lib/api-client.ts's refresh-and-retry).
 *  - refetchOnWindowFocus stays on (React Query's default) — back-office
 *    data (queues, approvals, statuses) going stale while a tab sits in
 *    the background is a real correctness issue for this kind of app.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
