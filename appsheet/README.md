# AppSheet handoff package

The project's stakeholders decided to also stand up a Google AppSheet app (no-code) alongside the custom web app in this repo, using the same requirements. AppSheet configuration itself can only be done by a person with Google/AppSheet access inside the AppSheet editor — there is no API for it — so this folder is the complete handoff package for whoever does that.

## Files

- **`SSB-Travel-Stay-AppSheet-Blueprint.xlsx`** — the backing data model: 3 tabs (`Requests`, `RecommendedTrains`, `RecommendedFlights`) with the exact header rows AppSheet needs. Also live as a Google Sheet: https://docs.google.com/spreadsheets/d/1uOvX4ZPpzcdDgR1_0ni8h_tmPPCoW3mT1bc5LCpwQPc/edit — upload this sheet to Google Drive (or use the existing link) before starting.
- **`AppSheet-Configuration-Checklist.docx`** — the exact, no-judgment-calls configuration steps: every column's type/formula for all 29 `Requests` fields, the 2 reference tables, 7 views to build, 3 actions, privacy rules, optional notification bots, and 4 explicit deviations from the original blueprint to be aware of going in. Also live as a Google Doc: https://docs.google.com/document/d/1e7nMS7WTbeHAwVzWKeefAAfqm8340LW3V9EaNbUhY7c/edit

## To take over from here

1. Open the sheet (Google Drive link above, or re-upload the `.xlsx`).
2. Open the checklist doc and follow it top to bottom inside the AppSheet editor (appsheet.com → Create → App → Start with existing data → select the sheet).
3. Everything needed is spelled out in the checklist — no design decisions left open.

This is independent of the rest of the repo (the Node/Express + SQLite app in `server/`/`public/`) — the two are alternative implementations of the same spec, not connected to each other.
