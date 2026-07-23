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
