-- ─────────────────────────────────────────
-- Grants for the authenticated role
-- RLS policies (002_rls.sql) only control which *rows* the
-- authenticated role can see once it already has table-level
-- access. Without an explicit GRANT, Postgres rejects the query
-- before RLS is evaluated at all ("permission denied for table X").
-- ─────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  users,
  courses,
  course_enrollments,
  sessions,
  attendance,
  subscriptions
TO authenticated;

-- No RLS on plans (reference/lookup table) — read-only is enough.
GRANT SELECT ON plans TO authenticated;
