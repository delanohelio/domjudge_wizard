// ============================================================================
// DOMJUDGE WIZARD - GERENCIADOR DE CONTESTS (SPA MODULE)
// ============================================================================

const ContestManagerModule = (() => {
  const state = {
    contests: [],
    filterText: "",
    filterEnabled: "all",
    filterChanged: "all",
    sortKey: "id",
    sortDir: "asc",
    page: 1,
    pageSize: 100,
  };

  const els = {
    loadBtn: document.getElementById("managerLoadBtn"),
    saveChangedBtn: document.getElementById("managerSaveChangedBtn"),
    filterText: document.getElementById("managerFilterText"),
    filterEnabled: document.getElementById("managerFilterEnabled"),
    filterChanged: document.getElementById("managerFilterChanged"),
    extraContestIds: document.getElementById("managerExtraContestIds"),
    changedHint: document.getElementById("managerChangedHint"),
    bulkStart: document.getElementById("managerBulkStart"),
    bulkEnd: document.getElementById("managerBulkEnd"),
    bulkEnabled: document.getElementById("managerBulkEnabled"),
    bulkScope: document.getElementById("managerBulkScope"),
    applyBulkBtn: document.getElementById("managerApplyBulkBtn"),
    pageSize: document.getElementById("managerPageSize"),
    prevPageBtn: document.getElementById("managerPrevPageBtn"),
    nextPageBtn: document.getElementById("managerNextPageBtn"),
    pageLabel: document.getElementById("managerPageLabel"),
    pageStats: document.getElementById("managerPageStats"),
    tableBody: document.getElementById("contestTableBody"),
    kpiTotal: document.getElementById("kpiContestTotal"),
    kpiActive: document.getElementById("kpiContestActive"),
    kpiUpcoming: document.getElementById("kpiContestUpcoming"),
    kpiChanged: document.getElementById("kpiContestChanged"),
  };

  function showToast(msg, type = "info") {
    if (window.showToast) {
      window.showToast(msg, type);
    } else {
      console.log(`[${type}] ${msg}`);
    }
  }

  function sanitize(text) {
    return String(text ?? "").replace(/[<>]/g, "");
  }

  function getContestId(contest) {
    return contest.id || contest.cid || contest.shortname || "";
  }

  function getContestTitle(contest) {
    return contest.name || contest.formal_name || contest.shortname || getContestId(contest);
  }

  function formatDateForInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  }

  function formatDateForLabel(value) {
    if (!value) return "Não definido";
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

  function getContestStatusInfo(contest) {
    const isEnabled = Boolean(contest.enabled ?? true);
    if (!isEnabled) {
      return { label: "Desabilitado", badgeClass: "badge-dim" };
    }

    const now = Date.now();
    const start = contest.start_time ? new Date(contest.start_time).getTime() : null;
    const end = contest.end_time ? new Date(contest.end_time).getTime() : null;

    if (start && start > now) {
      return { label: "Agendado", badgeClass: "badge-tle" };
    }
    if (end && end < now) {
      return { label: "Finalizado", badgeClass: "badge-dim" };
    }
    return { label: "Em Andamento", badgeClass: "badge-ac" };
  }

  function isContestChanged(item) {
    return item.draft.start !== item.orig.start ||
      item.draft.end !== item.orig.end ||
      item.draft.enabled !== item.orig.enabled;
  }

  function updateKpis() {
    const total = state.contests.length;
    const active = state.contests.filter((c) => Boolean(c.draft.enabled)).length;
    const now = Date.now();
    const upcoming = state.contests.filter((c) => {
      if (!c.draft.enabled) return false;
      const s = c.draft.start ? new Date(c.draft.start).getTime() : null;
      return s && s > now;
    }).length;
    const changed = state.contests.filter(isContestChanged).length;

    if (els.kpiTotal) els.kpiTotal.textContent = total;
    if (els.kpiActive) els.kpiActive.textContent = active;
    if (els.kpiUpcoming) els.kpiUpcoming.textContent = upcoming;
    if (els.kpiChanged) els.kpiChanged.textContent = changed;

    if (els.saveChangedBtn) {
      els.saveChangedBtn.disabled = changed === 0;
    }
    if (els.changedHint) {
      els.changedHint.textContent = changed > 0
        ? `${changed} contest(s) com alterações pendentes.`
        : "Nenhuma alteração pendente.";
      els.changedHint.style.color = changed > 0 ? "var(--brand)" : "var(--ink-muted)";
    }
  }

  // --------------------------------------------------------------------------
  // CARREGAR CONTESTS DA API
  // --------------------------------------------------------------------------
  async function loadContests() {
    const creds = window.getApiCredentials ? window.getApiCredentials() : null;
    if (!creds || !creds.apiBase) {
      showToast("Sessão da API não disponível.", "error");
      return;
    }

    try {
      showToast("Carregando lista de contests do DOMjudge...", "info");
      if (els.tableBody) {
        els.tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--ink-muted);">Carregando contests...</td></tr>`;
      }

      const headers = {};
      if (creds.user && creds.password) {
        headers["Authorization"] = `Basic ${btoa(`${creds.user}:${creds.password}`)}`;
      }

      const res = await fetch(`${creds.apiBase}/contests`, { headers });
      if (!res.ok) {
        throw new Error(`API HTTP ${res.status}: ${res.statusText}`);
      }

      const rawContests = await res.json();
      if (!Array.isArray(rawContests)) {
        throw new Error("Formato de resposta inesperado da API.");
      }

      state.contests = rawContests.map((c) => {
        const start = c.start_time || null;
        const end = c.end_time || null;
        const enabled = Boolean(c.enabled ?? true);
        return {
          id: getContestId(c),
          name: getContestTitle(c),
          raw: c,
          orig: { start, end, enabled },
          draft: { start, end, enabled },
        };
      });

      state.page = 1;
      renderTable();
      updateKpis();
      showToast(`${state.contests.length} contests carregados com sucesso!`, "success");
    } catch (err) {
      if (err.message && (err.message.includes("401") || err.message.includes("403"))) {
        if (window.handleApiUnauthorized) window.handleApiUnauthorized(err);
      }
      showToast(`Falha ao carregar contests: ${err.message}`, "error");
      if (els.tableBody) {
        els.tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 24px;">
          <div>Erro ao carregar: ${sanitize(err.message)}</div>
          ${(err.message && err.message.includes("401")) ? '<button type="button" class="primary btn-sm" style="margin-top: 10px;" onclick="window.handleApiUnauthorized && window.handleApiUnauthorized()">🔑 Renovar Token / Login</button>' : ''}
        </td></tr>`;
      }
    }
  }

  // --------------------------------------------------------------------------
  // FILTRAGEM, ORDENAÇÃO E PAGINAÇÃO
  // --------------------------------------------------------------------------
  function getFilteredContests() {
    const query = state.filterText.toLowerCase().trim();

    return state.contests.filter((item) => {
      // Filtro de texto (nome ou ID)
      if (query) {
        const idMatch = String(item.id).toLowerCase().includes(query);
        const nameMatch = item.name.toLowerCase().includes(query);
        if (!idMatch && !nameMatch) return false;
      }

      // Filtro de status habilitado
      if (state.filterEnabled === "enabled" && !item.draft.enabled) return false;
      if (state.filterEnabled === "disabled" && item.draft.enabled) return false;

      // Filtro de alteração
      const changed = isContestChanged(item);
      if (state.filterChanged === "changed" && !changed) return false;
      if (state.filterChanged === "unchanged" && changed) return false;

      return true;
    });
  }

  function getSortedContests(items) {
    return items.slice().sort((a, b) => {
      let valA, valB;
      if (state.sortKey === "id") {
        valA = Number(a.id) || a.id;
        valB = Number(b.id) || b.id;
      } else {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      }

      if (valA < valB) return state.sortDir === "asc" ? -1 : 1;
      if (valA > valB) return state.sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  function renderTable() {
    if (!els.tableBody) return;

    const filtered = getFilteredContests();
    const sorted = getSortedContests(filtered);

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;

    const startIdx = (state.page - 1) * state.pageSize;
    const pageItems = sorted.slice(startIdx, startIdx + state.pageSize);

    if (els.pageLabel) els.pageLabel.textContent = `Página ${state.page} de ${totalPages}`;
    if (els.pageStats) {
      els.pageStats.textContent = total > 0
        ? `Mostrando ${startIdx + 1} a ${Math.min(startIdx + state.pageSize, total)} de ${total}`
        : "Nenhum contest encontrado";
    }

    if (els.prevPageBtn) els.prevPageBtn.disabled = state.page <= 1;
    if (els.nextPageBtn) els.nextPageBtn.disabled = state.page >= totalPages;

    if (pageItems.length === 0) {
      els.tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--ink-muted); padding: 24px;">Nenhum contest corresponde aos filtros aplicados.</td></tr>`;
      return;
    }

    els.tableBody.innerHTML = "";

    pageItems.forEach((item) => {
      const tr = document.createElement("tr");
      const changed = isContestChanged(item);
      if (changed) tr.classList.add("row-changed");

      const statusInfo = getContestStatusInfo({
        enabled: item.draft.enabled,
        start_time: item.draft.start,
        end_time: item.draft.end,
      });

      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--ink-secondary);">${sanitize(item.id)}</td>
        <td>
          <div style="font-weight: 600; color: var(--ink);">${sanitize(item.name)}</div>
          ${changed ? '<span class="pill pill-role" style="font-size: 0.68rem;">Modificado</span>' : ""}
        </td>
        <td>
          <input type="datetime-local" class="table-input-start" value="${formatDateForInput(item.draft.start)}" style="padding: 6px 8px; font-size: 0.82rem; width: 190px;" />
        </td>
        <td>
          <input type="datetime-local" class="table-input-end" value="${formatDateForInput(item.draft.end)}" style="padding: 6px 8px; font-size: 0.82rem; width: 190px;" />
        </td>
        <td style="text-align: center;">
          <label class="switch-toggle">
            <input type="checkbox" class="table-toggle-enabled" ${item.draft.enabled ? "checked" : ""} />
            <span class="switch-slider"></span>
          </label>
        </td>
        <td style="text-align: center;">
          <span class="badge ${statusInfo.badgeClass}">${statusInfo.label}</span>
        </td>
      `;

      // Eventos de alteração inline
      const startInput = tr.querySelector(".table-input-start");
      const endInput = tr.querySelector(".table-input-end");
      const enabledToggle = tr.querySelector(".table-toggle-enabled");

      startInput.addEventListener("change", (e) => {
        item.draft.start = parseDateInputToIso(e.target.value);
        tr.classList.toggle("row-changed", isContestChanged(item));
        updateKpis();
      });

      endInput.addEventListener("change", (e) => {
        item.draft.end = parseDateInputToIso(e.target.value);
        tr.classList.toggle("row-changed", isContestChanged(item));
        updateKpis();
      });

      enabledToggle.addEventListener("change", (e) => {
        item.draft.enabled = e.target.checked;
        tr.classList.toggle("row-changed", isContestChanged(item));
        updateKpis();
      });

      els.tableBody.appendChild(tr);
    });
  }

  // --------------------------------------------------------------------------
  // APLICAÇÃO EM MASSA
  // --------------------------------------------------------------------------
  function applyBulkChanges() {
    const scope = els.bulkScope?.value || "page";
    const newStart = parseDateInputToIso(els.bulkStart?.value);
    const newEnd = parseDateInputToIso(els.bulkEnd?.value);
    const enabledMode = els.bulkEnabled?.value || "keep";

    if (!newStart && !newEnd && enabledMode === "keep") {
      showToast("Preencha ao menos um campo para aplicar em lote.", "warning");
      return;
    }

    let targetItems = [];
    if (scope === "page") {
      const filtered = getFilteredContests();
      const sorted = getSortedContests(filtered);
      const startIdx = (state.page - 1) * state.pageSize;
      targetItems = sorted.slice(startIdx, startIdx + state.pageSize);
    } else {
      targetItems = getFilteredContests();
    }

    if (targetItems.length === 0) {
      showToast("Nenhum contest selecionado para aplicar alterações.", "warning");
      return;
    }

    targetItems.forEach((item) => {
      if (newStart) item.draft.start = newStart;
      if (newEnd) item.draft.end = newEnd;
      if (enabledMode === "enable") item.draft.enabled = true;
      if (enabledMode === "disable") item.draft.enabled = false;
    });

    renderTable();
    updateKpis();
    showToast(`Alterações aplicadas a ${targetItems.length} contest(s). Lembre-se de salvar!`, "success");
  }

  // --------------------------------------------------------------------------
  // SALVAR ALTERAÇÕES PENDENTES NA API
  // --------------------------------------------------------------------------
  async function saveChangedContests() {
    const creds = window.getApiCredentials ? window.getApiCredentials() : null;
    if (!creds || !creds.apiBase) {
      showToast("Sessão da API não disponível.", "error");
      return;
    }

    const changedItems = state.contests.filter(isContestChanged);
    if (changedItems.length === 0) {
      showToast("Não há alterações pendentes para salvar.", "info");
      return;
    }

    try {
      showToast(`Salvando ${changedItems.length} contest(s) no DOMjudge...`, "info");
      els.saveChangedBtn.disabled = true;

      const headers = {
        "Content-Type": "application/json",
      };
      if (creds.user && creds.password) {
        headers["Authorization"] = `Basic ${btoa(`${creds.user}:${creds.password}`)}`;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const item of changedItems) {
        try {
          const form = new URLSearchParams();
          form.append("id", String(item.id));
          if (item.draft.start) {
            form.append("start_time", item.draft.start);
          }
          form.append("force", "true");

          const res = await fetch(`${creds.apiBase}/contests/${encodeURIComponent(item.id)}`, {
            method: "PATCH",
            headers: {
              ...headers,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: form.toString(),
          });

          if (!res.ok && res.status !== 204) {
            const errTxt = await res.text().catch(() => "");
            throw new Error(`HTTP ${res.status}: ${errTxt}`);
          }

          // Atualizar estado original após sucesso
          item.orig.start = item.draft.start;
          item.orig.end = item.draft.end;
          item.orig.enabled = item.draft.enabled;
          successCount += 1;
        } catch (err) {
          console.error(`Erro ao atualizar contest ${item.id}:`, err);
          errorCount += 1;
        }
      }

      renderTable();
      updateKpis();

      if (errorCount === 0) {
        showToast(`${successCount} contest(s) atualizados com sucesso!`, "success");
      } else {
        showToast(`${successCount} salvos, ${errorCount} falharam.`, "warning");
      }
    } catch (err) {
      showToast(`Erro ao salvar alterações: ${err.message}`, "error");
    } finally {
      els.saveChangedBtn.disabled = state.contests.filter(isContestChanged).length === 0;
    }
  }

  // --------------------------------------------------------------------------
  // INICIALIZAÇÃO
  // --------------------------------------------------------------------------
  function init() {
    if (els.loadBtn) els.loadBtn.addEventListener("click", loadContests);
    if (els.saveChangedBtn) els.saveChangedBtn.addEventListener("click", saveChangedContests);
    if (els.applyBulkBtn) els.applyBulkBtn.addEventListener("click", applyBulkChanges);

    if (els.filterText) {
      els.filterText.addEventListener("input", (e) => {
        state.filterText = e.target.value;
        state.page = 1;
        renderTable();
      });
    }

    if (els.filterEnabled) {
      els.filterEnabled.addEventListener("change", (e) => {
        state.filterEnabled = e.target.value;
        state.page = 1;
        renderTable();
      });
    }

    if (els.filterChanged) {
      els.filterChanged.addEventListener("change", (e) => {
        state.filterChanged = e.target.value;
        state.page = 1;
        renderTable();
      });
    }

    if (els.pageSize) {
      els.pageSize.addEventListener("change", (e) => {
        state.pageSize = parseInt(e.target.value, 10) || 100;
        state.page = 1;
        renderTable();
      });
    }

    if (els.prevPageBtn) {
      els.prevPageBtn.addEventListener("click", () => {
        if (state.page > 1) {
          state.page -= 1;
          renderTable();
        }
      });
    }

    if (els.nextPageBtn) {
      els.nextPageBtn.addEventListener("click", () => {
        state.page += 1;
        renderTable();
      });
    }

    // Ordenação
    document.querySelectorAll('#view-contests .th-sort-btn[data-sort]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const sortKey = btn.getAttribute("data-sort");
        if (state.sortKey === sortKey) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = sortKey;
          state.sortDir = "asc";
        }
        renderTable();
      });
    });
  }

  return { init, loadContests, renderTable };
})();

document.addEventListener("DOMContentLoaded", () => {
  ContestManagerModule.init();
});
