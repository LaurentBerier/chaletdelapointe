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

## ChaletDeLaPointe — Reservation Engine

Premium Airbnb-style rental site for Chalet St-Mathieu (Saint-Mathieu-de-Rioux, Québec). Multi-property architecture, one active listing.

### Database tables (`lib/db/src/schema/`)
- `users` — id, email, name, group, auth_user_id, can_approve, is_vip, is_admin
- `properties` — multi-property ready, slug-keyed
- `pricing_seasons` — date-range rows per property/season (haute/mi/basse) with `base_price_per_night` (integer CAD, whole dollars)
- `discount_rules` — per (property, season, applicable_group, requires_vip) with discount_percentage (0-100)
- `reservations` — start_date, end_date (exclusive checkout), nights, subtotal, discount_amount, total, status (`draft|pending_payment|pending_approval|confirmed|rejected|cancelled|expired`), `season_breakdown` jsonb
- `admin_actions` — audit log of every admin override

### Hard guarantees
- **No double-booking**: PostgreSQL `EXCLUDE USING gist` constraint on `(property_id, daterange(start_date, end_date, '[)'))` filtered to `pending_payment|pending_approval|confirmed`. Requires `btree_gist` extension. Returns 409 to clients.
- The calendar API lists held and confirmed date ranges. Verified owners also receive the booking owner's name for confirmed stays.

### Owner pilot

Supabase Auth sends email sign-in links. Express verifies each bearer token against the project's Auth service and loads the linked owner by Supabase user ID. Registration is invite-only. Enable the email provider and disable public signup in Supabase Auth.

Set `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `WEBSITE_URL`, `SMTP_URL`, and `BOOKING_EMAIL_FROM` in the server environment. Add the site's `/connexion` callback to the Supabase redirect allowlist. Configure the Auth email sender in Supabase separately. For a fresh development database, run the database push and both invariant scripts, then create the active property with slug `chalet-saint-mathieu` and its guest capacity.

For hosted Supabase, set `DATABASE_CA_CERT` to the PEM certificate downloaded from Database Settings and leave SSL options out of `DATABASE_URL` so the server verifies the pool's certificate. Give the web server a restricted database role. A Vercel preview can use its deployment URL for review links if `WEBSITE_URL` is unset.

To invite a single owner, run `node lib/db/scripts/invite-owner.mjs EMAIL NAME [--approver]` with the intended project's provisioning environment (a database role that can read Auth identities and manage owner profiles) and `SUPABASE_SECRET_KEY`. The server uses `can_approve` to send approval requests and authorize decisions. A single decision finalizes each request. Booking email is queued in the reservation transaction and retried after bookings, reviews, and dashboard visits.

### Pricing engine (`artifacts/api-server/src/lib/pricing.ts`)
Iterates each night between start/end (exclusive end), looks up the matching pricing_season row, finds the best discount rule for `(season, user.group, user.is_vip)`, and aggregates a per-season breakdown. Errors as `PricingError` with proper HTTP status.

### API endpoints (`/api`, defined in `lib/api-spec/openapi.yaml`)
- `GET /properties`, `GET /properties/{id}` — public
- `POST /reservations/quote` — anonymous-ok price preview
- `POST /reservations`, `GET /reservations`, `GET /reservations/{id}`, `POST /reservations/{id}/cancel` — authenticated
- `GET /calendar/{propertyId}` — public date ranges, approved names for signed-in owners
- `GET /admin/reservations`, `POST /admin/reservations/{id}/confirm`, `POST /admin/reservations/{id}/cancel`, `PATCH /admin/reservations/{id}` — admin only, all logged in `admin_actions`

- `GET /me` — signed-in owner profile
- `GET /reviews`, `POST /reviews/{id}` — selected approvers

### Historical demo seed data
- 1 property (`chalet-saint-mathieu`)
- 12 pricing_seasons covering 2026-2027 (haute Jul/Aug + Christmas, mi shoulder, basse low)
- 10 discount rules (proprietaire 100%, ancien_proprietaire 25-40%, famille 20-30% + VIP 50% in haute, ami 10-15%)
- 4 demo users: admin, famille VIP, famille standard, public
