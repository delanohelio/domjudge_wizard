const state = {
  dataSource: "dataset",
  datasetBase: "",
  datasetFileMap: null,
  datasetRootPrefix: "",
  apiBase: "https://coderunner.cin.ufpe.br/api/v4",
  apiUser: "",
  apiPassword: "",
  manifest: null,
  contests: [],
  view: "question",
  selectedContestIds: [],
  selectedProblemIds: ["all"],
  selectedTeamKey: null,
  filterProblemIds: ["all"],
  filterTeamKey: "all",
  filterStatusIds: ["all"],
  stepIndex: 0,
  loadedSource: "dataset",
  apiSourceCache: {},
};

const els = {
  datasetBase: document.getElementById("datasetBase"),
  pickDatasetFolderBtn: document.getElementById("pickDatasetFolderBtn"),
  datasetFolderInput: document.getElementById("datasetFolderInput"),
  apiBase: document.getElementById("apiBase"),
  apiUser: document.getElementById("apiUser"),
  apiPassword: document.getElementById("apiPassword"),
  dataHint: document.getElementById("dataHint"),
  datasetFields: document.getElementById("datasetFields"),
  apiFields: document.getElementById("apiFields"),
  apiActions: document.getElementById("apiActions"),
  saveDatasetBtn: document.getElementById("saveDatasetBtn"),
  dataSourceRadios: Array.from(document.querySelectorAll('input[name="dataSource"]')),
  reloadBtn: document.getElementById("reloadBtn"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
  contestSelect: document.getElementById("contestSelect"),
  problemSelect: document.getElementById("problemSelect"),
  teamSelect: document.getElementById("teamSelect"),
  statusSelect: document.getElementById("statusSelect"),
  filterProblemSelect: document.getElementById("filterProblemSelect"),
  filterTeamSelect: document.getElementById("filterTeamSelect"),
  viewButtons: Array.from(document.querySelectorAll(".view-btn")),
  controls: Array.from(document.querySelectorAll(".control")),
};

const viewControlMap = {
  question: ["contest", "problem", "status"],
  student: ["team", "status"],
  contest: ["contest", "filterProblem", "filterTeam", "status"],
  step: ["contest", "problem", "status"],
  summary: ["contest", "problem", "status"],
};

function setStatus(message) {
  els.status.textContent = message;
}

function sanitize(text) {
  return String(text ?? "").replace(/[<>]/g, "");
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeApiBase(url) {
  const cleaned = String(url || "").trim().replace(/\/+$/, "");
  if (cleaned.endsWith("/api/v4") || cleaned.endsWith("/api")) return cleaned;
  return `${cleaned}/api/v4`;
}

function buildBasicAuthHeader(user, password) {
  return `Basic ${btoa(`${user}:${password}`)}`;
}

function getSubmissionStatus(submission) {
  return normalizeStatus(submission.judgement_label || submission.status || "pending");
}

function isAccepted(submission) {
  const status = normalizeStatus(submission.status);
  const label = normalizeStatus(submission.judgement_label);
  return status === "ac" || status === "accepted" || status === "correct" || label.includes("accepted") || label.includes("correct");
}

function submissionTimeKey(submission) {
  return submission.time || submission.submission_time || submission.submit_time || submission.start_time || submission.end_time || submission.id || 0;
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
  return state.contests.find((contest) => String(contest.meta.id) === target || String(contest.meta.cid) === target);
}

function getSelectedValues(selectEl) {
  return Array.from(selectEl.selectedOptions).map((option) => option.value).filter(Boolean);
}

function getSelectedContests() {
  if (!state.selectedContestIds.length) return state.contests;
  return state.selectedContestIds.map((id) => getContestById(id)).filter(Boolean);
}

function getProblemLabel(problem) {
  return problem.shortname || problem.name || problem.id || "Questao";
}

function filterByStatus(submissions) {
  if (state.filterStatusIds.includes("all")) return submissions;
  return submissions.filter((submission) => state.filterStatusIds.includes(getSubmissionStatus(submission)));
}

function finalSubmission(submissions) {
  const ordered = sortSubmissions(submissions);
  return ordered[0] || null;
}

function decodeSourceContent(value) {
  const text = String(value ?? "");
  const candidate = text.trim();
  const looksBase64 = candidate.length > 0 && candidate.length % 4 === 0 && /^[A-Za-z0-9+/=\r\n]+$/.test(candidate);
  if (!looksBase64) return text;

  try {
    const decoded = atob(candidate);
    if (/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/.test(decoded)) return text;
    return decoded;
  } catch (_error) {
    return text;
  }
}

function parseSourcePayload(payload) {
  let items = [];
  if (Array.isArray(payload)) {
    items = payload.filter((entry) => entry && typeof entry === "object");
  } else if (payload && typeof payload === "object") {
    if (Array.isArray(payload.files)) items = payload.files.filter((entry) => entry && typeof entry === "object");
    else if (Array.isArray(payload.source)) items = payload.source.filter((entry) => entry && typeof entry === "object");
  }

  return items.map((entry) => {
    const filename = String(entry.filename || entry.name || "source.txt");
    const source = decodeSourceContent(entry.source ?? entry.content ?? "");
    return { filename, source };
  });
}

function buildDatasetFileSelection(fileList) {
  const files = Array.from(fileList || []);
  const fileMap = new Map();

  files.forEach((file) => {
    const relPath = String(file.webkitRelativePath || file.name || "").replace(/^\/+/, "");
    if (!relPath) return;
    fileMap.set(relPath, file);
  });

  let prefix = "";
  for (const relPath of fileMap.keys()) {
    if (relPath.endsWith("dataset_manifest.json")) {
      prefix = relPath.slice(0, relPath.length - "dataset_manifest.json".length);
      break;
    }
  }

  const rootLabel = files[0]?.webkitRelativePath ? files[0].webkitRelativePath.split("/")[0] : "";
  return { fileMap, prefix, rootLabel };
}

function getDatasetFile(relPath) {
  if (!state.datasetFileMap) return null;
  const clean = String(relPath || "").replace(/^\/+/, "");
  return state.datasetFileMap.get(`${state.datasetRootPrefix}${clean}`) || null;
}

async function readDatasetText(relPath) {
  const fromFile = getDatasetFile(relPath);
  if (fromFile) return fromFile.text();

  if (!state.datasetBase) {
    throw new Error("selecione uma pasta de dataset");
  }

  const response = await fetch(`${state.datasetBase}/${String(relPath || "").replace(/^\/+/, "")}`);
  if (!response.ok) throw new Error(`nao foi possivel ler ${relPath}`);
  return response.text();
}

async function readDatasetJson(relPath) {
  const text = await readDatasetText(relPath);
  return JSON.parse(text);
}

async function fetchApiJson(path) {
  const apiBase = normalizeApiBase(state.apiBase);
  const user = String(state.apiUser || "").trim();
  const password = state.apiPassword || "";

  if (!apiBase || !user || !password) {
    throw new Error("Preencha API base, usuario e senha para usar a API.");
  }

  const response = await fetch(`${apiBase}/${path.replace(/^\/+/, "")}`, {
    headers: {
      Accept: "application/json",
      Authorization: buildBasicAuthHeader(user, password),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha API (${response.status}): ${text || "sem detalhe"}`);
  }

  const raw = await response.text();
  return raw.trim() ? JSON.parse(raw) : null;
}

async function fetchCodeFromDataset(contest, submission, file) {
  return readDatasetText(`${contest.folder}/sources/${submission.id}/${file}`);
}

async function fetchCodeFromApi(contest, submission, file) {
  const contestId = contest.meta.id || contest.meta.cid;
  const cacheKey = `${contestId}::${submission.id}`;
  let files = state.apiSourceCache[cacheKey];

  if (!files) {
    const payload = await fetchApiJson(`contests/${encodeURIComponent(contestId)}/submissions/${encodeURIComponent(submission.id)}/source-code`);
    files = parseSourcePayload(payload);
    state.apiSourceCache[cacheKey] = files;
  }

  const fileEntry = files.find((entry) => entry.filename === file) || files[0];
  if (!fileEntry) throw new Error("arquivo de codigo nao encontrado na API");
  return fileEntry.source;
}

async function fetchSourceCode(contest, submission, file) {
  if (state.dataSource === "api") {
    return fetchCodeFromApi(contest, submission, file);
  }
  return fetchCodeFromDataset(contest, submission, file);
}

function buildSubmissionElement(contest, submission) {
  const container = document.createElement("div");
  container.className = "submission" + (isAccepted(submission) ? " accepted" : "");

  const statusLabel = submission.judgement_label || submission.status || "pending";
  const metaTime = submissionTimeKey(submission);
  const lang = submission.language_id || submission.language || "";

  container.innerHTML = `
    <div class="submission-header">
      <div>
        <strong>${sanitize(statusLabel)}</strong>
        ${isAccepted(submission) ? '<span class="badge">correta</span>' : ""}
      </div>
      <div class="submission-meta">
        <span>${sanitize(lang)}</span>
        <span>${sanitize(metaTime)}</span>
      </div>
    </div>
    <div class="file-list"></div>
    <div class="code-block" hidden>
      <div class="code-toolbar"><button class="badge dim close-code" type="button">Fechar codigo</button></div>
      <pre><code class="language-cpp"></code></pre>
    </div>
  `;

  const fileList = container.querySelector(".file-list");
  const codeBlock = container.querySelector(".code-block");
  const codeEl = container.querySelector("code");
  const closeBtn = container.querySelector(".close-code");

  closeBtn.addEventListener("click", () => {
    codeBlock.hidden = true;
    codeEl.textContent = "";
  });

  const files = Array.isArray(submission.source_files) ? submission.source_files : [];
  if (!files.length) {
    fileList.textContent = "Sem arquivos de codigo.";
    return container;
  }

  files.forEach((file) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = file;
    button.className = "badge dim";
    button.addEventListener("click", async () => {
      codeBlock.hidden = false;
      codeEl.textContent = "Carregando...";
      try {
        const text = await fetchSourceCode(contest, submission, file);
        codeEl.textContent = text;
        hljs.highlightElement(codeEl);
      } catch (error) {
        codeEl.textContent = `Erro ao carregar: ${error.message}`;
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
    <h3>${sanitize(team.name || team.id)}</h3>
    <small>${sanitize(formatContestLabel(contest))} · ${sanitize(getProblemLabel(problem))}</small>
    <div class="submissions"></div>
  `;

  const submissionsEl = card.querySelector(".submissions");
  if (first) submissionsEl.appendChild(buildSubmissionElement(contest, first));

  if (ordered.length > 1) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = `Ver mais ${ordered.length - 1} submissao(oes)`;
    toggle.className = "badge dim";
    let expanded = false;

    toggle.addEventListener("click", () => {
      expanded = !expanded;
      if (expanded) {
        toggle.textContent = "Ocultar submisssoes extras";
        ordered.slice(1).forEach((entry) => submissionsEl.appendChild(buildSubmissionElement(contest, entry)));
      } else {
        toggle.textContent = `Ver mais ${ordered.length - 1} submissao(oes)`;
        submissionsEl.querySelectorAll(".submission").forEach((el, idx) => {
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
  const allProblems = state.selectedProblemIds.includes("all");

  selectedContests.forEach((contest) => {
    const contestId = contest.meta.id || contest.meta.cid;
    const problems = contest.problems.filter((problem) => {
      if (allProblems) return true;
      return state.selectedProblemIds.includes(contestProblemKey(contestId, String(problem.id)));
    });

    problems.forEach((problem) => {
      sortedTeams(contest).forEach((team) => {
        if (state.view === "contest" && state.filterTeamKey !== "all" && String(team.id) !== state.filterTeamKey) return;
        if (state.view === "contest" && !state.filterProblemIds.includes("all") && !state.filterProblemIds.includes(contestProblemKey(contestId, String(problem.id)))) return;

        const key = `${team.id}::${problem.id}`;
        const submissions = filterByStatus(contest.submissionIndex[key] || []);
        if (!submissions.length) return;
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
  setStatus(`${rows.length} combinacao(oes) de questao/estudante.`);
  els.results.replaceChildren(...rows.map((row) => buildTeamCard(row.contest, row.team, row.problem, row.submissions)));
}

function renderStudentView() {
  const contestTeam = state.selectedTeamKey || "";
  const [contestId, teamId] = contestTeam.split("::");
  const contest = getContestById(contestId);
  if (!contest || !teamId) {
    setStatus("Selecione um estudante (team).");
    els.results.replaceChildren();
    return;
  }

  const team = contest.teams.find((entry) => String(entry.id) === teamId);
  if (!team) {
    setStatus("Team nao encontrado.");
    els.results.replaceChildren();
    return;
  }

  const cards = [];
  contest.problems.forEach((problem) => {
    const key = `${team.id}::${problem.id}`;
    const submissions = filterByStatus(contest.submissionIndex[key] || []);
    if (!submissions.length) return;
    cards.push(buildTeamCard(contest, team, problem, submissions));
  });

  setStatus(`${cards.length} questao(oes) com submissao para ${team.name || team.id}.`);
  els.results.replaceChildren(...cards);
}

function renderContestView() {
  const rows = collectRows();
  setStatus(`${rows.length} combinacao(oes) de questao/team com submissao.`);
  els.results.replaceChildren(...rows.map((row) => buildTeamCard(row.contest, row.team, row.problem, row.submissions)));
}

function renderStepView() {
  const rows = collectRows();
  if (!rows.length) {
    setStatus("Nenhuma resposta com os filtros atuais.");
    els.results.replaceChildren();
    return;
  }

  if (state.stepIndex >= rows.length) state.stepIndex = rows.length - 1;
  if (state.stepIndex < 0) state.stepIndex = 0;

  const nav = document.createElement("div");
  nav.className = "step-nav";
  nav.innerHTML = `
    <button type="button" class="badge dim" id="prevStep">Anterior</button>
    <span class="counter">${state.stepIndex + 1} de ${rows.length}</span>
    <button type="button" class="badge dim" id="nextStep">Proximo</button>
  `;

  nav.querySelector("#prevStep").addEventListener("click", () => {
    state.stepIndex = Math.max(0, state.stepIndex - 1);
    renderStepView();
  });
  nav.querySelector("#nextStep").addEventListener("click", () => {
    state.stepIndex = Math.min(rows.length - 1, state.stepIndex + 1);
    renderStepView();
  });

  const row = rows[state.stepIndex];
  const card = buildTeamCard(row.contest, row.team, row.problem, row.submissions);
  setStatus("Visualizacao individual por estudante/questao.");
  els.results.replaceChildren(nav, card);
}

function renderSummaryView() {
  const rows = collectRows();
  const list = document.createElement("div");
  list.className = "summary-list";

  rows.forEach((row) => {
    const final = finalSubmission(row.submissions);
    if (!final) return;
    const accepted = isAccepted(final);
    const item = document.createElement("article");
    item.className = "summary-item" + (accepted ? " accepted" : "");
    item.innerHTML = `
      <div class="summary-main">
        <strong>${sanitize(row.team.name || row.team.id)}</strong>
        <small>${sanitize(formatContestLabel(row.contest))} · ${sanitize(getProblemLabel(row.problem))}</small>
      </div>
      <span class="badge ${accepted ? "" : "dim"}">${accepted ? "accepted" : sanitize(final.judgement_label || final.status || "outro")}</span>
    `;
    list.appendChild(item);
  });

  setStatus(`${list.children.length} resumo(s) de resposta final.`);
  els.results.replaceChildren(list);
}

function renderView() {
  if (state.view === "question") return renderQuestionView();
  if (state.view === "student") return renderStudentView();
  if (state.view === "contest") return renderContestView();
  if (state.view === "step") return renderStepView();
  return renderSummaryView();
}

function updateControlsVisibility() {
  els.controls.forEach((control) => {
    const key = control.dataset.control;
    control.style.display = (viewControlMap[state.view] || []).includes(key) ? "grid" : "none";
  });
}

function updateSourceControlsVisibility() {
    debugger
  const isApi = state.dataSource === "api";
  els.datasetFields.style.display = isApi ? 'none' : '';
    els.apiFields.style.display = isApi ? '' : 'none';
  if (els.apiActions) {
      els.apiActions.style.display = !(isApi && state.loadedSource === "api") ? 'none' : '';
  }
  els.reloadBtn.textContent = isApi ? "Carregar da API" : "Carregar dataset";
  if (els.saveDatasetBtn) {
    const canSave = isApi && state.loadedSource === "api" && state.contests.length > 0;
    els.saveDatasetBtn.disabled = !canSave;
  }
  els.dataHint.textContent = isApi
    ? "Mostra apenas os campos da API. Use credenciais com permissao para ler contests e submisssoes."
    : "Use um servidor local para permitir fetch dos arquivos JSON.";
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "contest";
}

function contestFolderName(contest) {
  const id = String(contest.meta.id || contest.meta.cid || "contest");
  const slugBase = contest.meta.shortname || contest.meta.name || id;
  return `${id}-${slugify(slugBase)}`;
}

function triggerBlobDownload(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function saveDatasetZip() {
  if (state.dataSource !== "api") {
    setStatus("Troque para fonte API para salvar dataset.");
    return;
  }
  if (!state.contests.length) {
    setStatus("Carregue os dados da API antes de salvar dataset.");
    return;
  }
  if (!window.JSZip) {
    setStatus("JSZip nao carregado no navegador.");
    return;
  }

  try {
    els.saveDatasetBtn.disabled = true;
    setStatus("Gerando ZIP do dataset...");

    const zip = new window.JSZip();
    const root = zip.folder("dataset");
    if (!root) throw new Error("falha ao criar estrutura do ZIP");

    const manifest = {
      generated_at: new Date().toISOString(),
      source: "api",
      contests: [],
    };

    state.contests.forEach((contest) => {
      const folder = `contests/${contestFolderName(contest)}`;
      const contestDir = root.folder(folder);
      if (!contestDir) return;

      contestDir.file("contest.json", JSON.stringify(contest.meta, null, 2));
      contestDir.file("teams.json", JSON.stringify(contest.teams || [], null, 2));
      contestDir.file("problems.json", JSON.stringify(contest.problems || [], null, 2));
      contestDir.file("submissions.json", JSON.stringify(contest.submissions || [], null, 2));

      const contestId = String(contest.meta.id || contest.meta.cid || "");
      Object.entries(state.apiSourceCache).forEach(([key, files]) => {
        const [cacheContestId, submissionId] = key.split("::");
        if (cacheContestId !== contestId || !Array.isArray(files)) return;
        files.forEach((file) => {
          const filename = String(file.filename || "source.txt").replace(/[\\/]/g, "_");
          contestDir.file(`sources/${submissionId}/${filename}`, file.source || "");
        });
      });

      manifest.contests.push({
        contest_id: contest.meta.id,
        contest_cid: contest.meta.cid,
        contest_shortname: contest.meta.shortname,
        contest_name: contest.meta.name,
        folder,
        teams_count: (contest.teams || []).length,
        problems_count: (contest.problems || []).length,
        submissions_count: (contest.submissions || []).length,
      });
    });

    root.file("dataset_manifest.json", JSON.stringify(manifest, null, 2));

    const blob = await zip.generateAsync({ type: "blob" });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    triggerBlobDownload(blob, `domjudge-dataset-${stamp}.zip`);
    setStatus("Dataset salvo em ZIP com sucesso.");
  } catch (error) {
    setStatus(`Erro ao salvar dataset: ${error.message}`);
  } finally {
    els.saveDatasetBtn.disabled = !state.contests.length;
  }
}

function populateSelect(selectEl, options, placeholder, { multiple = false } = {}) {
  selectEl.innerHTML = "";
  if (!multiple) {
    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = placeholder;
    selectEl.appendChild(ph);
  }
  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = String(opt.value);
    option.textContent = opt.label;
    selectEl.appendChild(option);
  });
}

function reselectMulti(selectEl, values) {
  values.forEach((value) => {
    const option = selectEl.querySelector(`option[value="${CSS.escape(String(value))}"]`);
    if (option) option.selected = true;
  });
}

function populateProblemAndTeamSelectors() {
  const selectedContests = getSelectedContests();
  if (!selectedContests.length) return;

  const problemOptions = [];
  const teamOptions = [];
  const teamSeen = new Set();

  selectedContests.forEach((contest) => {
    const contestId = contest.meta.id || contest.meta.cid;
    contest.problems.forEach((problem) => {
      problemOptions.push({
        value: contestProblemKey(contestId, String(problem.id)),
        label: `${getProblemLabel(problem)} (${contest.meta.shortname || contest.meta.name})`,
      });
    });

    sortedTeams(contest).forEach((team) => {
      const key = contestTeamKey(contestId, team.id);
      if (teamSeen.has(key)) return;
      teamSeen.add(key);
      teamOptions.push({
        value: key,
        label: `${team.name || team.id} (${contest.meta.shortname || contest.meta.name})`,
      });
    });
  });

  populateSelect(els.problemSelect, [{ value: "all", label: "Todas as questoes" }, ...problemOptions], "Questoes", { multiple: true });
  const availableProblems = new Set(["all", ...problemOptions.map((entry) => entry.value)]);
  state.selectedProblemIds = state.selectedProblemIds.filter((value) => availableProblems.has(value));
  if (!state.selectedProblemIds.length) state.selectedProblemIds = ["all"];
  reselectMulti(els.problemSelect, state.selectedProblemIds);

  populateSelect(els.filterProblemSelect, [{ value: "all", label: "Todas as questoes" }, ...problemOptions], "Filtro questao", { multiple: true });
  const availableFilterProblems = new Set(["all", ...problemOptions.map((entry) => entry.value)]);
  state.filterProblemIds = state.filterProblemIds.filter((value) => availableFilterProblems.has(value));
  if (!state.filterProblemIds.length) state.filterProblemIds = ["all"];
  reselectMulti(els.filterProblemSelect, state.filterProblemIds);

  populateSelect(els.teamSelect, teamOptions, "Selecione um estudante");
  if (!teamOptions.some((option) => option.value === state.selectedTeamKey)) {
    state.selectedTeamKey = teamOptions[0]?.value || "";
  }
  els.teamSelect.value = state.selectedTeamKey;

  const uniqueTeamsById = new Map();
  teamOptions.forEach((option) => {
    const teamId = option.value.split("::")[1];
    if (!uniqueTeamsById.has(teamId)) {
      uniqueTeamsById.set(teamId, option.label.replace(/ \(.+\)$/, ""));
    }
  });

  populateSelect(
    els.filterTeamSelect,
    [{ value: "all", label: "Todos" }, ...Array.from(uniqueTeamsById.entries()).map(([value, label]) => ({ value, label }))],
    "Filtro estudante"
  );
  if (!Array.from(els.filterTeamSelect.options).some((opt) => opt.value === state.filterTeamKey)) {
    state.filterTeamKey = "all";
  }
  els.filterTeamSelect.value = state.filterTeamKey;
}

function populateStatusFilter() {
  const statuses = new Map();
  getSelectedContests().forEach((contest) => {
    contest.submissions.forEach((submission) => {
      const status = getSubmissionStatus(submission) || "pending";
      statuses.set(status, submission.judgement_label || submission.status || status);
    });
  });

  const statusOptions = [{ value: "all", label: "Todos" }, ...Array.from(statuses.entries()).map(([value, label]) => ({ value, label }))];
  populateSelect(els.statusSelect, statusOptions, "Filtro status", { multiple: true });
  const available = new Set(statusOptions.map((entry) => entry.value));
  state.filterStatusIds = state.filterStatusIds.filter((value) => available.has(value));
  if (!state.filterStatusIds.length) state.filterStatusIds = ["all"];
  reselectMulti(els.statusSelect, state.filterStatusIds);
}

function chooseFinalJudgement(judgements) {
  if (!Array.isArray(judgements) || !judgements.length) return null;

  return judgements
    .slice()
    .sort((a, b) => {
      const aKey = `${a.end_time || ""}|${a.start_time || ""}|${a.id || ""}`;
      const bKey = `${b.end_time || ""}|${b.start_time || ""}|${b.id || ""}`;
      return aKey.localeCompare(bKey);
    })
    .pop();
}

function buildStatusMap(judgementTypes) {
  const map = new Map();
  (judgementTypes || []).forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    map.set(String(entry.id), entry);
  });
  return map;
}

function enrichSubmissions(submissions, judgements, judgementTypes, withSourceMarker = false) {
  const judgementTypeMap = buildStatusMap(judgementTypes);
  const bySubmission = new Map();

  (judgements || []).forEach((judgement) => {
    if (!judgement || typeof judgement !== "object") return;
    const key = String(judgement.submission_id ?? "");
    if (!key) return;
    if (!bySubmission.has(key)) bySubmission.set(key, []);
    bySubmission.get(key).push(judgement);
  });

  return (submissions || []).map((submission) => {
    const current = { ...submission };
    const key = String(submission.id ?? "");
    const submissionJudgements = bySubmission.get(key) || [];
    const finalJudgement = chooseFinalJudgement(submissionJudgements);

    let status = "pending";
    let judgementTypeId = null;
    let judgementLabel = null;

    if (finalJudgement) {
      judgementTypeId = finalJudgement.judgement_type_id || null;
      const jt = judgementTypeMap.get(String(judgementTypeId || ""));
      if (jt) {
        status = String(jt.id || "pending");
        judgementLabel = jt.name || jt.id || null;
      } else if (judgementTypeId) {
        status = String(judgementTypeId);
      }
    }

    current.status = status;
    current.judgement_type_id = judgementTypeId;
    current.judgement_label = judgementLabel;
    current.judgements = submissionJudgements;
    if (!Array.isArray(current.source_files)) {
      current.source_files = withSourceMarker ? ["codigo"] : [];
    }

    return current;
  });
}

async function loadContestDataFromDataset(contestItem) {
  const folder = contestItem.folder;
  const [meta, teams, problems, submissions] = await Promise.all([
    readDatasetJson(`${folder}/contest.json`),
    readDatasetJson(`${folder}/teams.json`),
    readDatasetJson(`${folder}/problems.json`),
    readDatasetJson(`${folder}/submissions.json`),
  ]);

  const contest = { meta, folder, teams, problems, submissions };
  contest.submissionIndex = buildSubmissionIndex(contest);
  return contest;
}

async function loadContestDataFromApi(contestMeta) {
  const contestId = contestMeta.id ?? contestMeta.cid;
  const [teams, problems, submissions, judgements, judgementTypes] = await Promise.all([
    fetchApiJson(`contests/${encodeURIComponent(contestId)}/teams`),
    fetchApiJson(`contests/${encodeURIComponent(contestId)}/problems`),
    fetchApiJson(`contests/${encodeURIComponent(contestId)}/submissions`),
    fetchApiJson(`contests/${encodeURIComponent(contestId)}/judgements`),
    fetchApiJson(`contests/${encodeURIComponent(contestId)}/judgement-types`),
  ]);

  const contest = {
    meta: contestMeta,
    folder: null,
    teams: Array.isArray(teams) ? teams : [],
    problems: Array.isArray(problems) ? problems : [],
    submissions: enrichSubmissions(submissions, judgements, judgementTypes, true),
  };
  contest.submissionIndex = buildSubmissionIndex(contest);
  return contest;
}

async function finalizeLoadedContests(successLabel) {
  if (!state.contests.length) {
    setStatus("Nenhum contest encontrado para a fonte selecionada.");
    return;
  }

  const contestOptions = state.contests
    .slice()
    .sort((a, b) => formatContestLabel(a).localeCompare(formatContestLabel(b), "pt-BR"))
    .map((contest) => ({ value: String(contest.meta.id || contest.meta.cid), label: formatContestLabel(contest) }));

  populateSelect(els.contestSelect, contestOptions, "Selecione contest", { multiple: true });
  const selectedSet = new Set(state.selectedContestIds.map((value) => String(value)));
  state.selectedContestIds = contestOptions.filter((entry) => selectedSet.has(String(entry.value))).map((entry) => String(entry.value));
  if (!state.selectedContestIds.length) {
    state.selectedContestIds = contestOptions.slice(0, 1).map((entry) => String(entry.value));
  }

  reselectMulti(els.contestSelect, state.selectedContestIds);
  populateProblemAndTeamSelectors();
  populateStatusFilter();
  setStatus(`${successLabel}: ${state.contests.length} contest(s).`);
  renderView();
}

async function loadDataset() {
  state.datasetBase = els.datasetBase.value.trim();
  state.stepIndex = 0;
  state.apiSourceCache = {};
  setStatus("Carregando dataset...");
  els.results.innerHTML = "";

  if (!state.datasetFileMap && !state.datasetBase) {
    state.contests = [];
    setStatus("Selecione uma pasta de dataset e depois clique em Carregar dataset.");
    return;
  }

  state.manifest = await readDatasetJson("dataset_manifest.json");
  state.contests = await Promise.all(state.manifest.contests.map(loadContestDataFromDataset));
  state.loadedSource = "dataset";
  await finalizeLoadedContests("Dataset carregado");
  updateSourceControlsVisibility();
}

async function loadApi() {
  state.apiBase = els.apiBase.value.trim() || state.apiBase;
  state.apiUser = els.apiUser.value.trim();
  state.apiPassword = els.apiPassword.value;
  state.stepIndex = 0;
  state.apiSourceCache = {};
  setStatus("Carregando dados da API...");
  els.results.innerHTML = "";

  const contests = await fetchApiJson("contests");
  if (!Array.isArray(contests) || !contests.length) {
    throw new Error("nenhum contest encontrado na API para esse usuario");
  }

  state.contests = await Promise.all(contests.map(loadContestDataFromApi));
  state.loadedSource = "api";
  await finalizeLoadedContests("API carregada");
  updateSourceControlsVisibility();
}

async function loadData() {
  try {
    if (state.dataSource === "api") {
      await loadApi();
    } else {
      await loadDataset();
    }
  } catch (error) {
    setStatus(`Erro ao carregar: ${error.message}`);
  }
}

els.dataSourceRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (!radio.checked) return;
    state.dataSource = radio.value;
    state.stepIndex = 0;
    updateSourceControlsVisibility();
  });
});

els.viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    els.viewButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    state.view = button.dataset.view;
    state.stepIndex = 0;
    updateControlsVisibility();
    renderView();
  });
});

els.reloadBtn.addEventListener("click", loadData);

if (els.pickDatasetFolderBtn && els.datasetFolderInput) {
  els.pickDatasetFolderBtn.addEventListener("click", () => {
    els.datasetFolderInput.click();
  });

  els.datasetFolderInput.addEventListener("change", () => {
    const { fileMap, prefix, rootLabel } = buildDatasetFileSelection(els.datasetFolderInput.files);
    state.datasetFileMap = fileMap.size ? fileMap : null;
    state.datasetRootPrefix = prefix;

    if (els.datasetBase) {
      els.datasetBase.value = rootLabel || "";
    }
    setStatus(state.datasetFileMap ? "Pasta selecionada. Clique em Carregar dataset." : "Nenhuma pasta selecionada.");
  });
}

if (els.saveDatasetBtn) {
  els.saveDatasetBtn.addEventListener("click", saveDatasetZip);
}

els.contestSelect.addEventListener("change", (event) => {
  state.selectedContestIds = getSelectedValues(event.target);
  if (!state.selectedContestIds.length) {
    state.selectedContestIds = Array.from(event.target.options).slice(0, 1).map((entry) => entry.value);
    reselectMulti(els.contestSelect, state.selectedContestIds);
  }
  state.stepIndex = 0;
  populateProblemAndTeamSelectors();
  populateStatusFilter();
  renderView();
});

els.problemSelect.addEventListener("change", (event) => {
  state.selectedProblemIds = getSelectedValues(event.target);
  if (!state.selectedProblemIds.length) state.selectedProblemIds = ["all"];
  state.stepIndex = 0;
  renderView();
});

els.teamSelect.addEventListener("change", (event) => {
  state.selectedTeamKey = event.target.value;
  renderView();
});

els.filterProblemSelect.addEventListener("change", (event) => {
  state.filterProblemIds = getSelectedValues(event.target);
  if (!state.filterProblemIds.length) state.filterProblemIds = ["all"];
  state.stepIndex = 0;
  renderView();
});

els.filterTeamSelect.addEventListener("change", (event) => {
  state.filterTeamKey = event.target.value || "all";
  state.stepIndex = 0;
  renderView();
});

els.statusSelect.addEventListener("change", (event) => {
  state.filterStatusIds = getSelectedValues(event.target);
  if (!state.filterStatusIds.length) state.filterStatusIds = ["all"];
  state.stepIndex = 0;
  renderView();
});

updateControlsVisibility();
updateSourceControlsVisibility();
setStatus("Selecione uma fonte de dados e clique em carregar.");
