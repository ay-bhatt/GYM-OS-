# Deployment Guide — ForgeGym on mPanel

This guide covers deploying ForgeGym to a panel-based hosting environment (mPanel or similar).

## Prerequisites

Verify your hosting environment supports:

- **Node.js** v18 or higher
- **npm** v9 or higher
- **PostgreSQL** database (or MySQL/MariaDB — see note below)
- **Reverse proxy** (nginx, Apache, or built-in) to forward requests to Node.js
- **Custom domain/subdomain** with SSL/TLS certificate
- **Persistent file storage** (for uploads if needed)
- **Environment variable configuration**

If PostgreSQL is unavailable, the app uses Supabase as its database backend. You can use a cloud Supabase project regardless of your hosting environment — only the Node.js app needs to run on mPanel.

## Step-by-Step Deployment

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note the project URL, anon key, and service role key
3. Run the migration SQL files (from `supabase/migrations/`) in the Supabase SQL editor in order
4. Verify tables exist: `users`, `gyms`, `members`, `membership_plans`, `attendance`, `payments`

### 2. Upload the Project

Upload the entire project directory to your hosting environment. Typical path:

```
/home/username/apps/forgegym/
```

### 3. Configure Environment Variables

In your mPanel Node.js application settings (or `.env` file), set:

```
NODE_ENV=production
PORT=3000
AUTH_SECRET=<generate-a-long-random-string>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

**Never commit the `.env` file with real secrets.**

### 4. Install Dependencies

```bash
npm install --production=false
```

### 5. Build the Application

```bash
npm run build
```

This creates the `.next/` directory with the production build.

### 6. Start the Application

**Option A — Next.js default start:**
```bash
npm start
```

**Option B — Custom server (recommended for mPanel):**
```bash
node server.js
```

The server listens on the port from the `PORT` environment variable (defaults to 3000). Configure your reverse proxy to forward HTTP requests to this port.

### 7. Configure Reverse Proxy

Point your domain/subdomain to the Node.js application port.

**nginx example:**
```nginx
server {
    listen 80;
    server_name app.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8. Enable HTTPS

1. Obtain an SSL certificate (Let's Encrypt or via mPanel)
2. Configure your reverse proxy for HTTPS
3. Ensure cookies are served over HTTPS (the app sets `Secure` cookies when `NODE_ENV=production`)

### 9. Verify Deployment

- [ ] Visit `https://app.yourdomain.com` — should redirect to `/login`
- [ ] Log in as `superadmin` / `Super@2026#Admin` — should reach Super Admin dashboard
- [ ] The platform starts with **no demo gyms** — the Gyms list is empty (zero data)
- [ ] Super Admin can Add, Edit (name, login username, gym ID) and Delete any gym
- [ ] Super Admin cannot be impersonated by a Gym Admin (RBAC enforced on every API route)
- [ ] Add a gym from the panel, then add a member, create a plan, record attendance, record a payment
- [ ] QR scanner works on mobile

## Database Migrations

Run migration SQL files in the Supabase SQL editor in this order:

1. `supabase/migrations/20260812174211_create_gym_saas_schema.sql`
2. `supabase/migrations/20260812174239_seed_gyms_and_users.sql`
3. `supabase/migrations/20260812174345_seed_demo_data_v2.sql`

**For production:** Run only migration 1 (schema). Skip migrations 2 and 3 unless you want demo data.

## Adding a New Gym (Production)

1. Log in as Super Admin
2. Go to Gyms → Add Gym
3. Fill in gym details
4. The system auto-generates the next Gym ID (GYM-011, GYM-012, etc.)
5. A gym admin account is created automatically

## Backup

- **Database:** Use Supabase's automated backups or export via `pg_dump`
- **Application:** Keep a copy of your `.env` file in a secure password manager

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank page after login | Check browser console; verify API routes return 200 |
| 403 on all API calls | Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly |
| Redirect loop | Clear cookies; verify `AUTH_SECRET` matches across restarts |
| QR scanner not working | Ensure HTTPS is enabled (camera API requires secure context) |
| Build fails | Run `npm install` before `npm run build`; check Node.js version |
