/**
 * Apps Script -> Claude API bridge.
 *
 * WHAT THIS DOES AND DOES NOT SOLVE - read before relying on it:
 * This lets code running INSIDE the Sheet call OUT to Claude (Sheet -> Claude),
 * e.g. from a custom menu item, a button, or an onEdit trigger. It does NOT let
 * Claude Code edit this Sheet's structure or the AppSheet app's configuration -
 * that direction (Claude -> Sheet) would require this script to be deployed as
 * a Web App (doPost()) with a public URL for Claude Code to POST to, and this
 * environment's network proxy blocks *.google.com, so that path isn't reachable
 * from here either. Use migrateSheet.gs (this folder) for the one-off structural
 * edits; use this bridge for what it's actually good at - calling Claude to draft
 * text, summarize a row, or classify a request from inside the spreadsheet itself.
 *
 * Setup:
 *  1. Extensions -> Apps Script -> paste this file in alongside migrateSheet.gs.
 *  2. Project Settings (gear icon, left sidebar) -> Script Properties
 *     -> add property ANTHROPIC_API_KEY = <your key from aistudio.google.com or
 *     console.anthropic.com>. Never hardcode the key in this file.
 *  3. Reload the Sheet - a "Claude" menu appears. Select a Requests row, then
 *     Claude -> Summarize selected row.
 *  4. First run will prompt you to authorize External requests (UrlFetchApp).
 */

const CLAUDE_MODEL = 'claude-opus-5';
const CLAUDE_API_VERSION = '2023-06-01';
const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';

/**
 * Calls Claude with a single user-turn prompt and returns the reply text.
 * Throws a readable Error on any HTTP or API-level failure.
 */
function callClaude(prompt, maxTokens) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Project Settings -> Script Properties -> add it.');
  }

  const payload = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens || 1024,
    messages: [{ role: 'user', content: prompt }],
  };

  const response = UrlFetchApp.fetch(CLAUDE_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': CLAUDE_API_VERSION,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  const body = JSON.parse(response.getContentText());

  if (status !== 200) {
    const message = (body && body.error && body.error.message) || response.getContentText();
    throw new Error('Claude API error (' + status + '): ' + message);
  }

  if (body.stop_reason === 'refusal') {
    throw new Error('Claude declined to answer this prompt.');
  }

  const textBlocks = (body.content || []).filter(function (block) {
    return block.type === 'text';
  });

  if (textBlocks.length === 0) {
    throw new Error('Claude response contained no text content.');
  }

  return textBlocks.map(function (block) { return block.text; }).join('\n');
}

/**
 * Adds a "Claude" menu to the Sheet UI. Runs automatically when the Sheet opens.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Claude')
    .addItem('Summarize selected row', 'summarizeSelectedRow')
    .addToUi();
}

/**
 * Example usage: summarizes whichever row is selected on the active tab
 * (e.g. a Requests row) into a plain-language one-liner, shown in an alert.
 * Adapt this to write into a column instead of an alert if you want it logged.
 */
function summarizeSelectedRow() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getActiveRange();
  if (!range) {
    SpreadsheetApp.getUi().alert('Select a row first.');
    return;
  }

  const row = range.getRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const values = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

  const rowText = headers.map(function (h, i) { return h + ': ' + values[i]; }).join('\n');
  const prompt = 'Summarize this travel/stay request in one sentence for a desk coordinator:\n\n' + rowText;

  try {
    const summary = callClaude(prompt, 200);
    SpreadsheetApp.getUi().alert(summary);
  } catch (err) {
    SpreadsheetApp.getUi().alert('Error: ' + err.message);
  }
}
