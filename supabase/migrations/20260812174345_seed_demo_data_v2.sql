/*
# Seed: Membership Plans, Members, Attendance, Payments

## Overview
Intentionally EMPTY. All demo/sample data (membership plans, members,
attendance records, and payment records) has been removed so the platform
starts at ZERO.

There are NO rows in: membership_plans, members, attendance, or payments
until a Super Admin creates a gym and gym data is entered through the app.

This file is intentionally kept (as a no-op) so the migration history
stays linear and `supabase db reset` still applies cleanly.
*/

-- No seed data is inserted on a clean install. Add gyms and members
-- through the application UI.
