const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const puppeteer = require("puppeteer");
require("dotenv").config();

const storage = require("./server/storage");

// Inicializar arquivos de persistência se necessário
storage.initStorage();

const app = express();
const PORT = process.env.PORT || 7070;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Gerenciador de Sessões ativas em memória com TTL
const activeSessions = new Map(); // token -> { user, createdAt, expiresAt }
const SESSION_TTL_MS = (Number(process.env.STORAGE_EXPIRATION_DAYS) || 7) * 24 * 60 * 60 * 1000;

function createSession(user) {
  const token = crypto.randomUUID();
  const sessionData = {
    token,
    user,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  activeSessions.set(token, sessionData);
  return token;
}

function getSession(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

function extractSession(req) {
  const authHeader = req.headers["authorization"] || "";
  let token = null;
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (req.headers["x-session-token"]) {
    token = String(req.headers["x-session-token"]).trim();
  }
  return getSession(token);
}

function requireAuth(req, res, next) {
  const session = extractSession(req);
  if (!session) {
    return res.status(401).json({ success: false, error: "Sessão inválida ou expirada. Faça login novamente." });
  }
  req.session = session;
  req.currentUser = session.user;
  next();
}

function requireAdmin(req, res, next) {
  const session = extractSession(req);
  if (!session || !session.user || !session.user.isAdmin) {
    return res.status(403).json({ success: false, error: "Acesso negado: privilégios de administrador necessários." });
  }
  req.session = session;
  req.currentUser = session.user;
  next();
}

// Configurações e credenciais administrativas do DOMjudge
function getAdminCredentials() {
  const adminUser = process.env.DOMJUDGE_ADMIN_USER || process.env.DOMJUDGE_API_USER || "";
  const adminPassword = process.env.DOMJUDGE_ADMIN_PASSWORD || process.env.DOMJUDGE_API_PASSWORD || "";
  const apiBase = (process.env.DOMJUDGE_API_BASE || "https://coderunner.cin.ufpe.br/api/v4").replace(/\/+$/, "");
  const adminLabel = (process.env.WIZARD_ADMIN_LABEL || "admin").trim().toLowerCase();
  const adminAuthHeader = `Basic ${Buffer.from(`${adminUser}:${adminPassword}`).toString("base64")}`;
  return { adminUser, adminPassword, apiBase, adminLabel, adminAuthHeader };
}

// Extrair labels customizadas do time do DOMjudge, removendo o username
function extractTeamLabels(rawTeam, username) {
  let labels = [];
  if (!rawTeam) return labels;
  if (Array.isArray(rawTeam.labels)) {
    labels = rawTeam.labels;
  } else if (rawTeam.label) {
    labels = String(rawTeam.label).split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  }
  const uname = (username || "").toLowerCase();
  return labels.filter((l) => l && l.toLowerCase() !== uname);
}

// Avaliar permissões e páginas com base nas labels e regras configuradas
function evaluatePermissions(userData, teamLabels) {
  const { adminUser, adminLabel } = getAdminCredentials();
  const uname = (userData.username || "").toLowerCase();
  const roles = Array.isArray(userData.roles) ? userData.roles : [];
  const normalizedLabels = (teamLabels || []).map((l) => String(l).trim().toLowerCase());

  // 1. Verificação de Admin Raiz
  const isDomjudgeAdmin = roles.includes("admin") || (adminUser && uname === adminUser.toLowerCase());
  const hasAdminLabel = normalizedLabels.includes(adminLabel);

  const permissionsList = storage.getLabelPermissions();
  const adminRule = permissionsList.find((p) => p.isAdmin && normalizedLabels.includes(String(p.label).trim().toLowerCase()));

  const isAdmin = Boolean(isDomjudgeAdmin || hasAdminLabel || adminRule);

  if (isAdmin) {
    return {
      isAuthorized: true,
      isAdmin: true,
      allowedPages: ["review", "creator", "contests", "users", "codes", "permissions", "trocar-senha"],
    };
  }

  // 2. Verificação de permissões concedidas pelas labels customizadas
  const allowedPagesSet = new Set();
  for (const perm of permissionsList) {
    const permLabel = String(perm.label || "").trim().toLowerCase();
    if (normalizedLabels.includes(permLabel)) {
      if (perm.isAdmin) {
        return {
          isAuthorized: true,
          isAdmin: true,
          allowedPages: ["review", "creator", "contests", "users", "codes", "permissions", "trocar-senha"],
        };
      }
      (perm.allowedPages || []).forEach((page) => allowedPagesSet.add(page));
    }
  }

  if (allowedPagesSet.size > 0) {
    allowedPagesSet.add("trocar-senha");
    return {
      isAuthorized: true,
      isAdmin: false,
      allowedPages: Array.from(allowedPagesSet),
    };
  }

  return {
    isAuthorized: false,
    isAdmin: false,
    allowedPages: [],
  };
}

// Instância compartilhada do Puppeteer para alta performance
let browserInstance = null;

async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  const launchOptions = {
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=medium",
    ],
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  browserInstance = await puppeteer.launch(launchOptions);
  return browserInstance;
}

async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (e) {
      console.warn("Aviso ao encerrar Puppeteer:", e.message);
    }
    browserInstance = null;
  }
}

