const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "data");

const CODES_FILE = path.join(DATA_DIR, "access_codes.json");
const PERMISSIONS_FILE = path.join(DATA_DIR, "label_permissions.json");

function ensureDirectoryExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.warn(`[Storage] Falha ao ler ${filePath}:`, err.message);
    return fallback;
  }
}

function safeWriteJson(filePath, data) {
  ensureDirectoryExists();
  const tmpFile = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpFile, filePath);
}

function initStorage() {
  ensureDirectoryExists();
  const adminLabel = (process.env.WIZARD_ADMIN_LABEL || "admin").trim().toLowerCase();

  // Inicializar regras de labels se não existirem
  if (!fs.existsSync(PERMISSIONS_FILE)) {
    const defaultPermissions = [
      {
        label: adminLabel,
        description: "Administradores do Wizard (Acesso Total)",
        allowedPages: ["review", "creator", "contests", "users", "codes", "permissions", "trocar-senha"],
        isAdmin: true,
      },
      {
        label: "professor",
        description: "Professores e Coordenadores",
        allowedPages: ["review", "creator", "contests", "users", "codes", "trocar-senha"],
        isAdmin: false,
      },
      {
        label: "monitor",
        description: "Monitores da Disciplina",
        allowedPages: ["review", "creator", "trocar-senha"],
        isAdmin: false,
      },
      {
        label: "aluno",
        description: "Alunos / Competidores",
        allowedPages: ["trocar-senha"],
        isAdmin: false,
      },
    ];
    safeWriteJson(PERMISSIONS_FILE, defaultPermissions);
  }

  // Inicializar códigos de acesso se não existirem
  if (!fs.existsSync(CODES_FILE)) {
    const defaultCodes = [
      {
        id: "code_demo_1",
        code: "TURMA-2026-1",
        name: "Turma 2026.1 - Algoritmos e Programação",
        labels: ["turma-2026-1", "aluno"],
        category: "Participants",
        roles: ["team"],
        active: true,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      },
      {
        id: "code_demo_2",
        code: "MONITORES-2026",
        name: "Equipe de Monitoria 2026.1",
        labels: ["monitor"],
        category: "Professores / Jury",
        roles: ["jury"],
        active: true,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      },
    ];
    safeWriteJson(CODES_FILE, defaultCodes);
  }
}

const PROBLEMS_FILE = path.join(DATA_DIR, "problem_bank.json");
const AUDIENCE_FILE = path.join(DATA_DIR, "contest_audience_rules.json");

function getAccessCodes() {
  return safeReadJson(CODES_FILE, []);
}

function saveAccessCodes(codes) {
  safeWriteJson(CODES_FILE, codes);
}

function getLabelPermissions() {
  return safeReadJson(PERMISSIONS_FILE, []);
}

function saveLabelPermissions(permissions) {
  safeWriteJson(PERMISSIONS_FILE, permissions);
}

// Banco Central de Exercícios / Questões
function getProblemsBank() {
  return safeReadJson(PROBLEMS_FILE, []);
}

function saveProblemsBank(problems) {
  safeWriteJson(PROBLEMS_FILE, problems);
}

function saveProblemToBank(problem) {
  const problems = getProblemsBank();
  const existingIdx = problems.findIndex((p) => p.id === problem.id);
  const now = new Date().toISOString();
  if (existingIdx >= 0) {
    problems[existingIdx] = {
      ...problems[existingIdx],
      ...problem,
      updatedAt: now,
    };
  } else {
    problems.unshift({
      ...problem,
      createdAt: now,
      updatedAt: now,
    });
  }
  safeWriteJson(PROBLEMS_FILE, problems);
  return problem;
}

function getProblemFromBank(id) {
  const problems = getProblemsBank();
  return problems.find((p) => p.id === id) || null;
}

// Regras de Público-Alvo por Lista (Expressões Booleanas com Labels)
function getContestAudienceRules() {
  return safeReadJson(AUDIENCE_FILE, {});
}

function saveContestAudienceRule(contestId, rule) {
  const rules = getContestAudienceRules();
  if (!rule || !String(rule).trim()) {
    delete rules[contestId];
  } else {
    rules[contestId] = String(rule).trim();
  }
  safeWriteJson(AUDIENCE_FILE, rules);
}

// Parser e Avaliador Booleano de Expressões de Labels (AND, OR, NOT, Parenteses)
function tokenizeAudienceExpression(expr) {
  const regex = /\s*(\(|\)|AND|OR|NOT|&&|\|\||!|[a-zA-Z0-9_\-.]+)\s*/gi;
  const tokens = [];
  let match;
  while ((match = regex.exec(expr)) !== null) {
    if (match[1]) tokens.push(match[1]);
  }
  return tokens;
}

function validateAudienceExpression(expression) {
  if (!expression || !expression.trim()) return { valid: true };
  const tokens = tokenizeAudienceExpression(expression);
  let openCount = 0;
  for (const t of tokens) {
    if (t === "(") openCount++;
    if (t === ")") {
      openCount--;
      if (openCount < 0) return { valid: false, error: "Parêntese de fechamento ')' sem abertura correspondente." };
    }
  }
  if (openCount !== 0) return { valid: false, error: "Parênteses não balanceados na expressão." };
  return { valid: true };
}

function evaluateAudienceExpression(expression, userLabels = []) {
  if (!expression || !expression.trim()) return true;

  const normalizedLabels = new Set((userLabels || []).map((l) => String(l).trim().toLowerCase()));
  const tokens = tokenizeAudienceExpression(expression);
  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function consume() {
    return tokens[pos++];
  }

  function parseOr() {
    let left = parseAnd();
    while (pos < tokens.length) {
      const op = peek() ? peek().toUpperCase() : "";
      if (op === "OR" || op === "||") {
        consume();
        const right = parseAnd();
        left = left || right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseAnd() {
    let left = parseNot();
    while (pos < tokens.length) {
      const op = peek() ? peek().toUpperCase() : "";
      if (op === "AND" || op === "&&") {
        consume();
        const right = parseNot();
        left = left && right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseNot() {
    const op = peek() ? peek().toUpperCase() : "";
    if (op === "NOT" || op === "!") {
      consume();
      return !parseNot();
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = consume();
    if (!token) return false;

    if (token === "(") {
      const result = parseOr();
      if (peek() === ")") {
        consume();
      }
      return result;
    }

    return normalizedLabels.has(token.toLowerCase());
  }

  try {
    return Boolean(parseOr());
  } catch (err) {
    console.warn("Erro ao avaliar regra de audiência:", err.message);
    return false;
  }
}

// Obter todas as labels conhecidas cadastradas (Turmas e Papéis)
function getAllKnownLabels() {
  const roles = getLabelPermissions().map((p) => String(p.label).trim().toLowerCase());
  const turmas = [];
  getAccessCodes().forEach((c) => {
    (c.labels || []).forEach((l) => turmas.push(String(l).trim().toLowerCase()));
  });

  const distinct = Array.from(new Set([...roles, ...turmas])).filter(Boolean);
  return {
    roles: Array.from(new Set(roles)),
    turmas: Array.from(new Set(turmas.filter((t) => !roles.includes(t)))),
    all: distinct,
  };
}

module.exports = {
  initStorage,
  getAccessCodes,
  saveAccessCodes,
  getLabelPermissions,
  saveLabelPermissions,
  getProblemsBank,
  saveProblemsBank,
  saveProblemToBank,
  getProblemFromBank,
  getContestAudienceRules,
  saveContestAudienceRule,
  tokenizeAudienceExpression,
  validateAudienceExpression,
  evaluateAudienceExpression,
  getAllKnownLabels,
};
