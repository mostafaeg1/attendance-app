-- ─────────────────────────────────────────
-- Fix infinite recursion between courses and course_enrollments RLS
-- ─────────────────────────────────────────
-- courses_attendee_select (on courses) queries course_enrollments, and
-- enrollments_teacher_select (on course_enrollments) queries courses right
-- back. Postgres re-evaluates a table's RLS policies on every cross-table
-- reference to it, so the two policies loop forever (error 42P17).
--
-- Fix: move the courses lookup into a SECURITY DEFINER function. It's owned
-- by the migration role, which bypasses RLS on tables it owns, so the
-- function's internal query against courses does not re-trigger courses'
-- policies — breaking the cycle.

CREATE OR REPLACE FUNCTION public.is_course_teacher(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM courses
    WHERE id = target_course_id AND teacher_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_course_teacher(UUID) TO authenticated;

DROP POLICY IF EXISTS "enrollments_teacher_select" ON course_enrollments;

CREATE POLICY "enrollments_teacher_select" ON course_enrollments
  FOR SELECT USING (public.is_course_teacher(course_id));
