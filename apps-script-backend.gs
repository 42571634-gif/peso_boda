const SHEET_NAME = "Registros";
const APP_KEY = "CAMBIA_ESTA_KEY_PRIVADA";
const HEADERS = [
  "id",
  "person",
  "date",
  "weight",
  "note",
  "status",
  "createdAt",
  "updatedAt",
  "deletedAt"
];

function doGet(event) {
  try {
    const params = event && event.parameter ? event.parameter : {};
    const action = params.action || "list";

    if (action === "sync") {
      const payload = JSON.parse(params.payload || "{}");
      validateKey_(payload.key);
      const incoming = Array.isArray(payload.records) ? payload.records : [];
      upsertRecords_(incoming);
    } else {
      validateKey_(params.key);
    }

    return jsonResponse_({
      ok: true,
      records: readRecords_()
    }, params.callback);
  } catch (error) {
    const callback = event && event.parameter ? event.parameter.callback : "";
    return jsonResponse_({
      ok: false,
      error: error.message
    }, callback);
  }
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    if (payload.action !== "sync") {
      throw new Error("Accion no soportada");
    }
    validateKey_(payload.key);

    const incoming = Array.isArray(payload.records) ? payload.records : [];
    upsertRecords_(incoming);

    return jsonResponse_({
      ok: true,
      records: readRecords_()
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error.message
    });
  }
}

function validateKey_(key) {
  if (key !== APP_KEY) {
    throw new Error("Key invalida");
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActive();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsHeaders = HEADERS.some((header, index) => currentHeaders[index] !== header);
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function readRecords_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet
    .getRange(2, 1, lastRow - 1, HEADERS.length)
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

    if (rowNumber) {
      const current = existing.find((item) => item.id === normalized.id);
      const currentTime = Date.parse(current.updatedAt || "");
      const incomingTime = Date.parse(normalized.updatedAt || "");
      if (incomingTime >= currentTime) {
        sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([row]);
      }
    } else {
      sheet.appendRow(row);
    }
  });
}

function normalizeRecord_(record) {
  const now = new Date().toISOString();
  if (!record.id) throw new Error("Registro sin id");
  if (!record.person) throw new Error("Registro sin persona");
  if (!record.date) throw new Error("Registro sin fecha");
  if (!record.weight) throw new Error("Registro sin peso");

  return {
    id: String(record.id),
    person: normalizePerson_(record.person),
    date: String(record.date).slice(0, 10),
    weight: Number(record.weight),
    note: String(record.note || ""),
    status: record.status === "annulled" ? "annulled" : "active",
    createdAt: String(record.createdAt || now),
    updatedAt: String(record.updatedAt || now),
    deletedAt: String(record.deletedAt || "")
  };
}

function normalizePerson_(person) {
  const value = String(person || "");
  if (value === "Yo") return "Alberto";
  if (value === "Mi novia") return "Carla";
  if (value === "Carla") return "Carla";
  return "Alberto";
}

function recordToRow_(record) {
  return HEADERS.map((header) => record[header] || "");
}

function rowToRecord_(row) {
  const record = {};
  HEADERS.forEach((header, index) => {
    record[header] = row[index] instanceof Date ? row[index].toISOString() : row[index];
  });
  record.weight = Number(record.weight);
  return record;
}

function jsonResponse_(payload, callback) {
  const json = JSON.stringify(payload);
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