process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});

// Endpoint dinâmico de configuração com variáveis de ambiente públicas
app.get("/config.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  const config = {
    DOMJUDGE_API_BASE: process.env.DOMJUDGE_API_BASE || "https://coderunner.cin.ufpe.br/api/v4",
    WIZARD_ADMIN_LABEL: process.env.WIZARD_ADMIN_LABEL || "admin",
    STORAGE_EXPIRATION_DAYS: Number(process.env.STORAGE_EXPIRATION_DAYS) || 7,
  };
  res.send(`window.__ENV__ = ${JSON.stringify(config, null, 2)};\n`);
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    puppeteer: Boolean(browserInstance && browserInstance.isConnected()),
    activeSessionsCount: activeSessions.size,
  });
});

// ==============================================================================
// AUTENTICAÇÃO CENTRALIZADA VIA DOMJUDGE & CONTROLE POR LABELS
// ==============================================================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Usuário e senha são obrigatórios." });
    }

    const trimmedUser = String(username).trim();
    const { apiBase, adminAuthHeader } = getAdminCredentials();

    // 1. Validar usuário contra a API do DOMjudge
    const userAuthHeader = `Basic ${Buffer.from(`${trimmedUser}:${password}`).toString("base64")}`;
    let resUser;
    try {
      resUser = await fetch(`${apiBase}/user`, {
        headers: { Authorization: userAuthHeader, Accept: "application/json" },
      });
    } catch (netErr) {
      console.error("Erro ao conectar no DOMjudge para login:", netErr);
      return res.status(502).json({
        success: false,
        error: "Não foi possível conectar ao servidor DOMjudge. Tente novamente mais tarde.",
      });
    }

    if (resUser.status === 401 || resUser.status === 403) {
      return res.status(401).json({ success: false, error: "Usuário ou senha inválidos no DOMjudge." });
    }

    if (!resUser.ok) {
      const errTxt = await resUser.text().catch(() => "");
      return res.status(resUser.status).json({
        success: false,
        error: `Falha na autenticação com o DOMjudge (HTTP ${resUser.status}): ${errTxt}`,
      });
    }

    const userData = await resUser.json();

    // 2. Buscar o time do usuário no DOMjudge para obter as labels
    let teamLabels = [];
    if (userData.team_id) {
      try {
        const resTeam = await fetch(`${apiBase}/teams/${encodeURIComponent(userData.team_id)}`, {
          headers: { Authorization: adminAuthHeader, Accept: "application/json" },
        });
        if (resTeam.ok) {
          const teamData = await resTeam.json();
          teamLabels = extractTeamLabels(teamData, userData.username);
        }
      } catch (teamErr) {
        console.warn("Aviso ao buscar dados do time do usuário:", teamErr.message);
      }
    }

    // 3. Avaliar autorização e permissões de acesso ao Wizard
    const perms = evaluatePermissions(userData, teamLabels);

    if (!perms.isAuthorized) {
      return res.status(403).json({
        success: false,
        error: "Acesso não autorizado: sua conta do DOMjudge não possui nenhuma label autorizada para acessar o Wizard.",
        detectedLabels: teamLabels,
        roles: userData.roles || [],
      });
    }

    const userProfile = {
      id: String(userData.id || userData.username),
      username: userData.username,
      name: userData.name || userData.username,
      email: userData.email || null,
      roles: userData.roles || [],
      team_id: userData.team_id || null,
      labels: teamLabels,
      isAdmin: perms.isAdmin,
      allowedPages: perms.allowedPages,
    };

    const token = createSession(userProfile);

    return res.json({
      success: true,
      token,
      user: userProfile,
    });
  } catch (err) {
    console.error("Erro interno ao processar login:", err);
    return res.status(500).json({ success: false, error: "Erro interno no servidor ao processar autenticação." });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.currentUser,
  });
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers["authorization"] || "";
  let token = null;
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (req.headers["x-session-token"]) {
    token = String(req.headers["x-session-token"]).trim();
  }
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

