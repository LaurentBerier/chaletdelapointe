# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## ChaletDeLaPointe — Reservation Engine (Phase 2)

Premium Airbnb-style rental site for Chalet St-Mathieu (Saint-Mathieu-de-Rioux, Québec). Multi-property architecture, one active listing.

### Database tables (`lib/db/src/schema/`)
- `users` — id, email, name, group, is_vip, is_admin
- `properties` — multi-property ready, slug-keyed
- `pricing_seasons` — date-range rows per property/season (haute/mi/basse) with `base_price_per_night` (integer CAD, whole dollars)
- `discount_rules` — per (property, season, applicable_group, requires_vip) with discount_percentage (0-100)
- `reservations` — start_date, end_date (exclusive checkout), nights, subtotal, discount_amount, total, status (`draft|pending_payment|confirmed|cancelled|expired`), `season_breakdown` jsonb
- `admin_actions` — audit log of every admin override

### Hard guarantees
- **No double-booking**: PostgreSQL `EXCLUDE USING gist` constraint on `(property_id, daterange(start_date, end_date, '[)'))` filtered to `pending_payment|confirmed`. Requires `btree_gist` extension. Returns 409 to clients.
- **Public calendar**: `calendar_public` SQL view exposes only confirmed `(property_id, start_date, end_date)` — no user info, no pricing.

### Authorization model
Replaced Supabase-style RLS with middleware-based RBAC (`artifacts/api-server/src/middlewares/auth.ts`). Mock auth via `X-User-Id` header for now — pluggable for real auth in Phase 3. `requireAuth` and `requireAdmin` middleware gate routes. Owner-or-admin checks happen in route handlers.

### Pricing engine (`artifacts/api-server/src/lib/pricing.ts`)
Iterates each night between start/end (exclusive end), looks up the matching pricing_season row, finds the best discount rule for `(season, user.group, user.is_vip)`, and aggregates a per-season breakdown. Errors as `PricingError` with proper HTTP status.

### API endpoints (`/api`, defined in `lib/api-spec/openapi.yaml`)
- `GET /properties`, `GET /properties/{id}` — public
- `POST /reservations/quote` — anonymous-ok price preview
- `POST /reservations`, `GET /reservations`, `GET /reservations/{id}`, `POST /reservations/{id}/cancel` — authenticated
- `GET /calendar/{propertyId}` — public, confirmed only
- `GET /admin/reservations`, `POST /admin/reservations/{id}/confirm`, `POST /admin/reservations/{id}/cancel`, `PATCH /admin/reservations/{id}` — admin only, all logged in `admin_actions`

### Seed data
- 1 property (`chalet-saint-mathieu`)
- 12 pricing_seasons covering 2026-2027 (haute Jul/Aug + Christmas, mi shoulder, basse low)
- 10 discount rules (proprietaire 100%, ancien_proprietaire 25-40%, famille 20-30% + VIP 50% in haute, ami 10-15%)
- 4 demo users: admin, famille VIP, famille standard, public

### Phase 2 deviations from spec
- **No Stripe** (Phase 3 per spec)
- **No real auth** — mock via `X-User-Id` header (Phase 3)
- **RLS replaced by middleware RBAC** — same security guarantees, idiomatic for Express+Drizzle stack
