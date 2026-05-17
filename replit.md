# GoMindscout

A two-sided mentorship marketplace connecting ambitious professionals with real industry experts. Mentees can discover, book, and pay for 1-on-1 sessions with vetted mentors.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied via /api)
- `pnpm --filter @workspace/mentorbridge run dev` — run the frontend (port 20292, proxied via /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts exec tsx /home/runner/workspace/lib/db/src/seed.ts` — seed dev data
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, Wouter routing, shadcn/ui, TanStack Query
- Auth: Clerk (@clerk/react + @clerk/express)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (lib/db)
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec in lib/api-spec)
- Payments: Stripe Checkout (15% platform fee)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all endpoints)
- `lib/api-client-react/src/generated/api.ts` — generated hooks (DO NOT EDIT manually)
- `lib/api-client-react/src/custom-fetch.ts` — fetch wrapper with auth token support
- `lib/db/src/schema/` — Drizzle ORM schemas (users, categories, mentor-profiles, packages, bookings, reviews)
- `lib/db/src/seed.ts` — seed script for dev data
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/api-server/src/lib/auth.ts` — requireAuth, getUserByClerkId, getOrCreateUser
- `artifacts/mentorbridge/src/pages/` — React pages (all routes)
- `artifacts/mentorbridge/src/components/` — Shared components (Navbar, Footer, MentorCard, etc.)
- `artifacts/mentorbridge/src/App.tsx` — Wouter router + Clerk provider setup

## Architecture decisions

- Contract-first API: OpenAPI spec drives codegen for React Query hooks and Zod schemas. Always update the spec before adding new endpoints.
- Stripe is optional at startup — if STRIPE_SECRET_KEY is missing, bookings auto-confirm (dev mode).
- Auth via Clerk proxy: frontend uses Clerk's React SDK, backend uses @clerk/express middleware. The proxy path is /api/__clerk.
- Platform fee is 15% applied at booking creation, stored as `platform_fee` on each booking.
- Demo mentors use fake clerkIds (demo_mentor_1..6) and will never match real logged-in users.

## Product

- **Homepage**: Hero search, category grid, featured mentors, how-it-works, testimonials, CTA
- **Mentor Discovery** (/mentors): Search + filter by category, price, language. Paginated grid.
- **Mentor Profile** (/mentors/:id): Full bio, expertise, intro video, packages, reviews
- **Booking Flow** (/book/:packageId → Stripe → /payment/success): Auth-protected, Stripe checkout
- **Mentee Dashboard** (/dashboard): Bookings, stats, review submission
- **Mentor Dashboard** (/mentor/dashboard): Sessions, earnings, add meeting links, mark complete
- **Mentor Onboarding** (/mentor/onboarding): Profile + default packages creation
- **Admin Panel** (/admin): Approve/reject/feature mentors, view all bookings + stats
- **Marketing pages**: /about, /how-it-works, /become-a-mentor, /terms, /privacy, /contact

## User preferences

- Keep MVP simple and working end-to-end. No mock data in the UI.
- No emojis in UI components. data-testid on all interactive elements.
- Use Replit-native infrastructure only (no Supabase, Vercel, etc.)

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after editing openapi.yaml
- API server must build before starting — `pnpm run build` inside api-server runs esbuild
- Stripe: set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET env vars for payments. Without them, bookings auto-confirm in dev.
- The routes index mounts packagesRouter at BOTH /api/packages AND /api/mentors (for /mentors/:id/packages path)
- Clerk proxy middleware must be before express.json() and clerkMiddleware
- DB seed: `pnpm --filter @workspace/scripts exec tsx /home/runner/workspace/lib/db/src/seed.ts`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
