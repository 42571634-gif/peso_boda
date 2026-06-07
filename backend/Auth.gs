function validateKey_(key) {
  if (key !== CONFIG.APP_KEY) {
    throw new Error("Key invalida");
  }
}
