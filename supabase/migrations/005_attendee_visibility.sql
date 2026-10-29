-- ─────────────────────────────────────────
-- Let teachers see attendee profiles for students enrolled in
-- their own courses. Without this, users_select_own (002_rls.sql)
-- blocks teachers from reading any users row but their own, so a
-- course_enrollments -> users join returns no name/email at all.
-- ─────────────────────────────────────────

CREATE POLICY "users_select_enrolled_by_teacher" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_enrollments ce
      WHERE ce.attendee_id = users.id
      AND public.is_course_teacher(ce.course_id)
    )
  );
