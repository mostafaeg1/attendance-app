-- ─────────────────────────────────────────
-- Checking in via the permanent, printable "fixed" QR code (one per course,
-- encoding the course id rather than a session token). Mirrors check_in()
-- from 008_attendee_checkin.sql, but finds-or-creates *today's* session for
-- the course instead of looking one up by token — so a teacher who's
-- enabled a recurring schedule never has to start a session by hand.
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fixed_check_in(p_course_id UUID)
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
  v_today DATE := current_date;
  v_dow SMALLINT := EXTRACT(DOW FROM current_date);
  v_schedule RECORD;
  v_session RECORD;
  v_already BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_schedule
  FROM course_schedules
  WHERE course_id = p_course_id AND day_of_week = v_dow
  ORDER BY start_time
  LIMIT 1;

  IF v_schedule.id IS NULL THEN
    RAISE EXCEPTION 'No session is scheduled for today' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.id, s.course_id, s.title, s.is_active
  INTO v_session
  FROM sessions s
  WHERE s.course_id = p_course_id AND s.date = v_today
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_session.id IS NULL THEN
    INSERT INTO sessions (course_id, teacher_id, title, date, start_time, qr_mode, static_token, is_active)
    SELECT p_course_id, c.teacher_id, 'Scheduled session', v_today, v_schedule.start_time, 'static', gen_random_uuid()::text, true
    FROM courses c
    WHERE c.id = p_course_id
    RETURNING id, course_id, title, is_active INTO v_session;
  ELSIF NOT v_session.is_active THEN
    UPDATE sessions SET is_active = true WHERE id = v_session.id;
  END IF;

  INSERT INTO course_enrollments (course_id, attendee_id)
  VALUES (p_course_id, auth.uid())
  ON CONFLICT (course_id, attendee_id) DO NOTHING;

  INSERT INTO attendance (session_id, attendee_id, status, scan_method, time_valid)
  VALUES (v_session.id, auth.uid(), 'present', 'app', true)
  ON CONFLICT (session_id, attendee_id) DO NOTHING;

  v_already := NOT FOUND;

  RETURN QUERY SELECT v_session.id, p_course_id, v_session.title, v_already;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fixed_check_in(UUID) TO authenticated;
