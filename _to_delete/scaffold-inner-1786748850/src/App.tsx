import { lazy, Suspense } from "react";
import { RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { queryClient } from "@/lib/query-client";
import { env } from "@/lib/env";
import { useAuthBootstrap } from "@/auth/use-auth-bootstrap";
import { router } from "@/routes/router";

// Lazy + dev-only: the devtools package never enters the production
// bundle at all (not even tree-shaken out — it's simply never imported),
// rather than shipping it and hiding it behind a flag.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : null;

export function App() {
  useAuthBootstrap();

  return (
    <GoogleOAuthProvider clientId={env.VITE_GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {ReactQueryDevtools && (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        )}
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
