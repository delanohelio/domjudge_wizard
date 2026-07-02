const state = {
  apiBase: "https://coderunner.cin.ufpe.br/api/v4",
  apiUser: "",
  apiPassword: "",
  contests: [],
  filterText: "",
  filterEnabled: "all",
  filterChanged: "all",
  sortKey: "title",
  sortDir: "asc",
  page: 1,
  pageSize: 15,
};

const els = {
  apiBase: document.getElementById("managerApiBase"),
  apiUser: document.getElementById("managerApiUser"),
  apiPassword: document.getElementById("managerApiPassword"),
  extraContestIds: document.getElementById("managerExtraContestIds"),
  loadBtn: document.getElementById("managerLoadBtn"),
  saveChangedBtn: document.getElementById("managerSaveChangedBtn"),
  filterText: document.getElementById("managerFilterText"),
  filterEnabled: document.getElementById("managerFilterEnabled"),
  filterChanged: document.getElementById("managerFilterChanged"),
  changedHint: document.getElementById("managerChangedHint"),
  bulkStart: document.getElementById("managerBulkStart"),
  bulkEnd: document.getElementById("managerBulkEnd"),
  bulkEnabled: document.getElementById("managerBulkEnabled"),
  bulkScope: document.getElementById("managerBulkScope"),
  applyBulkBtn: document.getElementById("managerApplyBulkBtn"),
  bulkHint: document.getElementById("managerBulkHint"),
  pageSize: document.getElementById("managerPageSize"),
  prevPageBtn: document.getElementById("managerPrevPageBtn"),
  nextPageBtn: document.getElementById("managerNextPageBtn"),
  pageLabel: document.getElementById("managerPageLabel"),
  pageStats: document.getElementById("managerPageStats"),
  status: document.getElementById("managerStatus"),
  list: document.getElementById("contestManagerList"),
};

