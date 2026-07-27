# MKN Stay & Travel

Travel & stay request tracker for the SSB Consecration (Sadhguru Sannidhi Bengaluru, 28 Sep – 2 Oct 2026). Lets IYC team POCs, core volunteers, and individual Poornangas raise travel/stay requests, routes each one to two backend desks (Accommodation, Travel) for allocation, and auto-confirms a traveller once their ID is verified and both desks are done.

Node.js + Express, backed by Supabase (Postgres + Storage), vanilla JS/HTML/CSS frontend. No build step, no frontend framework.

## Requirements

- Node.js 18+
- A Supabase project — see [Supabase setup](#supabase-setup) below.

## Setup

```bash
cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm install
npm run seed   # populates the recommended train/flight reference tables
npm run dev    # starts the server with auto-reload at http://localhost:3000
```

(`npm start` runs the server without auto-reload.)

## Supabase setup

The app is otherwise stateless — all data lives in Supabase, not on local disk — which is what makes it deployable to Vercel.

1. Create a Supabase project (or reuse one; tables here are prefixed `mkn_` so they can coexist with other apps in the same project).
2. Run `server/schema.sql` against it once (Supabase dashboard SQL editor, `supabase db execute`, or an MCP `apply_migration` call) — it creates the `mkn_*` tables, the `mkn_request_status` view, enables RLS with no policies (default-deny for `anon`/`authenticated`), and creates the private `mkn-id-uploads` Storage bucket for ID images.
3. From Project Settings → API, copy the **Project URL** into `SUPABASE_URL` and the **service_role key** (not the anon/publishable key) into `SUPABASE_SERVICE_ROLE_KEY`.

The server always uses the service_role key, which bypasses RLS — that's intentional, since RLS is configured to deny the `anon`/`authenticated` roles entirely. ID document images are only ever served via short-lived signed URLs generated server-side, never a public bucket URL. **Never put the service_role key in frontend code or commit it to the repo** — it belongs in server-side env vars only (`.env` locally, platform secrets in production).

## Project layout

- `server/` — Express API, Supabase client, business-rule validation, ID masking, file uploads.
- `server/schema.sql` — reference copy of the Postgres schema/migration applied to Supabase (not run automatically by the app).
- `public/` — static frontend (no build step): `index.html`, `css/styles.css`, `js/` (hash router + per-view modules).
- `api/index.js` — Vercel serverless entrypoint (exports the same Express app).
- `tests/` — API-level tests (`node --test` + `supertest`), run against the live Supabase project.

## Roles / flow

- **Team POC (IYC)** raises a bulk batch of travellers via a table; IDs are *not* collected from the POC — each traveller gets their own link (`/#/upload/<request-id>`) to upload their own Aadhaar/passport.
- **Core volunteer** / **Individual (Poornanga)** raise their own request in one step, uploading their ID inline.
- **Accommodation desk** and **Travel desk** each allocate their part of every request, independently and in parallel.
- **Coordinator Queue** shows every request's ID/Stay/Travel status at a glance.
- A request is **Confirmed** only once ID is Received *and* Stay is Allocated *and* Travel is Booked — this is computed at read time from the three live statuses, never stored as a separate flag.

The in-app role switch (top right) is a convenience for browsing the relevant views — it is not access control. ID numbers are always masked to their last 4 digits by the server regardless of which role is selected, and the traveller-facing upload link never exposes any other request's data.

## Running the tests

```bash
npm test
```

These are integration tests against the live Supabase project pointed to by `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (there's no local embedded DB to isolate them anymore) — they create real rows and a real uploaded file per test, and delete everything they created in an `after` hook. Point `.env` at a non-production project if you'd rather not run these against real data. Covers the non-obvious business rules: last-mile required only for Train/Flight, From/To overridden server-side per travel mode, ID numbers never returned unmasked, the POC → traveller-upload → ID-received flow, and the confirmation gate.

## Manual smoke test

**Self request path**: Raise Request → pick "Core volunteer" → fill the form (pick Train or Flight to see the last-mile step) → upload an ID → submit. You'll land in the Coordinator Queue with `ID: Received`. Go to the Accommodation Desk and allocate a stay for that row, then the Travel Desk and book travel. Open the Confirmation view for that request — all three lines should be ✅ with a "confirmed" banner.

**POC + traveller-link path**: Raise Request → pick "Team POC (IYC)" → fill in POC details and add 2–3 traveller rows (try a mix of Train/Flight/bus modes) → submit. You'll land on a share screen listing each traveller's personal upload link — open one, confirm the read-only trip summary looks right, and submit an ID. Back in the queue, that traveller's ID status should flip from "Awaiting traveller" to "Received" and show a masked ID number (e.g. `XXXX-XXXX-1234`).

The Travel Desk view links to an admin screen for managing the RecommendedTrains/RecommendedFlights reference lists that feed the "preferred train/flight" dropdown.

## Deploying to Vercel

The app is stateless (Supabase holds all data), which is exactly what Vercel's serverless functions need — `api/index.js` exports the Express app, and `vercel.json` routes every request through it, including the static files under `public/`.

1. Install the Vercel CLI and sign in:
   ```bash
   npm i -g vercel
   vercel login
   ```
2. From the repo root, link and deploy:
   ```bash
   vercel link
   vercel env add SUPABASE_URL production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   vercel deploy --prod
   ```
   (Add the same two env vars for the `preview`/`development` environments too if you want `vercel deploy` previews and `vercel dev` to work — point them at a non-production Supabase project if you'd rather previews not touch real data.)
3. Seed the reference tables once against the same Supabase project (from your machine, with `.env` filled in): `npm run seed`.

Cold starts: Vercel functions spin down when idle, same tradeoff as Fly's `auto_stop_machines` below — the first request after idling is slower.

## Deploying to Fly.io

Fly.io is a fine alternative if you'd rather run a persistent container instead of serverless functions — the app is stateless either way, so no volume is needed for this deployment target either (Postgres/Storage is remote in both cases). Set `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` as Fly secrets instead of Vercel env vars.

### Automatic deploys via GitHub Actions

`.github/workflows/fly-deploy.yml` deploys on every push to `build/travel-stay-app` (and can be triggered manually from the Actions tab). It needs one repo secret:

1. Create a deploy token: `fly tokens create deploy -x 999999h -a mkn-stay-travel`
2. Add it as a repository secret named `FLY_API_TOKEN` (Settings → Secrets and variables → Actions).

The one-time app setup (step 2–3 below) still has to be done manually before the first deploy — the workflow only runs `flyctl deploy`, it doesn't create the app or set secrets.

### Manual deploy

1. Install flyctl and sign in:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```
2. `fly.toml` already sets `app = "mkn-stay-travel"` — if that name is taken on Fly (app names are global across all users), change it here first.
3. Create the app (region comes from `primary_region` in `fly.toml`, default `sin` = Singapore) and set secrets:
   ```bash
   fly apps create mkn-stay-travel
   fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
   ```
4. Deploy (this builds the Dockerfile — either locally via Docker, or on Fly's remote builder if you don't have Docker installed, no extra setup needed either way):
   ```bash
   fly deploy
   ```
5. Seed the reference tables once against the same Supabase project (from your machine, with `.env` filled in): `npm run seed`.
6. `fly open` to view it, or grab the URL with `fly status`.

Notes:
- `auto_stop_machines`/`min_machines_running = 0` in `fly.toml` let the machine scale to zero when idle, which keeps it within the free allowance — the first request after idling will be slower (cold start) while it spins back up.
- Fly's free allowance has required a card on file since 2024 pricing changes; it isn't billed unless you exceed it, but confirm current terms on fly.io before deploying.
- To redeploy after code changes, just run `fly deploy` again.
