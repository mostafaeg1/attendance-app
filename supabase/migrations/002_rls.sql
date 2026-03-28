-- ─────────────────────────────────────────
-- Row Level Security (RLS) Policies
-- Ensures users can only access their own data
-- ─────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ── Users ────────────────────────────────
-- Users can only read and update their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ── Courses ──────────────────────────────
-- Teachers can CRUD their own courses
CREATE POLICY "courses_teacher_all" ON courses
  FOR ALL USING (auth.uid() = teacher_id);

-- Attendees can view courses they're enrolled in
CREATE POLICY "courses_attendee_select" ON courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_id = courses.id
      AND attendee_id = auth.uid()
    )
  );

-- ── Course Enrollments ───────────────────
-- Teachers can view enrollments for their courses
CREATE POLICY "enrollments_teacher_select" ON course_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = course_enrollments.course_id
      AND teacher_id = auth.uid()
    )
  );

-- Attendees can manage their own enrollments
CREATE POLICY "enrollments_attendee_all" ON course_enrollments
  FOR ALL USING (auth.uid() = attendee_id);

-- ── Sessions ─────────────────────────────
-- Teachers can CRUD their own sessions
CREATE POLICY "sessions_teacher_all" ON sessions
  FOR ALL USING (auth.uid() = teacher_id);

-- Attendees can view active sessions for their courses
CREATE POLICY "sessions_attendee_select" ON sessions
  FOR SELECT USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_id = sessions.course_id
      AND attendee_id = auth.uid()
    )
  );

-- ── Attendance ───────────────────────────
-- Teachers can view and update attendance for their sessions
CREATE POLICY "attendance_teacher_all" ON attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE id = attendance.session_id
      AND teacher_id = auth.uid()
    )
  );

-- Attendees can view their own attendance
CREATE POLICY "attendance_attendee_select" ON attendance
  FOR SELECT USING (auth.uid() = attendee_id);

-- ── Subscriptions ────────────────────────
-- Teachers can only view their own subscription
CREATE POLICY "subscriptions_teacher_select" ON subscriptions
  FOR SELECT USING (auth.uid() = teacher_id);
