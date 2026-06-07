function parseJson_(value) {
  try {
    return JSON.parse(value || "{}");
  } catch (error) {
    throw new Error("JSON invalido");
  }
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
