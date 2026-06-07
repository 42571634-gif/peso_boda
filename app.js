(() => {
  "use strict";

  const LS = {
    records: "peso-registros-v1",
    endpoint: "peso-google-sheets-endpoint-v1",
    filter: "peso-filter-v1",
    unlocked: "peso-boda-2027-unlocked",
    key: "peso-boda-2027-access-key"
  };
  const people = ["Alberto", "Carla"];
  const colors = { Alberto: "#137c74", Carla: "#d95f73" };
  const $ = (id) => document.getElementById(id);
  const state = {
    records: load().map((r) => ({ ...r, person: normalizePerson(r.person) })),
    endpoint: localStorage.getItem(LS.endpoint) || "",
    filter: localStorage.getItem(LS.filter) || "Todos",
    syncing: false
  };
  const el = {
    lock: $("lockScreen"), accessForm: $("accessForm"), accessKey: $("accessKeyInput"), accessError: $("accessError"),
    form: $("weightForm"), person: $("personInput"), date: $("dateInput"), weight: $("weightInput"), note: $("noteInput"),
    endpoint: $("endpointInput"), saveEndpoint: $("saveEndpointBtn"), syncNow: $("syncNowBtn"), lockAccess: $("lockAccessBtn"),
    syncDot: $("syncDot"), syncState: $("syncState"), syncDetail: $("syncDetail"), chart: $("chart"), body: $("recordsBody"),
    statMe: $("statMe"), statPartner: $("statPartner"), trendMe: $("trendMe"), trendPartner: $("trendPartner"),
    statCount: $("statCount"), pendingCount: $("pendingCount"), export: $("exportBtn"), empty: $("emptyTemplate")
  };

  init();

  function init() {
    const unlocked = localStorage.getItem(LS.unlocked) === "true";
    document.body.classList.toggle("locked", !unlocked);
    el.lock.hidden = unlocked;
    el.date.value = today();
    el.endpoint.value = state.endpoint;
    el.accessForm.addEventListener("submit", unlock);
    el.form.addEventListener("submit", addRecord);
    el.saveEndpoint.addEventListener("click", saveEndpoint);
    el.syncNow.addEventListener("click", () => sync("manual"));
    el.lockAccess.addEventListener("click", lock);
    el.export.addEventListener("click", exportCsv);
    el.body.addEventListener("click", annulRecord);
    document.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => setFilter(b.dataset.filter)));
    render();
    if (unlocked) sync("startup");
  }

  function unlock(e) {
    e.preventDefault();
    const key = el.accessKey.value.trim();
    if (key.length < 6) {
      el.accessError.textContent = "Ingresa una key valida.";
      el.accessKey.select();
      return;
    }
    localStorage.setItem(LS.key, key);
    localStorage.setItem(LS.unlocked, "true");
    document.body.classList.remove("locked");
    el.lock.hidden = true;
    el.accessError.textContent = "";
    sync("startup");
  }

  function lock() {
    localStorage.removeItem(LS.key);
    localStorage.removeItem(LS.unlocked);
    el.lock.hidden = false;
    document.body.classList.add("locked");
    el.accessKey.value = "";
    el.accessKey.focus();
  }

  function addRecord(e) {
    e.preventDefault();
    const weight = Number(String(el.weight.value).replace(",", "."));
    if (!Number.isFinite(weight) || weight <= 0) return;
    const now = new Date().toISOString();
    state.records.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      person: el.person.value,
      date: el.date.value,
      weight: Math.round(weight * 10) / 10,
      note: el.note.value.trim(),
      status: "active",
      createdAt: now,
      updatedAt: now,
      deletedAt: "",
      pendingAction: "upsert"
    });
    el.weight.value = "";
    el.note.value = "";
    save();
    render();
    sync("create");
  }

  function annulRecord(e) {
    const btn = e.target.closest("[data-annul]");
    if (!btn) return;
    const record = state.records.find((r) => r.id === btn.dataset.annul);
    if (!record || record.status === "annulled") return;
    record.status = "annulled";
    record.pendingAction = "annul";
    record.deletedAt = new Date().toISOString();
    record.updatedAt = record.deletedAt;
    save();
    render();
    sync("annul");
  }

  function saveEndpoint() {
    state.endpoint = el.endpoint.value.trim();
    localStorage.setItem(LS.endpoint, state.endpoint);
    setSync(state.endpoint ? "Pendiente" : "Sin configurar", state.endpoint ? "Endpoint guardado." : "Conecta Google Sheets para sincronizar.", "pending");
    sync("endpoint");
  }

  async function sync(reason) {
    if (state.syncing || !state.endpoint) {
      if (!state.endpoint) setSync("Sin configurar", "Conecta Google Sheets para sincronizar.", "pending");
      return;
    }
    state.syncing = true;
    setSync("Sincronizando", syncLabel(reason), "pending");
    try {
      const pending = state.records.filter((r) => r.pendingAction).map(cleanRecord);
      const data = await jsonp(state.endpoint, { action: "sync", key: localStorage.getItem(LS.key) || "", clientTime: new Date().toISOString(), records: pending });
      if (!data.ok) throw new Error(data.error || "Respuesta invalida");
      merge(data.records || []);
      state.records.forEach((r) => { r.pendingAction = ""; r.syncedAt = new Date().toISOString(); });
      save();
      setSync("Sincronizado", `Ultima sincronizacion ${new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date())}`, "ok");
    } catch (err) {
      setSync("Sin conexion", `Se reintentara luego: ${err.message}`, "error");
    } finally {
      state.syncing = false;
      render();
    }
  }

  function jsonp(endpoint, payload) {
    return new Promise((resolve, reject) => {
      const cb = `pesoSync_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const url = new URL(endpoint);
      url.searchParams.set("action", "sync");
      url.searchParams.set("payload", JSON.stringify(payload));
      url.searchParams.set("callback", cb);
      const script = document.createElement("script");
      const timer = setTimeout(() => done(() => reject(new Error("Tiempo de espera agotado"))), 15000);
      window[cb] = (data) => done(() => resolve(data));
      script.onerror = () => done(() => reject(new Error("No se pudo conectar con Apps Script")));
      function done(fn) { clearTimeout(timer); delete window[cb]; script.remove(); fn(); }
      script.src = url.toString();
      document.body.appendChild(script);
    });
  }

  function merge(remote) {
    const map = new Map(state.records.map((r) => [r.id, r]));
    remote.forEach((r) => {
      if (!r.id) return;
      const normalized = normalizeRemote(r);
      const local = map.get(normalized.id);
      if (!local || (!local.pendingAction && Date.parse(normalized.updatedAt) > Date.parse(local.updatedAt || ""))) map.set(normalized.id, normalized);
    });
    state.records = [...map.values()];
  }

  function render() {
    const active = state.records.filter((r) => r.status !== "annulled");
    el.statCount.textContent = active.length;
    people.forEach((p) => renderPerson(p, active.filter((r) => r.person === p).sort(byDate)));
    renderChart(active.filter((r) => state.filter === "Todos" || r.person === state.filter).sort(byDate));
    renderTable();
    document.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("active", b.dataset.filter === state.filter));
    const pending = state.records.filter((r) => r.pendingAction).length;
    el.pendingCount.textContent = `${pending} pendiente${pending === 1 ? "" : "s"}`;
  }

  function renderPerson(person, records) {
    const latest = records.at(-1);
    const previous = records.at(-2);
    const value = person === "Alberto" ? el.statMe : el.statPartner;
    const trend = person === "Alberto" ? el.trendMe : el.trendPartner;
    value.textContent = latest ? `${latest.weight.toFixed(1)} kg` : "-- kg";
    trend.textContent = !latest ? "Sin datos" : !previous ? `Desde ${fmt(latest.date)}` : `${signed(latest.weight - previous.weight)} kg desde el anterior`;
  }

  function renderChart(records) {
    if (!records.length) {
      el.chart.innerHTML = '<div class="chart-empty">Registra un peso para ver la evolucion.</div>';
      return;
    }
    const w = 900, h = 340, pad = { l: 54, r: 28, t: 36, b: 46 };
    const dates = records.map((r) => Date.parse(`${r.date}T00:00:00`));
    const weights = records.map((r) => r.weight);
    const minD = Math.min(...dates), maxD = Math.max(...dates), minW = Math.floor(Math.min(...weights) - 1), maxW = Math.ceil(Math.max(...weights) + 1);
    const x = (d) => pad.l + ((d - minD) / Math.max(1, maxD - minD)) * (w - pad.l - pad.r);
    const y = (kg) => h - pad.b - ((kg - minW) / Math.max(1, maxW - minW)) * (h - pad.t - pad.b);
    const visible = state.filter === "Todos" ? people : [state.filter];
    const series = visible.map((p) => {
      const pts = records.filter((r) => r.person === p).map((r) => [x(Date.parse(`${r.date}T00:00:00`)), y(r.weight), r]);
      if (!pts.length) return "";
      const line = pts.map((pt, i) => `${i ? "L" : "M"} ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`).join(" ");
      const dots = pts.map((pt) => `<circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="5" fill="${colors[p]}"><title>${p}: ${pt[2].weight.toFixed(1)} kg - ${fmt(pt[2].date)}</title></circle>`).join("");
      return `<path d="${line}" fill="none" stroke="${colors[p]}" />${dots}`;
    }).join("");
    el.chart.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${h - pad.b}" stroke="#cfd7d1"/><line x1="${pad.l}" y1="${h - pad.b}" x2="${w - pad.r}" y2="${h - pad.b}" stroke="#cfd7d1"/><text x="14" y="${y(minW) + 4}" fill="#66706b" font-size="12">${minW}.0</text><text x="14" y="${y(maxW) + 4}" fill="#66706b" font-size="12">${maxW}.0</text>${series}</svg><div class="legend">${visible.map((p) => `<span><i style="background:${colors[p]}"></i>${p}</span>`).join("")}</div>`;
  }

  function renderTable() {
    el.body.innerHTML = "";
    const rows = [...state.records].sort((a, b) => byDate(b, a));
    if (!rows.length) return el.body.appendChild(el.empty.content.cloneNode(true));
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${fmt(r.date)}</td><td>${r.person}</td><td><strong>${Number(r.weight).toFixed(1)} kg</strong></td><td><span class="status ${r.status === "annulled" ? "annulled" : ""}">${r.status === "annulled" ? "Anulado" : "Activo"}${r.pendingAction ? " / pendiente" : ""}</span></td><td><button class="row-action" data-annul="${r.id}" ${r.status === "annulled" ? "disabled" : ""}>Anular</button></td>`;
      el.body.appendChild(tr);
    });
  }

  function setFilter(filter) { state.filter = filter; localStorage.setItem(LS.filter, filter); render(); }
  function load() { try { return JSON.parse(localStorage.getItem(LS.records) || "[]"); } catch { return []; } }
  function save() { localStorage.setItem(LS.records, JSON.stringify(state.records)); }
  function cleanRecord(r) { return { id: r.id, person: r.person, date: r.date, weight: r.weight, note: r.note, status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt }; }
  function normalizeRemote(r) { return { ...cleanRecord({ ...r, person: normalizePerson(r.person), weight: Number(r.weight || 0), note: r.note || "", status: r.status === "annulled" ? "annulled" : "active", createdAt: r.createdAt || new Date().toISOString(), updatedAt: r.updatedAt || new Date().toISOString(), deletedAt: r.deletedAt || "" }), pendingAction: "", syncedAt: new Date().toISOString() }; }
  function normalizePerson(p) { return p === "Carla" || p === "Mi novia" ? "Carla" : "Alberto"; }
  function byDate(a, b) { return `${a.date}-${a.createdAt}`.localeCompare(`${b.date}-${b.createdAt}`); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function fmt(d) { return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${d}T00:00:00`)); }
  function signed(n) { const v = Math.round(n * 10) / 10; return `${v > 0 ? "+" : ""}${v.toFixed(1)}`; }
  function syncLabel(r) { return ({ startup: "Sincronizando al ingresar...", create: "Sincronizando nuevo registro...", annul: "Sincronizando anulacion...", endpoint: "Probando conexion...", manual: "Sincronizando..." })[r] || "Sincronizando..."; }
  function setSync(title, detail, type) { el.syncState.textContent = title; el.syncDetail.textContent = detail; el.syncDot.className = `sync-dot ${type}`; }
  function exportCsv() {
    const csv = [["id", "persona", "fecha", "peso", "nota", "estado", "creado", "actualizado"], ...state.records.map((r) => [r.id, r.person, r.date, r.weight, r.note, r.status, r.createdAt, r.updatedAt])].map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `registro-peso-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
})();
