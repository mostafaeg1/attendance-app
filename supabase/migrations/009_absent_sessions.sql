-- ─────────────────────────────────────────
-- Let attendees see every session (not just active ones) for courses
-- they're enrolled in, so the mobile app can show ended sessions they
-- never checked into as "absent" in the attendance history.
-- ─────────────────────────────────────────

DROP POLICY IF EXISTS "sessions_attendee_select" ON sessions;

CREATE POLICY "sessions_attendee_select" ON sessions
  FOR SELECT USING (
    public.attendee_has_attendance(id)
    OR EXISTS (
      SELECT 1 FROM course_enrollments ce
      WHERE ce.course_id = sessions.course_id
      AND ce.attendee_id = auth.uid()
    )
  );
