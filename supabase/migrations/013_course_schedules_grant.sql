-- ─────────────────────────────────────────
-- course_schedules (011) was created after 003_grants.sql, so the
-- authenticated role never got table-level access to it — RLS alone
-- isn't enough, see 003_grants.sql's note.
-- ─────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON course_schedules TO authenticated;
