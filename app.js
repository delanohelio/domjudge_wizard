// ============================================================================
// DOMJUDGE WIZARD - SPA CONTROLLER, AUTH GATE & REVIEW MODULE
// ============================================================================

const envConfig = window.__ENV__ || {};
const STORAGE_SESSION_KEY = "domjudge_wizard_auth";
const EXPIRATION_DAYS = parseInt(envConfig.STORAGE_EXPIRATION_DAYS, 10) || 7; // Parametrizado: padrão 7 dias ou via .env

const globalState = {
  apiBase: envConfig.DOMJUDGE_API_BASE || "https://coderunner.cin.ufpe.br/api/v4",
  apiUser: envConfig.DOMJUDGE_API_USER || "",
  apiPassword: envConfig.DOMJUDGE_API_PASSWORD || "",
  isAuthenticated: false,
  activeTab: "review",
  contests: [],
  view: "question",
  selectedContestIds: [],
  selectedProblemIds: ["all"],
  selectedTeamKey: null,
  filterProblemIds: ["all"],
  filterTeamKey: "all",
  filterStatusIds: ["all"],
  stepIndex: 0,
  apiSourceCache: {},
};

// ============================================================================
// SISTEMA GLOBAL DE NOTIFICAÇÕES (TOASTS)
// ============================================================================
window.showToast = function (message, type = "info", duration = 4000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  toast.innerHTML = `
    <span>${iconMap[type] || "ℹ️"}</span>
    <div style="flex: 1; line-height: 1.3;">${String(message).replace(/[<>]/g, "")}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px) scale(0.95)";
    setTimeout(() => toast.remove(), 250);
  }, duration);
};

// ============================================================================
// GESTÃO DE SESSÃO & CREDENCIAIS DA API
// ============================================================================
window.getApiCredentials = function () {
  return {
    apiBase: normalizeApiBase(globalState.apiBase),
    user: globalState.apiUser,
    password: globalState.apiPassword,
    isAuthenticated: globalState.isAuthenticated,
  };
};

function normalizeApiBase(url) {
  const cleaned = String(url || "").trim().replace(/\/+$/, "");
  if (cleaned.endsWith("/api/v4") || cleaned.endsWith("/api")) return cleaned;
  return `${cleaned}/api/v4`;
}

function buildBasicAuthHeader(user, password) {
  return `Basic ${btoa(`${user}:${password}`)}`;
}

function saveStoredSession(apiBase, user, password, remember = true) {
  const sessionData = {
    apiBase,
    user,
    password,
    savedAt: Date.now(),
    expiresAt: Date.now() + EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
  };

  if (remember) {
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.warn("Falha ao salvar no localStorage:", e);
    }
  } else {
    try {
      sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
      localStorage.removeItem(STORAGE_SESSION_KEY);
    } catch (e) {
      console.warn("Falha ao salvar no sessionStorage:", e);
    }
  }
}

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY) || sessionStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (data.expiresAt && Date.now() > data.expiresAt) {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
      return null;
    }

    return data;
  } catch (e) {
    return null;
  }
}

window.handleApiUnauthorized = function (detail) {
  console.warn("API retornou HTTP 401 (Não autorizado). Solicitando novas credenciais para gerar novo token...", detail);
  globalState.isAuthenticated = false;
  updateSessionBar();

  const feedback = document.getElementById("authStatusFeedback");
  if (feedback) {
    feedback.textContent = "Sessão expirada ou não autorizada (HTTP 401). Informe usuário e senha para gerar um novo token.";
    feedback.style.color = "var(--danger)";
  }

  const pwd = document.getElementById("authApiPassword");
  if (pwd) pwd.value = "";

  showAuthGate(true);
  if (pwd) pwd.focus();

  if (typeof window.showToast === "function") {
    window.showToast("Sessão da API expirada (HTTP 401). Informe as credenciais para gerar um novo token.", "warning");
  }
};

function clearStoredSession() {
  localStorage.removeItem(STORAGE_SESSION_KEY);
  sessionStorage.removeItem(STORAGE_SESSION_KEY);
  globalState.isAuthenticated = false;
  globalState.apiUser = "";
  globalState.apiPassword = "";
  updateSessionBar();
  showAuthGate(true);
}

function updateSessionBar() {
  const userLabel = document.getElementById("sessionUserLabel");
  const sessionDot = document.getElementById("sessionDot");

  if (userLabel) {
    userLabel.textContent = globalState.isAuthenticated
      ? `${globalState.apiUser || "API"} (${globalState.apiBase.replace(/^https?:\/\//, "").split("/")[0]})`
      : "Desconectado";
  }

  if (sessionDot) {
    sessionDot.className = globalState.isAuthenticated ? "status-dot" : "status-dot disconnected";
  }
}

function showAuthGate(show = true) {
  const gate = document.getElementById("authGate");
  if (gate) {
    gate.hidden = !show;
  }
}

async function validateApiCredentials(apiBase, user, password) {
  const url = `${normalizeApiBase(apiBase)}/user`;
  const headers = {
    Accept: "application/json",
  };
  if (user && password) {
    headers["Authorization"] = buildBasicAuthHeader(user, password);
  }

  const res = await fetch(url, { headers });
  if (res.status === 401 || res.status === 403) {
    throw new Error("Usuário ou senha inválidos no DOMjudge.");
  }
  if (!res.ok && res.status !== 404) {
    // Tentar /contests como fallback se /user não existir
    const contestsRes = await fetch(`${normalizeApiBase(apiBase)}/contests`, { headers });
    if (!contestsRes.ok) {
      throw new Error(`Erro de conexão com o DOMjudge (HTTP ${res.status}).`);
    }
  }
  return true;
}

// ============================================================================
// ROTEADOR SPA & GESTÃO DE ABAS
// ============================================================================
function switchTab(tabId, pushHash = true) {
  globalState.activeTab = tabId;

  // Atualizar botões da Navbar
  document.querySelectorAll(".app-tab-btn").forEach((btn) => {
    const isTarget = btn.getAttribute("data-tab") === tabId;
    btn.classList.toggle("active", isTarget);
    btn.setAttribute("aria-selected", isTarget ? "true" : "false");
  });

  // Alternar contêineres de view
  document.querySelectorAll(".spa-view").forEach((view) => {
    view.classList.toggle("active", view.id === `view-${tabId}`);
  });

  if (pushHash && window.location.hash !== `#${tabId}`) {
    window.location.hash = `#${tabId}`;
  }

  // Ações ao entrar em cada aba
  if (tabId === "contests" && window.ContestManagerModule) {
    window.ContestManagerModule.loadContests();
  } else if (tabId === "users" && window.UsersModule) {
    if (window.UsersModule.loadCategories) {
      window.UsersModule.loadCategories();
    }
    window.UsersModule.loadUsers();
  } else if (tabId === "review" && globalState.contests.length === 0) {
    loadReviewDataFromApi();
  }
}

function handleHashChange() {
  const hash = window.location.hash.replace(/^#/, "");
  const validTabs = ["review", "creator", "contests", "users"];
  if (validTabs.includes(hash)) {
    switchTab(hash, false);
  } else {
    switchTab("review", false);
  }
}

// ============================================================================
// MÓDULO 1: VISUALIZAÇÃO E REVIEW DE SUBMISSÕES
// ============================================================================
const els = {
  reloadSubmissionsBtn: document.getElementById("reloadSubmissionsBtn"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  saveDatasetBtn: document.getElementById("saveDatasetBtn"),
  reviewStatusMessage: document.getElementById("reviewStatusMessage"),
  results: document.getElementById("results"),
  contestSelect: document.getElementById("contestSelect"),
  problemSelect: document.getElementById("problemSelect"),
  teamSelect: document.getElementById("teamSelect"),
  statusSelect: document.getElementById("statusSelect"),
  filterProblemSelect: document.getElementById("filterProblemSelect"),
  filterTeamSelect: document.getElementById("filterTeamSelect"),
  viewButtons: Array.from(document.querySelectorAll(".review-subnav-btn")),
  controls: Array.from(document.querySelectorAll(".control-item")),
};

const viewControlMap = {
  question: ["contest", "problem", "status"],
  student: ["team", "status"],
  contest: ["contest", "filterProblem", "filterTeam", "status"],
  step: ["contest", "problem", "status"],
  summary: ["contest", "problem", "status"],
};

function setReviewStatus(message, isError = false) {
  if (els.reviewStatusMessage) {
    els.reviewStatusMessage.textContent = message;
    els.reviewStatusMessage.style.color = isError ? "var(--danger)" : "var(--ink-secondary)";
  }
}

function sanitize(text) {
  return String(text ?? "").replace(/[<>]/g, "");
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function getSubmissionStatus(submission) {
  return normalizeStatus(submission.judgement_label || submission.status || "pending");
}

function isAccepted(submission) {
  const status = normalizeStatus(submission.status);
  const label = normalizeStatus(submission.judgement_label);
  return (
    status === "ac" ||
    status === "accepted" ||
    status === "correct" ||
    label.includes("accepted") ||
    label.includes("correct")
  );
}

function submissionTimeKey(submission) {
  return (
    submission.time ||
    submission.submission_time ||
    submission.submit_time ||
    submission.start_time ||
    submission.end_time ||
    submission.id ||
    0
  );
}

function sortSubmissions(submissions) {
  return submissions.slice().sort((a, b) => {
    const acceptedDiff = Number(isAccepted(b)) - Number(isAccepted(a));
    if (acceptedDiff !== 0) return acceptedDiff;
    const timeA = submissionTimeKey(a);
    const timeB = submissionTimeKey(b);
    if (timeA === timeB) return 0;
    return timeA > timeB ? 1 : -1;
  });
}

function teamSortKey(team) {
  return sanitize(team.name || team.id || "").toLowerCase();
}

function sortedTeams(contest) {
  return contest.teams.slice().sort((a, b) => teamSortKey(a).localeCompare(teamSortKey(b), "pt-BR"));
}

function formatContestLabel(contest) {
  const name = contest.meta.shortname || contest.meta.name || contest.meta.id;
  return `${name} (${contest.meta.id || contest.meta.cid || ""})`;
}

function contestTeamKey(contestId, teamId) {
  return `${contestId}::${teamId}`;
}

function contestProblemKey(contestId, problemId) {
  return `${contestId}::${problemId}`;
}

function getContestById(id) {
  const target = String(id);
  return globalState.contests.find(
    (contest) => String(contest.meta.id) === target || String(contest.meta.cid) === target
  );
}

function getSelectedValues(selectEl) {
  return Array.from(selectEl.selectedOptions).map((opt) => opt.value).filter(Boolean);
}

function getSelectedContests() {
  if (!globalState.selectedContestIds.length) return globalState.contests;
  return globalState.selectedContestIds.map((id) => getContestById(id)).filter(Boolean);
}

function getProblemLabel(problem) {
  return problem.shortname || problem.name || problem.id || "Questão";
}

function filterByStatus(submissions) {
  if (globalState.filterStatusIds.includes("all")) return submissions;
  return submissions.filter((s) => globalState.filterStatusIds.includes(getSubmissionStatus(s)));
}

function shouldIncludeByStatus(originalSubmissions, filteredSubmissions) {
  if (globalState.filterStatusIds.includes("all")) return true;
  if (!originalSubmissions.length) return globalState.filterStatusIds.includes("not_submitted");
  return filteredSubmissions.length > 0;
}

function finalSubmission(submissions) {
  const ordered = sortSubmissions(submissions);
  return ordered[0] || null;
}

function decodeSourceContent(value) {
  const text = String(value ?? "");
  const trimmed = text.trim();
  if (!trimmed) return text;

  let candidate = trimmed;
  const dataUriMatch = candidate.match(/^data:[^,]*;base64,(.*)$/i);
  let forceBase64 = false;
  if (dataUriMatch) {
    candidate = dataUriMatch[1];
    forceBase64 = true;
  }

  candidate = candidate.replace(/[\r\n\t\s]+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!candidate) return text;

  const mod = candidate.length % 4;
  if (mod !== 0) candidate = candidate.padEnd(candidate.length + (4 - mod), "=");

  const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(candidate);
  if (!looksBase64 && !forceBase64) return text;

  try {
    const binary = atob(candidate);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (_utf8Error) {
      return binary;
    }
  } catch (_error) {
    return text;
  }
}

function parseSourcePayload(payload) {
  let items = [];
  if (Array.isArray(payload)) {
    items = payload.filter((entry) => entry && typeof entry === "object");
  } else if (payload && typeof payload === "object") {
    if (Array.isArray(payload.files)) items = payload.files.filter((e) => e && typeof e === "object");
    else if (Array.isArray(payload.source)) items = payload.source.filter((e) => e && typeof e === "object");
  }

  return items.map((entry) => {
    const filename = String(entry.filename || entry.name || "source.txt");
    const rawCode = entry?.source ?? entry?.content ?? entry?.data ?? entry?.code ?? entry?.text ?? "";
    const source = decodeSourceContent(rawCode);
    return { filename, source };
  });
}

async function fetchApiJson(path) {
  const creds = window.getApiCredentials();
  if (!creds || !creds.apiBase) {
    throw new Error("Sessão da API não disponível.");
  }

  const headers = { Accept: "application/json" };
  if (creds.user && creds.password) {
    headers["Authorization"] = buildBasicAuthHeader(creds.user, creds.password);
  }

  const res = await fetch(`${creds.apiBase}/${path.replace(/^\/+/, "")}`, { headers });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      if (typeof window.handleApiUnauthorized === "function") {
        window.handleApiUnauthorized(new Error(`API HTTP ${res.status}: Sessão expirada.`));
      }
    }
    const text = await res.text().catch(() => "");
    throw new Error(`Falha API (${res.status}): ${text || res.statusText}`);
  }

  const raw = await res.text();
  return raw.trim() ? JSON.parse(raw) : null;
}

async function fetchSourceCode(contest, submission, file) {
  const contestId = contest.meta.id || contest.meta.cid;
  const cacheKey = `${contestId}::${submission.id}`;
  let files = globalState.apiSourceCache[cacheKey];

  if (!files) {
    const payload = await fetchApiJson(
      `contests/${encodeURIComponent(contestId)}/submissions/${encodeURIComponent(submission.id)}/source-code`
    );
    files = parseSourcePayload(payload);
    globalState.apiSourceCache[cacheKey] = files;
  }

  const fileEntry = files.find((entry) => entry.filename === file) || files[0];
  if (!fileEntry) throw new Error("Arquivo de código não encontrado na API.");
  return fileEntry.source;
}

function buildSubmissionElement(contest, submission) {
  const container = document.createElement("div");
  const accepted = isAccepted(submission);
  container.className = `submission-card ${accepted ? "accepted" : ""}`;

  const statusLabel = submission.judgement_label || submission.status || "pending";
  const metaTime = submissionTimeKey(submission);
  const lang = submission.language_id || submission.language || "code";

  const badgeClass = accepted ? "badge-ac" : (statusLabel.toLowerCase().includes("wrong") ? "badge-wa" : "badge-dim");

  container.innerHTML = `
    <div class="submission-head">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="badge ${badgeClass}">${sanitize(statusLabel)}</span>
        ${accepted ? '<span class="pill pill-role">⭐ Solução Aceita</span>' : ""}
      </div>
      <div class="submission-meta">
        <span class="pill">${sanitize(lang)}</span>
        <span>🕒 ${sanitize(metaTime)}</span>
        <span>ID: ${sanitize(submission.id)}</span>
      </div>
    </div>
    <div class="file-list" style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;"></div>
    <div class="code-viewer-container" hidden>
      <div class="code-viewer-toolbar">
        <div class="file-info">
          <span>📄</span>
          <strong class="code-file-name">source.cpp</strong>
        </div>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn-sm dim copy-code-btn">📋 Copiar</button>
          <button type="button" class="btn-sm dim close-code-btn">✕ Fechar</button>
        </div>
      </div>
      <div class="code-viewer-body">
        <pre><code class="language-cpp"></code></pre>
      </div>
    </div>
  `;

  const fileList = container.querySelector(".file-list");
  const codeViewer = container.querySelector(".code-viewer-container");
  const codeEl = container.querySelector("code");
  const fileNameEl = container.querySelector(".code-file-name");
  const closeBtn = container.querySelector(".close-code-btn");
  const copyBtn = container.querySelector(".copy-code-btn");

  closeBtn.addEventListener("click", () => {
    codeViewer.hidden = true;
    codeEl.textContent = "";
  });

  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(codeEl.textContent).then(() => {
      showToast("Código copiado para a área de transferência!", "success");
    });
  });

  const files = Array.isArray(submission.source_files) ? submission.source_files : ["source.cpp"];

  files.forEach((file) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `💻 Ver ${file}`;
    button.className = "dim btn-sm";
    button.addEventListener("click", async () => {
      codeViewer.hidden = false;
      fileNameEl.textContent = file;
      codeEl.textContent = "Carregando código da API...";
      try {
        const text = await fetchSourceCode(contest, submission, file);
        codeEl.textContent = decodeSourceContent(text);
        if (window.hljs) {
          window.hljs.highlightElement(codeEl);
        }
      } catch (error) {
        codeEl.textContent = `Erro ao carregar código: ${error.message}`;
      }
    });
    fileList.appendChild(button);
  });

  return container;
}

