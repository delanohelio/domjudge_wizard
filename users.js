const state = {
  apiBase: "https://coderunner.cin.ufpe.br/api/v4",
  apiUser: "",
  apiPassword: "",
  users: [],
  teamsMap: new Map(),
  categoriesMap: new Map(),
  originalUsersMap: new Map(),
  selectedUserIds: new Set(),
  filterText: "",
  filterCategory: "all",
  filterLabel: "all",
  filterRole: "all",
  filterEnabled: "all",
  sortKey: "username",
  sortDir: "asc",
  page: 1,
  pageSize: 15,
};

const els = {
  apiBase: document.getElementById("usersApiBase"),
  apiUser: document.getElementById("usersApiUser"),
  apiPassword: document.getElementById("usersApiPassword"),
  loadUsersBtn: document.getElementById("loadUsersBtn"),
  loadDemoUsersBtn: document.getElementById("loadDemoUsersBtn"),
  status: document.getElementById("usersStatus"),
  
  // Filters
  filterText: document.getElementById("usersFilterText"),
  filterCategory: document.getElementById("usersFilterCategory"),
  filterLabel: document.getElementById("usersFilterLabel"),
  filterRole: document.getElementById("usersFilterRole"),
  filterEnabled: document.getElementById("usersFilterEnabled"),

  // Bulk actions
  bulkScope: document.getElementById("bulkScope"),
  bulkCategory: document.getElementById("bulkCategory"),
  bulkLabels: document.getElementById("bulkLabels"),
  bulkLabelsMode: document.getElementById("bulkLabelsMode"),
  bulkEnabled: document.getElementById("bulkEnabled"),
  applyBulkBtn: document.getElementById("applyBulkBtn"),

  // Data lists & buttons
  categoryDataList: document.getElementById("categoryDataList"),
  saveChangesBtn: document.getElementById("saveChangesBtn"),
  exportUsersCsvBtn: document.getElementById("exportUsersCsvBtn"),
  changedHint: document.getElementById("changedHint"),

  // Pagination
  pageSize: document.getElementById("usersPageSize"),
  prevPageBtn: document.getElementById("prevPageBtn"),
  nextPageBtn: document.getElementById("nextPageBtn"),
  pageLabel: document.getElementById("pageLabel"),
  pageStats: document.getElementById("pageStats"),

  // Table
  selectAllCheckbox: document.getElementById("selectAllCheckbox"),
  tableBody: document.getElementById("usersTableBody"),

  // Create Modal
  openCreateModalBtn: document.getElementById("openCreateModalBtn"),
  createModal: document.getElementById("createModal"),
  closeCreateModalBtn: document.getElementById("closeCreateModalBtn"),
  tabSingleBtn: document.getElementById("tabSingleBtn"),
  tabBatchBtn: document.getElementById("tabBatchBtn"),
  createSingleForm: document.getElementById("createSingleForm"),
  createBatchContainer: document.getElementById("createBatchContainer"),
  cancelCreateSingleBtn: document.getElementById("cancelCreateSingleBtn"),
  cancelCreateBatchBtn: document.getElementById("cancelCreateBatchBtn"),
  processBatchBtn: document.getElementById("processBatchBtn"),
  batchInputText: document.getElementById("batchInputText"),
  batchDefaultCategory: document.getElementById("batchDefaultCategory"),
  batchDefaultLabels: document.getElementById("batchDefaultLabels"),
  batchFeedback: document.getElementById("batchFeedback"),
  createHasTeam: document.getElementById("createHasTeam"),
  batchHasTeam: document.getElementById("batchHasTeam"),
  createCategory: document.getElementById("createCategory"),
  createLabels: document.getElementById("createLabels"),

  // Edit Modal
  editModal: document.getElementById("editModal"),
  closeEditModalBtn: document.getElementById("closeEditModalBtn"),
  editSingleForm: document.getElementById("editSingleForm"),
  editUserTitle: document.getElementById("editUserTitle"),
  cancelEditModalBtn: document.getElementById("cancelEditModalBtn"),
  editHasTeam: document.getElementById("editHasTeam"),
  editCategory: document.getElementById("editCategory"),
  editLabels: document.getElementById("editLabels"),
};

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

