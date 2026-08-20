/*
# ForgeGym — Add password_temp flag to users table

Supports the gym admin password reset flow: when a Super Admin resets a gym's
admin password (or a gym admin resets their own), the new password is a
temporary credential that should be changed at first login. The `password_temp`
flag tracks this so the UI can prompt the user.
*/

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_temp boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_password_temp ON users (password_temp)
  WHERE password_temp = true;