function buildTeamCard(contest, team, problem, submissions) {
  const card = document.createElement("article");
  card.className = "card";

  const ordered = sortSubmissions(submissions);
  const first = ordered[0];

  card.innerHTML = `
    <div class="card-header" style="margin-bottom: 12px;">
      <div>
        <h3 class="card-title">${sanitize(team.name || team.id)}</h3>
        <p class="form-hint" style="font-size: 0.82rem;">${sanitize(formatContestLabel(contest))} · <strong>${sanitize(getProblemLabel(problem))}</strong></p>
      </div>
      <div>
        <span class="pill pill-category">${submissions.length} envio(s)</span>
      </div>
    </div>
    <div class="submissions-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
  `;

  const submissionsEl = card.querySelector(".submissions-list");
  if (first) {
    submissionsEl.appendChild(buildSubmissionElement(contest, first));
  } else {
    const empty = document.createElement("div");
    empty.className = "submission-card";
    empty.innerHTML = `
      <div class="submission-head">
        <div><strong>Não submetido</strong></div>
        <div class="submission-meta"><span class="badge badge-dim">Sem envios</span></div>
      </div>
    `;
    submissionsEl.appendChild(empty);
  }

  if (ordered.length > 1) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = `👁️ Ver mais ${ordered.length - 1} submissão(ões) anteriores`;
    toggle.className = "dim btn-sm";
    toggle.style.marginTop = "8px";
    let expanded = false;

    toggle.addEventListener("click", () => {
      expanded = !expanded;
      if (expanded) {
        toggle.textContent = "▲ Ocultar submissões anteriores";
        ordered.slice(1).forEach((entry) => submissionsEl.appendChild(buildSubmissionElement(contest, entry)));
      } else {
        toggle.textContent = `👁️ Ver mais ${ordered.length - 1} submissão(ões) anteriores`;
        submissionsEl.querySelectorAll(".submission-card").forEach((el, idx) => {
          if (idx > 0) el.remove();
        });
      }
    });
    submissionsEl.appendChild(toggle);
  }

  return card;
}