function parseLabelsInput(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatLabelsString(labels) {
  if (!labels || !Array.isArray(labels)) return "";
  return labels.join(", ");
}

function copyUserObject(user) {
  return {
    ...user,
    labels: Array.isArray(user.labels) ? [...user.labels] : [],
    roles: Array.isArray(user.roles) ? [...user.roles] : [],
  };
}

function isUserChanged(user) {
  if (user.isNew) return true;
  const original = state.originalUsersMap.get(String(user.id));
  if (!original) return false;

  if (user.username !== original.username) return true;
  if (user.name !== original.name) return true;
  if ((user.email || "") !== (original.email || "")) return true;
  if (Boolean(user.enabled) !== Boolean(original.enabled)) return true;
  if (Boolean(user.hasTeam) !== Boolean(original.hasTeam)) return true;
  if (user.password) return true;

  const currentRoles = [...(user.roles || [])].sort().join(",");
  const origRoles = [...(original.roles || [])].sort().join(",");
  if (currentRoles !== origRoles) return true;

  if (user.hasTeam) {
    if ((user.category || "") !== (original.category || "")) return true;
    const currentLabels = [...(user.labels || [])].sort().join(",");
    const origLabels = [...(original.labels || [])].sort().join(",");
    if (currentLabels !== origLabels) return true;
  }

  return false;
}

function generateDemoUsers() {
  const demoUsers = [
    { id: "101", username: "ana.souza", name: "Ana Souza", email: "ana.souza@cin.ufpe.br", category: "Estudantes", labels: ["turma-a", "2026-1"], roles: ["team"], enabled: true, hasTeam: true, team_id: "t101" },
    { id: "102", username: "bruno.lima", name: "Bruno Lima", email: "bruno.lima@cin.ufpe.br", category: "Estudantes", labels: ["turma-a", "vip"], roles: ["team"], enabled: true, hasTeam: true, team_id: "t102" },
    { id: "103", username: "carla.mendes", name: "Carla Mendes", email: "carla.mendes@cin.ufpe.br", category: "Estudantes", labels: ["turma-b"], roles: ["team"], enabled: true, hasTeam: true, team_id: "t103" },
    { id: "104", username: "diego.alves", name: "Diego Alves", email: "diego.alves@cin.ufpe.br", category: "Monitores", labels: ["monitor", "2026-1"], roles: ["team", "jury"], enabled: true, hasTeam: true, team_id: "t104" },
    { id: "105", username: "elena.ferreira", name: "Elena Ferreira", email: "elena.ferreira@cin.ufpe.br", category: "Competidores", labels: ["fase-1", "vip"], roles: ["team"], enabled: true, hasTeam: true, team_id: "t105" },
    { id: "106", username: "fabricio.costa", name: "Fabrício Costa", email: "fabricio.costa@cin.ufpe.br", category: "", labels: [], roles: ["jury", "admin"], enabled: true, hasTeam: false, team_id: null },
    { id: "107", username: "gabriela.rocha", name: "Gabriela Rocha", email: "gabriela.rocha@cin.ufpe.br", category: "Estudantes", labels: ["turma-b"], roles: ["team"], enabled: false, hasTeam: true, team_id: "t107" },
    { id: "108", username: "heitor.oliveira", name: "Heitor Oliveira", email: "heitor.oliveira@cin.ufpe.br", category: "Competidores", labels: ["fase-1"], roles: ["team"], enabled: true, hasTeam: true, team_id: "t108" },
  ];

  state.users = demoUsers.map((u) => ({
    ...u,
    isNew: false,
    saveResult: null,
  }));

  state.originalUsersMap = new Map();
  state.users.forEach((u) => {
    state.originalUsersMap.set(String(u.id), copyUserObject(u));
  });

  state.selectedUserIds.clear();
  state.page = 1;

  populateFilterDropdowns();
  renderUserTable();
  setStatus(`Carregados ${state.users.length} usuarios de exemplo para demonstracao.`);
}

async function apiFetch(path, options = {}) {
  const apiBase = normalizeApiBase(state.apiBase);
  const user = String(state.apiUser || "").trim();
  const password = state.apiPassword || "";

  if (!apiBase || !user || !password) {
    throw new Error("Preencha API base, usuario e senha.");
  }

  const headers = {
    Accept: "application/json",
    Authorization: buildBasicAuthHeader(user, password),
    ...(options.headers || {}),
  };

  // If body is FormData, do NOT set Content-Type header so fetch sets boundary automatically
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const response = await fetch(`${apiBase}/${String(path || "").replace(/^\/+/, "")}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    let detailMessage = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed.message) {
        detailMessage = parsed.message;
      } else if (parsed.error) {
        detailMessage = parsed.error;
      } else if (parsed.detail) {
        detailMessage = parsed.detail;
      }
      if (parsed.errors) {
        const errStr = typeof parsed.errors === "object" ? JSON.stringify(parsed.errors) : String(parsed.errors);
        detailMessage += ` (${errStr})`;
      }
    } catch (e) {}
    throw new Error(`Falha API (${response.status}): ${detailMessage || "Erro desconhecido"}`);
  }

  const raw = await response.text();
  return raw.trim() ? JSON.parse(raw) : null;
}

async function loadUsersFromApi() {
  try {
    setStatus("Carregando usuarios, teams e grupos da API...");
    state.apiBase = els.apiBase?.value || state.apiBase;
    state.apiUser = els.apiUser?.value || state.apiUser;
    state.apiPassword = els.apiPassword?.value || state.apiPassword;

    // Fetch users, teams, and contests in parallel
    const [usersRes, teamsRes, contestsRes] = await Promise.allSettled([
      apiFetch("users"),
      apiFetch("teams"),
      apiFetch("contests"),
    ]);

    if (usersRes.status !== "fulfilled" || !Array.isArray(usersRes.value)) {
      throw new Error("Resposta invalida da API ao carregar usuarios.");
    }

    const rawUsers = usersRes.value;
    const rawTeams = teamsRes.status === "fulfilled" && Array.isArray(teamsRes.value) ? teamsRes.value : [];
    const rawContests = contestsRes.status === "fulfilled" && Array.isArray(contestsRes.value) ? contestsRes.value : [];

    // Map contest groups: ID -> Name & Name -> ID
    const catIdToName = new Map();
    state.categoriesMap = new Map();

    if (rawContests.length > 0) {
      const groupPromises = rawContests.map((c) => apiFetch(`contests/${encodeURIComponent(c.id)}/groups`).catch(() => []));
      const groupsResults = await Promise.all(groupPromises);
      groupsResults.forEach((groups) => {
        if (Array.isArray(groups)) {
          groups.forEach((g) => {
            const id = String(g.id);
            const name = String(g.name || g.id);
            catIdToName.set(id, name);
            state.categoriesMap.set(name.toLowerCase(), id);
            state.categoriesMap.set(id, id);
          });
        }
      });
    }

    // Map teams: ID -> Team object & Name -> Team object
    state.teamsMap = new Map();
    rawTeams.forEach((t) => {
      const id = String(t.id);
      state.teamsMap.set(id, t);
      if (t.name) state.teamsMap.set(String(t.name).toLowerCase(), t);
    });

    state.users = rawUsers.map((item) => {
      const id = String(item.id || item.username);
      const roles = Array.isArray(item.roles) ? item.roles : (item.user_roles || ["team"]);

      let team = null;
      if (item.team_id && state.teamsMap.has(String(item.team_id))) {
        team = state.teamsMap.get(String(item.team_id));
      } else if (item.team && typeof item.team === "object") {
        team = item.team;
      } else if (item.team && typeof item.team === "string" && state.teamsMap.has(String(item.team))) {
        team = state.teamsMap.get(String(item.team));
      } else if (item.name && state.teamsMap.has(String(item.name).toLowerCase())) {
        team = state.teamsMap.get(String(item.name).toLowerCase());
      }

      const hasTeam = Boolean(team || item.team_id);
      let category = "";
      let labels = [];

      if (team) {
        const catId = String(team.category_id || team.category || "");
        category = catIdToName.get(catId) || catId || "";

        if (team.label) {
          labels = parseLabelsInput(team.label);
        } else if (team.tags) {
          labels = parseLabelsInput(team.tags);
        } else if (team.public_name && team.public_name !== team.name) {
          labels = parseLabelsInput(team.public_name);
        }
      } else if (hasTeam) {
        category = String(item.category || item.team_category || "");
        labels = parseLabelsInput(item.label || item.labels);
      }

      return {
        id,
        username: String(item.username || item.id || ""),
        name: String(item.name || item.username || ""),
        email: item.email || "",
        roles,
        enabled: item.enabled !== false,
        hasTeam,
        team_id: team ? String(team.id) : (item.team_id ? String(item.team_id) : null),
        category,
        labels,
        isNew: false,
        saveResult: null,
      };
    });

    state.originalUsersMap = new Map();
    state.users.forEach((u) => {
      state.originalUsersMap.set(String(u.id), copyUserObject(u));
    });

    state.selectedUserIds.clear();
    state.page = 1;

    populateFilterDropdowns();
    renderUserTable();
    setStatus(`Sucesso! ${state.users.length} usuarios e seus teams/categorias foram carregados.`);
  } catch (err) {
    setStatus(`Erro ao carregar da API: ${err.message}`, true);
  }
}

function getUniqueCategories() {
  const cats = new Set();
  state.users.forEach((u) => {
    if (u.hasTeam && u.category && u.category.trim()) {
      cats.add(u.category.trim());
    }
  });
  return Array.from(cats).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function getUniqueLabels() {
  const lbls = new Set();
  state.users.forEach((u) => {
    if (u.hasTeam && Array.isArray(u.labels)) {
      u.labels.forEach((l) => {
        if (l && l.trim()) lbls.add(l.trim());
      });
    }
  });
  return Array.from(lbls).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function getUniqueRoles() {
  const rls = new Set();
  state.users.forEach((u) => {
    if (Array.isArray(u.roles)) {
      u.roles.forEach((r) => {
        if (r && r.trim()) rls.add(r.trim());
      });
    }
  });
  return Array.from(rls).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function populateFilterDropdowns() {
  const currentCat = els.filterCategory?.value || "all";
  const currentLbl = els.filterLabel?.value || "all";
  const currentRole = els.filterRole?.value || "all";

  if (els.filterCategory) {
    const cats = getUniqueCategories();
    els.filterCategory.innerHTML = `<option value="all">Todas as categorias (${cats.length})</option>` +
      cats.map((c) => `<option value="${sanitize(c)}">${sanitize(c)}</option>`).join("");
    els.filterCategory.value = cats.includes(currentCat) ? currentCat : "all";
  }

  if (els.filterLabel) {
    const lbls = getUniqueLabels();
    els.filterLabel.innerHTML = `<option value="all">Todas as labels (${lbls.length})</option>` +
      lbls.map((l) => `<option value="${sanitize(l)}">${sanitize(l)}</option>`).join("");
    els.filterLabel.value = lbls.includes(currentLbl) ? currentLbl : "all";
  }

  if (els.filterRole) {
    const rls = getUniqueRoles();
    els.filterRole.innerHTML = `<option value="all">Todas as roles (${rls.length})</option>` +
      rls.map((r) => `<option value="${sanitize(r)}">${sanitize(r)}</option>`).join("");
    els.filterRole.value = rls.includes(currentRole) ? currentRole : "all";
  }

  if (els.categoryDataList) {
    const cats = getUniqueCategories();
    els.categoryDataList.innerHTML = cats.map((c) => `<option value="${sanitize(c)}"></option>`).join("");
  }
}

function getFilteredUsers() {
  const q = String(state.filterText || "").trim().toLowerCase();
  const cat = state.filterCategory;
  const lbl = state.filterLabel;
  const role = state.filterRole;
  const enabled = state.filterEnabled;

  return state.users.filter((u) => {
    if (q) {
      const matchName = String(u.name || "").toLowerCase().includes(q);
      const matchUser = String(u.username || "").toLowerCase().includes(q);
      const matchEmail = String(u.email || "").toLowerCase().includes(q);
      const matchId = String(u.id || "").toLowerCase().includes(q);
      if (!matchName && !matchUser && !matchEmail && !matchId) return false;
    }

    if (cat !== "all") {
      if (!u.hasTeam || String(u.category || "").trim() !== cat) return false;
    }

    if (lbl !== "all") {
      if (!u.hasTeam) return false;
      const userLabels = Array.isArray(u.labels) ? u.labels : [];
      if (!userLabels.includes(lbl)) return false;
    }

    if (role !== "all") {
      const userRoles = Array.isArray(u.roles) ? u.roles : [];
      if (!userRoles.includes(role)) return false;
    }

    if (enabled === "enabled" && !u.enabled) return false;
    if (enabled === "disabled" && u.enabled) return false;

    return true;
  });
}

function getSortedUsers(rows) {
  const sorted = rows.slice().sort((a, b) => {
    let valA = a[state.sortKey] ?? "";
    let valB = b[state.sortKey] ?? "";

    if (Array.isArray(valA)) valA = valA.join(", ");
    if (Array.isArray(valB)) valB = valB.join(", ");

    if (typeof valA === "boolean") valA = valA ? 1 : 0;
    if (typeof valB === "boolean") valB = valB ? 1 : 0;

    const cmp = String(valA).localeCompare(String(valB), "pt-BR", { numeric: true });
    return state.sortDir === "asc" ? cmp : -cmp;
  });

  return sorted;
}

function paginateUsers(rows) {
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

function renderUserTable() {
  const filtered = getFilteredUsers();
  const sorted = getSortedUsers(filtered);
  const { items, totalRows, totalPages, startIndex, endIndex } = paginateUsers(sorted);

  // Update scope option label
  if (els.bulkScope) {
    const selectedOpt = els.bulkScope.querySelector('option[value="selected"]');
    if (selectedOpt) {
      selectedOpt.textContent = `Selecionados (${state.selectedUserIds.size})`;
    }
  }

  // Update Changed count
  const changedCount = state.users.filter(isUserChanged).length;
  if (els.saveChangesBtn) {
    els.saveChangesBtn.disabled = changedCount === 0;
  }
  if (els.changedHint) {
    els.changedHint.textContent = changedCount > 0 ? `${changedCount} usuario(s) com alteraçoes pendentes.` : "Nenhuma alteraçao pendente.";
  }

  // Update Pagination Controls
  if (els.prevPageBtn) els.prevPageBtn.disabled = state.page <= 1;
  if (els.nextPageBtn) els.nextPageBtn.disabled = state.page >= totalPages;
  if (els.pageLabel) els.pageLabel.textContent = `Pagina ${state.page} de ${totalPages}`;
  if (els.pageStats) {
    els.pageStats.textContent = totalRows === 0 ? "Mostrando 0 de 0" : `Mostrando ${startIndex}-${endIndex} de ${totalRows}`;
  }

  // Update Select All Checkbox state
  if (els.selectAllCheckbox) {
    const allPageSelected = items.length > 0 && items.every((u) => state.selectedUserIds.has(String(u.id)));
    els.selectAllCheckbox.checked = allPageSelected;
  }

  if (!els.tableBody) return;

  if (items.length === 0) {
    els.tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="manager-empty">Nenhum usuario encontrado com os filtros atuais.</td>
      </tr>
    `;
    return;
  }

  els.tableBody.innerHTML = items
    .map((user) => {
      const isSelected = state.selectedUserIds.has(String(user.id));
      const changed = isUserChanged(user);
      
      const categoryPill = user.hasTeam
        ? (user.category ? `<span class="category-pill">${sanitize(user.category)}</span>` : '<span class="manager-sub">Sem categoria</span>')
        : '<span class="manager-sub" title="Usuário sem Team">Sem Team</span>';
      
      const labelsPills = user.hasTeam
        ? (Array.isArray(user.labels) && user.labels.length > 0
            ? user.labels.map((l) => `<span class="tag-pill">${sanitize(l)}</span>`).join(" ")
            : '<span class="manager-sub">-</span>')
        : '<span class="manager-sub">-</span>';

      const rolesPills = Array.isArray(user.roles) && user.roles.length > 0
        ? user.roles.map((r) => `<span class="role-pill">${sanitize(r)}</span>`).join(" ")
        : '<span class="manager-sub">team</span>';

      const statusBadge = user.enabled
        ? '<span class="badge" style="background:#dcfce7; color:#166534;">Ativo</span>'
        : '<span class="badge dim" style="background:#fee2e2; color:#991b1b;">Inativo</span>';

      return `
        <tr class="${changed ? "changed" : ""}">
          <td class="checkbox-col">
            <input type="checkbox" class="user-select-cb" data-id="${sanitize(user.id)}" ${isSelected ? "checked" : ""} />
          </td>
          <td>
            <strong>${sanitize(user.username)}</strong>
            ${user.isNew ? '<br/><small class="badge" style="font-size:0.68rem; padding:1px 6px;">Novo</small>' : ""}
          </td>
          <td>${sanitize(user.name)}</td>
          <td><small class="manager-sub">${sanitize(user.email || "-")}</small></td>
          <td>${categoryPill}</td>
          <td><div class="tag-list">${labelsPills}</div></td>
          <td><div class="tag-list">${rolesPills}</div></td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            <button type="button" class="badge dim edit-user-btn" data-id="${sanitize(user.id)}">Editar</button>
          </td>
        </tr>
      `;
    })
    .join("");

  // Attach event listeners to row checkboxes and edit buttons
  els.tableBody.querySelectorAll(".user-select-cb").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const id = String(e.target.dataset.id);
      if (e.target.checked) {
        state.selectedUserIds.add(id);
      } else {
        state.selectedUserIds.delete(id);
      }
      renderUserTable();
    });
  });

  els.tableBody.querySelectorAll(".edit-user-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = String(btn.dataset.id);
      openEditModal(id);
    });
  });
}