// ==============================================================================
// GESTÃO ADMINISTRATIVA DE LABELS E PERMISSÕES (RBAC)
// ==============================================================================

app.get("/api/admin/permissions", requireAdmin, (req, res) => {
  const perms = storage.getLabelPermissions();
  res.json({ success: true, permissions: perms });
});

app.post("/api/admin/permissions", requireAdmin, (req, res) => {
  const { permissions } = req.body || {};
  if (!Array.isArray(permissions)) {
    return res.status(400).json({ success: false, error: "Formato inválido: 'permissions' deve ser um array." });
  }
  storage.saveLabelPermissions(permissions);
  res.json({ success: true, permissions });
});

// ==============================================================================
// GESTÃO ADMINISTRATIVA DE CÓDIGOS DE ACESSO
// ==============================================================================

app.get("/api/admin/codes", requireAdmin, (req, res) => {
  const codes = storage.getAccessCodes();
  res.json({ success: true, codes });
});

app.post("/api/admin/codes", requireAdmin, (req, res) => {
  const { code, name, labels, category, roles, active } = req.body || {};
  if (!code || typeof code !== "string" || !code.trim()) {
    return res.status(400).json({ success: false, error: "O código de acesso é obrigatório." });
  }
  const cleanCode = code.trim().toUpperCase();

  const codes = storage.getAccessCodes();
  if (codes.some((c) => c.code.toUpperCase() === cleanCode)) {
    return res.status(400).json({ success: false, error: `O código de acesso '${cleanCode}' já existe.` });
  }

  const newCode = {
    id: `code_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    code: cleanCode,
    name: name ? String(name).trim() : cleanCode,
    labels: Array.isArray(labels) ? labels.map((l) => String(l).trim()).filter(Boolean) : [],
    category: category ? String(category).trim() : "Participants",
    roles: Array.isArray(roles) && roles.length > 0 ? roles : ["team"],
    active: active !== undefined ? Boolean(active) : true,
    createdAt: new Date().toISOString(),
    usageCount: 0,
  };

  codes.push(newCode);
  storage.saveAccessCodes(codes);
  res.status(201).json({ success: true, code: newCode });
});

app.put("/api/admin/codes/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const codes = storage.getAccessCodes();
  const index = codes.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Código de acesso não encontrado." });
  }

  const { code, name, labels, category, roles, active } = req.body || {};
  if (code) {
    const cleanCode = String(code).trim().toUpperCase();
    const duplicate = codes.find((c) => c.id !== id && c.code.toUpperCase() === cleanCode);
    if (duplicate) {
      return res.status(400).json({ success: false, error: `Já existe outro código '${cleanCode}'.` });
    }
    codes[index].code = cleanCode;
  }
  if (name !== undefined) codes[index].name = String(name).trim();
  if (Array.isArray(labels)) {
    codes[index].labels = labels.map((l) => String(l).trim()).filter(Boolean);
  }
  if (category !== undefined) codes[index].category = String(category).trim();
  if (Array.isArray(roles)) codes[index].roles = roles;
  if (active !== undefined) codes[index].active = Boolean(active);

  storage.saveAccessCodes(codes);
  res.json({ success: true, code: codes[index] });
});

app.delete("/api/admin/codes/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  let codes = storage.getAccessCodes();
  const initialLength = codes.length;
  codes = codes.filter((c) => c.id !== id);
  if (codes.length === initialLength) {
    return res.status(404).json({ success: false, error: "Código de acesso não encontrado." });
  }
  storage.saveAccessCodes(codes);
  res.json({ success: true });
});

// ==============================================================================
// AUTO-CADASTRO DE USUÁRIO COM CÓDIGO DE ACESSO
// ==============================================================================

app.get("/api/register/validate/:code", (req, res) => {
  const codeParam = String(req.params.code || "").trim().toUpperCase();
  const codes = storage.getAccessCodes();
  const found = codes.find((c) => c.code.toUpperCase() === codeParam);

  if (!found) {
    return res.status(404).json({ success: false, error: "Código de acesso não encontrado." });
  }

  if (!found.active) {
    return res.status(400).json({
      success: false,
      active: false,
      error: "Este código de acesso está desativado pelo administrador e não aceita novos cadastros.",
    });
  }

  res.json({
    success: true,
    active: true,
    code: found.code,
    name: found.name,
    labels: found.labels,
    category: found.category,
  });
});

app.post("/api/register", async (req, res) => {
  try {
    const { code, username, name, email, password, confirmPassword } = req.body || {};

    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ success: false, error: "O código de acesso é obrigatório." });
    }
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ success: false, error: "O nome de usuário (login) é obrigatório." });
    }
    if (!password || typeof password !== "string") {
      return res.status(400).json({ success: false, error: "A senha é obrigatória." });
    }
    if (password.length < 10) {
      return res.status(400).json({ success: false, error: "A senha deve ter pelo menos 10 caracteres." });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ success: false, error: "A senha e a confirmação de senha não coincidem." });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,32}$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        error: "O nome de usuário deve conter de 2 a 32 caracteres (apenas letras minúsculas, números, hífen e underline).",
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const codes = storage.getAccessCodes();
    const foundCode = codes.find((c) => c.code.toUpperCase() === cleanCode);

    if (!foundCode) {
      return res.status(404).json({ success: false, error: "Código de acesso não encontrado." });
    }
    if (!foundCode.active) {
      return res.status(400).json({
        success: false,
        error: "Este código de acesso está desativado e não permite novos cadastros.",
      });
    }

    const { apiBase, adminAuthHeader } = getAdminCredentials();
    const fullName = name && String(name).trim() ? String(name).trim() : cleanUsername;
    const userEmail = email && String(email).trim() ? String(email).trim() : null;

    // 1. Verificar se usuário já existe no DOMjudge
    try {
      const resExisting = await fetch(`${apiBase}/users`, {
        headers: { Authorization: adminAuthHeader, Accept: "application/json" },
      });
      if (resExisting.ok) {
        const usersList = await resExisting.json();
        if (Array.isArray(usersList) && usersList.some((u) => (u.username || "").toLowerCase() === cleanUsername)) {
          return res.status(400).json({
            success: false,
            error: `O nome de usuário '${cleanUsername}' já está cadastrado no DOMjudge. Escolha outro.`,
          });
        }
      }
    } catch (checkErr) {
      console.warn("Aviso ao verificar existência do usuário no DOMjudge:", checkErr.message);
    }

    // 2. Criar Time com a label padrão [username] + labels do código de acesso
    const combinedLabels = [cleanUsername, ...(foundCode.labels || [])].filter(Boolean);
    const labelStr = combinedLabels.join(", ");
    const teamPayload = [
      {
        id: cleanUsername,
        name: fullName,
        group_ids: [foundCode.category || "participants"],
        label: labelStr,
      },
    ];

    const fdTeams = new FormData();
    fdTeams.append("json", new Blob([JSON.stringify(teamPayload)], { type: "application/json" }), "teams.json");

    const resTeamCreate = await fetch(`${apiBase}/users/teams`, {
      method: "POST",
      headers: { Authorization: adminAuthHeader },
      body: fdTeams,
    });

    if (!resTeamCreate.ok) {
      const errTeamTxt = await resTeamCreate.text().catch(() => "");
      console.error("Erro retornado pelo DOMjudge ao criar time:", resTeamCreate.status, errTeamTxt);
      return res.status(500).json({
        success: false,
        error: `Falha ao registrar equipe/perfil no DOMjudge: ${errTeamTxt || resTeamCreate.statusText}`,
      });
    }

    // 3. Criar Conta de Usuário associada ao Time
    const roles = Array.isArray(foundCode.roles) && foundCode.roles.length > 0 ? foundCode.roles : ["team"];
    const isAdmin = roles.includes("admin");
    const isJury = roles.includes("jury");
    const type = isAdmin ? "admin" : (isJury ? "jury" : "team");

    const accountsPayload = [
      {
        type,
        name: fullName,
        username: cleanUsername,
        email: userEmail,
        team_id: cleanUsername,
        roles,
        password,
      },
    ];

    const fdAccounts = new FormData();
    fdAccounts.append("json", new Blob([JSON.stringify(accountsPayload)], { type: "application/json" }), "accounts.json");

    const resAccountCreate = await fetch(`${apiBase}/users/accounts`, {
      method: "POST",
      headers: { Authorization: adminAuthHeader },
      body: fdAccounts,
    });

    if (!resAccountCreate.ok) {
      const errAccTxt = await resAccountCreate.text().catch(() => "");
      console.error("Erro retornado pelo DOMjudge ao criar conta:", resAccountCreate.status, errAccTxt);
      return res.status(500).json({
        success: false,
        error: `Falha ao registrar credenciais no DOMjudge: ${errAccTxt || resAccountCreate.statusText}`,
      });
    }

    // 4. Incrementar contagem de utilizações do código de acesso
    foundCode.usageCount = (foundCode.usageCount || 0) + 1;
    storage.saveAccessCodes(codes);

    return res.status(201).json({
      success: true,
      message: "Conta criada com sucesso! Você já pode utilizar o DOMjudge e o Wizard com suas credenciais.",
      username: cleanUsername,
      labels: combinedLabels,
    });
  } catch (err) {
    console.error("Erro interno no registro com código de acesso:", err);
    return res.status(500).json({
      success: false,
      error: "Ocorreu um erro interno ao processar o cadastro. Tente novamente mais tarde.",
    });
  }
});

// ==============================================================================
// PROXY TRANSPARENTE PARA A API DO DOMJUDGE (Elimina problemas de CORS)
// ==============================================================================

app.all("/api/domjudge/*", requireAuth, async (req, res) => {
  try {
    const { apiBase, adminAuthHeader } = getAdminCredentials();
    const subpath = req.originalUrl.replace(/^\/api\/domjudge/, "");
    const targetUrl = `${apiBase}${subpath}`;

    const headers = {
      Authorization: adminAuthHeader,
      Accept: req.headers["accept"] || "application/json",
    };

    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (["POST", "PUT", "PATCH"].includes(req.method.toUpperCase())) {
      if (req.body && typeof req.body === "object") {
        headers["Content-Type"] = "application/json";
        fetchOptions.body = JSON.stringify(req.body);
      }
    }

    const domjudgeRes = await fetch(targetUrl, fetchOptions);
    const contentType = domjudgeRes.headers.get("content-type") || "";

    res.status(domjudgeRes.status);
    if (contentType.includes("application/json")) {
      const data = await domjudgeRes.json();
      return res.json(data);
    } else {
      const text = await domjudgeRes.text();
      return res.send(text);
    }
  } catch (err) {
    console.error("Erro no proxy do DOMjudge:", err.message);
    res.status(502).json({ success: false, error: `Falha na ponte com DOMjudge: ${err.message}` });
  }
});

// ==============================================================================
// SERVIÇO PUPPETEER PDF
// ==============================================================================

app.post("/api/pdf", async (req, res) => {
  let page = null;
  try {
    const { html, title } = req.body;
    if (!html || typeof html !== "string") {
      return res.status(400).json({ error: "Campo 'html' é obrigatório e deve ser uma string." });
    }

    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    await page.emulateMediaType("print");

    await page.setContent(html, {
      waitUntil: "load",
      timeout: 15000,
    });
    try {
      await page.evaluateHandle("document.fonts.ready");
    } catch (fontErr) {}

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "14mm",
        bottom: "14mm",
        left: "14mm",
      },
      displayHeaderFooter: false,
    });

    const safeTitle = title
      ? `${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "problem"}.pdf`
      : "problem.pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error("Erro ao gerar PDF via Puppeteer:", err);
    res.status(500).json({ error: `Erro ao processar PDF: ${err.message}` });
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.warn("Aviso ao fechar página Puppeteer:", e.message);
      }
    }
  }
});

// ==============================================================================
// ENDPOINT DE TROCA DE SENHA
// ==============================================================================

app.post("/api/change-password", async (req, res) => {
  try {
    const { username, currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ success: false, error: "O usuário é obrigatório." });
    }
    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({ success: false, error: "A senha anterior é obrigatória." });
    }
    if (!newPassword || typeof newPassword !== "string") {
      return res.status(400).json({ success: false, error: "A nova senha é obrigatória." });
    }

    const trimmedUsername = username.trim();

    if (newPassword.length < 10) {
      return res.status(400).json({
        success: false,
        error: "A nova senha deve ter pelo menos 10 caracteres.",
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "A nova senha e a confirmação de senha não coincidem.",
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        success: false,
        error: "A nova senha deve ser diferente da senha anterior.",
      });
    }

    const { apiBase, adminAuthHeader } = getAdminCredentials();

    // 1. Validar login e senha anterior via GET /api/v4/user
    const userAuthHeader = `Basic ${Buffer.from(`${trimmedUsername}:${currentPassword}`).toString("base64")}`;
    let resUser;
    try {
      resUser = await fetch(`${apiBase}/user`, {
        headers: { Authorization: userAuthHeader },
      });
    } catch (networkErr) {
      console.error("Erro de conexão ao validar usuário com DOMjudge:", networkErr);
      return res.status(502).json({
        success: false,
        error: "Não foi possível conectar ao servidor DOMjudge. Tente novamente mais tarde.",
      });
    }

    if (resUser.status === 401 || resUser.status === 403) {
      return res.status(401).json({
        success: false,
        error: "Usuário ou senha anterior inválidos.",
      });
    }

    if (!resUser.ok) {
      const errTxt = await resUser.text().catch(() => "");
      return res.status(resUser.status).json({
        success: false,
        error: `Falha ao validar credenciais no DOMjudge: ${errTxt}`,
      });
    }

    const userData = await resUser.json();

    if (userData.username && userData.username.toLowerCase() !== trimmedUsername.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: "Usuário ou senha anterior inválidos.",
      });
    }

    // 2. Montar payload do usuário preservando todos os atributos e aplicando a nova senha
    const roles = Array.isArray(userData.roles) && userData.roles.length > 0 ? userData.roles : ["team"];
    const isAdmin = roles.includes("admin");
    const isJury = roles.includes("jury");
    const type = userData.type || (isAdmin ? "admin" : (isJury ? "jury" : "team"));

    const accountsToSync = [
      {
        type,
        name: userData.name || userData.username,
        username: userData.username,
        email: userData.email || null,
        team_id: userData.team_id || null,
        roles,
        password: newPassword,
      },
    ];

    const fd = new FormData();
    fd.append("json", new Blob([JSON.stringify(accountsToSync)], { type: "application/json" }), "accounts.json");

    let resUpdate;
    try {
      resUpdate = await fetch(`${apiBase}/users/accounts`, {
        method: "POST",
        headers: { Authorization: adminAuthHeader },
        body: fd,
      });
    } catch (updateErr) {
      console.error("Erro de conexão ao atualizar senha via admin:", updateErr);
      return res.status(502).json({
        success: false,
        error: "Não foi possível conectar ao DOMjudge para atualizar a senha.",
      });
    }

    if (!resUpdate.ok) {
      const updateErrTxt = await resUpdate.text().catch(() => "");
      console.error("Erro retornado pelo DOMjudge ao atualizar conta:", resUpdate.status, updateErrTxt);
      return res.status(500).json({
        success: false,
        error: "O servidor DOMjudge recusou a atualização de senha.",
      });
    }

    return res.json({
      success: true,
      message: "Senha alterada com sucesso! Você já pode utilizar a sua nova senha para acessar o DOMjudge.",
    });
  } catch (err) {
    console.error("Erro interno ao processar troca de senha:", err);
    return res.status(500).json({
      success: false,
      error: "Ocorreu um erro interno ao processar a solicitação. Tente novamente mais tarde.",
    });
  }
});

// ==============================================================================
// ROTAS AMIGÁVEIS STANDALONE (SPA)
// ==============================================================================

app.get(["/trocar-senha", "/change-password", "/cadastro", "/register", "/criar-conta"], (req, res) => {
  const distPath = path.join(__dirname, "dist");
  if (fs.existsSync(distPath)) {
    res.sendFile(path.join(distPath, "index.html"));
  } else {
    res.sendFile(path.join(__dirname, "index.html"));
  }
});

// Servir arquivos estáticos (priorizar dist se compilado)
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  app.use(express.static(__dirname));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor DOMjudge Wizard 2.0 rodando na porta ${PORT} (http://localhost:${PORT})`);
  console.log(`📄 Motor Puppeteer PDF pronto em POST /api/pdf`);
  console.log(`🔐 Autenticação DOMjudge & Gestão de Labels prontos em /api/auth e /api/admin`);
});