function buildSubmissionIndex(contest) {
  const index = {};
  contest.submissions.forEach((submission) => {
    const teamId = String(submission.team_id ?? "");
    const problemId = String(submission.problem_id ?? "");
    if (!teamId || !problemId) return;
    const key = `${teamId}::${problemId}`;
    if (!index[key]) index[key] = [];
    index[key].push(submission);
  });
  return index;
}

function collectRows() {
  const rows = [];
  const selectedContests = getSelectedContests();
  const allProblems = globalState.selectedProblemIds.includes("all");

  selectedContests.forEach((contest) => {
    const contestId = contest.meta.id || contest.meta.cid;
    const problems = contest.problems.filter((problem) => {
      if (allProblems) return true;
      return globalState.selectedProblemIds.includes(contestProblemKey(contestId, String(problem.id)));
    });

    problems.forEach((problem) => {
      sortedTeams(contest).forEach((team) => {
        if (
          globalState.view === "contest" &&
          globalState.filterTeamKey !== "all" &&
          String(team.id) !== globalState.filterTeamKey
        )
          return;
        if (
          globalState.view === "contest" &&
          !globalState.filterProblemIds.includes("all") &&
          !globalState.filterProblemIds.includes(contestProblemKey(contestId, String(problem.id)))
        )
          return;

        const key = `${team.id}::${problem.id}`;
        const originalSubmissions = contest.submissionIndex[key] || [];
        const submissions = filterByStatus(originalSubmissions);
        if (!shouldIncludeByStatus(originalSubmissions, submissions)) return;
        rows.push({ contest, team, problem, submissions });
      });
    });
  });

  rows.sort((a, b) => {
    const byTeam = teamSortKey(a.team).localeCompare(teamSortKey(b.team), "pt-BR");
    if (byTeam !== 0) return byTeam;
    const byContest = formatContestLabel(a.contest).localeCompare(formatContestLabel(b.contest), "pt-BR");
    if (byContest !== 0) return byContest;
    return getProblemLabel(a.problem).localeCompare(getProblemLabel(b.problem), "pt-BR");
  });

  return rows;
}

