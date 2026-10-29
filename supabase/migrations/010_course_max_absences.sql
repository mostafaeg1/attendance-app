-- ─────────────────────────────────────────
-- Optional per-course cap on allowed absences, used to flag students in
-- the attendees table who are at or over the limit.
-- ─────────────────────────────────────────

ALTER TABLE courses ADD COLUMN max_absences INTEGER;