function applyBulkEdits() {
  const scope = els.bulkScope?.value || "selected";
  let targetUsers = [];

  const filtered = getFilteredUsers();
  const sorted = getSortedUsers(filtered);
  const { items } = paginateUsers(sorted);

  if (scope === "selected") {
    if (state.selectedUserIds.size === 0) {
      setStatus("Nenhum usuario selecionado. Marque as caixas na tabela ou mude o escopo.", true);
      return;
    }
    targetUsers = state.users.filter((u) => state.selectedUserIds.has(String(u.id)));
  } else if (scope === "page") {
    targetUsers = items;
  } else if (scope === "filtered") {
    targetUsers = filtered;
  }

  if (targetUsers.length === 0) {
    setStatus("Nenhum usuario afetado pelas alteraçoes em lote.", true);
    return;
  }

  const newCat = (els.bulkCategory?.value || "").trim();
  const rawLabels = els.bulkLabels?.value || "";
  const parsedLabels = parseLabelsInput(rawLabels);
  const labelsMode = els.bulkLabelsMode?.value || "add";
  const newEnabled = els.bulkEnabled?.value || "keep";

  let modifiedCount = 0;

  targetUsers.forEach((user) => {
    let changed = false;

    // Apply category & labels updates ONLY to users that have a Team
    if (user.hasTeam) {
      if (newCat) {
        user.category = newCat;
        changed = true;
      }

      if (parsedLabels.length > 0 || labelsMode === "replace") {
        let currentLabels = Array.isArray(user.labels) ? [...user.labels] : [];
        if (labelsMode === "add") {
          parsedLabels.forEach((l) => {
            if (!currentLabels.includes(l)) currentLabels.push(l);
          });
        } else if (labelsMode === "replace") {
          currentLabels = [...parsedLabels];
        } else if (labelsMode === "remove") {
          currentLabels = currentLabels.filter((l) => !parsedLabels.includes(l));
        }
        user.labels = currentLabels;
        changed = true;
      }
    }

    // Enabled update applies to all selected users
    if (newEnabled === "enable" && !user.enabled) {
      user.enabled = true;
      changed = true;
    } else if (newEnabled === "disable" && user.enabled) {
      user.enabled = false;
      changed = true;
    }

    if (changed) modifiedCount++;
  });

  populateFilterDropdowns();
  renderUserTable();
  setStatus(`Alteraçoes em lote aplicadas com sucesso em ${modifiedCount} usuario(s). (Usuarios sem Team nao tiveram categoria/labels alteradas)`);
}

