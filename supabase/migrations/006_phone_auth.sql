-- ─────────────────────────────────────────
-- Support phone-based attendee accounts (mobile app).
-- Teachers still sign up with email (web app); attendees now sign up/in
-- with a phone number + OTP, which has no email at all — so email must
-- become optional, and we need somewhere to store the phone number.
-- ─────────────────────────────────────────

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN phone TEXT UNIQUE;

ALTER TABLE users ADD CONSTRAINT users_email_or_phone_check
  CHECK (email IS NOT NULL OR phone IS NOT NULL);
