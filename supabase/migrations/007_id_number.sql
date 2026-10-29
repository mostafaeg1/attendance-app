-- ─────────────────────────────────────────
-- First-time attendees complete their profile (full name + ID number)
-- after verifying their phone OTP, before reaching the app.
-- ─────────────────────────────────────────

ALTER TABLE users ADD COLUMN id_number TEXT UNIQUE;
