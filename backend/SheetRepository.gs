function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActive();
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);

  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  const currentHeaders = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length).getValues()[0];
  const needsHeaders = CONFIG.HEADERS.some((header, index) => currentHeaders[index] !== header);

  if (!needsHeaders) return;

  sheet.getRange(1, 1, 1, CONFIG.HEADERS.length).setValues([CONFIG.HEADERS]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, CONFIG.HEADERS.length);
}

function readRecords_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet
    .getRange(2, 1, lastRow - 1, CONFIG.HEADERS.length)
    .getValues()
    .filter((row) => row[0])
    .map((row) => rowToRecord_(row));
}

function upsertRecords_(records) {
  if (records.length === 0) return;

  const sheet = getSheet_();
  const existing = readRecords_();
  const rowById = new Map();
  existing.forEach((record, index) => rowById.set(record.id, index + 2));

  records.forEach((record) => {
    const normalized = normalizeRecord_(record);
    const row = recordToRow_(normalized);
    const rowNumber = rowById.get(normalized.id);

    if (!rowNumber) {
      sheet.appendRow(row);
      return;
    }

    const current = existing.find((item) => item.id === normalized.id);
    const currentTime = Date.parse(current.updatedAt || "");
    const incomingTime = Date.parse(normalized.updatedAt || "");
    if (incomingTime >= currentTime) {
      sheet.getRange(rowNumber, 1, 1, CONFIG.HEADERS.length).setValues([row]);
    }
  });
}
