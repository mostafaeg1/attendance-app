-- ─────────────────────────────────────────
-- fixed_check_in() compared the scheduled start_time (a naive wall-clock
-- value the teacher typed) against the *database server's* local time —
-- which runs in UTC, not the teacher's timezone. A teacher scheduling
-- "4:00 PM" in Asia/Jerusalem (UTC+3) had their check-in window silently
-- evaluated 3 hours off. Storing the course's IANA timezone lets the
-- function do all date/day/time math in the classroom's actual timezone.
-- ─────────────────────────────────────────

ALTER TABLE courses ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';

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
  v_course RECORD;
  v_local_now TIMESTAMP;
  v_today DATE;
  v_dow SMALLINT;
  v_schedule RECORD;
  v_session RECORD;
  v_already BOOLEAN;
  v_now_time TIME;
  v_window_start TIME;
  v_window_end TIME;
  v_within_window BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT id, timezone, checkin_window_before_minutes, checkin_window_after_minutes
  INTO v_course
  FROM courses
  WHERE id = p_course_id;

  IF v_course.id IS NULL THEN
    RAISE EXCEPTION 'Course not found' USING ERRCODE = 'P0001';
  END IF;

  v_local_now := now() AT TIME ZONE v_course.timezone;
  v_today := v_local_now::date;
  v_dow := EXTRACT(DOW FROM v_today);
  v_now_time := v_local_now::time;

  SELECT * INTO v_schedule
  FROM course_schedules
  WHERE course_id = p_course_id AND day_of_week = v_dow
  ORDER BY start_time
  LIMIT 1;

  IF v_schedule.id IS NULL THEN
    RAISE EXCEPTION 'No session is scheduled for today' USING ERRCODE = 'P0001';
  END IF;

  v_window_start := v_schedule.start_time - make_interval(mins => v_course.checkin_window_before_minutes);
  v_window_end := v_schedule.start_time + make_interval(mins => v_course.checkin_window_after_minutes);

  IF v_window_start <= v_window_end THEN
    v_within_window := v_now_time BETWEEN v_window_start AND v_window_end;
  ELSE
    -- window wraps past midnight
    v_within_window := v_now_time >= v_window_start OR v_now_time <= v_window_end;
  END IF;

  IF NOT v_within_window THEN
    RAISE EXCEPTION 'Check-in is only open near the scheduled session time' USING ERRCODE = 'P0001';
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