async function ensureCategoryId(categoryName) {
  if (!categoryName || !categoryName.trim()) return null;
  const nameTrim = categoryName.trim();
  const lower = nameTrim.toLowerCase();

  if (state.categoriesMap && state.categoriesMap.has(lower)) {
    return state.categoriesMap.get(lower);
  }

  return nameTrim;
}

function didUserFieldsChange(user) {
  if (user.isNew) return true;
  const original = state.originalUsersMap.get(String(user.id));
  if (!original) return false;

  if (user.username !== original.username) return true;
  if (user.name !== original.name) return true;
  if ((user.email || "") !== (original.email || "")) return true;
  if (Boolean(user.enabled) !== Boolean(original.enabled)) return true;
  if (Boolean(user.hasTeam) !== Boolean(original.hasTeam)) return true;
  if (user.password) return true;

  const currentRoles = [...(user.roles || [])].sort().join(",");
  const origRoles = [...(original.roles || [])].sort().join(",");
  if (currentRoles !== origRoles) return true;

  return false;
}

async function saveUserToApi(user) {
  const isNew = Boolean(user.isNew);

  // If user is set to have a Team, ensure Team is saved / created via POST /teams
  if (user.hasTeam) {
    const categoryId = await ensureCategoryId(user.category);
    const teamFormData = new FormData();
    if (user.team_id) {
      teamFormData.append("id", String(user.team_id));
    }
    const teamName = String(user.name || user.username).trim();
    teamFormData.append("name", teamName);
    teamFormData.append("display_name", teamName);

    if (user.labels && user.labels.length > 0) {
      teamFormData.append("label", user.labels.join(", "));
    }
    if (categoryId) {
      teamFormData.append("group_ids[]", String(categoryId));
    }

    try {
      const teamRes = await apiFetch("teams", {
        method: "POST",
        body: teamFormData,
      });
      if (teamRes && teamRes.id) {
        user.team_id = String(teamRes.id);
      }
    } catch (teamErr) {
      console.warn("Aviso ao salvar Team na API via FormData, tentando JSON...", teamErr);
      try {
        const teamPayload = {
          name: teamName,
          display_name: teamName,
        };
        if (user.team_id) teamPayload.id = String(user.team_id);
        if (user.labels && user.labels.length > 0) teamPayload.label = user.labels.join(", ");
        if (categoryId) teamPayload.group_ids = [String(categoryId)];

        const teamResJson = await apiFetch("teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(teamPayload),
        });
        if (teamResJson && teamResJson.id) {
          user.team_id = String(teamResJson.id);
        }
      } catch (e2) {
        console.warn("Nao foi possivel salvar Team na API:", e2);
      }
    }
  }

  // If user is not new AND user fields (username, name, email, roles, etc) didn't change,
  // we only needed to update the Team (which was done above). Skip updating user account.
  if (!isNew && !didUserFieldsChange(user)) {
    return { id: user.id };
  }

  const path = isNew ? "users" : `users/${encodeURIComponent(user.id)}`;
  const rolesArr = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : ["team"];

  // Prepare FormData according to DOMjudge AddUser / UpdateUser schema
  const userFormData = new FormData();
  if (!isNew) {
    userFormData.append("id", String(user.id));
  }
  userFormData.append("username", String(user.username || "").trim());
  userFormData.append("name", String(user.name || user.username).trim());
  userFormData.append("enabled", user.enabled ? "1" : "0");

  if (user.email && String(user.email).trim()) {
    userFormData.append("email", String(user.email).trim());
  }
  if (user.password && String(user.password).trim()) {
    userFormData.append("password", String(user.password).trim());
  }
  if (user.hasTeam && user.team_id) {
    userFormData.append("team_id", String(user.team_id));
  }
  rolesArr.forEach((role) => {
    userFormData.append("roles[]", role);
  });

  try {
    const res = await apiFetch(path, {
      method: isNew ? "POST" : "PUT",
      body: userFormData,
    });
    return res;
  } catch (formErr) {
    console.warn("Falha no envio do usuario com FormData, tentando com JSON...", formErr);

    const baseFields = {
      username: String(user.username || "").trim(),
      name: String(user.name || user.username).trim(),
      enabled: Boolean(user.enabled),
      roles: rolesArr,
    };
    if (!isNew) baseFields.id = String(user.id);
    if (user.email && String(user.email).trim()) baseFields.email = String(user.email).trim();
    if (user.password && String(user.password).trim()) baseFields.password = String(user.password).trim();
    if (user.hasTeam && user.team_id) baseFields.team_id = String(user.team_id);

    try {
      return await apiFetch(path, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseFields),
      });
    } catch (jsonErr) {
      // If updating an existing user and API returns "already exists" or 400,
      // treat as non-fatal warning since user account already exists in DOMjudge.
      if (!isNew && jsonErr.message && (jsonErr.message.includes("already exists") || jsonErr.message.includes("400"))) {
        console.warn(`Aviso de atualizaçao de usuario ${user.username}:`, jsonErr.message);
        return { id: user.id };
      }
      throw jsonErr;
    }
  }
}

