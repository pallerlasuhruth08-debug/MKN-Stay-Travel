/**
 * One-time (but safe to re-run) migration for the SSB Travel & Stay AppSheet Sheet.
 *
 * What it does:
 *  - Inserts Gender and Age columns into the Requests tab, right after Region.
 *  - Creates the AccessRequests tab with its 8 header columns.
 * Matches SSB-Travel-Stay-AppSheet-Blueprint.xlsx exactly.
 *
 * How to run:
 *  1. Open the live Google Sheet the AppSheet app is bound to.
 *  2. Extensions -> Apps Script.
 *  3. Paste this file in, save.
 *  4. Select migrateSheet from the function dropdown, click Run.
 *  5. Grant the Sheets permission it asks for the first time.
 *
 * Idempotent: every step checks the current state before changing anything,
 * so running it twice (or on a Sheet that's already partially migrated) is safe.
 */
function migrateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  addGenderAndAgeColumns_(ss);
  createAccessRequestsTab_(ss);
  SpreadsheetApp.getUi().alert('Migration complete. Check View -> Execution log for details.');
}

function addGenderAndAgeColumns_(ss) {
  const sheet = ss.getSheetByName('Requests');
  if (!sheet) {
    Logger.log('Requests tab not found - skipping column migration.');
    return;
  }

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  if (headers.indexOf('Gender') !== -1 && headers.indexOf('Age') !== -1) {
    Logger.log('Gender and Age columns already exist - nothing to do.');
    return;
  }

  const regionCol = headers.indexOf('Region') + 1; // 1-based; 0 means "not found"
  if (regionCol === 0) {
    Logger.log('Region column not found - cannot anchor the insert. Add Gender/Age manually.');
    return;
  }

  // Insert two blank columns right after Region, then label them.
  sheet.insertColumnsAfter(regionCol, 2);
  sheet.getRange(1, regionCol + 1).setValue('Gender');
  sheet.getRange(1, regionCol + 2).setValue('Age');
  Logger.log('Inserted Gender and Age columns after Region (columns ' + (regionCol + 1) + ', ' + (regionCol + 2) + ').');
}

function createAccessRequestsTab_(ss) {
  const name = 'AccessRequests';
  if (ss.getSheetByName(name)) {
    Logger.log('AccessRequests tab already exists - nothing to do.');
    return;
  }

  const sheet = ss.insertSheet(name);
  const headers = [
    'Request ID', 'Timestamp', 'Requester Email', 'Requester Name',
    'Requested Role', 'Status', 'Reviewed By', 'Reviewed At',
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  Logger.log('Created AccessRequests tab with headers.');
}