function parseContestIdList(value) {
  const seen = new Set();
  return String(value || "")
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .filter((item) => {
      const key = String(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function mergeContestsById(baseList, extraList) {
  const byId = new Map();
  [...(baseList || []), ...(extraList || [])].forEach((contest) => {
    const id = getContestId(contest);
    if (!id) return;
    byId.set(String(id), contest);
  });
  return Array.from(byId.values());
}

function sanitize(text) {
  return String(text ?? "").replace(/[<>]/g, "");
}

function setStatus(message, isError = false) {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.style.color = isError ? "#b91c1c" : "var(--muted)";
}

function normalizeApiBase(url) {
  const cleaned = String(url || "").trim().replace(/\/+$/, "");
  if (cleaned.endsWith("/api/v4") || cleaned.endsWith("/api")) return cleaned;
  return `${cleaned}/api/v4`;
}

function buildBasicAuthHeader(user, password) {
  return `Basic ${btoa(`${user}:${password}`)}`;
}

function formatDateForInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function formatDateForLabel(value) {
  if (!value) return "nao definido";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return sanitize(value);
  return date.toLocaleString("pt-BR");
}

function parseDateInputToIso(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseFlexibleDateToTime(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct.getTime();

  const brMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]) - 1;
    const year = Number(brMatch[3]);
    const hour = Number(brMatch[4] || 0);
    const minute = Number(brMatch[5] || 0);
    const second = Number(brMatch[6] || 0);
    const date = new Date(year, month, day, hour, minute, second);
    if (!Number.isNaN(date.getTime())) return date.getTime();
  }

  const isoNoTzMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (isoNoTzMatch) {
    const year = Number(isoNoTzMatch[1]);
    const month = Number(isoNoTzMatch[2]) - 1;
    const day = Number(isoNoTzMatch[3]);
    const hour = Number(isoNoTzMatch[4]);
    const minute = Number(isoNoTzMatch[5]);
    const second = Number(isoNoTzMatch[6] || 0);
    const date = new Date(year, month, day, hour, minute, second);
    if (!Number.isNaN(date.getTime())) return date.getTime();
  }

  return null;
}

function getContestId(contest) {
  return String(contest.id ?? contest.cid ?? "");
}

function getContestTitle(contest) {
  return contest.shortname || contest.name || getContestId(contest);
}

function getStartTime(contest) {
  return contest.start_time ?? contest.activate_time ?? contest.starttime ?? null;
}

function getEndTime(contest) {
  return contest.end_time ?? contest.deactivate_time ?? contest.endtime ?? null;
}

function getEnabled(contest) {
  if (typeof contest.enabled === "boolean") return contest.enabled;
  if (typeof contest.active === "boolean") return contest.active;
  if (typeof contest.allow_submit === "boolean") return contest.allow_submit;
  return false;
}

function buildContestRow(contest) {
  const id = getContestId(contest);
  const title = getContestTitle(contest);
  const startOriginal = getStartTime(contest);
  const endOriginal = getEndTime(contest);
  const enabledOriginal = getEnabled(contest);

  return {
    id,
    title,
    raw: contest,
    startOriginal,
    endOriginal,
    enabledOriginal,
    startEdit: startOriginal,
    endEdit: endOriginal,
    enabledEdit: enabledOriginal,
    saveResult: "",
  };
}

function sameIsoDate(a, b) {
  const left = a || null;
  const right = b || null;
  return left === right;
}

function isRowChanged(row) {
  return !sameIsoDate(row.startEdit, row.startOriginal) || !sameIsoDate(row.endEdit, row.endOriginal) || row.enabledEdit !== row.enabledOriginal;
}

function getChangedRows() {
  return state.contests.filter((row) => isRowChanged(row));
}

function normalizeSaveResultText(message) {
  const text = String(message || "").trim();
  return text || "-";
}

function sortArrowFor(key) {
  if (state.sortKey !== key) return "";
  return state.sortDir === "asc" ? " ▲" : " ▼";
}

function updateBulkInfo() {
  const changed = getChangedRows().length;
  if (els.saveChangedBtn) {
    els.saveChangedBtn.disabled = changed === 0;
  }
  if (els.changedHint) {
    els.changedHint.textContent = changed ? `${changed} contest(s) alterado(s) aguardando salvar.` : "Nenhuma alteracao pendente.";
  }
}

function applyFilters(rows) {
  const term = state.filterText.trim().toLowerCase();
  return rows.filter((row) => {
    if (term) {
      const haystack = `${row.title} ${row.id}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    if (state.filterEnabled === "enabled" && !row.enabledEdit) return false;
    if (state.filterEnabled === "disabled" && row.enabledEdit) return false;

    const changed = isRowChanged(row);
    if (state.filterChanged === "changed" && !changed) return false;
    if (state.filterChanged === "unchanged" && changed) return false;

    return true;
  });
}

function getFilteredSortedRows() {
  return sortRows(applyFilters(state.contests));
}

function compareNullableText(a, b) {
  return String(a || "").localeCompare(String(b || ""), "pt-BR");
}

function compareNullableDate(a, b) {
  const aTime = parseFlexibleDateToTime(a);
  const bTime = parseFlexibleDateToTime(b);
  if (aTime === null && bTime === null) return 0;
  if (aTime === null) return 1;
  if (bTime === null) return -1;
  if (aTime === bTime) return 0;
  return aTime < bTime ? -1 : 1;
}

function sortRows(rows) {
  const sorted = rows.slice().sort((a, b) => {
    if (state.sortKey === "id") return compareNullableText(a.id, b.id);
    if (state.sortKey === "title") return compareNullableText(a.title, b.title);
    if (state.sortKey === "start") return compareNullableDate(a.startEdit, b.startEdit);
    if (state.sortKey === "end") return compareNullableDate(a.endEdit, b.endEdit);
    if (state.sortKey === "enabled") return Number(a.enabledEdit) - Number(b.enabledEdit);
    if (state.sortKey === "changed") return Number(isRowChanged(a)) - Number(isRowChanged(b));
    if (state.sortKey === "save") return compareNullableText(a.saveResult, b.saveResult);
    return compareNullableText(a.title, b.title);
  });

  return state.sortDir === "asc" ? sorted : sorted.reverse();
}

function setSort(key) {
  if (state.sortKey === key) {
    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
  } else {
    state.sortKey = key;
    state.sortDir = "asc";
  }
  state.page = 1;
  renderContestTable();
}

function paginateRows(rows) {
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));

  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  const start = (state.page - 1) * state.pageSize;
  const end = start + state.pageSize;
  const items = rows.slice(start, end);

  return {
    items,
    totalRows,
    totalPages,
    startIndex: start + 1,
    endIndex: start + items.length,
  };
}

function updatePaginationUi(totalRows, totalPages, startIndex, endIndex) {
  if (els.prevPageBtn) {
    els.prevPageBtn.disabled = state.page <= 1;
  }
  if (els.nextPageBtn) {
    els.nextPageBtn.disabled = state.page >= totalPages;
  }
  if (els.pageLabel) {
    els.pageLabel.textContent = `Pagina ${state.page} de ${totalPages}`;
  }
  if (els.pageStats) {
    if (!totalRows) {
      els.pageStats.textContent = "Mostrando 0 de 0";
    } else {
      els.pageStats.textContent = `Mostrando ${startIndex}-${endIndex} de ${totalRows}`;
    }
  }
  if (els.pageSize) {
    els.pageSize.value = String(state.pageSize);
  }
}

async function apiFetch(path, options = {}) {
  const apiBase = normalizeApiBase(state.apiBase);
  const user = String(state.apiUser || "").trim();
  const password = state.apiPassword || "";

  if (!apiBase || !user || !password) {
    throw new Error("Preencha API base, usuario e senha.");
  }

  const response = await fetch(`${apiBase}/${String(path || "").replace(/^\/+/, "")}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: buildBasicAuthHeader(user, password),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha API (${response.status}): ${text || "sem detalhe"}`);
  }

  if (response.status === 204) return null;
  const raw = await response.text();
  return raw.trim() ? JSON.parse(raw) : null;
}

function buildUpdateAttempts(startTime, endTime, enabled) {
  const variants = [
    {
      start_time: startTime,
      end_time: endTime,
      enabled,
    },
    {
      start_time: startTime,
      end_time: endTime,
      active: enabled,
    },
    {
      activate_time: startTime,
      deactivate_time: endTime,
      enabled,
    },
    {
      activate_time: startTime,
      deactivate_time: endTime,
      active: enabled,
    },
  ];

  return variants.map((body) => ({
    method: "PATCH",
    body,
  }));
}

async function updateContest(contestId, startTime, endTime, enabled) {
  const attempts = buildUpdateAttempts(startTime, endTime, enabled);
  let lastError = null;

  for (const attempt of attempts) {
    try {
      const payload = JSON.stringify(attempt.body);
      await apiFetch(`contests/${encodeURIComponent(contestId)}`, {
        method: attempt.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
      });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Nao foi possivel atualizar o contest.");
}

function bindRowInputs(tbody) {
  tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
    const row = state.contests.find((entry) => entry.id === tr.dataset.id);
    if (!row) return;

    const startInput = tr.querySelector(".manager-start");
    const endInput = tr.querySelector(".manager-end");
    const enabledInput = tr.querySelector(".manager-enabled");

    const onUpdate = () => {
      const startIso = parseDateInputToIso(startInput.value);
      const endIso = parseDateInputToIso(endInput.value);

      if (startInput.value && !startIso) {
        startInput.setCustomValidity("Data invalida");
      } else {
        startInput.setCustomValidity("");
      }

      if (endInput.value && !endIso) {
        endInput.setCustomValidity("Data invalida");
      } else {
        endInput.setCustomValidity("");
      }

      row.startEdit = startIso;
      row.endEdit = endIso;
      row.enabledEdit = Boolean(enabledInput.checked);
      row.saveResult = "";

      tr.querySelector(".manager-toggle-inline span").textContent = row.enabledEdit ? "Sim" : "Nao";
      tr.querySelector(".manager-changed-cell").textContent = isRowChanged(row) ? "Sim" : "Nao";
      tr.querySelector(".manager-save-cell").textContent = "-";
      tr.classList.toggle("changed", isRowChanged(row));
      updateBulkInfo();
    };

    startInput.addEventListener("input", onUpdate);
    endInput.addEventListener("input", onUpdate);
    enabledInput.addEventListener("change", onUpdate);
  });
}

function renderContestTable() {
  if (!els.list) return;
  if (!state.contests.length) {
    els.list.innerHTML = "";
    setStatus("Nenhum contest encontrado para este usuario.");
    updateBulkInfo();
    updatePaginationUi(0, 1, 0, 0);
    return;
  }

  const filteredSortedRows = getFilteredSortedRows();
  const { items: pagedRows, totalRows, totalPages, startIndex, endIndex } = paginateRows(filteredSortedRows);

  const wrapper = document.createElement("article");
  wrapper.className = "card manager-table-card";
  wrapper.innerHTML = `
    <div class="manager-table-wrap">
      <table class="manager-table">
        <thead>
          <tr>
            <th><button type="button" class="manager-sort" data-sort="id">ID${sortArrowFor("id")}</button></th>
            <th><button type="button" class="manager-sort" data-sort="title">Contest${sortArrowFor("title")}</button></th>
            <th><button type="button" class="manager-sort" data-sort="start">Inicio atual${sortArrowFor("start")}</button></th>
            <th><button type="button" class="manager-sort" data-sort="end">Fim atual${sortArrowFor("end")}</button></th>
            <th><button type="button" class="manager-sort" data-sort="enabled">Habilitado${sortArrowFor("enabled")}</button></th>
            <th><button type="button" class="manager-sort" data-sort="changed">Alterado${sortArrowFor("changed")}</button></th>
            <th><button type="button" class="manager-sort" data-sort="save">Resultado save${sortArrowFor("save")}</button></th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  const tbody = wrapper.querySelector("tbody");
  if (!pagedRows.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="7" class="manager-empty">Nenhum contest corresponde aos filtros.</td>';
    tbody.appendChild(row);
  } else {
    pagedRows.forEach((rowData) => {
      const row = document.createElement("tr");
      row.dataset.id = rowData.id;
      if (isRowChanged(rowData)) row.classList.add("changed");
      row.innerHTML = `
        <td>${sanitize(rowData.id)}</td>
        <td>
          <strong>${sanitize(rowData.title)}</strong>
          <div class="manager-sub">${sanitize(rowData.raw.name || "")}</div>
        </td>
        <td>
          <input class="manager-start" type="datetime-local" value="${formatDateForInput(rowData.startEdit)}" />
          <div class="manager-sub">Original: ${sanitize(formatDateForLabel(rowData.startOriginal))}</div>
        </td>
        <td>
          <input class="manager-end" type="datetime-local" value="${formatDateForInput(rowData.endEdit)}" />
          <div class="manager-sub">Original: ${sanitize(formatDateForLabel(rowData.endOriginal))}</div>
        </td>
        <td>
          <label class="manager-toggle-inline">
            <input class="manager-enabled" type="checkbox" ${rowData.enabledEdit ? "checked" : ""} />
            <span>${rowData.enabledEdit ? "Sim" : "Nao"}</span>
          </label>
        </td>
        <td class="manager-changed-cell">${isRowChanged(rowData) ? "Sim" : "Nao"}</td>
        <td class="manager-save-cell">${sanitize(normalizeSaveResultText(rowData.saveResult))}</td>
      `;
      tbody.appendChild(row);
    });
  }

  wrapper.querySelectorAll(".manager-sort").forEach((btn) => {
    btn.addEventListener("click", () => {
      setSort(btn.dataset.sort);
    });
  });

  els.list.innerHTML = "";
  els.list.appendChild(wrapper);

  bindRowInputs(tbody);
  updateBulkInfo();
  updatePaginationUi(totalRows, totalPages, startIndex, endIndex);
}

function getBulkTargetRows(scope) {
  const filteredSortedRows = getFilteredSortedRows();
  if (scope === "filtered") {
    return filteredSortedRows;
  }

  const { items } = paginateRows(filteredSortedRows);
  return items;
}

function applyBulkChanges() {
  if (!state.contests.length) {
    setStatus("Carregue contests antes de aplicar alteracoes em massa.", true);
    return;
  }

  const startRaw = els.bulkStart?.value || "";
  const endRaw = els.bulkEnd?.value || "";
  const enabledMode = els.bulkEnabled?.value || "keep";
  const scope = els.bulkScope?.value || "page";

  const hasStartChange = Boolean(startRaw);
  const hasEndChange = Boolean(endRaw);
  const hasEnabledChange = enabledMode !== "keep";

  if (!hasStartChange && !hasEndChange && !hasEnabledChange) {
    setStatus("Defina ao menos um valor para aplicar em massa.", true);
    return;
  }

  const startIso = hasStartChange ? parseDateInputToIso(startRaw) : null;
  const endIso = hasEndChange ? parseDateInputToIso(endRaw) : null;

  if (hasStartChange && !startIso) {
    setStatus("Data de inicio invalida na aplicacao em massa.", true);
    return;
  }

  if (hasEndChange && !endIso) {
    setStatus("Data de fim invalida na aplicacao em massa.", true);
    return;
  }

  const targetRows = getBulkTargetRows(scope);
  if (!targetRows.length) {
    setStatus("Nenhum contest alvo para aplicacao em massa com os filtros atuais.", true);
    return;
  }

  let changedCount = 0;
  targetRows.forEach((row) => {
    if (hasStartChange) row.startEdit = startIso;
    if (hasEndChange) row.endEdit = endIso;
    if (hasEnabledChange) row.enabledEdit = enabledMode === "enable";
    row.saveResult = "";
    if (isRowChanged(row)) changedCount += 1;
  });

  renderContestTable();
  setStatus(`Aplicacao em massa concluida em ${targetRows.length} contest(s). ${changedCount} estao alterados para salvar.`);
}

async function saveChangedContests() {
  const changedRows = getChangedRows();
  if (!changedRows.length) {
    setStatus("Nenhuma alteracao pendente para salvar.");
    return;
  }

  changedRows.forEach((row) => {
    row.saveResult = "Pendente";
  });

  if (els.saveChangedBtn) els.saveChangedBtn.disabled = true;
  if (els.loadBtn) els.loadBtn.disabled = true;
  renderContestTable();
  setStatus(`Salvando ${changedRows.length} contest(s) alterado(s)...`);

  let success = 0;
  const failures = [];

  for (const row of changedRows) {
    try {
      await updateContest(row.id, row.startEdit, row.endEdit, row.enabledEdit);
      row.startOriginal = row.startEdit;
      row.endOriginal = row.endEdit;
      row.enabledOriginal = row.enabledEdit;
      row.saveResult = "Salvo";
      success += 1;
    } catch (error) {
      const reason = String(error?.message || "erro desconhecido");
      row.saveResult = `Erro: ${reason}`;
      failures.push(`${row.title} (${row.id}): ${reason}`);
    }
  }

  if (failures.length) {
    setStatus(`Salvos: ${success}. Falhas: ${failures.length}. Primeira falha: ${failures[0]}`, true);
  } else {
    setStatus(`Todos os ${success} contest(s) alterados foram salvos.`);
  }

  if (els.loadBtn) els.loadBtn.disabled = false;
  renderContestTable();
}

async function loadContests() {
  state.apiBase = els.apiBase?.value?.trim() || state.apiBase;
  state.apiUser = els.apiUser?.value?.trim() || "";
  state.apiPassword = els.apiPassword?.value || "";

  if (els.loadBtn) els.loadBtn.disabled = true;
  setStatus("Carregando contests...");

  try {
    let contests;
    try {
      contests = await apiFetch("contests?onlyActive=false");
    } catch (error) {
      const maybeUnsupportedParam = /Falha API \((400|404)\)/.test(String(error?.message || ""));
      if (!maybeUnsupportedParam) throw error;
      contests = await apiFetch("contests");
    }

    const manualIds = parseContestIdList(els.extraContestIds?.value || "");
    const extraContests = [];
    const failedIds = [];

    for (const cid of manualIds) {
      try {
        const contest = await apiFetch(`contests/${encodeURIComponent(cid)}`);
        if (contest && typeof contest === "object") {
          extraContests.push(contest);
        }
      } catch (_error) {
        failedIds.push(cid);
      }
    }

    contests = mergeContestsById(contests, extraContests);

    if (!Array.isArray(contests)) {
      throw new Error("Resposta da API invalida para contests.");
    }

    state.contests = contests
      .slice()
      .sort((a, b) => getContestTitle(a).localeCompare(getContestTitle(b), "pt-BR"))
      .map(buildContestRow);
    state.page = 1;

    renderContestTable();
    if (manualIds.length && failedIds.length) {
      setStatus(`${state.contests.length} contest(s) carregado(s). IDs sem acesso/encontrados: ${failedIds.join(", ")}.`, true);
    } else if (!manualIds.length) {
      setStatus(`${state.contests.length} contest(s) carregado(s). Se faltarem contests desabilitados, informe os IDs no campo opcional.`);
    } else {
      setStatus(`${state.contests.length} contest(s) carregado(s), incluindo IDs extras solicitados.`);
    }
  } catch (error) {
    state.contests = [];
    els.list.innerHTML = "";
    setStatus(`Erro ao carregar contests: ${error.message}`, true);
    updateBulkInfo();
    updatePaginationUi(0, 1, 0, 0);
  } finally {
    if (els.loadBtn) els.loadBtn.disabled = false;
  }
}

if (els.loadBtn) {
  els.loadBtn.addEventListener("click", loadContests);
}

if (els.saveChangedBtn) {
  els.saveChangedBtn.addEventListener("click", saveChangedContests);
}

if (els.filterText) {
  els.filterText.addEventListener("input", () => {
    state.filterText = els.filterText.value || "";
    state.page = 1;
    renderContestTable();
  });
}

if (els.filterEnabled) {
  els.filterEnabled.addEventListener("change", () => {
    state.filterEnabled = els.filterEnabled.value || "all";
    state.page = 1;
    renderContestTable();
  });
}

if (els.filterChanged) {
  els.filterChanged.addEventListener("change", () => {
    state.filterChanged = els.filterChanged.value || "all";
    state.page = 1;
    renderContestTable();
  });
}

if (els.pageSize) {
  els.pageSize.addEventListener("change", () => {
    const next = Number(els.pageSize.value || 15);
    state.pageSize = Number.isFinite(next) && next > 0 ? next : 15;
    state.page = 1;
    renderContestTable();
  });
}

if (els.prevPageBtn) {
  els.prevPageBtn.addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    renderContestTable();
  });
}

if (els.nextPageBtn) {
  els.nextPageBtn.addEventListener("click", () => {
    state.page += 1;
    renderContestTable();
  });
}

if (els.applyBulkBtn) {
  els.applyBulkBtn.addEventListener("click", applyBulkChanges);
}

setStatus("Preencha API base, usuario e senha para carregar contests.");
updateBulkInfo();
updatePaginationUi(0, 1, 0, 0);