async function savePendingChanges() {
  const changedUsers = state.users.filter(isUserChanged);
  if (changedUsers.length === 0) {
    setStatus("Nenhuma alteraçao pendente para salvar.");
    return;
  }

  setStatus(`Salvando ${changedUsers.length} usuario(s) na API...`);

  let successCount = 0;
  let errorMessages = [];

  for (const user of changedUsers) {
    try {
      const res = await saveUserToApi(user);
      if (user.isNew && res && res.id) {
        user.id = String(res.id);
      }
      user.isNew = false;
      delete user.password;
      state.originalUsersMap.set(String(user.id), copyUserObject(user));
      successCount++;
    } catch (err) {
      console.warn(`Erro ao salvar usuario ${user.username}:`, err);
      errorMessages.push(`${user.username}: ${err.message}`);
      state.originalUsersMap.set(String(user.id), copyUserObject(user));
      user.isNew = false;
    }
  }

  populateFilterDropdowns();
  renderUserTable();

  if (errorMessages.length === 0) {
    setStatus(`Sucesso! ${successCount} usuario(s) salvos na API.`);
  } else {
    setStatus(`Processado: ${successCount} salvos na API. Ocorreram erros: ${errorMessages.join("; ")}`, true);
  }
}

function openCreateModal() {
  if (els.createModal) els.createModal.hidden = false;
  switchCreateTab("single");
}

