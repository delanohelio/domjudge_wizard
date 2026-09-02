// ============================================================================
// DOMJUDGE WIZARD - CRIADOR DE QUESTÕES COM MARKDOWN STUDIO
// ============================================================================

const CreatorModule = (() => {
  const els = {
    creatorName: document.getElementById("creatorName"),
    creatorProblemId: document.getElementById("creatorProblemId"),
    creatorIsEditCheckbox: document.getElementById("creatorIsEditCheckbox"),
    creatorTime: document.getElementById("creatorTime"),
    creatorMemory: document.getElementById("creatorMemory"),
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

    // Permitir e interpretar tags HTML úteis dentro de tags <code>...</code>
    // (ex.: `4<br>1 2 3 4` em células de tabela de exemplos, formatações em código)
    html = html.replace(/<code\b([^>]*)>([\s\S]*?)<\/code>/gi, (match, attrs, codeContent) => {
      const decoded = codeContent
        .replace(/&lt;br\s*\/?&gt;/gi, "<br>")
        .replace(/&lt;(\/?(?:b|i|strong|em|u|s|del|span|sub|sup|small|mark|kbd|var)(?:\s+[^&>]*)?)&gt;/gi, "<$1>");
      return `<code${attrs}>${decoded}</code>`;
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
  function getPdfDocumentStyles() {
    return `
      <style>
        .pdf-render-root {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          color: #1e293b !important;
          background: #ffffff !important;
          padding: 20px 24px !important;
          box-sizing: border-box !important;
          width: 760px !important;
          line-height: 1.7 !important;
          font-size: 14px !important;
          letter-spacing: normal !important;
        }

        .pdf-header {
          margin-bottom: 20px !important;
          padding-bottom: 12px !important;
          border-bottom: 2px solid #e2e8f0 !important;
        }

        .pdf-title {
          margin: 0 0 8px 0 !important;
          font-size: 22px !important;
          font-weight: 700 !important;
          color: #0f172a !important;
          line-height: 1.25 !important;
        }

        .pdf-meta {
          font-size: 12.5px !important;
          color: #64748b !important;
          display: flex !important;
          gap: 20px !important;
        }

        .pdf-meta strong {
          color: #1e293b !important;
        }

        /* Títulos com espaçamento idêntico ao HTML */
        .pdf-render-root h1 {
          font-size: 22px !important;
          font-weight: 700 !important;
          color: #0f172a !important;
          margin-top: 24px !important;
          margin-bottom: 14px !important;
          padding-bottom: 8px !important;
          border-bottom: 2px solid #e2e8f0 !important;
          line-height: 1.3 !important;
          page-break-after: avoid !important;
        }
        .pdf-render-root h1:first-child {
          margin-top: 0 !important;
        }

        .pdf-render-root h2 {
          font-size: 17px !important;
          font-weight: 700 !important;
          color: #0f172a !important;
          margin-top: 22px !important;
          margin-bottom: 10px !important;
          line-height: 1.35 !important;
          page-break-after: avoid !important;
        }

        .pdf-render-root h3 {
          font-size: 15px !important;
          font-weight: 600 !important;
          color: #1e293b !important;
          margin-top: 18px !important;
          margin-bottom: 8px !important;
          line-height: 1.4 !important;
          page-break-after: avoid !important;
        }

        .pdf-render-root h4 {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #334155 !important;
          margin-top: 14px !important;
          margin-bottom: 6px !important;
          page-break-after: avoid !important;
        }

        /* Parágrafos e espaçamento entre elementos de texto */
        .pdf-render-root p {
          margin-top: 0 !important;
          margin-bottom: 14px !important;
          line-height: 1.7 !important;
          color: #1e293b !important;
        }

        /* Listas */
        .pdf-render-root ul,
        .pdf-render-root ol {
          margin-top: 0 !important;
          margin-bottom: 14px !important;
          padding-left: 26px !important;
          line-height: 1.7 !important;
        }

        .pdf-render-root li {
          margin-bottom: 6px !important;
          color: #1e293b !important;
        }

        /* Código em formato de texto estruturado */
        .pdf-render-root pre {
          background-color: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 6px !important;
          padding: 12px 16px !important;
          margin-top: 12px !important;
          margin-bottom: 16px !important;
          overflow: hidden !important;
          page-break-inside: avoid !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          word-wrap: break-word !important;
          font-family: 'JetBrains Mono', 'Fira Code', 'Roboto Mono', Menlo, Monaco, Consolas, 'Courier New', monospace !important;
          font-size: 12.5px !important;
          line-height: 1.55 !important;
          color: #0f172a !important;
        }

        .pdf-render-root pre code {
          background: transparent !important;
          padding: 0 !important;
          border: none !important;
          font-family: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
          color: inherit !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
        }

        .pdf-render-root :not(pre) > code {
          font-family: 'JetBrains Mono', 'Fira Code', 'Roboto Mono', Menlo, Monaco, Consolas, 'Courier New', monospace !important;
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          border: 1px solid #e2e8f0 !important;
          font-size: 0.88em !important;
        }

        .pdf-render-root td code,
        .pdf-render-root th code {
          display: inline-block !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          line-height: 1.45 !important;
          text-align: left !important;
        }

        /* Tabelas com espaçamento nítido */
        .pdf-render-root table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin-top: 14px !important;
          margin-bottom: 18px !important;
          page-break-inside: avoid !important;
          font-size: 13px !important;
          line-height: 1.5 !important;
        }

        .pdf-render-root th,
        .pdf-render-root td {
          border: 1px solid #cbd5e1 !important;
          padding: 9px 13px !important;
          text-align: left !important;
          vertical-align: top !important;
        }

        .pdf-render-root th {
          background-color: #f1f5f9 !important;
          font-weight: 700 !important;
          color: #0f172a !important;
        }

        .pdf-render-root td {
          color: #1e293b !important;
          background-color: #ffffff !important;
        }

        /* Citações / Blockquotes */
        .pdf-render-root blockquote {
          margin: 14px 0 18px 0 !important;
          padding: 10px 16px !important;
          border-left: 4px solid #3b82f6 !important;
          background-color: #f8fafc !important;
          color: #334155 !important;
          font-style: italic !important;
          page-break-inside: avoid !important;
        }

        .pdf-render-root hr {
          border: none !important;
          border-top: 1px solid #e2e8f0 !important;
          margin: 20px 0 !important;
        }

        /* Tabela de Exemplos de Entrada e Saída */
        .pdf-samples-section {
          margin-top: 22px !important;
          page-break-inside: avoid !important;
        }
        .pdf-samples-table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin-top: 8px !important;
          margin-bottom: 16px !important;
        }
        .pdf-samples-table th {
          background: #f1f5f9 !important;
          border: 1px solid #cbd5e1 !important;
          padding: 8px 12px !important;
          font-weight: 700 !important;
          text-align: left !important;
          font-size: 13px !important;
        }
        .pdf-samples-table td {
          border: 1px solid #cbd5e1 !important;
          padding: 8px 12px !important;
          vertical-align: top !important;
          background: #ffffff !important;
          width: 50% !important;
        }
        .pdf-samples-table pre {
          margin: 0 !important;
          background: transparent !important;
          padding: 0 !important;
          border: none !important;
          font-family: 'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace !important;
          font-size: 12.5px !important;
          line-height: 1.45 !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          color: #0f172a !important;
        }

        /* Syntax Highlighting Light */
        .pdf-render-root .hljs-keyword,
        .pdf-render-root .hljs-selector-tag,
        .pdf-render-root .hljs-built_in {
          color: #0550ae !important;
          font-weight: 600 !important;
        }
        .pdf-render-root .hljs-string,
        .pdf-render-root .hljs-title,
        .pdf-render-root .hljs-section,
        .pdf-render-root .hljs-attribute {
          color: #0a3069 !important;
        }
        .pdf-render-root .hljs-number,
        .pdf-render-root .hljs-literal {
          color: #116329 !important;
        }
        .pdf-render-root .hljs-comment,
        .pdf-render-root .hljs-quote {
          color: #6e7781 !important;
          font-style: italic !important;
        }
        .pdf-render-root .hljs-type,
        .pdf-render-root .hljs-class {
          color: #953800 !important;
        }
      </style>
    `;
  }

  function buildPdfTemplateHtml(markdownText) {
    const rawName = els.creatorName?.value?.trim() || "";
    const timeLimit = parseFloat(els.creatorTime?.value) || 1.0;
    const memoryLimit = parseInt(els.creatorMemory?.value, 10) || 512;
    const parsedBody = parseMdWithMath(markdownText || "");

    let sampleHtml = "";
    const { samples } = collectTestsData();
    const hasSampleInText = /exemplo|sample/i.test(markdownText || "");
    if (samples.length > 0 && !hasSampleInText) {
      sampleHtml = `
        <div class="pdf-samples-section">
          <h2>Exemplos de Entrada e Saída</h2>
          <table class="pdf-samples-table">
            <thead>
              <tr>
                <th style="width: 50%;">Exemplo de Entrada</th>
                <th style="width: 50%;">Exemplo de Saída</th>
              </tr>
            </thead>
            <tbody>
              ${samples
                .map(
                  (s) => `
                <tr>
                  <td><pre><code>${sanitize(s.in)}</code></pre></td>
                  <td><pre><code>${sanitize(s.out)}</code></pre></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    const startsWithHeading = /^#\s+/m.test((markdownText || "").trim());
    let headerHtml = "";
    if (!startsWithHeading && rawName) {
      headerHtml = `
        <div class="pdf-header">
          <h1 class="pdf-title">${sanitize(rawName)}</h1>
          <div class="pdf-meta">
            <span>Tempo Limite: <strong>${timeLimit}s</strong></span>
            <span>Memória Limite: <strong>${memoryLimit} MB</strong></span>
          </div>
        </div>
      `;
    }

    return `
      ${headerHtml}
      <div class="pdf-content">
        ${parsedBody}
      </div>
      ${sampleHtml}
    `;
  }

  function buildProblemHtml(markdownText) {
    const content = buildPdfTemplateHtml(markdownText);
    const styles = getPdfDocumentStyles();
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${sanitize(els.creatorName?.value || "Problema")}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css" />
  ${styles}
</head>
<body style="margin: 0; background: #ffffff; display: flex; justify-content: center; padding: 20px;">
  <div class="pdf-render-root" style="width: 100%; max-width: 800px;">
    ${content}
  </div>
</body>
</html>`;
  }

  async function generatePdfBlob() {
    const markdown = els.creatorMarkdown?.value || "";
    const title = els.creatorName?.value?.trim() || "Problema";
    const fullHtml = buildProblemHtml(markdown);

    // 1. Priorizar geração via backend Node.js com Puppeteer (alta fidelidade e texto vetorial nativo)
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: fullHtml, title }),
      });

      if (response.ok) {
        return await response.blob();
      }
      console.warn("Backend /api/pdf retornou HTTP", response.status, "- utilizando fallback local...");
    } catch (netErr) {
      console.warn("Backend /api/pdf indisponível, utilizando fallback local:", netErr.message);
    }

    // 2. Fallback gracioso com html2pdf.js local no cliente
    if (!window.html2pdf) {
      throw new Error("Não foi possível gerar o PDF: backend indisponível e biblioteca html2pdf não carregada.");
    }

    const container = document.createElement("div");
    container.className = "pdf-render-root";
    container.innerHTML = `
      ${getPdfDocumentStyles()}
      ${buildPdfTemplateHtml(markdown)}
    `;

    highlightCodeBlocks(container);

    const opt = {
      margin: [12, 14, 12, 14], // [top, right, bottom, left] em mm
      filename: `${slugify(title)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        backgroundColor: "#ffffff",
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
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
      const problemId = els.creatorProblemId?.value?.trim();
      a.download = `${problemId || slugify(els.creatorName?.value || "problem")}.pdf`;
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
    const problemId = els.creatorProblemId?.value?.trim();
    const shortname = problemId || slugify(name);
    const timeLimit = parseFloat(els.creatorTime?.value) || 1.0;
    const memoryLimit = parseInt(els.creatorMemory?.value, 10) || 512;
    const markdown = els.creatorMarkdown?.value || "";

    // problem.yaml
    const problemYaml = `name: "${name}"\nlimits:\n  time: ${timeLimit}\n  memory: ${memoryLimit}\n`;
    zip.file("problem.yaml", problemYaml);

    // domjudge-problem.ini: short-name deve ser o mesmo de name
    const ini = `short-name = "${name}"\nname = "${name}"\ntimelimit = ${timeLimit}\n`;
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
      const problemId = els.creatorProblemId?.value?.trim();
      const filename = `${problemId || slugify(els.creatorName?.value || "problem")}.zip`;
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

      const zipFiles = Object.keys(zip.files);

      // 1. Ler statement em .md, .html ou .txt (mesmo em subpastas)
      let statementText = "";
      const mdPath =
        zipFiles.find((p) => /(^|\/)(statement|problem|enunciado|description)(\.[a-z_-]+)?\.md$/i.test(p)) ||
        zipFiles.find((p) => /\.md$/i.test(p) && !p.toLowerCase().includes("readme"));

      if (mdPath) {
        statementText = await zip.file(mdPath).async("string");
      } else {
        const htmlPath =
          zipFiles.find((p) => /(^|\/)(statement|problem|enunciado|description)(\.[a-z_-]+)?\.html$/i.test(p)) ||
          zipFiles.find((p) => /\.html$/i.test(p) && !p.toLowerCase().includes("index"));

        if (htmlPath) {
          const htmlContent = await zip.file(htmlPath).async("string");
          const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          statementText = bodyMatch ? bodyMatch[1].trim() : htmlContent.trim();
        } else {
          const txtPath = zipFiles.find((p) => /(^|\/)(statement|problem|enunciado|description)\.txt$/i.test(p));
          if (txtPath) {
            statementText = await zip.file(txtPath).async("string");
          }
        }
      }

      if (statementText && els.creatorMarkdown) {
        els.creatorMarkdown.value = statementText;
        renderPreview();
      }

      // 2. Ler domjudge-problem.ini
      const iniPath = zipFiles.find((p) => /(^|\/)domjudge-problem\.ini$/i.test(p));
      if (iniPath) {
        const iniText = await zip.file(iniPath).async("string");
        const nameMatch = iniText.match(/name\s*=\s*"?([^"\n\r]+)"?/i);
        const shortMatch = iniText.match(/short-name\s*=\s*"?([^"\n\r]+)"?/i);
        const timeMatch = iniText.match(/timelimit\s*=\s*([0-9.]+)/i);

        const shortVal = shortMatch ? shortMatch[1].trim() : "";
        const nameVal = nameMatch ? nameMatch[1].trim() : "";
        const zipBase = file.name ? file.name.replace(/\.zip$/i, "").trim() : "";

        if (nameVal && els.creatorName) els.creatorName.value = nameVal;
        if (els.creatorProblemId) {
          if (zipBase) {
            els.creatorProblemId.value = zipBase;
          } else if (shortVal && shortVal !== nameVal) {
            els.creatorProblemId.value = shortVal;
          } else if (nameVal) {
            els.creatorProblemId.value = slugify(nameVal);
          }
        }
        if (timeMatch && els.creatorTime) els.creatorTime.value = timeMatch[1].trim();
      }

      // 3. Ler problem.yaml
      const yamlPath = zipFiles.find((p) => /(^|\/)problem\.yaml$/i.test(p));
      if (yamlPath) {
        const yamlText = await zip.file(yamlPath).async("string");
        const nameMatch = yamlText.match(/name\s*:\s*"?([^"\n\r]+)"?/i);
        const timeMatch = yamlText.match(/time(?:limit)?\s*:\s*([0-9.]+)/i);
        const memMatch = yamlText.match(/memory(?:limit)?\s*:\s*([0-9.]+)/i);

        if (nameMatch && els.creatorName && !els.creatorName.value) els.creatorName.value = nameMatch[1].trim();
        if (timeMatch && els.creatorTime && (!els.creatorTime.value || els.creatorTime.value === "1")) els.creatorTime.value = timeMatch[1].trim();
        if (memMatch && els.creatorMemory && (!els.creatorMemory.value || els.creatorMemory.value === "512")) els.creatorMemory.value = memMatch[1].trim();
      }

      // 4. Ler testes sample e secret (em qualquer subdiretório)
      const testMap = {};
      zipFiles.forEach((path) => {
        const match = path.match(/(?:^|\/)data\/(sample|secret)\/([^/]+)\.(in|ans|out)$/i);
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
      const isEdit = Boolean(els.creatorIsEditCheckbox?.checked);
      showToast(isEdit ? "Atualizando problema no DOMjudge..." : "Gerando pacote e enviando novo problema...", "info");
      const zipBlob = await generateZipBlob();
      const problemId = els.creatorProblemId?.value?.trim();
      const zipFilename = `${problemId || slugify(els.creatorName?.value || "problem")}.zip`;

      const formData = new FormData();
      formData.append("zip", zipBlob, zipFilename);

      // Só anexa o parâmetro 'problem' se o modo de edição estiver ativado
      if (isEdit && problemId) {
        formData.append("problem", problemId);
      }

      const url = `${creds.apiBase}/problems`;
      const method = "POST";

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
      const assignedId = json.problem_id || json.id || problemId || "processado com sucesso";
      if (assignedId && els.creatorProblemId) {
        els.creatorProblemId.value = String(assignedId);
      }

      const msgList = Array.isArray(json.messages) && json.messages.length > 0
        ? ` (${json.messages.join("; ")})`
        : "";

      const actionDesc = isEdit ? "atualizado" : "criado";
      showToast(`Problema ${actionDesc} no DOMjudge com ID: ${assignedId}${msgList}`, "success");
      setFeedback(`Problema ${actionDesc} com sucesso! ID: ${assignedId}${msgList}`);
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

    if (els.creatorIsEditCheckbox && els.sendToDomjudgeBtn) {
      els.creatorIsEditCheckbox.addEventListener("change", () => {
        els.sendToDomjudgeBtn.textContent = els.creatorIsEditCheckbox.checked
          ? "🚀 Atualizar no DOMjudge"
          : "🚀 Enviar para DOMjudge";
      });
    }

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