function renderQuestionView() {
  const rows = collectRows();
  setReviewStatus(`${rows.length} combinação(ões) de questão/estudante.`);
  els.results.replaceChildren(
    ...rows.map((row) => buildTeamCard(row.contest, row.team, row.problem, row.submissions))
  );
}

function renderStudentView() {
  const contestTeam = globalState.selectedTeamKey || "";
  const [contestId, teamId] = contestTeam.split("::");
  const contest = getContestById(contestId);
  if (!contest || !teamId) {
    setReviewStatus("Selecione um estudante no menu acima.");
    els.results.replaceChildren();
    return;
  }

  const team = contest.teams.find((entry) => String(entry.id) === teamId);
  if (!team) {
    setReviewStatus("Estudante não encontrado.");
    els.results.replaceChildren();
    return;
  }

  const cards = [];
  contest.problems.forEach((problem) => {
    const key = `${team.id}::${problem.id}`;
    const originalSubmissions = contest.submissionIndex[key] || [];
    const submissions = filterByStatus(originalSubmissions);
    if (!shouldIncludeByStatus(originalSubmissions, submissions)) return;
    cards.push(buildTeamCard(contest, team, problem, submissions));
  });

  setReviewStatus(`${cards.length} questão(ões) para ${team.name || team.id}.`);
  els.results.replaceChildren(...cards);
}

