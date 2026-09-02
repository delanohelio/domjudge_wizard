// ============================================================================
// DOMJUDGE WIZARD - GERENCIADOR DE USUÁRIOS E TIMES (SPA MODULE)
// ============================================================================

const UsersModule = (() => {
  const state = {
    users: [],
    teamsMap: new Map(),
    categoriesMap: new Map(),
    originalUsersMap: new Map(),
    conflictsMap: new Map(),
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

  function getUserCustomLabels(user) {
    if (!user) return [];
    const uname = (user.username || "").trim().toLowerCase();
    return (user.teamLabels || []).filter((l) => l && l.trim().toLowerCase() !== uname);
  }

  function isParticipantsCategory(cat) {
    if (!cat || typeof cat !== "string") return false;
    return /participants/i.test(cat.trim());
  }

  const STORAGE_CUSTOM_CATEGORIES_KEY = "domjudge_wizard_custom_categories";

  function loadStoredCustomCategories() {
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_CATEGORIES_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((cat) => {
            if (cat && typeof cat === "string" && cat.trim()) {
              const trimmed = cat.trim();
              const slug = trimmed.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
              state.categoriesMap.set(slug, trimmed);
            }
          });
        }
      }
    } catch (e) {}
  }

  function saveStoredCustomCategory(cat) {
    if (!cat || typeof cat !== "string") return;
    const trimmed = cat.trim();
    if (!trimmed) return;
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_CATEGORIES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!arr.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
        arr.push(trimmed);
        localStorage.setItem(STORAGE_CUSTOM_CATEGORIES_KEY, JSON.stringify(arr));
      }
      const slug = trimmed.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
      state.categoriesMap.set(slug, trimmed);
    } catch (e) {}
  }

  // --------------------------------------------------------------------------
  // DETECÇÃO DE USERNAME DUPLICADO (APENAS DUPLICAÇÕES EXATAS)
  // --------------------------------------------------------------------------
  function checkUsernameDuplicate(u1, u2) {
    const raw1 = String(u1 || "").trim();
    const raw2 = String(u2 || "").trim();
    if (!raw1 || !raw2) return null;

    if (raw1.toLowerCase() === raw2.toLowerCase()) {
      return { type: "duplicate", reason: "Username duplicado" };
    }

    return null;
  }

  function computeUsernameConflicts() {
    const conflicts = new Map();
    const n = state.users.length;

    for (let i = 0; i < n; i++) {
      const u1 = state.users[i];
      const name1 = (u1.username || "").trim();
      if (!name1) continue;

      for (let j = i + 1; j < n; j++) {
        const u2 = state.users[j];
        const name2 = (u2.username || "").trim();
        if (!name2) continue;

        const conflict = checkUsernameDuplicate(name1, name2);
        if (conflict) {
          if (!conflicts.has(u1.id)) conflicts.set(u1.id, []);
          conflicts.get(u1.id).push({
            otherId: u2.id,
            otherUsername: name2,
            type: conflict.type,
            reason: conflict.reason,
          });

          if (!conflicts.has(u2.id)) conflicts.set(u2.id, []);
          conflicts.get(u2.id).push({
            otherId: u1.id,
            otherUsername: name1,
            type: conflict.type,
            reason: conflict.reason,
          });
        }
      }
    }

    state.conflictsMap = conflicts;
    return conflicts;
  }

  function isUserChanged(user) {
    const orig = state.originalUsersMap.get(user.id);
    if (!orig) return true; // Novo usuário não salvo

    const origRoles = (orig.roles || []).slice().sort().join(",");
    const currRoles = (user.roles || []).slice().sort().join(",");
    const origLabels = getUserCustomLabels(orig).slice().sort().join(",");
    const currLabels = getUserCustomLabels(user).slice().sort().join(",");

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
    computeUsernameConflicts();
    const hasConflicts = state.conflictsMap && state.conflictsMap.size > 0;
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

    // Se houver duplicidade de usernames, NÃO habilitar o botão de salvar
    if (els.saveChangesBtn) {
      els.saveChangesBtn.disabled = changed === 0 || hasConflicts;
      if (hasConflicts) {
        els.saveChangesBtn.title = "Não é possível salvar: existem usuários com username duplicado.";
      } else {
        els.saveChangesBtn.title = changed > 0 ? "Salvar alterações no DOMjudge" : "Nenhuma alteração pendente";
      }
    }

    if (els.changedHint) {
      if (hasConflicts) {
        const conflictCount = state.conflictsMap.size;
        els.changedHint.innerHTML = `⚠️ <strong style="color: var(--danger); font-weight: 700;">${conflictCount} usuário(s) com username duplicado.</strong> Edite os dados ou remova as linhas em destaque para poder salvar.`;
        els.changedHint.style.color = "var(--danger)";
      } else {
        els.changedHint.textContent = changed > 0
          ? `${changed} usuário(s) com alterações pendentes.`
          : "Nenhuma alteração pendente.";
        els.changedHint.style.color = changed > 0 ? "var(--brand)" : "var(--ink-muted)";
      }
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

      await loadCategories();

      // Buscar Contests, Times e Usuários em paralelo
      const [teamsRes, usersRes] = await Promise.all([
        fetch(`${creds.apiBase}/teams`, { headers }).catch(() => null),
        fetch(`${creds.apiBase}/users`, { headers }),
      ]);

      if (!usersRes.ok) {
        throw new Error(`API HTTP ${usersRes.status}: ${usersRes.statusText}`);
      }

      const rawTeams = teamsRes && teamsRes.ok ? await teamsRes.json().catch(() => []) : [];
      const rawUsers = await usersRes.json();

      state.teamsMap.clear();
      rawTeams.forEach((t) => {
        // Resolver categoria através dos dados de category do time
        let catName = "";
        if (t.category && typeof t.category === "string" && t.category.trim()) {
          catName = t.category.trim();
        } else if (Array.isArray(t.group_ids) && t.group_ids.length > 0) {
          catName = t.group_ids
            .map((gid) => state.categoriesMap.get(String(gid)) || (String(gid).toLowerCase() === "participants" ? "Participants" : gid))
            .join(", ");
        } else if (t.category_id) {
          catName = state.categoriesMap.get(String(t.category_id)) || String(t.category_id);
        }

        if (catName) {
          const slug = catName.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
          state.categoriesMap.set(slug, catName);
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
          raw: t,
        });
      });

      state.originalUsersMap.clear();
      state.users = rawUsers.map((u) => {
        const teamObj = u.team_id ? state.teamsMap.get(String(u.team_id)) : null;
        const rawLabels = teamObj ? teamObj.labels : [];
        const cleanLabels = rawLabels.filter((l) => l.toLowerCase() !== (u.username || "").toLowerCase());
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
          teamLabels: cleanLabels,
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
      getUserCustomLabels(u).forEach((l) => labels.add(l));
      (u.roles || []).forEach((r) => roles.add(r));
    });

    state.categoriesMap.forEach((gname) => {
      if (gname) categories.add(gname);
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
  // CARREGAR CATEGORIAS DA API DO DOMJUDGE (EXCLUSIVAMENTE DE TEAMS)
  // --------------------------------------------------------------------------
  async function loadCategories() {
    const creds = window.getApiCredentials ? window.getApiCredentials() : null;
    if (!creds || !creds.apiBase) return;

    const headers = {};
    if (creds.user && creds.password) {
      headers["Authorization"] = `Basic ${btoa(`${creds.user}:${creds.password}`)}`;
    }

    try {
      state.categoriesMap.clear();

      // Considerar APENAS os dados de categoria dos times (/teams)
      const teams = await fetch(`${creds.apiBase}/teams`, { headers })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);

      if (Array.isArray(teams)) {
        teams.forEach((t) => {
          // 1. Campo category do time (se houver)
          if (t.category && typeof t.category === "string" && t.category.trim()) {
            const cat = t.category.trim();
            const slug = cat.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
            state.categoriesMap.set(slug, cat);
            state.categoriesMap.set(cat, cat);
          }
          // 2. Campo category_id do time (se houver)
          if (t.category_id) {
            const cid = String(t.category_id).trim();
            if (cid && !state.categoriesMap.has(cid)) {
              let disp = cid;
              if (isParticipantsCategory(cid)) {
                disp = cid.replace(/^participants[-_]?/i, "Participants-");
                if (disp === "Participants-") disp = "Participants";
              }
              state.categoriesMap.set(cid, disp);
            }
          }
          // 3. Campo group_ids do time
          if (Array.isArray(t.group_ids)) {
            t.group_ids.forEach((gid) => {
              const strGid = String(gid).trim();
              if (strGid && !state.categoriesMap.has(strGid)) {
                let displayName = strGid;
                if (strGid.toLowerCase() === "participants") {
                  displayName = "Participants";
                } else if (isParticipantsCategory(strGid)) {
                  displayName = strGid.replace(/^participants[-_]?/i, "Participants-");
                  if (displayName === "Participants-") displayName = "Participants";
                } else if (strGid.toLowerCase() === "system") {
                  displayName = "System";
                }
                state.categoriesMap.set(strGid, displayName);
              }
            });
          }
        });
      }

      // Se nenhum time tiver categoria ainda, manter Participants como base
      if (state.categoriesMap.size === 0) {
        state.categoriesMap.set("participants", "Participants");
      }

      loadStoredCustomCategories();
      populateFilterDropdowns();
    } catch (e) {
      console.warn("Aviso ao carregar categorias de teams:", e.message);
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

      if (state.filterCategory !== "all") {
        const filterCat = state.filterCategory.toLowerCase();
        const userCat = (user.teamCategory || "").toLowerCase();
        const isMatch =
          userCat === filterCat ||
          (filterCat === "participants" && isParticipantsCategory(user.teamCategory)) ||
          (isParticipantsCategory(filterCat) && userCat === filterCat);

        if (!isMatch) return false;
      }

      if (state.filterLabel && state.filterLabel.trim() !== "" && state.filterLabel !== "all") {
        const visibleLabels = getUserCustomLabels(user);
        if (!matchLabelsExpression(visibleLabels, state.filterLabel)) {
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

    computeUsernameConflicts();
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
      const uId = String(user.id);
      const isSelected = state.selectedUserIds.has(uId);

      const userConflicts = state.conflictsMap ? state.conflictsMap.get(user.id) : null;
      const hasConflict = Array.isArray(userConflicts) && userConflicts.length > 0;

      if (hasConflict) {
        tr.classList.add("row-conflict");
      } else if (changed) {
        tr.classList.add("row-changed");
      }

      const customLabels = getUserCustomLabels(user);
      const labelsHtml = (customLabels && customLabels.length > 0)
        ? customLabels.map((l) => `<span class="pill">${sanitize(l)}</span>`).join("")
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

      let conflictBadge = "";
      if (hasConflict) {
        const descriptions = userConflicts
          .map((c) => `<div class="pill-conflict" title="${sanitize(`${c.reason}: ${c.otherUsername}`)}">⚠️ ${sanitize(`${c.reason}: "${c.otherUsername}"`)}</div>`)
          .join("");
        conflictBadge = `<div class="conflict-wrapper" style="margin-top: 4px;">${descriptions}</div>`;
      }

      tr.innerHTML = `
        <td style="text-align: center;">
          <input type="checkbox" class="user-row-checkbox" data-id="${sanitize(uId)}" ${isSelected ? "checked" : ""} />
        </td>
        <td>
          <div style="font-family: var(--font-mono); font-weight: 700; color: var(--ink);">${sanitize(user.username)}</div>
          ${conflictBadge}
        </td>
        <td>
          <div style="font-weight: 600;">${sanitize(user.name)}</div>
          ${changed ? '<span class="pill pill-role" style="font-size: 0.65rem;">Modificado</span>' : ""}
        </td>
        <td style="font-size: 0.82rem; color: var(--ink-secondary); font-family: var(--font-mono);">${sanitize(user.email || "-")}</td>
        <td>${categoryHtml}</td>
        <td><div class="pill-list">${labelsHtml}</div></td>
        <td><div class="pill-list">${rolesHtml}</div></td>
        <td style="text-align: center;">${statusBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button type="button" class="btn-sm dim edit-user-btn" data-id="${sanitize(uId)}" title="Editar dados deste usuário">✏️ Editar</button>
          <button type="button" class="btn-sm btn-delete-row" data-id="${sanitize(uId)}" title="Remover usuário desta tabela" style="margin-left: 6px; color: var(--danger); border-color: rgba(239, 68, 68, 0.35);">🗑️</button>
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

      // Botão remover linha
      const delBtn = tr.querySelector(".btn-delete-row");
      if (delBtn) {
        delBtn.addEventListener("click", () => {
          deleteUserRow(user.id);
        });
      }

      els.tableBody.appendChild(tr);
    });
  }

  // --------------------------------------------------------------------------
  // REMOVER LINHA / USUÁRIO DA TABELA
  // --------------------------------------------------------------------------
  function deleteUserRow(userId) {
    const user = state.users.find((u) => String(u.id) === String(userId));
    if (!user) return;

    const isNew = !state.originalUsersMap.has(user.id) || String(userId).startsWith("new_") || String(userId).startsWith("batch_");
    const confirmMsg = isNew
      ? `Remover o usuário adicionado "${user.username}" da tabela?`
      : `Remover "${user.username}" da tabela local? (As alterações não salvas serão descartadas)`;

    if (!confirm(confirmMsg)) return;

    state.users = state.users.filter((u) => String(u.id) !== String(userId));
    state.selectedUserIds.delete(String(userId));

    populateFilterDropdowns();
    updateKpis();
    renderTable();
    showToast(`Usuário "${user.username}" removido da tabela.`, "info");
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
    els.editLabels.value = getUserCustomLabels(user).join(", ");
    els.editEnabled.checked = Boolean(user.enabled);

    const isOriginalAdmin = (user.roles || []).includes("admin") || user.username === "admin";
    document.querySelectorAll('input[name="editRoles"]').forEach((cb) => {
      cb.checked = (user.roles || []).includes(cb.value);
      if (cb.value === "admin" && isOriginalAdmin) {
        cb.checked = true;
        cb.disabled = true;
        cb.title = "O papel de admin é protegido e não pode ser removido.";
      } else {
        cb.disabled = false;
        cb.title = "";
      }
    });

    els.editCategoryField.style.display = "flex";
    els.editLabelsField.style.display = "flex";

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

    const newCategory = els.editCategory.value.trim();
    if (newCategory) {
      saveStoredCustomCategory(newCategory);
    }
    const newLabels = els.editLabels.value
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter((s) => Boolean(s) && s.toLowerCase() !== user.username.toLowerCase());
    const isPart = isParticipantsCategory(newCategory);
    const wantsTeam = els.editHasTeam.checked || isPart || Boolean(newCategory) || newLabels.length > 0;

    user.hasTeam = wantsTeam;
    user.teamCategory = newCategory;
    user.teamLabels = newLabels;
    if (wantsTeam && !user.teamId) {
      user.teamId = user.username;
    }

    user.enabled = els.editEnabled.checked;

    const selectedRoles = Array.from(
      document.querySelectorAll('input[name="editRoles"]:checked')
    ).map((cb) => cb.value);

    // Se for categoria de participante, garante role team
    if (isPart && !selectedRoles.includes("team") && !selectedRoles.includes("admin")) {
      selectedRoles.push("team");
    }

    // O papel de admin não pode ser removido ou trocado
    const origUser = state.originalUsersMap.get(user.id);
    const wasAdmin = (origUser?.roles || []).includes("admin") || (user.roles || []).includes("admin") || user.username === "admin";
    if (wasAdmin && !selectedRoles.includes("admin")) {
      selectedRoles.push("admin");
    }

    user.roles = selectedRoles.length > 0 ? selectedRoles : ["team"];

    els.editModal.hidden = true;
    populateFilterDropdowns();
    updateKpis();
    renderTable();
    showToast(`Usuário ${user.username} atualizado localmente. Clique em "Salvar no DOMjudge" para sincronizar.`, "success");
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
    const hasTeamRaw = els.createHasTeam.checked;
    const teamCategory = els.createCategory.value.trim();
    if (teamCategory) {
      saveStoredCustomCategory(teamCategory);
    }
    const isPart = isParticipantsCategory(teamCategory);
    const hasTeam = hasTeamRaw || isPart || Boolean(teamCategory);
    const teamLabels = hasTeam
      ? els.createLabels.value
          .split(/[,;]+/)
          .map((s) => s.trim())
          .filter((s) => Boolean(s) && s.toLowerCase() !== username.toLowerCase())
      : [];
    const enabled = document.getElementById("createEnabled").checked;
    const roles = Array.from(
      document.querySelectorAll('input[name="createRoles"]:checked')
    ).map((cb) => cb.value);

    if (isPart && !roles.includes("team") && !roles.includes("admin")) {
      roles.push("team");
    }

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
    updateKpis();
    renderTable();

    if (state.conflictsMap && state.conflictsMap.has(newUser.id)) {
      showToast(`Atenção: Username "${username}" já existe na tabela! Edite ou remova a linha para poder salvar.`, "warning", 8000);
    } else {
      showToast(`Usuário ${username} adicionado à lista para salvar!`, "success");
    }
  }

  function processBatchUsers() {
    const parsed = parseBatchText(els.batchInputText.value);
    if (parsed.length === 0) {
      showToast("Nenhum usuário válido encontrado no texto colado.", "warning");
      return;
    }

    const hasTeam = els.batchHasTeam.checked;

    parsed.forEach((p, idx) => {
      const cleanLabels = (p.labels || []).filter(
        (l) => l.toLowerCase() !== (p.username || "").toLowerCase()
      );
      state.users.unshift({
        id: `batch_${Date.now()}_${idx}`,
        username: p.username,
        name: p.name,
        email: p.email,
        password: p.password,
        hasTeam,
        teamCategory: p.category,
        teamLabels: cleanLabels,
        enabled: true,
        roles: ["team"],
      });
      if (p.category) {
        saveStoredCustomCategory(p.category);
      }
    });

    els.createModal.hidden = true;
    els.batchInputText.value = "";
    populateFilterDropdowns();
    updateKpis();
    renderTable();

    const conflictCount = state.conflictsMap ? state.conflictsMap.size : 0;
    if (conflictCount > 0) {
      showToast(`${parsed.length} usuário(s) adicionados. Atenção: ${conflictCount} usuário(s) possuem username duplicado. Edite ou remova as linhas para salvar.`, "warning", 9000);
    } else {
      showToast(`${parsed.length} usuários adicionados com sucesso!`, "success");
    }
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
        showToast("Nenhum usuário selecionado na tabela.", "warning");
        return;
      }
    } else if (scope === "filtered") {
      targets = getFilteredUsers();
      if (targets.length === 0) {
        showToast("Nenhum usuário encontrado com os filtros atuais.", "warning");
        return;
      }
    } else if (scope === "page") {
      const filtered = getFilteredUsers();
      const start = (state.page - 1) * state.pageSize;
      targets = filtered.slice(start, start + state.pageSize);
      if (targets.length === 0) {
        showToast("Nenhum usuário na página atual.", "warning");
        return;
      }
    }

    if (targets.length === 0) {
      showToast("Nenhum usuário no escopo selecionado para aplicar alterações.", "warning");
      return;
    }

    const newCategory = els.bulkCategory.value.trim();
    if (newCategory) {
      saveStoredCustomCategory(newCategory);
    }
    const newLabelsRaw = (els.bulkLabels?.value || "").trim();
    const labelsMode = els.bulkLabelsMode?.value || "add";
    const newEnabled = els.bulkEnabled?.value || "keep";

    const isReplacing = labelsMode === "replace";
    const isClearing = labelsMode === "clear";
    const hasLabelsInput = newLabelsRaw.length > 0;
    const inputLabels = hasLabelsInput
      ? newLabelsRaw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
      : [];

    targets.forEach((u) => {
      if (newCategory) {
        u.teamCategory = newCategory;
        if (isParticipantsCategory(newCategory)) {
          u.hasTeam = true;
          if (!u.teamId) u.teamId = u.username;
          if (!u.roles.includes("team") && !u.roles.includes("admin")) {
            u.roles.push("team");
          }
        }
      }

      if (hasLabelsInput || isReplacing || isClearing) {
        let nextLabels = [];
        const uCustom = getUserCustomLabels(u);
        if (labelsMode === "clear") {
          nextLabels = [];
        } else if (labelsMode === "add") {
          const set = new Set(uCustom);
          inputLabels.forEach((l) => {
            if (l.toLowerCase() !== u.username.toLowerCase()) set.add(l);
          });
          nextLabels = Array.from(set);
        } else if (labelsMode === "replace") {
          nextLabels = inputLabels.filter((l) => l.toLowerCase() !== u.username.toLowerCase());
        } else if (labelsMode === "remove") {
          const removeSet = new Set(inputLabels.map((l) => l.toLowerCase()));
          nextLabels = uCustom.filter((l) => !removeSet.has(l.toLowerCase()));
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

    computeUsernameConflicts();
    if (state.conflictsMap && state.conflictsMap.size > 0) {
      showToast(`Não é possível salvar: existem ${state.conflictsMap.size} usuário(s) com username duplicado em conflito. Edite ou remova as linhas antes de sincronizar.`, "error", 8000);
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

      function appendJsonToFormData(formData, fieldName, filename, data) {
        const jsonStr = typeof data === "string" ? data : JSON.stringify(data);
        try {
          const file = new File([jsonStr], filename, { type: "application/json" });
          formData.append(fieldName, file, filename);
        } catch (e) {
          const blob = new Blob([jsonStr], { type: "application/json" });
          formData.append(fieldName, blob, filename);
        }
      }

      // 1. Sincronizar novos grupos / subcategorias com DOMjudge antes dos times
      const groupsToSync = [];
      changedUsers.forEach((u) => {
        if (u.teamCategory && u.teamCategory.toLowerCase() !== "participants") {
          const slug = u.teamCategory.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
          if (!groupsToSync.some((g) => g.id === slug)) {
            groupsToSync.push({
              id: slug,
              name: u.teamCategory,
            });
          }
        }
      });

      if (groupsToSync.length > 0) {
        try {
          const fdGroups = new FormData();
          appendJsonToFormData(fdGroups, "json", "groups.json", groupsToSync);
          await fetch(`${creds.apiBase}/users/groups`, {
            method: "POST",
            headers: authHeaders,
            body: fdGroups,
          });
          groupsToSync.forEach((g) => {
            state.categoriesMap.set(g.id, g.name);
          });
        } catch (e) {
          console.warn("Aviso ao sincronizar grupos com DOMjudge:", e);
        }
      }

      // 2. Criar e atualizar times no DOMjudge (teams.json)
      const teamsToSync = [];
      changedUsers.forEach((u) => {
        const existingObj = u.team_id ? state.teamsMap.get(String(u.team_id)) : (u.teamId ? state.teamsMap.get(String(u.teamId)) : null);
        const hasExistingTeam = Boolean(existingObj);
        const customLabels = getUserCustomLabels(u);
        const wantsTeam = u.hasTeam || Boolean(u.teamCategory) || customLabels.length > 0;

        if (wantsTeam || hasExistingTeam) {
          const tId = existingObj ? existingObj.id : (u.teamId || u.username);
          const tName = existingObj ? (existingObj.name || u.name || u.username) : (u.name || u.username);

          let groupIds = [];
          if (u.teamCategory) {
            let foundGid = null;
            // 1. Match exato no categoriesMap (por nome ou id)
            for (const [gid, gname] of state.categoriesMap.entries()) {
              if (
                gname.toLowerCase() === u.teamCategory.toLowerCase() ||
                gid.toLowerCase() === u.teamCategory.toLowerCase()
              ) {
                foundGid = gid;
                break;
              }
            }

            // 2. Se for subcategoria, preserva o slug da subcategoria e registra no mapa
            if (!foundGid) {
              const slug = u.teamCategory.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
              foundGid = slug;
              state.categoriesMap.set(slug, u.teamCategory);
            }

            groupIds = [foundGid];
          } else if (existingObj?.raw?.group_ids && existingObj.raw.group_ids.length > 0) {
            groupIds = existingObj.raw.group_ids;
          } else {
            groupIds = ["participants"];
          }

          // Sempre inclui o username como label para garantir unicidade no banco do DOMjudge
          const allLabels = [u.username, ...customLabels].filter(Boolean);
          const labelStr = allLabels.join(", ");

          const teamPayload = {
            id: tId,
            name: tName,
            group_ids: groupIds,
            label: labelStr,
          };

          if (existingObj?.raw?.organization_id) {
            teamPayload.organization_id = existingObj.raw.organization_id;
          }

          teamsToSync.push(teamPayload);
        }
      });

      if (teamsToSync.length > 0) {
        // Tenta enviar em lote primeiro
        const fdTeams = new FormData();
        appendJsonToFormData(fdTeams, "json", "teams.json", teamsToSync);
        const resTeams = await fetch(`${creds.apiBase}/users/teams`, {
          method: "POST",
          headers: authHeaders,
          body: fdTeams,
        });

        if (!resTeams.ok && teamsToSync.length > 1) {
          console.warn("Envio em lote de teams.json retornou status", resTeams.status, "- sincronizando individualmente com resiliência...");
          // Fallback individual para garantir que todos os times possíveis sejam atualizados
          for (const item of teamsToSync) {
            try {
              const singleFd = new FormData();
              appendJsonToFormData(singleFd, "json", "teams.json", [item]);
              await fetch(`${creds.apiBase}/users/teams`, {
                method: "POST",
                headers: authHeaders,
                body: singleFd,
              });
              await new Promise((r) => setTimeout(r, 60));
            } catch (e) {
              console.warn(`Aviso ao sincronizar time ${item.id}:`, e);
            }
          }
        }
      }

      // 2. Sincronizar Contas/Usuários via /users/accounts
      const accountsToSync = changedUsers.map((u) => {
        const origUser = state.originalUsersMap.get(u.id);
        const wasAdmin = (origUser?.roles || []).includes("admin") || (u.roles || []).includes("admin") || u.username === "admin";

        let roles = Array.isArray(u.roles) && u.roles.length > 0 ? [...u.roles] : ["team"];
        if (wasAdmin && !roles.includes("admin")) {
          roles.push("admin");
        }

        const isAdmin = roles.includes("admin");
        const isJury = roles.includes("jury");
        const type = isAdmin ? "admin" : (isJury ? "jury" : "team");

        return {
          type,
          name: u.name,
          username: u.username,
          email: u.email || null,
          team_id: (u.hasTeam || u.teamCategory || (u.teamLabels && u.teamLabels.length > 0))
            ? (u.teamId || u.team_id || u.username)
            : null,
          roles,
          password: u.password || undefined,
        };
      });

      const fdAccounts = new FormData();
      appendJsonToFormData(fdAccounts, "json", "accounts.json", accountsToSync);

      const resAccounts = await fetch(`${creds.apiBase}/users/accounts`, {
        method: "POST",
        headers: authHeaders,
        body: fdAccounts,
      });

      if (!resAccounts.ok) {
        const errTxt = await resAccounts.text().catch(() => "");
        throw new Error(`Erro ao sincronizar usuários na API (HTTP ${resAccounts.status}): ${errTxt || resAccounts.statusText}`);
      }

      // Atualizar mapeamento original de usuários e times
      changedUsers.forEach((user) => {
        if ((user.hasTeam || user.teamCategory || (user.teamLabels && user.teamLabels.length > 0)) && !user.teamId) {
          user.teamId = user.username;
          user.hasTeam = true;
        }
        if (user.teamId) {
          const customLabels = getUserCustomLabels(user);
          const allLabels = [user.username, ...customLabels].filter(Boolean);
          state.teamsMap.set(String(user.teamId), {
            id: user.teamId,
            teamid: user.teamId,
            name: user.name || user.username,
            category: user.teamCategory || "Participants",
            labels: allLabels,
          });
        }
        user.teamLabels = getUserCustomLabels(user);
        state.originalUsersMap.set(user.id, JSON.parse(JSON.stringify(user)));
      });

      renderTable();
      updateKpis();
      showToast(`${changedUsers.length} usuário(s) sincronizados com sucesso no DOMjudge!`, "success");
    } catch (err) {
      console.error("Erro ao salvar alterações de usuários:", err);
      if (err.message && (err.message.includes("401") || err.message.includes("403"))) {
        if (window.handleApiUnauthorized) window.handleApiUnauthorized(err);
      }
      showToast(`Erro ao salvar alterações: ${err.message}`, "error", 10000);
    } finally {
      updateKpis();
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
      const labelsStr = getUserCustomLabels(u).join(";");
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

    if (els.bulkLabelsMode && els.bulkLabels) {
      els.bulkLabelsMode.addEventListener("change", () => {
        if (els.bulkLabelsMode.value === "clear") {
          els.bulkLabels.disabled = true;
          els.bulkLabels.value = "";
          els.bulkLabels.placeholder = "Desativado (modo Limpar)";
        } else {
          els.bulkLabels.disabled = false;
          els.bulkLabels.placeholder = "ex: turma-a";
        }
      });
    }

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

    loadCategories();
  }

  return { init, loadUsers, loadCategories, loadDemoUsers, renderTable };
})();

window.UsersModule = UsersModule;

document.addEventListener("DOMContentLoaded", () => {
  UsersModule.init();
});
