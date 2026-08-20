/*
# Seed: Super Admin User

## Overview
Seeds a single Super Admin account so the platform can be administered.
ALL demo/sample data (10 demo gyms, 10 gym-admin accounts, and all
membership-plan / member / attendance / payment rows) has been removed so
the platform starts at zero.

Gyms are added from the Super Admin panel (Gyms -> Add Gym), which also
auto-creates a per-gym GYM_ADMIN account with a random temporary password
that is shown once so the super admin can share it with the gym owner.

## Tables Modified
- users: 1 row inserted (SUPER_ADMIN only)

## Security
- Password is a bcrypt hash (cost factor 10), never plaintext
- Super Admin has gym_id = null (access to all gyms)
*/

-- Super Admin — the only seeded account; required to log in and manage gyms.
INSERT INTO users (username, password_hash, role, gym_id, name, status)
VALUES
  ('superadmin', '$2b$10$u4ZBfklNc47qi3QL.Z6qL.Qvg496nr.kUdjnqZUi8LC/FH3p8IXRa', 'SUPER_ADMIN', null, 'System Administrator', 'active')
ON CONFLICT (username) DO NOTHING;
