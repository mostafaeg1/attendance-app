-- ─────────────────────────────────────────
-- QR Attendance App — Database Schema
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────

-- ── Users ────────────────────────────────
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('teacher', 'attendee')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Courses ──────────────────────────────
CREATE TABLE courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  subject_code  TEXT,
  description   TEXT,
  is_archived   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);

-- ── Course Enrollments ───────────────────
CREATE TABLE course_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  attendee_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, attendee_id)
);

CREATE INDEX idx_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX idx_enrollments_attendee_id ON course_enrollments(attendee_id);

-- ── Sessions ─────────────────────────────
CREATE TABLE sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id          UUID NOT NULL REFERENCES users(id),
  title               TEXT,
  date                DATE NOT NULL,
  start_time          TIMETZ NOT NULL,
  end_time            TIMETZ,
  qr_mode             TEXT NOT NULL CHECK (qr_mode IN ('static', 'rotating')),
  static_token        TEXT UNIQUE,
  location_enabled    BOOLEAN DEFAULT false,
  location_lat        DECIMAL(9,6),
  location_lng        DECIMAL(9,6),
  location_radius_m   INTEGER,
  is_active           BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_course_id ON sessions(course_id);
CREATE INDEX idx_sessions_teacher_id ON sessions(teacher_id);
CREATE INDEX idx_sessions_static_token ON sessions(static_token);

-- ── Attendance ───────────────────────────
CREATE TABLE attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  attendee_id     UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
  scan_method     TEXT CHECK (scan_method IN ('app', 'web', 'manual')),
  location_valid  BOOLEAN,
  time_valid      BOOLEAN,
  scanned_at      TIMESTAMPTZ DEFAULT now(),
  note            TEXT,
  UNIQUE(session_id, attendee_id)
);

CREATE INDEX idx_attendance_session_id ON attendance(session_id);
CREATE INDEX idx_attendance_attendee_id ON attendance(attendee_id);

-- ── Plans ────────────────────────────────
CREATE TABLE plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT UNIQUE NOT NULL CHECK (name IN ('free', 'pro')),
  price_monthly    INTEGER NOT NULL,
  price_annual     INTEGER NOT NULL,
  max_courses      INTEGER,
  max_sessions_pm  INTEGER,
  max_attendees    INTEGER,
  features         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now()
);

INSERT INTO plans (name, price_monthly, price_annual, max_courses, max_sessions_pm, max_attendees, features)
VALUES
  ('free', 0, 0, 2, 10, 30,
   '{"rotating_qr": false, "location_constraint": false, "export": false}'),
  ('pro',  999, 7999, NULL, NULL, NULL,
   '{"rotating_qr": true, "location_constraint": true, "export": true}');

-- ── Subscriptions ────────────────────────
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id              UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id                 UUID NOT NULL REFERENCES plans(id),
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  status                  TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'free')),
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_teacher_id ON subscriptions(teacher_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
