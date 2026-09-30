# TrustShield AI — Production Deployment Guide

This guide details the step-by-step procedure for deploying TrustShield AI to production cloud infrastructure using **Supabase** (PostgreSQL with RLS), **Render** (Node.js API), and **Vercel** (Vite React Client).

---

## 1. Database Deployment (Supabase PostgreSQL)

### Step 1: Create a Supabase Project
1. Log in to [Supabase Console](https://supabase.com).
2. Create a new project (e.g. `trustshield-prod`).
3. Set a strong database password and select your preferred AWS/GCP region.

### Step 2: Execute Schema Migrations
1. In the Supabase dashboard, navigate to **SQL Editor**.
2. Open the migration file: `server/migrations/001_initial_schema.sql`.
3. Paste the contents into the SQL Editor and click **Run**.
4. This script creates:
   - 19 relational tables with indexes and timestamp update triggers.
   - Row-Level Security (RLS) policies enabled across all tables.
   - Immutability trigger on `audit_logs` preventing updates or deletions.

### Step 3: Run Database Seed Script
From your local terminal or CI/CD runner:
```bash
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
npm --prefix server run seed
```
This populates the initial organizations (`Acme Cyber Systems`, `FinTrust Global`), default security policies, demo users across all roles, and initial hash-chained audit blocks.

---

## 2. Backend API Deployment (Render / Railway)

### Step 1: Create a New Web Service
1. In the [Render Dashboard](https://dashboard.render.com), click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name:** `trustshield-api`
   - **Environment:** `Node`
   - **Region:** Choose the region closest to your Supabase project.
   - **Branch:** `main`
   - **Build Command:**
     ```bash
     npm install && npm --prefix shared run build && npm --prefix server run build
     ```
   - **Start Command:**
     ```bash
     npm --prefix server run start
     ```

### Step 2: Configure Environment Variables
Add the following secrets under **Environment**:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations and secure cookies |
| `PORT` | `4000` | Server listening port |
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require` | Supabase SSL connection string |
| `JWT_ACCESS_SECRET` | `[64-character random hex string]` | HMAC secret for signing 15-minute access tokens |
| `JWT_REFRESH_SECRET` | `[64-character random hex string]` | HMAC secret for signing 7-day rotating refresh tokens |
| `CLIENT_URL` | `https://trustshield.vercel.app` | Vercel client URL for strict CORS whitelisting |
| `GEMINI_API_KEY` | `AIzaSy...` | Official Google Gemini API Key |

*Generate secure 64-char secrets via terminal:*
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Frontend Client Deployment (Vercel)

### Step 1: Import Project to Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Select your GitHub repository.

### Step 2: Configure Project Settings
- **Framework Preset:** `Vite`
- **Root Directory:** `client`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Step 3: Set Environment Variables
Add the following environment variable:
- `VITE_API_URL` = `https://trustshield-api.onrender.com/api` (URL of your deployed backend service)

### Step 4: Verify SPA Routing
The repository includes `client/vercel.json` with the following configuration to handle React Router browser routing:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 4. Production Verification Checklist

1. **Health Check:**
   ```bash
   curl -i https://trustshield-api.onrender.com/api/health
   # Expected: {"status":"healthy","uptime_seconds":...}
   ```
2. **CORS Validation:**
   Open browser developer tools on `https://trustshield.vercel.app` and verify credentials cookies (`trustshield_refresh`) are accepted with `Secure; HttpOnly; SameSite=Strict`.
3. **Database RLS:**
   Verify multi-tenant isolation by logging in as `admin@trustshield.io` and confirming zero FinTrust data is visible.
4. **Audit Hash Verification:**
   Navigate to the **Audit Log** page in the console and click **Verify Chain Integrity** to confirm all SHA-256 blocks validate from Genesis.