function renderContestView() {
  const rows = collectRows();
  setReviewStatus(`${rows.length} combinação(ões) de questão/team.`);
  els.results.replaceChildren(
    ...rows.map((row) => buildTeamCard(row.contest, row.team, row.problem, row.submissions))
  );
}

function renderStepView() {
  const rows = collectRows();
  if (!rows.length) {
    setReviewStatus("Nenhuma submissão corresponde aos filtros atuais.");
    els.results.replaceChildren();
    return;
  }

  if (globalState.stepIndex >= rows.length) globalState.stepIndex = rows.length - 1;
  if (globalState.stepIndex < 0) globalState.stepIndex = 0;

  const nav = document.createElement("div");
  nav.className = "step-navbar";
  nav.innerHTML = `
    <div class="step-info">
      <span class="step-counter">${globalState.stepIndex + 1} / ${rows.length}</span>
      <span class="step-keyboard-hint">Navegue com as setas <kbd>←</kbd> e <kbd>→</kbd></span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button type="button" class="dim btn-sm" id="prevStepBtn" ${globalState.stepIndex <= 0 ? "disabled" : ""}>◀ Anterior</button>
      <button type="button" class="primary btn-sm" id="nextStepBtn" ${globalState.stepIndex >= rows.length - 1 ? "disabled" : ""}>Próximo ▶</button>
    </div>
  `;

  nav.querySelector("#prevStepBtn").addEventListener("click", () => {
    globalState.stepIndex = Math.max(0, globalState.stepIndex - 1);
    renderStepView();
  });
  nav.querySelector("#nextStepBtn").addEventListener("click", () => {
    globalState.stepIndex = Math.min(rows.length - 1, globalState.stepIndex + 1);
    renderStepView();
  });

  const row = rows[globalState.stepIndex];
  const card = buildTeamCard(row.contest, row.team, row.problem, row.submissions);
  setReviewStatus("Modo Aluno por Vez: navegação focada estudante a estudante.");
  els.results.replaceChildren(nav, card);
}

