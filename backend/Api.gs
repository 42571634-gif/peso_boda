function doGet(event) {
  try {
    const params = event && event.parameter ? event.parameter : {};
    const action = params.action || "list";

    if (action === "sync") {
      const payload = parseJson_(params.payload || "{}");
      validateKey_(payload.key);
      const incoming = Array.isArray(payload.records) ? payload.records : [];
      upsertRecords_(incoming);
    } else {
      validateKey_(params.key);
    }

    return jsonResponse_({
      ok: true,
      records: readRecords_(),
      serverTime: new Date().toISOString()
    }, params.callback);
  } catch (error) {
    const callback = event && event.parameter ? event.parameter.callback : "";
    return jsonResponse_({
      ok: false,
      error: error.message,
      serverTime: new Date().toISOString()
    }, callback);
  }
}

function doPost(event) {
  try {
    const payload = parseJson_(event.postData.contents || "{}");
    if (payload.action !== "sync") {
      throw new Error("Accion no soportada");
    }

    validateKey_(payload.key);
    const incoming = Array.isArray(payload.records) ? payload.records : [];
    upsertRecords_(incoming);

    return jsonResponse_({
      ok: true,
      records: readRecords_(),
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error.message,
      serverTime: new Date().toISOString()
    });
  }
}