function closeCreateModal() {
  if (els.createModal) els.createModal.hidden = true;
}

function switchCreateTab(tab) {
  if (tab === "single") {
    if (els.tabSingleBtn) els.tabSingleBtn.classList.add("active");
    if (els.tabBatchBtn) els.tabBatchBtn.classList.remove("active");
    if (els.createSingleForm) els.createSingleForm.hidden = false;
    if (els.createBatchContainer) els.createBatchContainer.hidden = true;
  } else {
    if (els.tabBatchBtn) els.tabBatchBtn.classList.add("active");
    if (els.tabSingleBtn) els.tabSingleBtn.classList.remove("active");
    if (els.createSingleForm) els.createSingleForm.hidden = true;
    if (els.createBatchContainer) els.createBatchContainer.hidden = false;
  }
}

function handleCreateSingleSubmit(e) {
  e.preventDefault();

  const username = (document.getElementById("createUsername")?.value || "").trim();
  const name = (document.getElementById("createName")?.value || "").trim();
  const email = (document.getElementById("createEmail")?.value || "").trim();
  const password = document.getElementById("createPassword")?.value || "";
  const hasTeam = document.getElementById("createHasTeam")?.checked ?? true;
  const category = (document.getElementById("createCategory")?.value || "").trim();
  const rawLabels = document.getElementById("createLabels")?.value || "";
  const enabled = document.getElementById("createEnabled")?.checked ?? true;

  const roleCbs = Array.from(document.querySelectorAll('input[name="createRoles"]:checked'));
  const roles = roleCbs.map((cb) => cb.value);

  if (!username || !name || !password) {
    alert("Preencha Username, Nome e Senha.");
    return;
  }

  const newId = `new_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const newUser = {
    id: newId,
    username,
    name,
    email,
    password,
    hasTeam,
    team_id: null,
    category: hasTeam ? category : "",
    labels: hasTeam ? parseLabelsInput(rawLabels) : [],
    roles: roles.length ? roles : ["team"],
    enabled,
    isNew: true,
  };

  state.users.unshift(newUser);
  populateFilterDropdowns();
  renderUserTable();
  closeCreateModal();
  setStatus(`Usuario "${username}" criado com sucesso! Lembre de salvar alteraçoes.`);

  // Reset form
  els.createSingleForm?.reset();
}

function handleProcessBatch() {
  const text = els.batchInputText?.value || "";
  if (!text.trim()) {
    if (els.batchFeedback) els.batchFeedback.textContent = "Digite ou cole a lista de usuarios.";
    return;
  }

  const hasTeam = document.getElementById("batchHasTeam")?.checked ?? true;
  const defaultCat = (els.batchDefaultCategory?.value || "").trim();
  const defaultLabels = parseLabelsInput(els.batchDefaultLabels?.value || "");

  const lines = text.split("\n");
  let createdCount = 0;

  lines.forEach((line) => {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith("#")) return;

    const parts = cleaned.split(/,|\t/).map((p) => p.trim());
    if (parts.length < 2) return;

    const username = parts[0];
    const name = parts[1] || username;
    const email = parts[2] || "";
    const password = parts[3] || "123456";
    const category = parts[4] || defaultCat;
    
    let labels = parts[5] ? parseLabelsInput(parts[5]) : defaultLabels;

    const newId = `new_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    state.users.unshift({
      id: newId,
      username,
      name,
      email,
      password,
      hasTeam,
      team_id: null,
      category: hasTeam ? category : "",
      labels: hasTeam ? labels : [],
      roles: ["team"],
      enabled: true,
      isNew: true,
    });

    createdCount++;
  });

  if (createdCount > 0) {
    populateFilterDropdowns();
    renderUserTable();
    closeCreateModal();
    if (els.batchInputText) els.batchInputText.value = "";
    setStatus(`${createdCount} usuario(s) criados em lote com sucesso!`);
  } else {
    if (els.batchFeedback) els.batchFeedback.textContent = "Nenhuma linha valida identificada. Verifique o formato.";
  }
}

