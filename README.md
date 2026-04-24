# Donut IRL

Next.js 14 (App Router) app: **IRL (cash) trading for Donut SMP in-game money** (INR), sell flow, and admin tools. **Donut IRL** at **donutirl.online** — independent, not the server.

## Stack

- **Framework:** Next.js, TypeScript, Tailwind CSS  
- **Data:** MongoDB + Mongoose  
- **Auth:** NextAuth (credentials + JWT)  
- **Charts:** Recharts (admin)  
- **State:** Zustand (sell calculator)  
- **Toasts:** Sonner  

## Quick start

1. **Copy environment**

   ```bash
   cp .env.example .env.local
   ```

   Set `MONGODB_URI` (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)), `NEXTAUTH_URL` (e.g. `http://localhost:3000`), and a long random `NEXTAUTH_SECRET`.

   **Fastest local DB (Docker):** from the project root run `docker compose up -d` — MongoDB will listen on `127.0.0.1:27017`, matching the default `MONGODB_URI` in `.env.example`. Then you can **register and log in**.

2. **Install and seed (optional demo data)**

   ```bash
   npm install
   npm run seed
   ```

   Demo logins (password for all: `password123`):

   - `admin@demo.local` — admin  
   - `staff@demo.local` — staff  
   - `seller@demo.local` — seller  

3. **Run**

   ```bash
   npm run dev
   ```

4. **Sanity check (optional, matches CI / production)**

   ```bash
   npm run build && npm start
   ```

### If you see `ECONNREFUSED 127.0.0.1:27017` or `/api/prices` failed

That means **MongoDB is not running** or **`MONGODB_URI` is wrong**:

- **Local MongoDB:** install MongoDB Community and start the service (`brew services start mongodb-community` on macOS), or run `mongod` so something listens on port **27017**.
- **Cloud:** create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), copy the connection string, and set `MONGODB_URI` in `.env.local`.

Without a database, **login, register, orders, and admin** will not work (NextAuth still needs user storage). The app can still render the **homepage** and **sell UI** with empty rates; after the latest changes, `/api/prices` returns `[]` instead of 500 when the DB is down.

**Other log noise (optional):**

- `GET /apple-touch-icon.png` **404** — harmless; browsers request it; add `public/apple-touch-icon.png` if you want to silence it.
- `npm audit` **high severity** — dependency advisories; review with `npm audit` (only use `npm audit fix --force` if you accept possible breaking upgrades).

4. **Discord (optional)**  
   Set `DISCORD_WEBHOOK_URL` for trade/rate/promo messages. `INTERNAL_DISCORD_KEY` can authorize automation to `POST /api/webhooks/discord`.

## Routes

| Path        | Description              |
|------------|---------------------------|
| `/`         | Home, live rates, public feed & stats |
| `/sell`     | Calculator + sell order   |
| `/dashboard` | Seller dashboard, referrals, price alerts |
| `/orders/[id]` | Order tracking (role-aware) |
| `/admin`    | Stats, pricing, users, analytics, Discord promo |
| `/staff`    | Assigned orders only     |
| `/login` · `/register` | Auth         |

## Domain: **donutirl.online** (production)

Use one **canonical** URL everywhere (usually `https://donutirl.online` **or** `https://www.donutirl.online`, not both without redirects).

