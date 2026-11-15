-- Website tables are served by Express. Supabase Auth only supplies identities.
-- Supabase may grant new public tables to its browser roles by default.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','properties','reservations','pricing_seasons',
    'discount_rules','admin_actions','booking_emails']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;