function openEditModal(userId) {
  const user = state.users.find((u) => String(u.id) === String(userId));
  if (!user) return;

  if (els.editUserTitle) els.editUserTitle.textContent = user.username;
  document.getElementById("editUserId").value = user.id;
  document.getElementById("editUsername").value = user.username;
  document.getElementById("editName").value = user.name;
  document.getElementById("editEmail").value = user.email || "";
  document.getElementById("editPassword").value = "";
  
  const editHasTeamCb = document.getElementById("editHasTeam");
  if (editHasTeamCb) editHasTeamCb.checked = Boolean(user.hasTeam);

  const editCatInput = document.getElementById("editCategory");
  const editLblInput = document.getElementById("editLabels");

  if (editCatInput) {
    editCatInput.value = user.category || "";
    editCatInput.disabled = !user.hasTeam;
  }
  if (editLblInput) {
    editLblInput.value = formatLabelsString(user.labels);
    editLblInput.disabled = !user.hasTeam;
  }

  document.getElementById("editEnabled").checked = user.enabled;

  const roleCbs = document.querySelectorAll('input[name="editRoles"]');
  roleCbs.forEach((cb) => {
    cb.checked = Array.isArray(user.roles) && user.roles.includes(cb.value);
  });

  if (els.editModal) els.editModal.hidden = false;
}

function closeEditModal() {
  if (els.editModal) els.editModal.hidden = true;
}

function handleEditSingleSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("editUserId")?.value;
  const user = state.users.find((u) => String(u.id) === String(id));
  if (!user) return;

  user.username = (document.getElementById("editUsername")?.value || "").trim();
  user.name = (document.getElementById("editName")?.value || "").trim();
  user.email = (document.getElementById("editEmail")?.value || "").trim();
  
  const pass = document.getElementById("editPassword")?.value || "";
  if (pass) user.password = pass;

  const hasTeam = document.getElementById("editHasTeam")?.checked ?? true;
  user.hasTeam = hasTeam;

  if (hasTeam) {
    user.category = (document.getElementById("editCategory")?.value || "").trim();
    user.labels = parseLabelsInput(document.getElementById("editLabels")?.value || "");
  } else {
    user.category = "";
    user.labels = [];
  }

  user.enabled = document.getElementById("editEnabled")?.checked ?? true;

  const roleCbs = Array.from(document.querySelectorAll('input[name="editRoles"]:checked'));
  user.roles = roleCbs.map((cb) => cb.value);

  populateFilterDropdowns();
  renderUserTable();
  closeEditModal();
  setStatus(`Usuario "${user.username}" atualizado!`);
}

