-- ─────────────────────────────────────────
-- The course description field was removed from the app (no longer
-- collected or shown anywhere) — dropping the now-dead column.
-- ─────────────────────────────────────────

ALTER TABLE courses DROP COLUMN description;
