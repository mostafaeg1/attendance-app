-- ─────────────────────────────────────────
-- plans was created without RLS in 001_schema.sql, leaving it fully
-- writable by anyone with the anon key. Pricing tiers are meant to be
-- publicly readable but never client-writable.
-- ─────────────────────────────────────────

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_public_select ON plans
  FOR SELECT
  TO anon, authenticated
  USING (true);
