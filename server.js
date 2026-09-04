const express = require("express");
const cors = require("cors");
const path = require("path");
const puppeteer = require("puppeteer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 7070;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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

// Endpoint dinâmico de configuração com variáveis de ambiente
app.get("/config.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  const config = {
    DOMJUDGE_API_BASE: process.env.DOMJUDGE_API_BASE || "https://coderunner.cin.ufpe.br/api/v4",
    DOMJUDGE_API_USER: process.env.DOMJUDGE_API_USER || "",
    DOMJUDGE_API_PASSWORD: process.env.DOMJUDGE_API_PASSWORD || "",
    STORAGE_EXPIRATION_DAYS: Number(process.env.STORAGE_EXPIRATION_DAYS) || 7,
  };
  res.send(`window.__ENV__ = ${JSON.stringify(config, null, 2)};\n`);
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    puppeteer: Boolean(browserInstance && browserInstance.isConnected()),
  });
});

// Endpoint de geração de PDF com Puppeteer (Headless Chrome)
app.post("/api/pdf", async (req, res) => {
  let page = null;
  try {
    const { html, title } = req.body;
    if (!html || typeof html !== "string") {
      return res.status(400).json({ error: "Campo 'html' é obrigatório e deve ser uma string." });
    }

    const browser = await getBrowser();
    page = await browser.newPage();

    // Viewport de alta densidade para renderização perfeita
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    // Emular mídia 'print' para CSS paged media e quebras de página
    await page.emulateMediaType("print");

    // Carregar HTML e aguardar fontes e estilos (KaTeX, Highlight.js)
    await page.setContent(html, {
      waitUntil: "load",
      timeout: 15000,
    });
    try {
      await page.evaluateHandle("document.fonts.ready");
    } catch (fontErr) {}

    // Gerar PDF vetorial nativo do Chrome
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

// Endpoint de alteração de senha de usuário comum
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

    // Requisito 2.1: a senha precisa ter pelo menos 10 caracteres
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

    const apiBase = (process.env.DOMJUDGE_API_BASE || "https://coderunner.cin.ufpe.br/api/v4").replace(/\/+$/, "");

    // 1. Validar login e senha anterior via GET /api/v4/user com Basic Auth do próprio usuário
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
      console.error("Erro inesperado na validação do usuário:", resUser.status, errTxt);
      return res.status(resUser.status).json({
        success: false,
        error: "Falha ao validar credenciais no DOMjudge.",
      });
    }

    const userData = await resUser.json();

    // Verificação de segurança: garantir correspondência exata de username
    if (userData.username && userData.username.toLowerCase() !== trimmedUsername.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: "Usuário ou senha anterior inválidos.",
      });
    }

    // 2. Obter credenciais de admin configuradas no servidor para gerenciar contas
    const adminUser = process.env.DOMJUDGE_ADMIN_USER || process.env.DOMJUDGE_API_USER;
    const adminPassword = process.env.DOMJUDGE_ADMIN_PASSWORD || process.env.DOMJUDGE_API_PASSWORD;

    if (!adminUser || !adminPassword) {
      console.error("Credenciais de administrador não configuradas no ambiente (.env).");
      return res.status(500).json({
        success: false,
        error: "Configuração do servidor incompleta: credenciais administrativas não definidas.",
      });
    }

    // 3. Montar payload do usuário preservando todos os atributos e aplicando a nova senha
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

    const adminAuthHeader = `Basic ${Buffer.from(`${adminUser}:${adminPassword}`).toString("base64")}`;
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

// Rotas amigáveis para a página avulsa e isolada de troca de senha
app.get(["/trocar-senha", "/change-password"], (req, res) => {
  res.sendFile(path.join(__dirname, "trocar-senha.html"));
});

// Servir arquivos estáticos do diretório raiz
app.use(express.static(__dirname));

// Fallback SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor DOMjudge Wizard rodando na porta ${PORT} (http://localhost:${PORT})`);
  console.log(`📄 Motor Puppeteer PDF pronto em POST /api/pdf`);
});
