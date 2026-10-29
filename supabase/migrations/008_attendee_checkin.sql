-- ─────────────────────────────────────────
-- Let attendees check in via QR scan (mobile app) and see their own
-- attendance history — including sessions that have since ended.
-- ─────────────────────────────────────────

-- SECURITY DEFINER: mirrors is_course_teacher() from 004 — breaks the
-- sessions <-> attendance RLS cycle the same way (a plain EXISTS subquery
-- here would re-trigger attendance's policies, which subquery sessions).
CREATE OR REPLACE FUNCTION public.attendee_has_attendance(target_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM attendance
    WHERE session_id = target_session_id AND attendee_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.attendee_has_attendance(UUID) TO authenticated;

-- Attendees can see a session if they attended it (any time, including
-- past/ended sessions — needed for attendance history) or if it's a
-- currently active session for a course they're enrolled in.
DROP POLICY IF EXISTS "sessions_attendee_select" ON sessions;

CREATE POLICY "sessions_attendee_select" ON sessions
  FOR SELECT USING (
    public.attendee_has_attendance(id)
    OR (
      is_active = true AND
      EXISTS (
        SELECT 1 FROM course_enrollments ce
        WHERE ce.course_id = sessions.course_id
        AND ce.attendee_id = auth.uid()
      )
    )
  );

-- Checking in: looks up the session by its QR token, auto-enrolls the
-- attendee in the course if needed, and records attendance. SECURITY
-- DEFINER so this doesn't need a broad "attendees can read any session by
-- token" policy (which RLS can't scope to "only the one they queried for"
-- anyway) or a standalone attendee-INSERT policy on attendance — the
-- token itself is the authorization, and this function is the only path
-- that needs to act on it.
-- Output columns are prefixed (out_*) because RETURNS TABLE column names
-- become PL/pgSQL variables in scope for the whole function body — plain
-- `session_id`/`course_id` here would collide with the real columns of
-- the same name on `sessions`/`attendance`/`course_enrollments`, making
-- statements like `ON CONFLICT (course_id, ...)` ambiguous.
CREATE OR REPLACE FUNCTION public.check_in(p_token TEXT)
RETURNS TABLE (
  out_session_id UUID,
  out_course_id UUID,
  out_session_title TEXT,
  out_already_checked_in BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_already BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT s.id, s.course_id, s.title, s.is_active
  INTO v_session
  FROM sessions s
  WHERE s.static_token = p_token;

  IF v_session.id IS NULL THEN
    -- P0001 (not P0002) so PostgREST maps this to a 400, not a 500 — a
    -- bad/nonexistent QR token is a client-input problem, not a server
    -- failure, and P0001 is the one exception class PostgREST special-
    -- cases as a plain user-facing error.
    RAISE EXCEPTION 'Session not found' USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_session.is_active THEN
    RAISE EXCEPTION 'This session has ended' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO course_enrollments (course_id, attendee_id)
  VALUES (v_session.course_id, auth.uid())
  ON CONFLICT (course_id, attendee_id) DO NOTHING;

  INSERT INTO attendance (session_id, attendee_id, status, scan_method, time_valid)
  VALUES (v_session.id, auth.uid(), 'present', 'app', true)
  ON CONFLICT (session_id, attendee_id) DO NOTHING;

  v_already := NOT FOUND;

  RETURN QUERY SELECT v_session.id, v_session.course_id, v_session.title, v_already;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_in(TEXT) TO authenticated;
