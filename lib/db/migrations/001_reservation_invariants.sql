-- Hard-DB guarantees that Drizzle cannot express as table columns.
-- Run after `pnpm --filter @workspace/db run push` on every fresh database.
-- Idempotent: safe to re-run.

-- 1) btree_gist lets us combine an equality predicate (uuid) with a range predicate (daterange) inside one EXCLUDE constraint.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2) Hard overlap prevention. Two reservations on the same property cannot have overlapping date ranges
--    when either is in pending_payment or confirmed. End date is exclusive, so [Aug 1, Aug 8) and
--    [Aug 8, Aug 12) are allowed (back-to-back stays).
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_no_overlap;
ALTER TABLE reservations
  ADD CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (
    property_id WITH =,
    daterange(start_date, end_date, '[)') WITH &&
  )
  WHERE (status IN ('pending_payment', 'confirmed'));

-- 3) Public, read-only calendar view. Exposes only confirmed bookings (no user, no pricing).
CREATE OR REPLACE VIEW calendar_public AS
SELECT property_id, start_date, end_date
FROM reservations
WHERE status = 'confirmed';

GRANT SELECT ON calendar_public TO PUBLIC;