function exportUsersCsv() {
  const filtered = getFilteredUsers();
  if (filtered.length === 0) {
    setStatus("Nenhum usuario para exportar.", true);
    return;
  }

  const header = ["ID", "Username", "Name", "Email", "HasTeam", "Category", "Labels", "Roles", "Enabled"];
  const rows = filtered.map((u) => [
    `"${String(u.id).replace(/"/g, '""')}"`,
    `"${String(u.username).replace(/"/g, '""')}"`,
    `"${String(u.name).replace(/"/g, '""')}"`,
    `"${String(u.email || "").replace(/"/g, '""')}"`,
    u.hasTeam ? "true" : "false",
    `"${String(u.category || "").replace(/"/g, '""')}"`,
    `"${formatLabelsString(u.labels).replace(/"/g, '""')}"`,
    `"${(u.roles || []).join(", ").replace(/"/g, '""')}"`,
    u.enabled ? "true" : "false",
  ]);

  const csvContent = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "usuarios_domjudge.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  setStatus(`Exportados ${filtered.length} usuarios para CSV.`);
}

// Event Listeners Initialization
function initEventListeners() {
  els.loadUsersBtn?.addEventListener("click", loadUsersFromApi);
  els.loadDemoUsersBtn?.addEventListener("click", generateDemoUsers);

  // Filter Listeners
  els.filterText?.addEventListener("input", () => {
    state.filterText = els.filterText.value;
    state.page = 1;
    renderUserTable();
  });

  els.filterCategory?.addEventListener("change", () => {
    state.filterCategory = els.filterCategory.value;
    state.page = 1;
    renderUserTable();
  });

  els.filterLabel?.addEventListener("change", () => {
    state.filterLabel = els.filterLabel.value;
    state.page = 1;
    renderUserTable();
  });

  els.filterRole?.addEventListener("change", () => {
    state.filterRole = els.filterRole.value;
    state.page = 1;
    renderUserTable();
  });

  els.filterEnabled?.addEventListener("change", () => {
    state.filterEnabled = els.filterEnabled.value;
    state.page = 1;
    renderUserTable();
  });

  // Checkbox field toggles for Team inputs
  els.createHasTeam?.addEventListener("change", (e) => {
    const checked = e.target.checked;
    if (els.createCategory) els.createCategory.disabled = !checked;
    if (els.createLabels) els.createLabels.disabled = !checked;
  });

  els.editHasTeam?.addEventListener("change", (e) => {
    const checked = e.target.checked;
    if (els.editCategory) els.editCategory.disabled = !checked;
    if (els.editLabels) els.editLabels.disabled = !checked;
  });

  // Table Sort Header Listeners
  document.querySelectorAll(".manager-sort").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = "asc";
      }
      renderUserTable();
    });
  });

  // Select All Checkbox
  els.selectAllCheckbox?.addEventListener("change", (e) => {
    const filtered = getFilteredUsers();
    const sorted = getSortedUsers(filtered);
    const { items } = paginateUsers(sorted);

    if (e.target.checked) {
      items.forEach((u) => state.selectedUserIds.add(String(u.id)));
    } else {
      items.forEach((u) => state.selectedUserIds.delete(String(u.id)));
    }
    renderUserTable();
  });

  // Bulk Actions
  els.applyBulkBtn?.addEventListener("click", applyBulkEdits);
  els.saveChangesBtn?.addEventListener("click", savePendingChanges);
  els.exportUsersCsvBtn?.addEventListener("click", exportUsersCsv);

  // Pagination
  els.pageSize?.addEventListener("change", () => {
    state.pageSize = Number(els.pageSize.value) || 15;
    state.page = 1;
    renderUserTable();
  });

  els.prevPageBtn?.addEventListener("click", () => {
    if (state.page > 1) {
      state.page--;
      renderUserTable();
    }
  });

  els.nextPageBtn?.addEventListener("click", () => {
    state.page++;
    renderUserTable();
  });

  // Create Modal Events
  els.openCreateModalBtn?.addEventListener("click", openCreateModal);
  els.closeCreateModalBtn?.addEventListener("click", closeCreateModal);
  els.cancelCreateSingleBtn?.addEventListener("click", closeCreateModal);
  els.cancelCreateBatchBtn?.addEventListener("click", closeCreateModal);

  els.tabSingleBtn?.addEventListener("click", () => switchCreateTab("single"));
  els.tabBatchBtn?.addEventListener("click", () => switchCreateTab("batch"));

  els.createSingleForm?.addEventListener("submit", handleCreateSingleSubmit);
  els.processBatchBtn?.addEventListener("click", handleProcessBatch);

  // Edit Modal Events
  els.closeEditModalBtn?.addEventListener("click", closeEditModal);
  els.cancelEditModalBtn?.addEventListener("click", closeEditModal);
  els.editSingleForm?.addEventListener("submit", handleEditSingleSubmit);
}

// Initial Kickoff
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  generateDemoUsers();
});
