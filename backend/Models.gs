function normalizeRecord_(record) {
  const now = new Date().toISOString();
  if (!record.id) throw new Error("Registro sin id");
  if (!record.person) throw new Error("Registro sin persona");
  if (!record.date) throw new Error("Registro sin fecha");
  if (!record.weight) throw new Error("Registro sin peso");

  const weight = Number(record.weight);
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new Error("Peso invalido");
  }

  return {
    id: String(record.id),
    person: normalizePerson_(record.person),
    date: normalizeDate_(record.date),
    weight,
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

function normalizeDate_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  const text = String(value || "");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  throw new Error("Fecha invalida");
}

function recordToRow_(record) {
  return CONFIG.HEADERS.map((header) => record[header] || "");
}

function rowToRecord_(row) {
  const record = {};
  CONFIG.HEADERS.forEach((header, index) => {
    if (row[index] instanceof Date && header === "date") {
      record[header] = Utilities.formatDate(row[index], Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      record[header] = row[index] instanceof Date ? row[index].toISOString() : row[index];
    }
  });
  record.weight = Number(record.weight);
  return record;
}
