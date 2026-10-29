-- ─────────────────────────────────────────
-- Optional per-session location constraint — sessions.location_enabled/
-- location_lat/location_lng/location_radius_m were scaffolded in
-- 001_schema.sql but never wired up. This adds a Haversine-distance helper
-- and extends check_in() to require and validate the student's device
-- coordinates when a session has it enabled, rejecting scans from outside
-- the allowed radius outright (no attendance row gets created).
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.haversine_meters(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 6371000 * acos(
    LEAST(1.0, GREATEST(-1.0,
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    ))
  );
$$;

DROP FUNCTION IF EXISTS public.check_in(TEXT);

CREATE OR REPLACE FUNCTION public.check_in(
  p_token TEXT,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL
)
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
  v_distance DOUBLE PRECISION;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT s.id, s.course_id, s.title, s.is_active,
         s.location_enabled, s.location_lat, s.location_lng, s.location_radius_m
  INTO v_session
  FROM sessions s
  WHERE s.static_token = p_token;

  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'Session not found' USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_session.is_active THEN
    RAISE EXCEPTION 'This session has ended' USING ERRCODE = 'P0001';
  END IF;

  IF v_session.location_enabled THEN
    IF p_lat IS NULL OR p_lng IS NULL THEN
      RAISE EXCEPTION 'Location is required to check in to this session' USING ERRCODE = 'P0001';
    END IF;

    v_distance := public.haversine_meters(
      v_session.location_lat, v_session.location_lng, p_lat, p_lng
    );

    IF v_distance > v_session.location_radius_m THEN
      RAISE EXCEPTION 'You are too far from the session location' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO course_enrollments (course_id, attendee_id)
  VALUES (v_session.course_id, auth.uid())
  ON CONFLICT (course_id, attendee_id) DO NOTHING;

  INSERT INTO attendance (session_id, attendee_id, status, scan_method, time_valid, location_valid)
  VALUES (
    v_session.id, auth.uid(), 'present', 'app', true,
    CASE WHEN v_session.location_enabled THEN true ELSE NULL END
  )
  ON CONFLICT (session_id, attendee_id) DO NOTHING;

  v_already := NOT FOUND;

  RETURN QUERY SELECT v_session.id, v_session.course_id, v_session.title, v_already;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_in(TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