function renderSummaryView() {
  const rows = collectRows();
  const list = document.createElement("div");
  list.className = "results-grid";

  rows.forEach((row) => {
    const final = finalSubmission(row.submissions);
    const accepted = final ? isAccepted(final) : false;
    const item = document.createElement("article");
    item.className = `submission-card ${accepted ? "accepted" : ""}`;
    item.innerHTML = `
      <div class="submission-head">
        <div>
          <strong style="font-size: 1rem;">${sanitize(row.team.name || row.team.id)}</strong>
          <div class="form-hint">${sanitize(formatContestLabel(row.contest))} · ${sanitize(getProblemLabel(row.problem))}</div>
        </div>
        <span class="badge ${accepted ? "badge-ac" : "badge-dim"}">${accepted ? "ACCEPTED" : sanitize(final?.judgement_label || final?.status || "NÃO SUBMETIDO")}</span>
      </div>
    `;
    list.appendChild(item);
  });

  setReviewStatus(`${list.children.length} resumo(s) de resposta final.`);
  els.results.replaceChildren(list);
}

function renderView() {
  if (globalState.view === "question") return renderQuestionView();
  if (globalState.view === "student") return renderStudentView();
  if (globalState.view === "contest") return renderContestView();
  if (globalState.view === "step") return renderStepView();
  return renderSummaryView();
}

function updateControlsVisibility() {
  els.controls.forEach((control) => {
    const key = control.dataset.control;
    control.style.display = (viewControlMap[globalState.view] || []).includes(key) ? "flex" : "none";
  });
}

function updateDropdowns() {
  // Contests
  els.contestSelect.innerHTML = globalState.contests
    .map((c) => `<option value="${sanitize(c.meta.id || c.meta.cid)}" selected>${sanitize(formatContestLabel(c))}</option>`)
    .join("");

  globalState.selectedContestIds = globalState.contests.map((c) => String(c.meta.id || c.meta.cid));

  // Problems
  const problemOptions = ['<option value="all" selected>Todas as questões</option>'];
  globalState.contests.forEach((c) => {
    const cId = c.meta.id || c.meta.cid;
    c.problems.forEach((p) => {
      problemOptions.push(
        `<option value="${sanitize(contestProblemKey(cId, String(p.id)))}">${sanitize(getProblemLabel(p))} (${sanitize(c.meta.shortname || cId)})</option>`
      );
    });
  });
  els.problemSelect.innerHTML = problemOptions.join("");
  els.filterProblemSelect.innerHTML = problemOptions.join("");

  // Teams
  const teamOptions = ['<option value="all">Todos os estudantes</option>'];
  globalState.contests.forEach((c) => {
    const cId = c.meta.id || c.meta.cid;
    sortedTeams(c).forEach((t) => {
      teamOptions.push(
        `<option value="${sanitize(contestTeamKey(cId, String(t.id)))}">${sanitize(t.name || t.id)} (${sanitize(c.meta.shortname || cId)})</option>`
      );
    });
  });
  els.teamSelect.innerHTML = teamOptions.slice(1).join("");
  els.filterTeamSelect.innerHTML = teamOptions.join("");

  // Statuses
  const statuses = new Set(["all", "correct", "wrong-answer", "timelimit", "memory-limit", "not_submitted"]);
  els.statusSelect.innerHTML = Array.from(statuses)
    .map((s) => `<option value="${sanitize(s)}" ${s === "all" ? "selected" : ""}>${sanitize(s)}</option>`)
    .join("");
}