1. **In your host (e.g. [Render](https://render.com))** for the Web Service: **Settings → Custom Domains** → add `donutirl.online` (and `www.donutirl.online` if you want). Follow the panel’s **DNS instructions** at your registrar (often a **CNAME** to your `*.onrender.com` hostname, or **ALIAS/ANAME** for the apex). Wait until TLS shows as active.
2. **Environment variables (required):** set these to your **canonical** HTTPS URL, **no trailing slash**:
   - `NEXTAUTH_URL` — e.g. `https://donutirl.online`
   - `NEXT_PUBLIC_APP_URL` — same value (used for metadata, emails, password-reset links).
3. **Redeploy** after changing env vars so the server picks them up.
4. **Smoke test:** open the site on the custom domain, sign in, and confirm sessions work. If cookies fail, `NEXTAUTH_URL` does not match the browser’s origin.
5. **Email (optional):** set `EMAIL_FROM` to something on your domain (e.g. `Donut IRL <noreply@donutirl.online>`) after you add DNS (SPF/DKIM) with your mail provider.

See also **`.env.example`** (production block at the bottom).

---

## Deploy (Vercel, recommended)

This app is a standard **Next.js 14** Node server (`next start`). Vercel detects it and runs the build automatically.

1. **Push the repo to GitHub** (or GitLab / Bitbucket). Never commit `.env.local`; keep secrets in the host’s UI.
2. **Create a Vercel project** → Import the repository → leave defaults: **Build:** `next build`, **Output:** (none / default), **Install:** `npm install`, **Node:** 20.x is fine.
3. **Set environment variables** in Vercel → Project → **Settings** → **Environment variables** (Production, and Preview if you want PR previews to work with auth):

| Variable | Notes |
|----------|--------|
| `MONGODB_URI` | Atlas connection string, or your managed Mongo URL. |
| `NEXTAUTH_URL` | **Exact** public origin, e.g. `https://donutirl.online` or `https://your-app.vercel.app` (HTTPS, no trailing slash). |
| `NEXTAUTH_SECRET` | Long random string (e.g. `openssl rand -base64 32`). |
| `NEXT_PUBLIC_APP_URL` | Same as `NEXTAUTH_URL` for the live site; used in emails, metadata, and password-reset links. |
| `DISCORD_WEBHOOK_URL` | Optional. |
| `INTERNAL_DISCORD_KEY` | Optional; for `POST /api/webhooks/discord`. |
| `RESEND_API_KEY` or SMTP\* + `EMAIL_FROM` | Optional; needed for password reset email in production. |

4. **MongoDB Atlas (if used):** In **Network Access**, allow the IPs that can reach the cluster. For Vercel’s dynamic IPs, many teams use **`0.0.0.0/0`** (tighten later with a private link or a fixed egress if you have that). Ensure the DB user has read/write on the right database.
5. **First deploy** → Redeploy after changing env vars if the first build ran without them.
6. **Smoke test:** open `/`, `/login`, and an authenticated route; confirm `NEXTAUTH_URL` matches the browser’s origin or cookie/session issues may appear.

**If logs show `JWT_SESSION_ERROR` / “decryption operation failed”:** the session cookie was encrypted with a different `NEXTAUTH_SECRET` than the server is using. Fix: set **one** long random `NEXTAUTH_SECRET` in the host (e.g. `openssl rand -base64 32`), **the same** for every deploy and every process; redeploy. Use **one** public URL in `NEXTAUTH_URL` and browse only that (avoid logging in on `*.onrender.com` and the custom domain with one account — pick one). After changing the secret, have users sign in again (or clear site data for your domain) so old cookies are replaced.

**CLI (optional):** With [Vercel CLI](https://vercel.com/docs/cli) installed and logged in:

```bash
npx vercel
```

For production: `npx vercel --prod` after setting env in the dashboard or pulling them with `vercel env pull` for local use only (do not commit).

**Not Vercel:** Any Node host that runs `npm run build` and `npm start` with the same environment variables and a compatible Node version (18+) can run the app. Docker is not required; `docker compose` in the repo is only for **local** MongoDB.

- **Profit / analytics:** “earned” uses a 10% placeholder of payout for demo metrics; adjust in `recordCompletedOrder` and admin stats if you track real margin.

## Project layout

- `src/app` — App Router pages and `api/**`  
- `src/components` — UI (home, layout, providers)  
- `src/models` — Mongoose schemas  
- `src/lib` — DB, auth, analytics, Discord, referrals  
- `scripts/seed.ts` — demo database seed  
