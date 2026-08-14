# igroom-frontend-bo

React + TypeScript back office for igroom, talking to `igroom-backend`'s Google OAuth + mandatory
TOTP MFA auth flow.

## Stack, and why

| Concern | Choice | Why |
|---|---|---|
| Package manager | **pnpm** | Same as `igroom-backend` — one lockfile format, one mental model across the codebase. Content-addressable store makes installs fast and disk-cheap; strict `node_modules` linking catches phantom imports (packages used but not declared) that npm/yarn hoisting hides. |
| Build tool | **Vite** | Native-ESM dev server (near-instant start, HMR that doesn't re-bundle the world), Rollup-based production build with real tree-shaking and code splitting. The standard choice for a React SPA in 2025+; CRA is dead, plain webpack is strictly more config for less speed here. |
| Linting/formatting | **oxlint + oxfmt** | Same tools as the backend (`.oxlintrc.json`/`.oxfmtrc.json` here mirror the backend's), so `oxlint --fix` habits transfer directly. Both are Rust-based (Oxc project) — oxlint alone is commonly 50–100x faster than ESLint on a codebase this size, which matters most in the pre-commit hook and CI, not just locally. Added the `react`, `react-perf`, and `jsx-a11y` plugins on top of the backend's set, since those categories don't exist in a Node backend. |
| Language | **TypeScript, strict** | `strict: true` plus `noUncheckedIndexedAccess` — matches the backend's rigor. `verbatimModuleSyntax` forces type-only imports to say so explicitly, which keeps Vite's per-file transpilation (no full type-checker in the build step) safe. |
| Routing | **react-router v7** (data router) | Route-level code splitting via the `lazy` field — see `src/routes/router.tsx` — so a user who only ever visits the dashboard never downloads the login/MFA screens' JS. |
| Server state | **TanStack Query** | Caching, dedup, retry/backoff, and background refetch for anything hitting the backend beyond auth. Tuned defaults in `src/lib/query-client.ts` (30s staleTime, no retry on 401/403/404) instead of the out-of-the-box public-website defaults. |
| Client state | **Zustand** | One small store for the auth session (`src/auth/auth-store.ts`). No provider boilerplate, no unnecessary re-renders — appropriate for state this narrow; reach for something heavier only if/when there's a real reason to. |
| Styling | **Tailwind CSS v4** | Zero-runtime, tiny production CSS, and the CSS-variable design tokens in `src/styles/index.css` are the intended seam for dropping in the actual Claude Design system once it's pulled in — retheme from one file, not component-by-component. |
| Auth | **@react-oauth/google** | Thin, well-maintained wrapper around Google Identity Services — gets an ID token client-side, which is exactly what `igroom-backend`'s `POST /auth/google` expects to verify. |
| Tests | **Vitest + Testing Library** | Shares Vite's config/transform pipeline (no separate ts-jest setup to keep in sync), Jest-compatible API. |

## The auth flow this implements

Reverse-engineered from `igroom-backend/src/{routes,controllers,services}/auth*`:

1. `LoginPage` gets a Google ID token client-side, sends it to `POST /auth/google`. That endpoint
   never creates a user — only a pre-provisioned `bo_users` row can log in — and returns either
   `mfa_setup_required` (first login) or `mfa_challenge_required` (returning user), each with a
   short-lived (10 min) flow token.
2. `MfaSetupPage` (first login only) fetches a TOTP QR code, the user scans it into an
   authenticator app, and submits the resulting 6-digit code to enroll.
   `MfaChallengePage` (every login after) just asks for that code.
3. Either path ends with a real session: a 15-minute access token + a 30-day, single-use/rotating
   refresh token.
4. `src/lib/api-client.ts` attaches the access token to every non-auth request and transparently
   refreshes-and-retries once on a 401, de-duping concurrent refreshes into a single in-flight
   call (the backend's refresh tokens are single-use, so two simultaneous refreshes would race).
5. `src/auth/use-auth-bootstrap.ts` runs once on app load: if a refresh token persisted from a
   previous visit, it silently re-establishes the session (refresh → `/auth/me`) before
   `ProtectedRoute` decides whether to redirect to `/login`.

**Trade-off worth knowing about:** the backend returns the refresh token in the JSON response body
rather than an httpOnly cookie, so there's no XSS-proof place to store it client-side — it's
persisted (see `auth-store.ts`'s `partialize`) so returning users don't have to re-auth with
Google + TOTP on every visit. The access token is kept memory-only to shrink the exposure window.
If that trade-off isn't acceptable, the real fix is on the backend: issue the refresh token as an
httpOnly, `SameSite` cookie instead.

## Setup

```bash
cp .env.example .env
# fill in VITE_API_BASE_URL and VITE_GOOGLE_CLIENT_ID (must match
# igroom-backend's GOOGLE_CLIENT_ID exactly — same OAuth client)

pnpm install
pnpm dev
```

Other scripts: `pnpm typecheck`, `pnpm lint` / `pnpm lint:fix`, `pnpm fmt` / `pnpm fmt:check`,
`pnpm test`, `pnpm build`, `pnpm analyze` (bundle size breakdown via `stats.html`).

`pnpm prepare` (runs automatically after `pnpm install` on a git repo) wires up the same
husky + lint-staged pre-commit pattern as the backend.

> **Note on this scaffold:** it was generated in a cloud sandbox without access to the npm
> registry, so `pnpm install` has not been run or verified here — do that as the first step
> locally. If anything doesn't resolve cleanly (a version pin that's since moved, etc.), that's
> the one part of this scaffold that couldn't be verified end-to-end before landing.

## Design system

Theme (colors, fonts, spacing) is pulled directly from `Backoffice.dc.html`, a Claude Design
mockup — every value in `src/styles/index.css`'s `@theme` block is the mockup's own `oklch()`
number, registered as first-class Tailwind utilities (`bg-bo-surface`, `text-bo-ink`, `font-serif`,
etc.) rather than scattered inline. Login, MFA setup/challenge, the loading screen, and the
sidebar match the mockup's B0/B0.5/B0.6/B1–B8 frames. One exception: the mockup draws a custom
"Sign in with Google" button, but the real button (`@react-oauth/google`) is Google's own rendered
component — themed as close as their API allows (outline, pill), but not pixel-identical, since
restyling it further would break the ID-token flow the backend verifies.

All eight sidebar sections from the mockup (B1–B8: Overview, Usage & Notifications,
Shops/Accounts, Billing & Plans, Bookings & Waitlist, Support Tickets, Referrals & Rewards,
Platform Settings) are built out — stat cards, charts (`MiniLineChart.tsx`, `DonutChart.tsx`),
tables, and the settings list all match their frames. Every number on every page is the mockup's
own illustrative data (shared shop list lives in `src/lib/sample-data.ts` so Overview and
Shops/Accounts, which show the same 4 shops in the mockup, don't drift from each other) — none of
it is live, since igroom-backend doesn't have metrics/shops/billing/support endpoints yet. The
Shops/Accounts search box does filter the sample list client-side as a small bit of real
behavior; Platform Settings' rows are inert (no target screens exist to link to).

## Still to do

- Wire each page's sample data up to a real backend endpoint as those endpoints get built —
  every page is structured to swap in a TanStack Query hook (see `src/lib/query-client.ts`)
  in place of its `SAMPLE_*`/hardcoded rows.
- Role-aware navigation/route guards — `bo_roles`/`bo_permissions` exist on the backend already
  but nothing here reads them yet; right now every authenticated user sees every sidebar item.
- Platform Settings' five rows need actual destination screens.
