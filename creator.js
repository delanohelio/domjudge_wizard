// ============================================================================
// DOMJUDGE WIZARD - CRIADOR DE QUESTÕES COM MARKDOWN STUDIO
// ============================================================================

const CreatorModule = (() => {
  const els = {
    creatorName: document.getElementById("creatorName"),
    creatorShortname: document.getElementById("creatorShortname"),
    creatorTime: document.getElementById("creatorTime"),
    creatorMemory: document.getElementById("creatorMemory"),
    creatorProblemId: document.getElementById("creatorProblemId"),
    creatorMarkdown: document.getElementById("creatorMarkdown"),
    markdownPreview: document.getElementById("markdownPreview"),
    mdWorkspace: document.getElementById("mdWorkspace"),
    testsContainer: document.getElementById("testsContainer"),
    importZipInput: document.getElementById("importZipInput"),
    importZipBtn: document.getElementById("importZipBtn"),
    addSampleTest: document.getElementById("addSampleTest"),
    addSecretTest: document.getElementById("addSecretTest"),
    insertSampleTableBtn: document.getElementById("insertSampleTableBtn"),
    downloadPdfBtn: document.getElementById("downloadPdfBtn"),
    downloadZipBtn: document.getElementById("downloadZipBtn"),
    sendToDomjudgeBtn: document.getElementById("sendToDomjudgeBtn"),
    includePdfCheckbox: document.getElementById("includePdfCheckbox"),
    creatorFeedback: document.getElementById("creatorFeedback"),
  };

  let testCounter = 0;
  let debounceTimer = null;

  function showToast(msg, type = "info") {
    if (window.showToast) {
      window.showToast(msg, type);
    } else {
      console.log(`[${type}] ${msg}`);
    }
  }

  function setFeedback(msg, isError = false) {
    if (els.creatorFeedback) {
      els.creatorFeedback.textContent = msg;
      els.creatorFeedback.style.color = isError ? "var(--danger)" : "var(--ink-muted)";
    }
  }

  function sanitize(text) {
    return String(text ?? "").replace(/[<>]/g, "");
  }

  function slugify(text) {
    return (
      String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "problema"
    );
  }

  // Parse Markdown com proteção para equações KaTeX ($...$ e $$...$$)
  function parseMdWithMath(markdownText) {
    const placeholders = [];
    let text = markdownText || "";

    // Proteger blocos de equação centralizada $$...$$
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
      const id = `MATHPLACEHOLDER${placeholders.length}END`;
      placeholders.push({ id, tex, display: true });
      return id;
    });

    // Proteger fórmulas inline $...$
    text = text.replace(/\$([^\$\n]+?)\$/g, (_, tex) => {
      const id = `MATHPLACEHOLDER${placeholders.length}END`;
      placeholders.push({ id, tex, display: false });
      return id;
    });

    let html = window.marked ? window.marked.parse(text) : sanitize(text);

    placeholders.forEach(({ id, tex, display }) => {
      let rendered;
      if (window.katex) {
        try {
          rendered = window.katex.renderToString(tex, {
            displayMode: display,
            throwOnError: false,
          });
        } catch (e) {
          rendered = sanitize(display ? `$$${tex}$$` : `$${tex}$`);
        }
      } else {
        rendered = sanitize(display ? `$$${tex}$$` : `$${tex}$`);
      }
      html = html.replace(id, rendered);
    });

    return html;
  }

  function highlightCodeBlocks(container) {
    if (!container || !window.hljs) return;
    container.querySelectorAll("pre code").forEach((codeEl) => {
      window.hljs.highlightElement(codeEl);
    });
  }

  function renderPreview() {
    if (!els.markdownPreview || !els.creatorMarkdown) return;
    const raw = els.creatorMarkdown.value;
    if (!raw.trim()) {
      els.markdownPreview.innerHTML =
        '<p style="color: var(--ink-muted); font-style: italic;">O preview do enunciado aparecerá aqui conforme você digita...</p>';
      return;
    }
    els.markdownPreview.innerHTML = parseMdWithMath(raw);
    highlightCodeBlocks(els.markdownPreview);
  }

  function triggerLivePreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderPreview, 120);
  }

  // --------------------------------------------------------------------------
  // TOOLBAR & ATALHOS DO MARKDOWN STUDIO
  // --------------------------------------------------------------------------
  function insertFormatting(prefix, suffix = "", defaultText = "") {
    const textarea = els.creatorMarkdown;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end) || defaultText;
    const replacement = prefix + selected + suffix;

    textarea.setRangeText(replacement, start, end, "select");
    textarea.focus();

    // Se inseriu sem texto selecionado, posiciona o cursor entre o prefixo e sufixo
    if (start === end) {
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }
    triggerLivePreview();
  }

  function insertTemplateICPC() {
    const template = `# \${1:Título do Problema}

Descrição contextualizada do problema aqui. Explique a motivação e a tarefa com clareza. Você pode utilizar fórmulas matemáticas como $N \\le 10^5$ e $\\mathcal{O}(N \\log N)$.

## Entrada
A primeira linha contém um inteiro $T$ indicando o número de casos de teste. Cada caso consiste de...

## Saída
Para cada caso de teste, imprima a resposta requerida em uma única linha.

## Exemplos
| Entrada | Saída |
|---|---|
| \`4\`<br>\`1 2 3 4\` | \`10\` |

## Notas
Explicações adicionais sobre os casos de teste de exemplo.
`;
    const textarea = els.creatorMarkdown;
    if (!textarea) return;

    if (textarea.value.trim() && !confirm("Deseja substituir o conteúdo atual pelo Template Padrão ICPC/OBI?")) {
      return;
    }

    textarea.value = template;
    textarea.focus();
    renderPreview();
    showToast("Template ICPC/OBI inserido com sucesso!", "success");
  }

  function insertSampleTableFromTests() {
    const sampleCards = Array.from(
      els.testsContainer ? els.testsContainer.querySelectorAll('.test-card[data-type="sample"]') : []
    );

    if (sampleCards.length === 0) {
      showToast("Nenhum caso de teste 'Sample' encontrado para gerar a tabela.", "warning");
      return;
    }

    let tableMd = `\n## Exemplos de Entrada e Saída\n\n| Exemplo de Entrada | Exemplo de Saída |\n|---|---|\n`;

    sampleCards.forEach((card, idx) => {
      const inText = card.querySelector('textarea[data-kind="in"]')?.value || "";
      const outText = card.querySelector('textarea[data-kind="out"]')?.value || "";

      const formattedIn = inText.trim().replace(/\n/g, "<br>");
      const formattedOut = outText.trim().replace(/\n/g, "<br>");

      tableMd += `| \`${formattedIn}\` | \`${formattedOut}\` |\n`;
    });

    tableMd += "\n";

    const textarea = els.creatorMarkdown;
    if (textarea) {
      textarea.value += tableMd;
      renderPreview();
      showToast("Tabela de exemplos gerada a partir dos testes cadastrados!", "success");
    }
  }

  function setupToolbar() {
    document.querySelectorAll(".md-toolbar-btn[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        switch (action) {
          case "h1":
            insertFormatting("# ", "", "Título 1");
            break;
          case "h2":
            insertFormatting("## ", "", "Subtítulo 2");
            break;
          case "h3":
            insertFormatting("### ", "", "Seção 3");
            break;
          case "bold":
            insertFormatting("**", "**", "texto em negrito");
            break;
          case "italic":
            insertFormatting("*", "*", "texto em itálico");
            break;
          case "code":
            insertFormatting("`", "`", "código");
            break;
          case "codeblock":
            insertFormatting("```cpp\n", "\n```", "// seu código aqui");
            break;
          case "math-inline":
            insertFormatting("$", "$", "\\mathcal{O}(N)");
            break;
          case "math-block":
            insertFormatting("$$\n", "\n$$", "\\sum_{i=1}^{n} a_i");
            break;
          case "table":
            insertFormatting(
              "\n| Coluna 1 | Coluna 2 |\n|---|---|\n| Dado A | Dado B |\n\n"
            );
            break;
          case "template-icpc":
            insertTemplateICPC();
            break;
        }
      });
    });

    if (els.insertSampleTableBtn) {
      els.insertSampleTableBtn.addEventListener("click", insertSampleTableFromTests);
    }

    // Alternância de modo de visualização do Markdown Studio
    document.querySelectorAll(".md-view-btn[data-view-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".md-view-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const mode = btn.getAttribute("data-view-mode");
        if (els.mdWorkspace) {
          els.mdWorkspace.className = `md-workspace mode-${mode}`;
        }
      });
    });

    // Atalhos de teclado no textarea
    if (els.creatorMarkdown) {
      els.creatorMarkdown.addEventListener("input", triggerLivePreview);

      els.creatorMarkdown.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
          e.preventDefault();
          insertFormatting("**", "**", "texto em negrito");
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
          e.preventDefault();
          insertFormatting("*", "*", "texto em itálico");
        } else if (e.key === "Tab") {
          e.preventDefault();
          const start = els.creatorMarkdown.selectionStart;
          const end = els.creatorMarkdown.selectionEnd;
          els.creatorMarkdown.setRangeText("  ", start, end, "end");
          triggerLivePreview();
        }
      });
    }
  }

  // --------------------------------------------------------------------------
  // GERENCIAMENTO DE CASOS DE TESTE (SAMPLE & SECRET)
  // --------------------------------------------------------------------------
  function createTestCard(type = "sample", initialIn = "", initialOut = "") {
    testCounter += 1;
    const testId = `test_${testCounter}`;
    const card = document.createElement("div");
    card.className = "test-card";
    card.dataset.type = type;
    card.id = testId;

    const badgeClass = type === "sample" ? "pill-category" : "pill-role";
    const badgeText = type === "sample" ? "Sample (Exemplo Público)" : "Secret (Teste Oculto)";

    card.innerHTML = `
      <div class="test-card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="pill ${badgeClass}">${badgeText}</span>
          <strong style="font-size: 0.85rem; font-family: var(--font-mono);">#${testCounter}</strong>
        </div>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn-sm dim btn-dup" title="Duplicar Caso de Teste">📋 Duplicar</button>
          <button type="button" class="btn-sm danger btn-del" title="Excluir Caso de Teste">🗑️ Excluir</button>
        </div>
      </div>
      <div class="test-grid">
        <div class="test-field">
          <label>Entrada (.in)</label>
          <textarea data-kind="in" placeholder="Cole a entrada do teste aqui...">${sanitize(initialIn)}</textarea>
        </div>
        <div class="test-field">
          <label>Saída Esperada (.ans / .out)</label>
          <textarea data-kind="out" placeholder="Cole a saída esperada aqui...">${sanitize(initialOut)}</textarea>
        </div>
      </div>
    `;

    card.querySelector(".btn-del").addEventListener("click", () => {
      card.remove();
      showToast(`Caso de teste #${testCounter} removido.`, "info");
    });

    card.querySelector(".btn-dup").addEventListener("click", () => {
      const inVal = card.querySelector('textarea[data-kind="in"]').value;
      const outVal = card.querySelector('textarea[data-kind="out"]').value;
      createTestCard(type, inVal, outVal);
      showToast("Caso de teste duplicado!", "success");
    });

    if (els.testsContainer) {
      els.testsContainer.appendChild(card);
    }
  }

  function clearAllTests() {
    if (els.testsContainer) {
      els.testsContainer.innerHTML = "";
    }
    testCounter = 0;
  }

  // --------------------------------------------------------------------------
  // GERAÇÃO DE PDF E PACOTE ZIP
  // --------------------------------------------------------------------------
  function buildProblemHtml(markdownText) {
    const body = parseMdWithMath(markdownText);
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${sanitize(els.creatorName?.value || "Problema")}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; padding: 24px; color: #111827; }
    h1 { font-size: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; }
    h2 { font-size: 18px; margin-top: 20px; margin-bottom: 8px; color: #1f2937; }
    pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; }
    code { font-family: monospace; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
    th { background: #f9fafb; font-weight: bold; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
  }

  async function generatePdfBlob() {
    if (!window.html2pdf) {
      throw new Error("Biblioteca html2pdf não carregada.");
    }
    const container = document.createElement("div");
    container.style.padding = "24px";
    container.style.background = "#fff";
    container.style.color = "#000";
    container.style.fontFamily = "Arial, sans-serif";
    container.innerHTML = parseMdWithMath(els.creatorMarkdown?.value || "");

    const opt = {
      margin: 15,
      filename: "problem.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    return await window.html2pdf().set(opt).from(container).outputPdf("blob");
  }

  async function downloadPdf() {
    try {
      showToast("Gerando PDF do enunciado...", "info");
      const blob = await generatePdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(els.creatorName?.value || "problem")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("PDF baixado com sucesso!", "success");
    } catch (err) {
      showToast(`Erro ao gerar PDF: ${err.message}`, "error");
    }
  }

  function collectTestsData() {
    const cards = Array.from(
      els.testsContainer ? els.testsContainer.querySelectorAll(".test-card") : []
    );
    const samples = [];
    const secrets = [];

    cards.forEach((card) => {
      const type = card.dataset.type || "sample";
      const inVal = card.querySelector('textarea[data-kind="in"]')?.value || "";
      const outVal = card.querySelector('textarea[data-kind="out"]')?.value || "";

      if (type === "sample") {
        samples.push({ in: inVal, out: outVal });
      } else {
        secrets.push({ in: inVal, out: outVal });
      }
    });

    return { samples, secrets };
  }

  async function generateZipBlob() {
    if (!window.JSZip) {
      throw new Error("Biblioteca JSZip não carregada.");
    }
    const zip = new window.JSZip();
    const name = els.creatorName?.value?.trim() || "Problema";
    const shortname = els.creatorShortname?.value?.trim() || slugify(name);
    const timeLimit = parseFloat(els.creatorTime?.value) || 1.0;
    const memoryLimit = parseInt(els.creatorMemory?.value, 10) || 512;
    const markdown = els.creatorMarkdown?.value || "";

    // problem.yaml
    const problemYaml = `name: "${name}"\nlimits:\n  time: ${timeLimit}\n  memory: ${memoryLimit}\n`;
    zip.file("problem.yaml", problemYaml);

    // domjudge-problem.ini
    const ini = `short-name = ${shortname}\nname = "${name}"\ntimelimit = ${timeLimit}\n`;
    zip.file("domjudge-problem.ini", ini);

    // problem.pdf / problem.html
    const htmlStatement = buildProblemHtml(markdown);
    zip.file("problem.html", htmlStatement);
    zip.file("statement.md", markdown);

    if (els.includePdfCheckbox?.checked) {
      try {
        const pdfBlob = await generatePdfBlob();
        zip.file("problem.pdf", pdfBlob);
      } catch (err) {
        console.warn("PDF não pôde ser anexado ao ZIP:", err);
      }
    }

    // Test cases (data/sample e data/secret)
    const { samples, secrets } = collectTestsData();
    const sampleFolder = zip.folder("data/sample");
    const secretFolder = zip.folder("data/secret");

    samples.forEach((test, idx) => {
      const prefix = `sample-${idx + 1}`;
      sampleFolder.file(`${prefix}.in`, test.in);
      sampleFolder.file(`${prefix}.ans`, test.out);
    });

    secrets.forEach((test, idx) => {
      const prefix = `secret-${idx + 1}`;
      secretFolder.file(`${prefix}.in`, test.in);
      secretFolder.file(`${prefix}.ans`, test.out);
    });

    return await zip.generateAsync({ type: "blob" });
  }

  async function downloadZip() {
    try {
      showToast("Empacotando problema em formato DOMjudge...", "info");
      const zipBlob = await generateZipBlob();
      const filename = `${slugify(els.creatorName?.value || "problem")}.zip`;
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Pacote ${filename} baixado com sucesso!`, "success");
    } catch (err) {
      showToast(`Erro ao gerar pacote ZIP: ${err.message}`, "error");
    }
  }

  // --------------------------------------------------------------------------
  // IMPORTAR PACOTE ZIP EXISTENTE
  // --------------------------------------------------------------------------
  async function importZipFile(file) {
    if (!file || !window.JSZip) return;
    try {
      showToast("Lendo estrutura do pacote ZIP...", "info");
      const zip = await window.JSZip.loadAsync(file);
      clearAllTests();

      // Ler statement.md ou problem.html
      const mdFile = zip.file("statement.md") || zip.file("problem.md");
      if (mdFile) {
        const content = await mdFile.async("string");
        if (els.creatorMarkdown) {
          els.creatorMarkdown.value = content;
          renderPreview();
        }
      }

      // Ler domjudge-problem.ini
      const iniFile = zip.file("domjudge-problem.ini");
      if (iniFile) {
        const iniText = await iniFile.async("string");
        const nameMatch = iniText.match(/name\s*=\s*"?([^"\n\r]+)"?/i);
        const shortMatch = iniText.match(/short-name\s*=\s*"?([^"\n\r]+)"?/i);
        const timeMatch = iniText.match(/timelimit\s*=\s*([0-9.]+)/i);

        if (nameMatch && els.creatorName) els.creatorName.value = nameMatch[1].trim();
        if (shortMatch && els.creatorShortname) els.creatorShortname.value = shortMatch[1].trim();
        if (timeMatch && els.creatorTime) els.creatorTime.value = timeMatch[1].trim();
      }

      // Ler testes sample e secret
      const filePaths = Object.keys(zip.files);
      const testMap = {};

      filePaths.forEach((path) => {
        const match = path.match(/^data\/(sample|secret)\/([^/]+)\.(in|ans|out)$/i);
        if (match) {
          const type = match[1].toLowerCase();
          const baseName = match[2];
          const ext = match[3].toLowerCase();
          const key = `${type}::${baseName}`;

          if (!testMap[key]) testMap[key] = { type, baseName };
          testMap[key][ext === "in" ? "inPath" : "outPath"] = path;
        }
      });

      for (const key of Object.keys(testMap)) {
        const item = testMap[key];
        let inContent = "";
        let outContent = "";

        if (item.inPath) {
          inContent = await zip.file(item.inPath).async("string");
        }
        if (item.outPath) {
          outContent = await zip.file(item.outPath).async("string");
        }

        createTestCard(item.type, inContent, outContent);
      }

      showToast("Pacote ZIP importado com sucesso!", "success");
    } catch (err) {
      showToast(`Falha ao importar ZIP: ${err.message}`, "error");
    }
  }

  // --------------------------------------------------------------------------
  // ENVIAR DIRETAMENTE PARA A API DO DOMJUDGE
  // --------------------------------------------------------------------------
  async function sendToDomjudge() {
    const creds = window.getApiCredentials ? window.getApiCredentials() : null;
    if (!creds || !creds.apiBase) {
      showToast("Sessão da API não configurada. Conecte-se primeiro.", "error");
      return;
    }

    try {
      showToast("Gerando pacote e enviando para o DOMjudge...", "info");
      const zipBlob = await generateZipBlob();
      const formData = new FormData();
      formData.append("zip", zipBlob, "problem.zip");

      const problemId = els.creatorProblemId?.value?.trim();
      let url = `${creds.apiBase}/problems`;
      let method = "POST";

      if (problemId) {
        url = `${creds.apiBase}/problems/${encodeURIComponent(problemId)}`;
        method = "PUT";
      }

      const headers = {};
      if (creds.user && creds.password) {
        headers["Authorization"] = `Basic ${btoa(`${creds.user}:${creds.password}`)}`;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errTxt = await res.text();
        throw new Error(`API HTTP ${res.status}: ${errTxt || res.statusText}`);
      }

      const json = await res.json().catch(() => ({}));
      const assignedId = json.id || problemId || "criado com sucesso";
      showToast(`Problema salvo no DOMjudge com ID: ${assignedId}`, "success");
      setFeedback(`Problema enviado com sucesso! ID: ${assignedId}`);
    } catch (err) {
      if (err.message && (err.message.includes("401") || err.message.includes("403"))) {
        if (window.handleApiUnauthorized) window.handleApiUnauthorized(err);
      }
      showToast(`Falha ao enviar para API: ${err.message}`, "error");
      setFeedback(`Erro ao enviar: ${err.message}`, true);
    }
  }

  // --------------------------------------------------------------------------
  // INICIALIZAÇÃO DO MÓDULO
  // --------------------------------------------------------------------------
  function init() {
    setupToolbar();

    if (els.addSampleTest) {
      els.addSampleTest.addEventListener("click", () => createTestCard("sample"));
    }
    if (els.addSecretTest) {
      els.addSecretTest.addEventListener("click", () => createTestCard("secret"));
    }
    if (els.downloadPdfBtn) {
      els.downloadPdfBtn.addEventListener("click", downloadPdf);
    }
    if (els.downloadZipBtn) {
      els.downloadZipBtn.addEventListener("click", downloadZip);
    }
    if (els.sendToDomjudgeBtn) {
      els.sendToDomjudgeBtn.addEventListener("click", sendToDomjudge);
    }

    if (els.importZipBtn && els.importZipInput) {
      els.importZipBtn.addEventListener("click", () => els.importZipInput.click());
      els.importZipInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) importZipFile(file);
      });
    }

    // Criar 1 sample de exemplo inicial
    if (els.testsContainer && els.testsContainer.children.length === 0) {
      createTestCard("sample", "4\n1 2 3 4", "10");
    }

    renderPreview();
  }

  return { init, renderPreview, createTestCard };
})();

document.addEventListener("DOMContentLoaded", () => {
  CreatorModule.init();
});
