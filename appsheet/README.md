# AppSheet handoff package

The project's stakeholders decided to also stand up a Google AppSheet app (no-code) alongside the custom web app in this repo, using the same requirements. AppSheet configuration itself can only be done by a person with Google/AppSheet access inside the AppSheet editor — there is no API for it — so this folder is the complete handoff package for whoever does that.

## Files

- **`SSB-Travel-Stay-AppSheet-Blueprint.xlsx`** — the backing data model: 4 tabs (`Requests`, `RecommendedTrains`, `RecommendedFlights`, `AccessRequests`) with the exact header rows AppSheet needs.
- **`AppSheet-Configuration-Checklist.docx`** — the exact, no-judgment-calls configuration steps: every column's type/formula for all 31 `Requests` fields, the 2 reference tables + the new `AccessRequests` table, 8 views to build, 5 actions, mobile-UI fixes, privacy rules, optional notification bots, and explicit deviations from the original blueprint to be aware of going in.
- **`migrateSheet.gs`** — Google Apps Script, paste into the live Sheet's Extensions → Apps Script. Adds the `Gender`/`Age` columns and creates the `AccessRequests` tab automatically (idempotent — safe to re-run). Run this instead of adding those by hand.
- **`claudeBridge.gs`** — Google Apps Script that lets the Sheet call the Claude API (e.g. a "Summarize selected row" menu item). See "About the Claude bridge" below for what it does and doesn't solve.

**These local files are the up-to-date, authoritative versions** — always use these, not the Drive links mentioned in earlier chat history, which are now stale (there's no API to edit an existing Google Doc/Sheet in place, so updates land here instead of in-place on Drive).

## Status: revision 2 — live app feedback incorporated

The first pass was built in AppSheet already (linked from an `appsheet.com/start/...` URL) and came back with feedback. This revision's checklist addresses all of it — see its "What changed in this revision" section for the full list, summarized here:

- **New fields**: `Gender` (required — used by the Accommodation desk for dorm/bunk assignment) and `Age` (optional) added to `Requests`. **Action needed**: run `migrateSheet.gs` (see Files above) against the live Google Sheet — it adds these 2 columns and the `AccessRequests` tab for you, no manual editing required.
- **Preferred train/flight in the POC bulk request**: clarified that this is the same `Preferred Option` column/rule as the self-request form — if it's missing from the bulk grid, it's a view-configuration gap (add the column back to that view), not new logic.
- **"How does bulk request work?"**: clarified explicitly — it is not a different design, it's the identical set of per-traveller fields as the self form, just entered one row per traveller in a spreadsheet-style grid (a native AppSheet Table view with inline add/edit).
- **Mobile UI / overlapping bottom buttons**: root-caused to multiple actions being marked "prominent" on the same view (AppSheet floats one round button per prominent action; two or more overlap on narrow screens) — the checklist gives the exact per-view fix.
- **Self-service access request + approval**: new `AccessRequests` table + a "Request Access" form anyone signed in can submit + an admin-only view/actions to Approve/Deny, restricted to the two of your emails. Includes an honest limitation: approving a row doesn't by itself grant app access — see the checklist's callout for what that actually requires in AppSheet.

## To take over from here

1. Get the Google Sheet the live app is already using (from whoever has the AppSheet editor open), open Extensions → Apps Script, paste in `migrateSheet.gs`, and run `migrateSheet` once — it adds the `Gender`/`Age` columns and the `AccessRequests` tab, matching `SSB-Travel-Stay-AppSheet-Blueprint.xlsx` in this folder exactly.
2. Open `AppSheet-Configuration-Checklist.docx` and follow it top to bottom inside the AppSheet editor.
3. Everything needed is spelled out in the checklist — no design decisions left open.

This is independent of the rest of the repo (the Node/Express + SQLite app in `server/`/`public/`) — the two are alternative implementations of the same spec, not connected to each other.

## About the Claude bridge (`claudeBridge.gs`)

Two questions came up when this was requested, answered directly:

**Does the Apps Script ↔ Claude API bridge solve the "I can't edit AppSheet directly" problem? No.** The bridge lets code running *inside* the Sheet call *out* to Claude (Sheet → Claude) — useful for things like summarizing a row or drafting a reply from a menu button. It does not run in the other direction: it gives Claude Code no way to reach back *into* the Sheet or the AppSheet app. The only thing that could invert the direction is deploying the script as a Web App (`doPost()`) with a public URL for Claude Code to POST to — and this environment's outbound network proxy blocks `*.google.com`, so that path is also unreachable from here. `migrateSheet.gs` is the actual fix for the columns/tab problem; it has to be run by a human with the Sheet open, once.

**Can AppSheet itself be configured from Claude Code after this bridge is set up? No, and the bridge doesn't change that.** AppSheet's app definition (views, columns, actions, formulas) is editor-only — there is no API for it, with or without a Claude bridge in the picture. `AppSheet-Configuration-Checklist.docx` remains the only way to get the configuration done: a human follows it inside the AppSheet editor.