// ============================================================================
// CARREGAR DADOS DA API DO DOMJUDGE
// ============================================================================
async function loadReviewDataFromApi() {
  const creds = window.getApiCredentials();
  if (!creds || !creds.apiBase) {
    showAuthGate(true);
    return;
  }

  try {
    setReviewStatus("Carregando contests e submissões da API...", false);
    els.reloadSubmissionsBtn.disabled = true;

    const rawContests = await fetchApiJson("contests");
    if (!Array.isArray(rawContests)) {
      throw new Error("Resposta inválida da API de contests.");
    }

    const contests = [];

    for (const meta of rawContests) {
      const cId = meta.id || meta.cid;
      try {
        const [problems, teams, submissions, judgements] = await Promise.all([
          fetchApiJson(`contests/${encodeURIComponent(cId)}/problems`).catch(() => []),
          fetchApiJson(`contests/${encodeURIComponent(cId)}/teams`).catch(() => []),
          fetchApiJson(`contests/${encodeURIComponent(cId)}/submissions`).catch(() => []),
          fetchApiJson(`contests/${encodeURIComponent(cId)}/judgements`).catch(() => []),
        ]);

        const judgementMap = new Map();
        (judgements || []).forEach((j) => {
          if (j.submission_id) judgementMap.set(String(j.submission_id), j);
        });

        const enrichedSubmissions = (submissions || []).map((s) => {
          const j = judgementMap.get(String(s.id));
          return {
            ...s,
            judgement_label: j?.judgement_type_id || s.judgement_label || "pending",
            status: j?.judgement_type_id || s.status || "pending",
            source_files: Array.isArray(s.files) ? s.files.map((f) => f.filename || f.name) : ["source.cpp"],
          };
        });

        const contestObj = {
          meta,
          problems: problems || [],
          teams: teams || [],
          submissions: enrichedSubmissions,
          submissionIndex: {},
        };

        contestObj.submissionIndex = buildSubmissionIndex(contestObj);
        contests.push(contestObj);
      } catch (err) {
        console.warn(`Erro ao carregar contest ${cId}:`, err);
      }
    }

    globalState.contests = contests;
    updateDropdowns();
    renderView();
    updateControlsVisibility();

    if (els.exportCsvBtn) els.exportCsvBtn.disabled = contests.length === 0;
    if (els.saveDatasetBtn) els.saveDatasetBtn.disabled = contests.length === 0;

    showToast(`${contests.length} contest(s) sincronizados com sucesso!`, "success");
    setReviewStatus(`${contests.length} contest(s) carregados da API.`);
  } catch (err) {
    showToast(`Erro ao carregar da API: ${err.message}`, "error");
    setReviewStatus(`Erro ao carregar: ${err.message}`, true);
  } finally {
    els.reloadSubmissionsBtn.disabled = false;
  }
}

