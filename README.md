# MKN Stay & Travel

Travel & stay request tracker for the SSB Consecration (Sadhguru Sannidhi Bengaluru, 28 Sep – 2 Oct 2026). Lets IYC team POCs, core volunteers, and individual Poornangas raise travel/stay requests, routes each one to two backend desks (Accommodation, Travel) for allocation, and auto-confirms a traveller once their ID is verified and both desks are done.

Node.js + Express + SQLite, vanilla JS/HTML/CSS frontend. No build step, no frontend framework.

## Requirements

- Node.js 18+

## Setup

```bash
npm install
npm run seed   # creates data/app.db and populates the recommended train/flight reference tables
npm run dev    # starts the server with auto-reload at http://localhost:3000
```

(`npm start` runs the server without auto-reload.)

## Project layout

- `server/` — Express API, SQLite schema/connection, business-rule validation, ID masking, file uploads.
- `public/` — static frontend (no build step): `index.html`, `css/styles.css`, `js/` (hash router + per-view modules).
- `uploads/` — uploaded Aadhaar/passport images (gitignored).
- `data/` — SQLite database file (gitignored).
- `tests/` — API-level tests (`node --test` + `supertest`).

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

Runs against a temporary SQLite file (created fresh per run, cleaned up after), covering the non-obvious business rules: last-mile required only for Train/Flight, From/To overridden server-side per travel mode, ID numbers never returned unmasked, the POC → traveller-upload → ID-received flow, and the confirmation gate.

## Manual smoke test

**Self request path**: Raise Request → pick "Core volunteer" → fill the form (pick Train or Flight to see the last-mile step) → upload an ID → submit. You'll land in the Coordinator Queue with `ID: Received`. Go to the Accommodation Desk and allocate a stay for that row, then the Travel Desk and book travel. Open the Confirmation view for that request — all three lines should be ✅ with a "confirmed" banner.

**POC + traveller-link path**: Raise Request → pick "Team POC (IYC)" → fill in POC details and add 2–3 traveller rows (try a mix of Train/Flight/bus modes) → submit. You'll land on a share screen listing each traveller's personal upload link — open one, confirm the read-only trip summary looks right, and submit an ID. Back in the queue, that traveller's ID status should flip from "Awaiting traveller" to "Received" and show a masked ID number (e.g. `XXXX-XXXX-1234`).

The Travel Desk view links to an admin screen for managing the RecommendedTrains/RecommendedFlights reference lists that feed the "preferred train/flight" dropdown.

## Deploying to Fly.io

The app is a single Docker container plus one persistent volume (for the SQLite file and uploaded ID images) — Fly's free allowance covers this. `MKN_DATA_DIR` and `MKN_UPLOAD_DIR` (read by `server/lib/paths.js`) point the app at the mounted volume instead of the repo checkout.

1. Install flyctl and sign in:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```
2. In `fly.toml`, change `app = "mkn-stay-travel"` to a globally-unique name (Fly app names are global across all users).
3. Create the app and its persistent volume (must be in the same region as `primary_region` in `fly.toml`, default `sin` = Singapore — change both if you want a different region):
   ```bash
   fly apps create <your-app-name>
   fly volumes create mkn_data --region sin --size 1
   ```
4. Deploy (this builds the Dockerfile — either locally via Docker, or on Fly's remote builder if you don't have Docker installed, no extra setup needed either way):
   ```bash
   fly deploy
   ```
5. Seed the reference tables on the deployed instance (one-off command against the running machine):
   ```bash
   fly ssh console -C "node server/seed.js"
   ```
6. `fly open` to view it, or grab the URL with `fly status`.

Notes:
- `auto_stop_machines`/`min_machines_running = 0` in `fly.toml` let the machine scale to zero when idle, which keeps it within the free allowance — the first request after idling will be slower (cold start) while it spins back up.
- Fly's free allowance has required a card on file since 2024 pricing changes; it isn't billed unless you exceed it, but confirm current terms on fly.io before deploying.
- To redeploy after code changes, just run `fly deploy` again — the volume (and its data) persists across deploys.
