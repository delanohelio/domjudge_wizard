// ============================================================================
// DOMJUDGE WIZARD - GERENCIADOR DE USUÁRIOS E TIMES (SPA MODULE)
// ============================================================================

const UsersModule = (() => {
  const state = {
    users: [],
    teamsMap: new Map(),
    categoriesMap: new Map(),
    originalUsersMap: new Map(),
    selectedUserIds: new Set(),
    filterText: "",
    filterCategory: "all",
    filterLabel: "",
    filterRole: "all",
    filterEnabled: "all",
    sortKey: "username",
    sortDir: "asc",
    page: 1,
    pageSize: 100,
  };

  const els = {
    loadUsersBtn: document.getElementById("loadUsersBtn"),
    filterText: document.getElementById("usersFilterText"),
    filterCategory: document.getElementById("usersFilterCategory"),
    filterLabel: document.getElementById("usersFilterLabel"),
    labelsFilterDataList: document.getElementById("labelsFilterDataList"),
    filterRole: document.getElementById("usersFilterRole"),
    filterEnabled: document.getElementById("usersFilterEnabled"),

    bulkScope: document.getElementById("bulkScope"),
    bulkCategory: document.getElementById("bulkCategory"),
    bulkLabels: document.getElementById("bulkLabels"),
    bulkLabelsMode: document.getElementById("bulkLabelsMode"),
    bulkEnabled: document.getElementById("bulkEnabled"),
    applyBulkBtn: document.getElementById("applyBulkBtn"),

    categoryDataList: document.getElementById("categoryDataList"),
    saveChangesBtn: document.getElementById("saveChangesBtn"),
    exportUsersCsvBtn: document.getElementById("exportUsersCsvBtn"),
    changedHint: document.getElementById("changedHint"),

    pageSize: document.getElementById("usersPageSize"),
    prevPageBtn: document.getElementById("prevPageBtn"),
    nextPageBtn: document.getElementById("nextPageBtn"),
    pageLabel: document.getElementById("pageLabel"),
    pageStats: document.getElementById("pageStats"),

    selectAllCheckbox: document.getElementById("selectAllCheckbox"),
    tableBody: document.getElementById("usersTableBody"),

    // KPI Cards
    kpiTotal: document.getElementById("kpiUsersTotal"),
    kpiActive: document.getElementById("kpiUsersActive"),
    kpiCategories: document.getElementById("kpiUsersCategories"),
    kpiTeams: document.getElementById("kpiUsersTeams"),

    // Create Modal
    openCreateModalBtn: document.getElementById("openCreateModalBtn"),
    createModal: document.getElementById("createModal"),
    closeCreateModalBtn: document.getElementById("closeCreateModalBtn"),
    tabSingleBtn: document.getElementById("tabSingleBtn"),
    tabBatchBtn: document.getElementById("tabBatchBtn"),
    createSingleContainer: document.getElementById("createSingleContainer"),
    createSingleForm: document.getElementById("createSingleForm"),
    createBatchContainer: document.getElementById("createBatchContainer"),
    downloadBatchTemplateCsvBtn: document.getElementById("downloadBatchTemplateCsvBtn"),
    downloadBatchTemplateTsvBtn: document.getElementById("downloadBatchTemplateTsvBtn"),
    batchFileInput: document.getElementById("batchFileInput"),
    cancelCreateSingleBtn: document.getElementById("cancelCreateSingleBtn"),
    cancelCreateBatchBtn: document.getElementById("cancelCreateBatchBtn"),
    processBatchBtn: document.getElementById("processBatchBtn"),
    batchInputText: document.getElementById("batchInputText"),
    batchDefaultCategory: document.getElementById("batchDefaultCategory"),
    batchDefaultLabels: document.getElementById("batchDefaultLabels"),
    batchFeedback: document.getElementById("batchFeedback"),
    batchPreviewBody: document.getElementById("batchPreviewBody"),
    batchCountBadge: document.getElementById("batchCountBadge"),
    createHasTeam: document.getElementById("createHasTeam"),
    batchHasTeam: document.getElementById("batchHasTeam"),
    createCategory: document.getElementById("createCategory"),
    createLabels: document.getElementById("createLabels"),
    createCategoryField: document.getElementById("createCategoryField"),
    createLabelsField: document.getElementById("createLabelsField"),

    // Edit Modal
    editModal: document.getElementById("editModal"),
    closeEditModalBtn: document.getElementById("closeEditModalBtn"),
    editSingleForm: document.getElementById("editSingleForm"),
    editUserTitle: document.getElementById("editUserTitle"),
    cancelEditModalBtn: document.getElementById("cancelEditModalBtn"),
    editUserId: document.getElementById("editUserId"),
    editUsername: document.getElementById("editUsername"),
    editName: document.getElementById("editName"),
    editEmail: document.getElementById("editEmail"),
    editPassword: document.getElementById("editPassword"),
    editHasTeam: document.getElementById("editHasTeam"),
    editCategory: document.getElementById("editCategory"),
    editLabels: document.getElementById("editLabels"),
    editEnabled: document.getElementById("editEnabled"),
    editCategoryField: document.getElementById("editCategoryField"),
    editLabelsField: document.getElementById("editLabelsField"),
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

  function isUserChanged(user) {
    const orig = state.originalUsersMap.get(user.id);
    if (!orig) return true; // Novo usuário não salvo

    const origRoles = (orig.roles || []).slice().sort().join(",");
    const currRoles = (user.roles || []).slice().sort().join(",");
    const origLabels = (orig.teamLabels || []).slice().sort().join(",");
    const currLabels = (user.teamLabels || []).slice().sort().join(",");

    return (
      user.name !== orig.name ||
      user.username !== orig.username ||
      user.email !== orig.email ||
      user.enabled !== orig.enabled ||
      user.hasTeam !== orig.hasTeam ||
      user.teamCategory !== orig.teamCategory ||
      currLabels !== origLabels ||
      currRoles !== origRoles ||
      Boolean(user.password)
    );
  }

  function updateKpis() {
    const total = state.users.length;
    const active = state.users.filter((u) => Boolean(u.enabled)).length;
    const categories = new Set(
      state.users.map((u) => u.teamCategory).filter(Boolean)
    ).size;
    const teams = state.users.filter((u) => Boolean(u.hasTeam)).length;
    const changed = state.users.filter(isUserChanged).length;

    if (els.kpiTotal) els.kpiTotal.textContent = total;
    if (els.kpiActive) els.kpiActive.textContent = active;
    if (els.kpiCategories) els.kpiCategories.textContent = categories;
    if (els.kpiTeams) els.kpiTeams.textContent = teams;

    if (els.saveChangesBtn) els.saveChangesBtn.disabled = changed === 0;
    if (els.changedHint) {
      els.changedHint.textContent = changed > 0
        ? `${changed} usuário(s) com alterações pendentes.`
        : "Nenhuma alteração pendente.";
      els.changedHint.style.color = changed > 0 ? "var(--brand)" : "var(--ink-muted)";
    }

    if (els.bulkScope) {
      const optSelected = els.bulkScope.querySelector('option[value="selected"]');
      if (optSelected) {
        optSelected.textContent = `Selecionados (${state.selectedUserIds.size})`;
      }
    }
  }

  // --------------------------------------------------------------------------
  // CARREGAR DADOS DA API
  // --------------------------------------------------------------------------
  async function loadUsers() {
    const creds = window.getApiCredentials ? window.getApiCredentials() : null;
    if (!creds || !creds.apiBase) {
      showToast("Sessão da API não disponível.", "error");
      return;
    }

    try {
      showToast("Carregando usuários e times do DOMjudge...", "info");
      if (els.tableBody) {
        els.tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--ink-muted);">Carregando usuários...</td></tr>`;
      }

      const headers = {};
      if (creds.user && creds.password) {
        headers["Authorization"] = `Basic ${btoa(`${creds.user}:${creds.password}`)}`;
      }

      // Buscar Contests, Grupos, Times e Usuários em paralelo
      const [contestsRes, groupsFallbackRes, teamsRes, usersRes] = await Promise.all([
        fetch(`${creds.apiBase}/contests`, { headers }).catch(() => null),
        fetch(`${creds.apiBase}/groups`, { headers }).catch(() => null),
        fetch(`${creds.apiBase}/teams`, { headers }).catch(() => null),
        fetch(`${creds.apiBase}/users`, { headers }),
      ]);

      if (!usersRes.ok) {
        throw new Error(`API HTTP ${usersRes.status}: ${usersRes.statusText}`);
      }

      const rawContests = contestsRes && contestsRes.ok ? await contestsRes.json().catch(() => []) : [];
      const rawGroupsFallback = groupsFallbackRes && groupsFallbackRes.ok ? await groupsFallbackRes.json().catch(() => []) : [];
      const rawTeams = teamsRes && teamsRes.ok ? await teamsRes.json().catch(() => []) : [];
      const rawUsers = await usersRes.json();

      state.categoriesMap.clear();

      // Mapear grupos do fallback se existirem
      if (Array.isArray(rawGroupsFallback)) {
        rawGroupsFallback.forEach((g) => state.categoriesMap.set(String(g.id), g.name || g.id));
      }

      // Buscar grupos específicos de cada contest (padrão DOMjudge v4)
      if (Array.isArray(rawContests)) {
        for (const c of rawContests) {
          const cId = c.id || c.cid;
          const contestGroups = await fetch(`${creds.apiBase}/contests/${encodeURIComponent(cId)}/groups`, { headers })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []);

          if (Array.isArray(contestGroups)) {
            contestGroups.forEach((g) => state.categoriesMap.set(String(g.id), g.name || g.id));
          }
        }
      }

      state.teamsMap.clear();
      rawTeams.forEach((t) => {
        // Resolver categoria através dos group_ids ou category_id
        let catName = "";
        if (Array.isArray(t.group_ids) && t.group_ids.length > 0) {
          catName = t.group_ids.map((gid) => state.categoriesMap.get(String(gid)) || gid).join(", ");
        } else if (t.category_id) {
          catName = state.categoriesMap.get(String(t.category_id)) || String(t.category_id);
        }

        // Resolver labels (array ou string separada por vírgula no campo label)
        let labels = [];
        if (Array.isArray(t.labels)) {
          labels = t.labels;
        } else if (t.label) {
          labels = String(t.label).split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
        }

        state.teamsMap.set(String(t.id), {
          id: t.id,
          teamid: t.teamid,
          name: t.name,
          category: catName,
          labels,
        });
      });

      // Verificar usuários com função "team" que não possuem time cadastrado e criar automaticamente
      const teamUsersMissingTeam = rawUsers.filter((u) => {
        const roles = Array.isArray(u.roles) ? u.roles : (u.roles ? [u.roles] : ["team"]);
        return roles.includes("team") && !u.team_id && !u.team;
      });

      if (teamUsersMissingTeam.length > 0) {
        try {
          const teamsPayload = teamUsersMissingTeam.map((u) => ({
            id: u.username || String(u.id),
            name: u.name || u.username,
            group_ids: ["participants"],
            organization_id: "UFPE",
            label: "",
          }));

          const fdTeams = new FormData();
          fdTeams.append(
            "json",
            new Blob([JSON.stringify(teamsPayload)], { type: "application/json" }),
            "teams.json"
          );
          await fetch(`${creds.apiBase}/users/teams`, { method: "POST", headers, body: fdTeams }).catch(() => null);

          const accountsPayload = teamUsersMissingTeam.map((u) => ({
            type: "team",
            name: u.name || u.username,
            username: u.username,
            email: u.email || null,
            team_id: u.username || String(u.id),
            roles: Array.isArray(u.roles) ? u.roles : ["team"],
          }));

          const fdAccounts = new FormData();
          fdAccounts.append(
            "json",
            new Blob([JSON.stringify(accountsPayload)], { type: "application/json" }),
            "accounts.json"
          );
          await fetch(`${creds.apiBase}/users/accounts`, { method: "POST", headers, body: fdAccounts }).catch(() => null);

          // Atualizar os objetos locais em memória
          teamUsersMissingTeam.forEach((u) => {
            const tId = u.username || String(u.id);
            u.team_id = tId;
            u.team = u.name || u.username;
            state.teamsMap.set(String(tId), {
              id: tId,
              teamid: tId,
              name: u.name || u.username,
              category: "Participants",
              labels: [],
            });
          });
        } catch (autoTeamErr) {
          console.warn("Aviso ao auto-cadastrar times:", autoTeamErr);
        }
      }

      state.originalUsersMap.clear();
      state.users = rawUsers.map((u) => {
        const teamObj = u.team_id ? state.teamsMap.get(String(u.team_id)) : null;
        const mappedUser = {
          id: String(u.id || u.username),
          username: u.username || "",
          name: u.name || u.username || "",
          email: u.email || "",
          enabled: Boolean(u.enabled ?? true),
          roles: Array.isArray(u.roles) ? u.roles : (u.roles ? [u.roles] : ["team"]),
          hasTeam: Boolean(u.team_id),
          teamId: u.team_id || null,
          teamCategory: teamObj ? teamObj.category : "",
          teamLabels: teamObj ? teamObj.labels : [],
          password: "",
        };

        state.originalUsersMap.set(mappedUser.id, JSON.parse(JSON.stringify(mappedUser)));
        return mappedUser;
      });

      state.selectedUserIds.clear();
      state.page = 1;
      populateFilterDropdowns();
      renderTable();
      updateKpis();
      showToast(`${state.users.length} usuários carregados com sucesso!`, "success");
    } catch (err) {
      if (err.message && (err.message.includes("401") || err.message.includes("403"))) {
        if (window.handleApiUnauthorized) window.handleApiUnauthorized(err);
      }
      showToast(`Erro ao carregar usuários: ${err.message}`, "error");
      if (els.tableBody) {
        els.tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--danger); padding: 24px;">
          <div>Erro ao carregar: ${sanitize(err.message)}</div>
          ${(err.message && err.message.includes("401")) ? '<button type="button" class="primary btn-sm" style="margin-top: 10px;" onclick="window.handleApiUnauthorized && window.handleApiUnauthorized()">🔑 Renovar Token / Login</button>' : ''}
        </td></tr>`;
      }
    }
  }

  function loadDemoUsers() {
    const demoCategories = ["Estudantes", "Professores / Jury", "Convidados"];
    const demoUsers = [
      { id: "1", username: "aluno01", name: "Ana Souza", email: "ana@cin.ufpe.br", enabled: true, roles: ["team"], hasTeam: true, teamCategory: "Estudantes", teamLabels: ["turma-a", "2026-1"] },
      { id: "2", username: "aluno02", name: "Bruno Lima", email: "bruno@cin.ufpe.br", enabled: true, roles: ["team"], hasTeam: true, teamCategory: "Estudantes", teamLabels: ["turma-a"] },
      { id: "3", username: "aluno03", name: "Carlos Mendes", email: "carlos@cin.ufpe.br", enabled: false, roles: ["team"], hasTeam: true, teamCategory: "Estudantes", teamLabels: ["turma-b"] },
      { id: "4", username: "prof_carlos", name: "Prof. Carlos", email: "prof@cin.ufpe.br", enabled: true, roles: ["jury", "admin"], hasTeam: false, teamCategory: "Professores / Jury", teamLabels: [] },
      { id: "5", username: "monitor01", name: "Lucas Monitor", email: "lucas@cin.ufpe.br", enabled: true, roles: ["jury"], hasTeam: false, teamCategory: "Professores / Jury", teamLabels: ["monitor"] },
    ];

    state.originalUsersMap.clear();
    state.users = demoUsers.map((u) => {
      state.originalUsersMap.set(u.id, JSON.parse(JSON.stringify(u)));
      return { ...u, password: "" };
    });

    state.selectedUserIds.clear();
    state.page = 1;
    populateFilterDropdowns();
    renderTable();
    updateKpis();
    showToast("Dados de demonstração carregados com sucesso!", "info");
  }

  // --------------------------------------------------------------------------
  // AVALIADOR DE EXPRESSÕES BOOLEANAS PARA LABELS (AND, OR, NOT, PARÊNTESES)
  // --------------------------------------------------------------------------
  function matchLabelsExpression(labels, query) {
    if (!query || !query.trim() || query === "all") return true;

    const normalizedLabels = (labels || []).map((l) => String(l).trim().toLowerCase());

    // Tokenize: aspas, parênteses, operadores lógicos, termos
    const rawTokens = [];
    const regex = /"([^"]+)"|'([^']+)'|([()])|(\bAND\b|\bOR\b|\bNOT\b|&&|\|\||!|[^\s()"'!]+)/gi;
    let match;
    while ((match = regex.exec(query)) !== null) {
      if (match[1] !== undefined) {
        rawTokens.push({ type: "TERM", value: match[1].toLowerCase() });
      } else if (match[2] !== undefined) {
        rawTokens.push({ type: "TERM", value: match[2].toLowerCase() });
      } else if (match[3] !== undefined) {
        rawTokens.push({ type: match[3] === "(" ? "LPAREN" : "RPAREN" });
      } else if (match[4] !== undefined) {
        const val = match[4];
        const upper = val.toUpperCase();
        if (upper === "AND" || upper === "&&") {
          rawTokens.push({ type: "AND" });
        } else if (upper === "OR" || upper === "||") {
          rawTokens.push({ type: "OR" });
        } else if (upper === "NOT" || upper === "!") {
          rawTokens.push({ type: "NOT" });
        } else {
          rawTokens.push({ type: "TERM", value: val.toLowerCase() });
        }
      }
    }

    if (rawTokens.length === 0) return true;

    // Inserir operador AND implícito entre termos/parênteses consecutivos
    const tokens = [];
    for (let i = 0; i < rawTokens.length; i++) {
      const cur = rawTokens[i];
      const prev = tokens[tokens.length - 1];
      if (prev) {
        const prevCanEndExpr = prev.type === "TERM" || prev.type === "RPAREN";
        const curCanStartExpr = cur.type === "TERM" || cur.type === "LPAREN" || cur.type === "NOT";
        if (prevCanEndExpr && curCanStartExpr) {
          tokens.push({ type: "AND" });
        }
      }
      tokens.push(cur);
    }

    let pos = 0;
    function peek() {
      return tokens[pos];
    }
    function consume() {
      return tokens[pos++];
    }

    function parseExpression() {
      let left = parseAnd();
      while (peek() && peek().type === "OR") {
        consume();
        const right = parseAnd();
        left = left || right;
      }
      return left;
    }

    function parseAnd() {
      let left = parseNot();
      while (peek() && peek().type === "AND") {
        consume();
        const right = parseNot();
        left = left && right;
      }
      return left;
    }

    function parseNot() {
      if (peek() && peek().type === "NOT") {
        consume();
        const operand = parseNot();
        return !operand;
      }
      return parsePrimary();
    }

    function parsePrimary() {
      const token = peek();
      if (!token) return true;

      if (token.type === "LPAREN") {
        consume();
        const result = parseExpression();
        if (peek() && peek().type === "RPAREN") {
          consume();
        }
        return result;
      }

      if (token.type === "TERM") {
        consume();
        const term = token.value;
        return normalizedLabels.some((l) => l === term || l.includes(term));
      }

      consume();
      return true;
    }

    try {
      return Boolean(parseExpression());
    } catch (err) {
      return normalizedLabels.some((l) => l.includes(query.toLowerCase()));
    }
  }

  function populateFilterDropdowns() {
    const categories = new Set();
    const labels = new Set();
    const roles = new Set();

    state.users.forEach((u) => {
      if (u.teamCategory) categories.add(u.teamCategory);
      (u.teamLabels || []).forEach((l) => labels.add(l));
      (u.roles || []).forEach((r) => roles.add(r));
    });

    if (els.filterCategory) {
      const cur = els.filterCategory.value;
      els.filterCategory.innerHTML = '<option value="all">Todas as categorias</option>';
      Array.from(categories).sort().forEach((cat) => {
        els.filterCategory.innerHTML += `<option value="${sanitize(cat)}">${sanitize(cat)}</option>`;
      });
      els.filterCategory.value = cur;
    }

    if (els.labelsFilterDataList) {
      els.labelsFilterDataList.innerHTML = "";
      Array.from(labels).sort().forEach((lbl) => {
        els.labelsFilterDataList.innerHTML += `<option value="${sanitize(lbl)}"></option>`;
      });
    }

    if (els.categoryDataList) {
      els.categoryDataList.innerHTML = "";
      Array.from(categories).sort().forEach((cat) => {
        els.categoryDataList.innerHTML += `<option value="${sanitize(cat)}"></option>`;
      });
    }
  }

  // --------------------------------------------------------------------------
  // FILTRAGEM & TABELA
  // --------------------------------------------------------------------------
  function getFilteredUsers() {
    const q = state.filterText.toLowerCase().trim();

    return state.users.filter((user) => {
      if (q) {
        const uMatch = user.username.toLowerCase().includes(q);
        const nMatch = user.name.toLowerCase().includes(q);
        const eMatch = user.email.toLowerCase().includes(q);
        if (!uMatch && !nMatch && !eMatch) return false;
      }

      if (state.filterCategory !== "all" && user.teamCategory !== state.filterCategory) {
        return false;
      }

      if (state.filterLabel && state.filterLabel.trim() !== "" && state.filterLabel !== "all") {
        if (!matchLabelsExpression(user.teamLabels, state.filterLabel)) {
          return false;
        }
      }

      if (state.filterRole !== "all" && !(user.roles || []).includes(state.filterRole)) {
        return false;
      }

      if (state.filterEnabled === "enabled" && !user.enabled) return false;
      if (state.filterEnabled === "disabled" && user.enabled) return false;

      return true;
    });
  }

  function getSortedUsers(items) {
    return items.slice().sort((a, b) => {
      let valA, valB;
      switch (state.sortKey) {
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "category":
          valA = (a.teamCategory || "").toLowerCase();
          valB = (b.teamCategory || "").toLowerCase();
          break;
        case "enabled":
          valA = a.enabled ? 1 : 0;
          valB = b.enabled ? 1 : 0;
          break;
        default:
          valA = a.username.toLowerCase();
          valB = b.username.toLowerCase();
          break;
      }

      if (valA < valB) return state.sortDir === "asc" ? -1 : 1;
      if (valA > valB) return state.sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  function renderTable() {
    if (!els.tableBody) return;

    const filtered = getFilteredUsers();
    const sorted = getSortedUsers(filtered);

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;

    const startIdx = (state.page - 1) * state.pageSize;
    const pageItems = sorted.slice(startIdx, startIdx + state.pageSize);

    if (els.pageLabel) els.pageLabel.textContent = `Página ${state.page} de ${totalPages}`;
    if (els.pageStats) {
      els.pageStats.textContent = total > 0
        ? `Mostrando ${startIdx + 1} a ${Math.min(startIdx + state.pageSize, total)} de ${total}`
        : "Nenhum usuário encontrado";
    }

    if (els.prevPageBtn) els.prevPageBtn.disabled = state.page <= 1;
    if (els.nextPageBtn) els.nextPageBtn.disabled = state.page >= totalPages;

    if (pageItems.length === 0) {
      els.tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--ink-muted); padding: 24px;">Nenhum usuário corresponde aos filtros.</td></tr>`;
      if (els.selectAllCheckbox) {
        els.selectAllCheckbox.checked = false;
        els.selectAllCheckbox.indeterminate = false;
      }
      return;
    }

    if (els.selectAllCheckbox) {
      const pageIds = pageItems.map((u) => String(u.id));
      const selectedCountOnPage = pageIds.filter((id) => state.selectedUserIds.has(id)).length;
      els.selectAllCheckbox.checked = pageItems.length > 0 && selectedCountOnPage === pageItems.length;
      els.selectAllCheckbox.indeterminate = selectedCountOnPage > 0 && selectedCountOnPage < pageItems.length;
    }

    els.tableBody.innerHTML = "";

    pageItems.forEach((user) => {
      const tr = document.createElement("tr");
      const changed = isUserChanged(user);
      if (changed) tr.classList.add("row-changed");

      const uId = String(user.id);
      const isSelected = state.selectedUserIds.has(uId);

      const labelsHtml = (user.teamLabels && user.teamLabels.length > 0)
        ? user.teamLabels.map((l) => `<span class="pill">${sanitize(l)}</span>`).join("")
        : '<span style="color: var(--ink-muted); font-size: 0.78rem;">-</span>';

      const rolesHtml = (user.roles && user.roles.length > 0)
        ? user.roles.map((r) => `<span class="pill pill-role">${sanitize(r)}</span>`).join("")
        : '<span class="pill pill-role">team</span>';

      const categoryHtml = user.teamCategory
        ? `<span class="pill pill-category">${sanitize(user.teamCategory)}</span>`
        : '<span style="color: var(--ink-muted); font-size: 0.78rem;">-</span>';

      const statusBadge = user.enabled
        ? '<span class="badge badge-ac">Ativo</span>'
        : '<span class="badge badge-dim">Inativo</span>';

      tr.innerHTML = `
        <td style="text-align: center;">
          <input type="checkbox" class="user-row-checkbox" data-id="${sanitize(uId)}" ${isSelected ? "checked" : ""} />
        </td>
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--ink);">${sanitize(user.username)}</td>
        <td>
          <div style="font-weight: 600;">${sanitize(user.name)}</div>
          ${changed ? '<span class="pill pill-role" style="font-size: 0.65rem;">Modificado</span>' : ""}
        </td>
        <td style="font-size: 0.82rem; color: var(--ink-secondary); font-family: var(--font-mono);">${sanitize(user.email || "-")}</td>
        <td>${categoryHtml}</td>
        <td><div class="pill-list">${labelsHtml}</div></td>
        <td><div class="pill-list">${rolesHtml}</div></td>
        <td style="text-align: center;">${statusBadge}</td>
        <td style="text-align: right;">
          <button type="button" class="btn-sm dim edit-user-btn" data-id="${sanitize(uId)}">✏️ Editar</button>
        </td>
      `;

      // Checkbox da linha
      const rowCheckbox = tr.querySelector(".user-row-checkbox");
      rowCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          state.selectedUserIds.add(uId);
        } else {
          state.selectedUserIds.delete(uId);
        }
        updateKpis();
        if (els.selectAllCheckbox) {
          const pageIds = pageItems.map((p) => String(p.id));
          const selectedCountOnPage = pageIds.filter((id) => state.selectedUserIds.has(id)).length;
          els.selectAllCheckbox.checked = pageItems.length > 0 && selectedCountOnPage === pageItems.length;
          els.selectAllCheckbox.indeterminate = selectedCountOnPage > 0 && selectedCountOnPage < pageItems.length;
        }
      });

      // Botão editar
      tr.querySelector(".edit-user-btn").addEventListener("click", () => {
        openEditModal(user);
      });

      els.tableBody.appendChild(tr);
    });
  }

  // --------------------------------------------------------------------------
  // MODAL DE EDIÇÃO INDIVIDUAL
  // --------------------------------------------------------------------------
  function openEditModal(user) {
    if (!els.editModal) return;
    els.editUserId.value = user.id;
    els.editUserTitle.textContent = `${user.username} (${user.name})`;
    els.editUsername.value = user.username;
    els.editName.value = user.name;
    els.editEmail.value = user.email || "";
    els.editPassword.value = "";
    els.editHasTeam.checked = Boolean(user.hasTeam);
    els.editCategory.value = user.teamCategory || "";
    els.editLabels.value = (user.teamLabels || []).join(", ");
    els.editEnabled.checked = Boolean(user.enabled);

    document.querySelectorAll('input[name="editRoles"]').forEach((cb) => {
      cb.checked = (user.roles || []).includes(cb.value);
    });

    els.editCategoryField.style.display = user.hasTeam ? "flex" : "none";
    els.editLabelsField.style.display = user.hasTeam ? "flex" : "none";

    els.editModal.hidden = false;
  }

  function saveEditModal(e) {
    e.preventDefault();
    const id = els.editUserId.value;
    const user = state.users.find((u) => u.id === id);
    if (!user) return;

    user.username = els.editUsername.value.trim();
    user.name = els.editName.value.trim();
    user.email = els.editEmail.value.trim();
    if (els.editPassword.value.trim()) {
      user.password = els.editPassword.value.trim();
    }
    user.hasTeam = els.editHasTeam.checked;
    user.teamCategory = user.hasTeam ? els.editCategory.value.trim() : "";
    user.teamLabels = user.hasTeam
      ? els.editLabels.value.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    user.enabled = els.editEnabled.checked;

    user.roles = Array.from(
      document.querySelectorAll('input[name="editRoles"]:checked')
    ).map((cb) => cb.value);

    els.editModal.hidden = true;
    renderTable();
    updateKpis();
    showToast(`Usuário ${user.username} atualizado localmente.`, "success");
  }

  // --------------------------------------------------------------------------
  // MODAL DE CRIAÇÃO (INDIVIDUAL & LOTE CSV COM PREVIEW)
  // --------------------------------------------------------------------------
  function downloadBatchTemplate(format = "csv") {
    let content = "";
    let filename = "";
    let mime = "";

    if (format === "tsv") {
      content = "username\tnome\temail\tsenha\tcategoria\tlabels\n" +
        "aluno01\tAna Souza\tana.souza@email.com\tsenha123\tEstudantes\t2026-1;turma-a\n" +
        "aluno02\tBruno Lima\tbruno.lima@email.com\tsenha123\tEstudantes\t2026-1;turma-b\n" +
        "aluno03\tCarla Mendes\tcarla.mendes@email.com\tsenha123\tEstudantes\t2026-1;monitor\n";
      filename = "modelo_usuarios_domjudge.tsv";
      mime = "text/tab-separated-values;charset=utf-8;";
    } else {
      content = "username,nome,email,senha,categoria,labels\n" +
        "aluno01,Ana Souza,ana.souza@email.com,senha123,Estudantes,2026-1;turma-a\n" +
        "aluno02,Bruno Lima,bruno.lima@email.com,senha123,Estudantes,2026-1;turma-b\n" +
        "aluno03,Carla Mendes,carla.mendes@email.com,senha123,Estudantes,2026-1;monitor\n";
      filename = "modelo_usuarios_domjudge.csv";
      mime = "text/csv;charset=utf-8;";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Modelo ${format.toUpperCase()} baixado com sucesso!`, "success");
  }

  function parseBatchText(text) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const defaultCat = els.batchDefaultCategory?.value?.trim() || "";
    const defaultLbls = (els.batchDefaultLabels?.value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const parsed = [];

    lines.forEach((line) => {
      const parts = line.split(/[,\t]+/).map((p) => p.trim());
      if (parts.length < 2) return;

      const username = parts[0];
      // Pular linha de cabeçalho se o usuário colou o template completo
      if (
        username.toLowerCase() === "username" ||
        username.toLowerCase() === "usuario" ||
        username.toLowerCase() === "user"
      ) {
        return;
      }

      const name = parts[1];
      const email = parts[2] || "";
      const password = parts[3] || "123456";
      const category = parts[4] || defaultCat;
      const labels = parts[5]
        ? parts[5].split(";").map((s) => s.trim()).filter(Boolean)
        : defaultLbls;

      parsed.push({ username, name, email, password, category, labels });
    });

    return parsed;
  }

  function updateBatchPreview() {
    if (!els.batchPreviewBody || !els.batchInputText) return;
    const parsed = parseBatchText(els.batchInputText.value);

    if (els.batchCountBadge) els.batchCountBadge.textContent = parsed.length;

    if (parsed.length === 0) {
      els.batchPreviewBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--ink-muted); padding: 12px;">Cole dados acima para ver o preview.</td></tr>`;
      return;
    }

    els.batchPreviewBody.innerHTML = parsed.map((p) => `
      <tr>
        <td style="font-family: var(--font-mono); font-weight: 700;">${sanitize(p.username)}</td>
        <td>${sanitize(p.name)}</td>
        <td>${sanitize(p.email || "-")}</td>
        <td>${sanitize(p.category || "-")}</td>
        <td>${sanitize(p.labels.join(", ") || "-")}</td>
      </tr>
    `).join("");
  }

  function saveCreateSingle(e) {
    e.preventDefault();
    const username = document.getElementById("createUsername").value.trim();
    const name = document.getElementById("createName").value.trim();
    const email = document.getElementById("createEmail").value.trim();
    const password = document.getElementById("createPassword").value.trim();
    const hasTeam = els.createHasTeam.checked;
    const teamCategory = hasTeam ? els.createCategory.value.trim() : "";
    const teamLabels = hasTeam
      ? els.createLabels.value.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const enabled = document.getElementById("createEnabled").checked;
    const roles = Array.from(
      document.querySelectorAll('input[name="createRoles"]:checked')
    ).map((cb) => cb.value);

    const newUser = {
      id: `new_${Date.now()}`,
      username,
      name,
      email,
      password,
      hasTeam,
      teamCategory,
      teamLabels,
      enabled,
      roles,
    };

    state.users.unshift(newUser);
    els.createModal.hidden = true;
    els.createSingleForm.reset();
    populateFilterDropdowns();
    renderTable();
    updateKpis();
    showToast(`Usuário ${username} adicionado à lista para salvar!`, "success");
  }

  function processBatchUsers() {
    const parsed = parseBatchText(els.batchInputText.value);
    if (parsed.length === 0) {
      showToast("Nenhum usuário válido encontrado no texto colado.", "warning");
      return;
    }

    const hasTeam = els.batchHasTeam.checked;

    parsed.forEach((p, idx) => {
      state.users.unshift({
        id: `batch_${Date.now()}_${idx}`,
        username: p.username,
        name: p.name,
        email: p.email,
        password: p.password,
        hasTeam,
        teamCategory: p.category,
        teamLabels: p.labels,
        enabled: true,
        roles: ["team"],
      });
    });

    els.createModal.hidden = true;
    els.batchInputText.value = "";
    populateFilterDropdowns();
    renderTable();
    updateKpis();
    showToast(`${parsed.length} usuários adicionados com sucesso!`, "success");
  }

  // --------------------------------------------------------------------------
  // AÇÕES EM LOTE (CATEGORIA, LABELS, STATUS)
  // --------------------------------------------------------------------------
  function applyBulkAction() {
    const scope = els.bulkScope?.value || "selected";
    let targets = [];

    if (scope === "selected") {
      targets = state.users.filter((u) => state.selectedUserIds.has(String(u.id)));
      if (targets.length === 0) {
        showToast("Nenhum usuário selecionado. Marque os checkboxes ou altere o Escopo para 'Página atual' ou 'Todos filtrados'.", "warning");
        return;
      }
    } else if (scope === "page") {
      const filtered = getFilteredUsers();
      const sorted = getSortedUsers(filtered);
      const startIdx = (state.page - 1) * state.pageSize;
      targets = sorted.slice(startIdx, startIdx + state.pageSize);
    } else {
      targets = getFilteredUsers();
    }

    if (targets.length === 0) {
      showToast("Nenhum usuário no escopo selecionado para aplicar alterações.", "warning");
      return;
    }

    const newCategory = els.bulkCategory?.value?.trim();
    const newLabelsRaw = (els.bulkLabels?.value || "").trim();
    const labelsMode = els.bulkLabelsMode?.value || "add";
    const newEnabled = els.bulkEnabled?.value || "keep";

    const isReplacing = labelsMode === "replace";
    const hasLabelsInput = newLabelsRaw.length > 0;
    const inputLabels = hasLabelsInput
      ? newLabelsRaw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
      : [];

    targets.forEach((u) => {
      if (newCategory) {
        u.teamCategory = newCategory;
        u.hasTeam = true;
        if (!u.teamId) u.teamId = u.username;
      }

      if (hasLabelsInput || isReplacing) {
        let nextLabels = [];
        if (labelsMode === "add") {
          const set = new Set(u.teamLabels || []);
          inputLabels.forEach((l) => set.add(l));
          nextLabels = Array.from(set);
        } else if (labelsMode === "replace") {
          nextLabels = [...inputLabels];
        } else if (labelsMode === "remove") {
          const set = new Set(u.teamLabels || []);
          inputLabels.forEach((l) => set.delete(l));
          nextLabels = Array.from(set);
        }
        u.teamLabels = nextLabels;
        u.hasTeam = true;
        if (!u.teamId) u.teamId = u.username;
      }

      if (newEnabled === "enable") u.enabled = true;
      if (newEnabled === "disable") u.enabled = false;
    });

    // Se havia filtro de labels que ocultaria os usuários atualizados, limpar o filtro
    if (state.filterLabel) {
      state.filterLabel = "";
      if (els.filterLabel) els.filterLabel.value = "";
    }

    populateFilterDropdowns();
    renderTable();
    updateKpis();
    showToast(`Alterações aplicadas a ${targets.length} usuário(s)! Clique em "Salvar no DOMjudge" para sincronizar.`, "success");
  }

  // --------------------------------------------------------------------------
  // SALVAR ALTERAÇÕES NA API
  // --------------------------------------------------------------------------
  async function saveChanges() {
    const creds = window.getApiCredentials ? window.getApiCredentials() : null;
    if (!creds || !creds.apiBase) {
      showToast("Sessão da API não disponível.", "error");
      return;
    }

    const changedUsers = state.users.filter(isUserChanged);
    if (changedUsers.length === 0) {
      showToast("Não há alterações pendentes para salvar.", "info");
      return;
    }

    try {
      showToast(`Sincronizando ${changedUsers.length} usuário(s) no DOMjudge...`, "info");
      els.saveChangesBtn.disabled = true;

      const authHeaders = {};
      if (creds.user && creds.password) {
        authHeaders["Authorization"] = `Basic ${btoa(`${creds.user}:${creds.password}`)}`;
      }

      // 1. Criar times genuinamente novos (que ainda não existiam no DOMjudge)
      const newTeamsToCreate = [];
      changedUsers.forEach((u) => {
        if (u.hasTeam || u.teamId || u.teamCategory || (u.teamLabels && u.teamLabels.length > 0)) {
          const tId = u.teamId || u.username;
          if (!state.teamsMap.has(String(tId))) {
            let groupIds = [];
            if (u.teamCategory) {
              // Buscar ID da categoria/grupo pelo nome ou slug
              let foundGid = null;
              for (const [gid, gname] of state.categoriesMap.entries()) {
                if (
                  gname.toLowerCase() === u.teamCategory.toLowerCase() ||
                  gid.toLowerCase() === u.teamCategory.toLowerCase()
                ) {
                  foundGid = gid;
                  break;
                }
              }
              groupIds = [foundGid || u.teamCategory.toLowerCase().replace(/[^a-z0-9_-]/g, "") || "participants"];
            } else {
              groupIds = ["participants"];
            }

            newTeamsToCreate.push({
              id: tId,
              name: u.name || u.username,
              group_ids: groupIds,
              label: Array.isArray(u.teamLabels) ? u.teamLabels.join(", ") : (u.teamLabels || ""),
            });
          }
        }
      });

      if (newTeamsToCreate.length > 0) {
        try {
          const fdTeams = new FormData();
          fdTeams.append(
            "json",
            new Blob([JSON.stringify(newTeamsToCreate)], { type: "application/json" }),
            "teams.json"
          );
          const resTeams = await fetch(`${creds.apiBase}/users/teams`, {
            method: "POST",
            headers: authHeaders,
            body: fdTeams,
          });
          if (!resTeams.ok) {
            console.warn("Aviso ao criar novos times via API:", await resTeams.text().catch(() => ""));
          }
        } catch (e) {
          console.warn("Erro ao enviar teams.json:", e);
        }
      }

      // 2. Sincronizar Contas/Usuários via /users/accounts
      const accountsToSync = changedUsers.map((u) => ({
        type: (u.roles && u.roles.includes("admin"))
          ? "admin"
          : (u.roles && u.roles.includes("jury") ? "jury" : "team"),
        name: u.name,
        username: u.username,
        email: u.email || null,
        team_id: (u.hasTeam || u.teamCategory || (u.teamLabels && u.teamLabels.length > 0))
          ? (u.teamId || u.username)
          : null,
        roles: u.roles && u.roles.length > 0 ? u.roles : ["team"],
        password: u.password || undefined,
      }));

      const fdAccounts = new FormData();
      fdAccounts.append(
        "json",
        new Blob([JSON.stringify(accountsToSync)], { type: "application/json" }),
        "accounts.json"
      );

      const resAccounts = await fetch(`${creds.apiBase}/users/accounts`, {
        method: "POST",
        headers: authHeaders,
        body: fdAccounts,
      });

      if (!resAccounts.ok) {
        const errTxt = await resAccounts.text().catch(() => "");
        throw new Error(`Erro na API (${resAccounts.status}): ${errTxt}`);
      }

      // Atualizar mapeamento original de usuários
      changedUsers.forEach((user) => {
        if ((user.hasTeam || user.teamCategory || (user.teamLabels && user.teamLabels.length > 0)) && !user.teamId) {
          user.teamId = user.username;
          user.hasTeam = true;
        }
        state.originalUsersMap.set(user.id, JSON.parse(JSON.stringify(user)));
      });

      renderTable();
      updateKpis();
      showToast(`${changedUsers.length} usuário(s) sincronizados com sucesso no DOMjudge!`, "success");
    } catch (err) {
      console.error("Erro ao salvar alterações de usuários:", err);
      showToast(`Falha ao salvar: ${err.message}`, "error");
    } finally {
      els.saveChangesBtn.disabled = state.users.filter(isUserChanged).length === 0;
    }
  }

  // --------------------------------------------------------------------------
  // EXPORTAR CSV
  // --------------------------------------------------------------------------
  function exportCsv() {
    if (state.users.length === 0) {
      showToast("Nenhum usuário para exportar.", "warning");
      return;
    }

    let csv = "id,username,name,email,category,labels,roles,enabled\n";
    state.users.forEach((u) => {
      const labelsStr = (u.teamLabels || []).join(";");
      const rolesStr = (u.roles || []).join(";");
      csv += `"${u.id}","${u.username}","${u.name}","${u.email || ""}","${u.teamCategory || ""}","${labelsStr}","${rolesStr}","${u.enabled ? 1 : 0}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `domjudge_users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV de usuários exportado com sucesso!", "success");
  }

  // --------------------------------------------------------------------------
  // INICIALIZAÇÃO
  // --------------------------------------------------------------------------
  function init() {
    if (els.loadUsersBtn) els.loadUsersBtn.addEventListener("click", loadUsers);
    if (els.saveChangesBtn) els.saveChangesBtn.addEventListener("click", saveChanges);
    if (els.exportUsersCsvBtn) els.exportUsersCsvBtn.addEventListener("click", exportCsv);
    if (els.applyBulkBtn) els.applyBulkBtn.addEventListener("click", applyBulkAction);

    // Filtros
    if (els.filterText) {
      els.filterText.addEventListener("input", (e) => {
        state.filterText = e.target.value;
        state.page = 1;
        renderTable();
      });
    }
    if (els.filterCategory) {
      els.filterCategory.addEventListener("change", (e) => {
        state.filterCategory = e.target.value;
        state.page = 1;
        renderTable();
      });
    }
    if (els.filterLabel) {
      const handleLabelFilter = (e) => {
        state.filterLabel = e.target.value;
        state.page = 1;
        renderTable();
      };
      els.filterLabel.addEventListener("input", handleLabelFilter);
      els.filterLabel.addEventListener("change", handleLabelFilter);
    }
    if (els.filterRole) {
      els.filterRole.addEventListener("change", (e) => {
        state.filterRole = e.target.value;
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

    // Paginação
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

    // Selecionar todos da página
    if (els.selectAllCheckbox) {
      els.selectAllCheckbox.addEventListener("change", (e) => {
        const filtered = getFilteredUsers();
        const sorted = getSortedUsers(filtered);
        const startIdx = (state.page - 1) * state.pageSize;
        const pageItems = sorted.slice(startIdx, startIdx + state.pageSize);

        pageItems.forEach((u) => {
          if (e.target.checked) state.selectedUserIds.add(u.id);
          else state.selectedUserIds.delete(u.id);
        });

        renderTable();
        updateKpis();
      });
    }

    // Modais
    if (els.openCreateModalBtn) {
      els.openCreateModalBtn.addEventListener("click", () => {
        if (els.tabSingleBtn) els.tabSingleBtn.classList.add("active");
        if (els.tabBatchBtn) els.tabBatchBtn.classList.remove("active");
        if (els.createSingleContainer) els.createSingleContainer.hidden = false;
        if (els.createBatchContainer) els.createBatchContainer.hidden = true;
        if (els.createModal) els.createModal.hidden = false;
      });
    }
    if (els.closeCreateModalBtn) {
      els.closeCreateModalBtn.addEventListener("click", () => {
        if (els.createModal) els.createModal.hidden = true;
      });
    }
    if (els.cancelCreateSingleBtn) {
      els.cancelCreateSingleBtn.addEventListener("click", () => {
        if (els.createModal) els.createModal.hidden = true;
      });
    }
    if (els.cancelCreateBatchBtn) {
      els.cancelCreateBatchBtn.addEventListener("click", () => {
        if (els.createModal) els.createModal.hidden = true;
      });
    }

    if (els.closeEditModalBtn) {
      els.closeEditModalBtn.addEventListener("click", () => {
        if (els.editModal) els.editModal.hidden = true;
      });
    }
    if (els.cancelEditModalBtn) {
      els.cancelEditModalBtn.addEventListener("click", () => {
        if (els.editModal) els.editModal.hidden = true;
      });
    }

    if (els.createSingleForm) els.createSingleForm.addEventListener("submit", saveCreateSingle);
    if (els.editSingleForm) els.editSingleForm.addEventListener("submit", saveEditModal);
    if (els.processBatchBtn) els.processBatchBtn.addEventListener("click", processBatchUsers);

    // Abas do Modal Criar Usuários
    if (els.tabSingleBtn && els.tabBatchBtn) {
      els.tabSingleBtn.addEventListener("click", () => {
        els.tabSingleBtn.classList.add("active");
        els.tabBatchBtn.classList.remove("active");
        if (els.createSingleContainer) els.createSingleContainer.hidden = false;
        if (els.createBatchContainer) els.createBatchContainer.hidden = true;
      });
      els.tabBatchBtn.addEventListener("click", () => {
        els.tabBatchBtn.classList.add("active");
        els.tabSingleBtn.classList.remove("active");
        if (els.createSingleContainer) els.createSingleContainer.hidden = true;
        if (els.createBatchContainer) els.createBatchContainer.hidden = false;
        updateBatchPreview();
      });
    }

    if (els.createHasTeam) {
      els.createHasTeam.addEventListener("change", (e) => {
        els.createCategoryField.style.display = e.target.checked ? "flex" : "none";
        els.createLabelsField.style.display = e.target.checked ? "flex" : "none";
      });
    }

    if (els.editHasTeam) {
      els.editHasTeam.addEventListener("change", (e) => {
        els.editCategoryField.style.display = e.target.checked ? "flex" : "none";
        els.editLabelsField.style.display = e.target.checked ? "flex" : "none";
      });
    }

    if (els.batchInputText) {
      els.batchInputText.addEventListener("input", updateBatchPreview);
    }
    if (els.batchDefaultCategory) {
      els.batchDefaultCategory.addEventListener("input", updateBatchPreview);
    }
    if (els.batchDefaultLabels) {
      els.batchDefaultLabels.addEventListener("input", updateBatchPreview);
    }

    if (els.downloadBatchTemplateCsvBtn) {
      els.downloadBatchTemplateCsvBtn.addEventListener("click", () => downloadBatchTemplate("csv"));
    }
    if (els.downloadBatchTemplateTsvBtn) {
      els.downloadBatchTemplateTsvBtn.addEventListener("click", () => downloadBatchTemplate("tsv"));
    }

    if (els.batchFileInput) {
      els.batchFileInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (els.batchInputText) {
            els.batchInputText.value = ev.target.result;
            updateBatchPreview();
            showToast(`Arquivo "${file.name}" carregado com sucesso!`, "info");
          }
        };
        reader.readAsText(file);
        // Resetar o input para permitir selecionar o mesmo arquivo novamente
        e.target.value = "";
      });
    }

    // Ordenação
    document.querySelectorAll('#view-users .th-sort-btn[data-sort]').forEach((btn) => {
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

  return { init, loadUsers, loadDemoUsers, renderTable };
})();

document.addEventListener("DOMContentLoaded", () => {
  UsersModule.init();
});