// ============================================================================
// EXPORTAÇÕES (CSV & DATASET ZIP)
// ============================================================================
function exportCsv() {
  const rows = collectRows();
  if (!rows.length) {
    showToast("Nenhum dado para exportar com os filtros atuais.", "warning");
    return;
  }

  let csv = "contest,problem,team,verdict,submission_id,time\n";
  rows.forEach((r) => {
    const final = finalSubmission(r.submissions);
    csv += `"${r.contest.meta.shortname || r.contest.meta.id}","${r.problem.shortname || r.problem.name}","${r.team.name || r.team.id}","${final?.judgement_label || "nao_submetido"}","${final?.id || ""}","${final?.time || ""}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `domjudge_review_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV de review exportado com sucesso!", "success");
}

// ============================================================================
// INICIALIZAÇÃO GERAL DA APLICAÇÃO
// ============================================================================
function setupEventListeners() {
  // Roteamento de Abas
  document.querySelectorAll(".app-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  window.addEventListener("hashchange", handleHashChange);

  // Sub-navegação do Review
  els.viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      els.viewButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      globalState.view = btn.dataset.view;
      updateControlsVisibility();
      renderView();
    });
  });

  // Filtros de Review
  if (els.contestSelect) {
    els.contestSelect.addEventListener("change", () => {
      globalState.selectedContestIds = getSelectedValues(els.contestSelect);
      renderView();
    });
  }
  if (els.problemSelect) {
    els.problemSelect.addEventListener("change", () => {
      globalState.selectedProblemIds = getSelectedValues(els.problemSelect);
      renderView();
    });
  }
  if (els.teamSelect) {
    els.teamSelect.addEventListener("change", () => {
      globalState.selectedTeamKey = els.teamSelect.value;
      renderView();
    });
  }
  if (els.statusSelect) {
    els.statusSelect.addEventListener("change", () => {
      globalState.filterStatusIds = getSelectedValues(els.statusSelect);
      renderView();
    });
  }
  if (els.filterProblemSelect) {
    els.filterProblemSelect.addEventListener("change", () => {
      globalState.filterProblemIds = getSelectedValues(els.filterProblemSelect);
      renderView();
    });
  }
  if (els.filterTeamSelect) {
    els.filterTeamSelect.addEventListener("change", () => {
      globalState.filterTeamKey = els.filterTeamSelect.value;
      renderView();
    });
  }

  if (els.reloadSubmissionsBtn) els.reloadSubmissionsBtn.addEventListener("click", loadReviewDataFromApi);
  if (els.exportCsvBtn) els.exportCsvBtn.addEventListener("click", exportCsv);

  // Atalhos de teclado no modo "Aluno por vez"
  window.addEventListener("keydown", (e) => {
    if (globalState.activeTab === "review" && globalState.view === "step") {
      if (e.key === "ArrowLeft") {
        globalState.stepIndex = Math.max(0, globalState.stepIndex - 1);
        renderStepView();
      } else if (e.key === "ArrowRight") {
        const rows = collectRows();
        globalState.stepIndex = Math.min(rows.length - 1, globalState.stepIndex + 1);
        renderStepView();
      }
    }
  });

  // Botão Trocar Conexão
  const openChangeAuthBtn = document.getElementById("openChangeAuthBtn");
  if (openChangeAuthBtn) {
    openChangeAuthBtn.addEventListener("click", () => {
      showAuthGate(true);
    });
  }

  // Formulário de Autenticação / Conexão API
  const authForm = document.getElementById("authForm");
  const authSubmitBtn = document.getElementById("authSubmitBtn");
  const authStatusFeedback = document.getElementById("authStatusFeedback");
  const authDemoBtn = document.getElementById("authDemoBtn");

  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const apiBase = document.getElementById("authApiBase").value.trim();
      const user = document.getElementById("authApiUser").value.trim();
      const password = document.getElementById("authApiPassword").value;
      const remember = document.getElementById("authRememberCheckbox").checked;

      if (!apiBase || !user || !password) {
        if (authStatusFeedback) authStatusFeedback.textContent = "Preencha todos os campos obrigatórios.";
        return;
      }

      authSubmitBtn.disabled = true;
      authSubmitBtn.innerHTML = "<span>Validando conexão...</span>";
      if (authStatusFeedback) authStatusFeedback.textContent = "";

      try {
        await validateApiCredentials(apiBase, user, password);

        globalState.apiBase = apiBase;
        globalState.apiUser = user;
        globalState.apiPassword = password;
        globalState.isAuthenticated = true;

        saveStoredSession(apiBase, user, password, remember);
        updateSessionBar();
        showAuthGate(false);
        showToast(`Conectado com sucesso ao DOMjudge (${user})!`, "success");

        // Disparar carregamento na aba atual
        switchTab(globalState.activeTab, false);
      } catch (err) {
        if (authStatusFeedback) authStatusFeedback.textContent = err.message;
        showToast(err.message, "error");
      } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.innerHTML = "<span>Conectar ao DOMjudge</span>";
      }
    });
  }

  if (authDemoBtn) {
    authDemoBtn.addEventListener("click", () => {
      globalState.apiBase = "https://coderunner.cin.ufpe.br/api/v4";
      globalState.apiUser = "demo_user";
      globalState.apiPassword = "demo_password";
      globalState.isAuthenticated = true;
      updateSessionBar();
      showAuthGate(false);
      showToast("Modo Demonstração ativado.", "info");

      if (window.UsersModule) {
        window.UsersModule.loadDemoUsers();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();

  const apiBaseInput = document.getElementById("authApiBase");
  const apiUserInput = document.getElementById("authApiUser");
  const apiPasswordInput = document.getElementById("authApiPassword");

  if (apiBaseInput && envConfig.DOMJUDGE_API_BASE) {
    apiBaseInput.value = envConfig.DOMJUDGE_API_BASE;
  }
  if (apiUserInput && envConfig.DOMJUDGE_API_USER) {
    apiUserInput.value = envConfig.DOMJUDGE_API_USER;
  }
  if (apiPasswordInput && envConfig.DOMJUDGE_API_PASSWORD) {
    apiPasswordInput.value = envConfig.DOMJUDGE_API_PASSWORD;
  }

  // 1. Verificar se há sessão salva válida no storage
  const session = loadStoredSession();
  if (session && session.apiBase && session.user && session.password) {
    globalState.apiBase = session.apiBase;
    globalState.apiUser = session.user;
    globalState.apiPassword = session.password;
    globalState.isAuthenticated = true;

    if (apiBaseInput) apiBaseInput.value = session.apiBase;
    if (apiUserInput) apiUserInput.value = session.user;

    updateSessionBar();
    showAuthGate(false);
    handleHashChange();
    return;
  }

  // 2. Se variáveis de ambiente fornecerem credenciais completas, auto-conectar (ideal para localhost / docker)
  if (envConfig.DOMJUDGE_API_BASE && envConfig.DOMJUDGE_API_USER && envConfig.DOMJUDGE_API_PASSWORD) {
    try {
      globalState.apiBase = envConfig.DOMJUDGE_API_BASE;
      globalState.apiUser = envConfig.DOMJUDGE_API_USER;
      globalState.apiPassword = envConfig.DOMJUDGE_API_PASSWORD;
      globalState.isAuthenticated = true;

      saveStoredSession(envConfig.DOMJUDGE_API_BASE, envConfig.DOMJUDGE_API_USER, envConfig.DOMJUDGE_API_PASSWORD, true);
      updateSessionBar();
      showAuthGate(false);
      showToast(`Conectado automaticamente via variáveis de ambiente (${envConfig.DOMJUDGE_API_USER})`, "success");
      handleHashChange();
      return;
    } catch (e) {
      console.warn("Falha no auto-login por variáveis de ambiente:", e);
    }
  }

  // Caso contrário, exibir o gate de autenticação
  showAuthGate(true);
  updateSessionBar();
});
