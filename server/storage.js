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

module.exports = {
  initStorage,
  getAccessCodes,
  saveAccessCodes,
  getLabelPermissions,
  saveLabelPermissions,
};
