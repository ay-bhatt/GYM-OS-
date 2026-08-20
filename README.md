# ForgeGym — Gym Management SaaS

A production-ready multi-tenant gym management platform. Each gym operates in complete isolation with its own members, membership plans, attendance, and payments. A Super Admin oversees all gyms from a single dashboard.

## Tech Stack

- **Frontend:** Next.js 13 (App Router), React, TypeScript, Tailwind CSS
- **UI:** Lucide icons, Framer Motion, Recharts, React Three Fiber (login page only)
- **Backend:** Next.js API routes (Node.js runtime)
- **Database:** PostgreSQL via Supabase
- **Auth:** JWT sessions (jose), bcryptjs password hashing, HttpOnly cookies
- **QR:** qrcode (generation), html5-qrcode (scanning)

## Administrator Credentials

The platform ships with **no demo data** — zero gyms, members, or plans. Log in
with the single seeded Super Admin account, then create gyms from the
Super Admin panel (each new gym auto-creates its own gym admin account).

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `superadmin` | `Super@2026#Admin` |

## Local Development

This project uses **Supabase Local Development** (Docker-based) for a fully
self-contained local environment — no external Supabase project or service
role key is required.

### Prerequisites

- **Docker Desktop** (running) — [install](https://docs.docker.com/desktop/)
- **Node.js** v18+ and npm
- **Supabase CLI** — install globally:
  ```bash
  npm install -g supabase
  ```

### Quick Start

```bash
# 1. Install Node.js dependencies
npm install

# 2. Start the local Supabase stack (Postgres + API + Studio + Auth)
#    This automatically applies all migrations from supabase/migrations/
supabase start

# 3. Configure environment variables
#    Run the following to get local credentials:
supabase status -o env
#    Then copy them into .env (or use the template below)

# 4. Start the Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

### Local .env Configuration

Run `supabase status -o env` after `supabase start` and use the output to
populate `.env`:

```env
NODE_ENV=development
PORT=3000
AUTH_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Local Supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<from: supabase status -o env>
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from: supabase status -o env>
```

### Useful Local Services

| Service      | URL                          |
|-------------|------------------------------|
| App (dev)   | http://localhost:3000        |
| Supabase API| http://127.0.0.1:54321       |
| Supabase Studio | http://127.0.0.1:54323   |
| Database    | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

### Local Development Commands

```bash
supabase start    # Start local Supabase stack
supabase stop     # Stop local Supabase stack
supabase status   # Show local credentials and service URLs
npm run dev       # Start Next.js dev server (port 3000)
node test-login-rbac.js  # Run the login + RBAC verification test suite
```

### Administrator Credentials

The platform starts with **no demo gyms** — only the Super Admin account is
seeded. Gym admins are created automatically when you add a gym.

| Role          | Username    | Password         |
|---------------|-------------|------------------|
| Super Admin   | `superadmin`| `Super@2026#Admin`|

## Production Build

```bash
npm install
npm run build
npm start
```

Or use the custom server entry:

```bash
npm run build
node server.js
```

The server listens on `PORT` from the environment (defaults to 3000).

## Architecture

```
Browser → Next.js (API + Pages) → PostgreSQL (Supabase)
```

- **Tenant isolation:** Every API route derives `gymId` from the authenticated session, never from client input.
- **Roles:** `SUPER_ADMIN` (all gyms), `GYM_ADMIN` (own gym only).
- **Middleware:** Protects `/gym/*` and `/super-admin/*` routes, enforces role-based access.

## Project Structure

```
app/
  api/            API routes (auth, members, plans, attendance, payments, gyms, dashboard)
  gym/            Gym Admin pages (dashboard, members, attendance, plans, payments)
  super-admin/    Super Admin pages (dashboard, gyms)
  login/          Login page
components/
  ui/             shadcn/ui components
  sidebar.tsx     Shared navigation sidebar
  dumbbell-3d.tsx 3D dumbbell for login page
lib/
  auth.ts         JWT creation and verification
  session.ts      Server-side session helper
  supabase-server.ts  Supabase client factory
  types.ts        Shared TypeScript types
  utils.ts        Utility functions
middleware.ts     Route protection and role enforcement
server.js         Custom production server entry
```

## Database

The database runs on Supabase (PostgreSQL). Migrations are in `supabase/migrations/`:

1. `20260812174211_create_gym_saas_schema.sql` — tables, indexes, RLS policies
2. `20260812174239_seed_gyms_and_users.sql` — 10 gyms + admin accounts
3. `20260812174345_seed_demo_data_v2.sql` — demo members, plans, attendance, payments

All tables have Row Level Security enabled. The service role key is used server-side; the anon key is used for client-side Supabase calls if needed.

## Security Checklist

- [x] Passwords hashed with bcryptjs (never stored in plaintext)
- [x] JWT sessions in HttpOnly, SameSite cookies
- [x] Middleware enforces route protection and role-based access
- [x] API routes derive gymId from session, never from client
- [x] Super Admin can access all gyms; Gym Admin only their own
- [x] No secrets exposed in frontend code
- [x] Input validation on all API routes
- [x] QR tokens are random UUIDs (no personal info embedded)
