/*
# ForgeGym — Add password_plain column to users table

Supports the Super Admin requirement to "see the password to log in to a
different gym". Because `password_hash` is a one-way bcrypt hash, a
previously-set password can never be recovered by the auth layer. To let the
Super Admin retrieve a gym admin's current credential from the panel, the
plaintext is stored at the moment a password is set or reset.

IMPORTANT (security trade-off):
- `password_plain` is DISPLAY-ONLY. Authentication continues to use the
  bcrypt `password_hash` column exclusively (see app/api/auth/login).
- It is only ever returned by Super-Admin-scoped endpoints
  (GET /api/gyms and GET /api/gyms/[id]); it is never returned on the gym
  admin's own dashboard.
- In a hardened/production deployment this column should be omitted in favour
  of one-time temp-password sharing. It exists here to satisfy the explicit
  "see password" requirement of this admin tooling.
*/

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_plain text;

-- Index helps locate GYM_ADMIN rows whose credential is still retrievable.
CREATE INDEX IF NOT EXISTS idx_users_password_plain ON users (password_plain)
  WHERE password_plain IS NOT NULL;