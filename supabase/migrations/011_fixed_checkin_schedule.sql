-- ─────────────────────────────────────────
-- Optional recurring check-in schedule per course. When enabled, the
-- teacher gets one permanent, printable QR code (encoding the course id,
-- not a session token) instead of starting a new session by hand at every
-- class meeting. day_of_week follows Postgres's EXTRACT(DOW) convention:
-- 0 = Sunday .. 6 = Saturday.
-- ─────────────────────────────────────────

ALTER TABLE courses ADD COLUMN fixed_checkin_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE course_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_course_schedules_course_id ON course_schedules(course_id);

ALTER TABLE course_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_schedules_teacher_all" ON course_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = course_schedules.course_id
      AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "course_schedules_attendee_select" ON course_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_id = course_schedules.course_id
      AND attendee_id = auth.uid()
    )
  );
