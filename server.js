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
