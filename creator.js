const els = {
  creatorName: document.getElementById("creatorName"),
  creatorShortname: document.getElementById("creatorShortname"),
  creatorTime: document.getElementById("creatorTime"),
  creatorMemory: document.getElementById("creatorMemory"),
  creatorMarkdown: document.getElementById("creatorMarkdown"),
  markdownPreview: document.getElementById("markdownPreview"),
  testsContainer: document.getElementById("testsContainer"),
  importZipInput: document.getElementById("importZipInput"),
  importZipBtn: document.getElementById("importZipBtn"),
  addSampleTest: document.getElementById("addSampleTest"),
  addSecretTest: document.getElementById("addSecretTest"),
  previewMarkdownBtn: document.getElementById("previewMarkdownBtn"),
  downloadZipBtn: document.getElementById("downloadZipBtn"),
  sendToDomjudgeBtn: document.getElementById("sendToDomjudgeBtn"),
  creatorFeedback: document.getElementById("creatorFeedback"),
  creatorApiBase: document.getElementById("creatorApiBase"),
  creatorProblemId: document.getElementById("creatorProblemId"),
  creatorApiUser: document.getElementById("creatorApiUser"),
  creatorApiPassword: document.getElementById("creatorApiPassword"),
};

function creatorMessage(message) {
  if (els.creatorFeedback) {
    els.creatorFeedback.textContent = message;
  }
}

function sanitize(text) {
  return String(text ?? "").replace(/[<>]/g, "");
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "problema";
}

function parseMdWithMath(markdownText) {
  const placeholders = [];
  let text = markdownText || "";

  // Protect $$...$$ (display math) from marked processing
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    const id = `MATHPLACEHOLDER${placeholders.length}END`;
    placeholders.push({ id, tex, display: true });
    return id;
  });

  // Protect $...$ (inline math) from marked processing
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
        rendered = katex.renderToString(tex, { displayMode: display, throwOnError: false });
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

function buildProblemHtml(markdownText) {
  const body = parseMdWithMath(markdownText);
  return [
    "<html>",
    "<head>",
    "  <meta charset=\"utf-8\" />",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    "  <link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css\" />",
    "  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css\" />",
    "  <script src=\"https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.js\"></script>",
    "  <script src=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js\"></script>",
    "  <style>body{font-family:Arial,sans-serif;line-height:1.5;padding:20px;}pre{padding:12px;border-radius:8px;overflow:auto;background:#f6f8fa;}code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;}</style>",
    "</head>",
    "<body>",
    body,
    "<script>if(window.hljs){window.hljs.highlightAll();}</script>",
    "</body>",
    "</html>",
  ].join("\n");
}

function collectTestsFromForm() {
  return Array.from(document.querySelectorAll(".test-item")).map((item, idx) => {
    const type = item.querySelector("select")?.value || "sample";
    const input = item.querySelector("textarea[data-kind='in']")?.value || "";
    const answer = item.querySelector("textarea[data-kind='ans']")?.value || "";
    return { id: idx + 1, type, input, answer };
  });
}

function createTestRow(type = "sample", inputValue = "", answerValue = "") {
  const wrapper = document.createElement("article");
  wrapper.className = "test-item";
  wrapper.innerHTML = `
    <div class="test-item-head">
      <strong>Teste</strong>
      <button type="button" class="badge dim remove-test">Remover</button>
    </div>
    <div class="test-item-grid">
      <div>
        <label>Tipo</label>
        <select>
          <option value="sample">sample</option>
          <option value="secret">secret</option>
        </select>
      </div>
      <div>
        <label>Input (.in)</label>
        <textarea data-kind="in"></textarea>
      </div>
      <div>
        <label>Output esperado (.ans)</label>
        <textarea data-kind="ans"></textarea>
      </div>
    </div>
  `;

  wrapper.querySelector("select").value = type;
  wrapper.querySelector("textarea[data-kind='in']").value = inputValue;
  wrapper.querySelector("textarea[data-kind='ans']").value = answerValue;
  wrapper.querySelector(".remove-test").addEventListener("click", () => {
    wrapper.remove();
  });
  return wrapper;
}

function readIniValue(content, key) {
  const regex = new RegExp(`^\\s*${key}\\s*=\\s*['\"]?([^'\"\\n]+)['\"]?`, "mi");
  const match = String(content || "").match(regex);
  return match ? match[1].trim() : "";
}

function extractBodyHtml(html) {
  const text = String(html || "");
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : text;
}

function htmlToMarkdownBasic(html) {
  return String(html || "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n\n")
    .replace(/<\s*li\s*>/gi, "- ")
    .replace(/<\s*\/li\s*>/gi, "\n")
    .replace(/<\s*h1[^>]*>/gi, "# ")
    .replace(/<\s*h2[^>]*>/gi, "## ")
    .replace(/<\s*h3[^>]*>/gi, "### ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeZipPath(path) {
  return String(path || "").replace(/^\/+/, "");
}

function findFirstFileBySuffix(zip, suffix) {
  const target = suffix.toLowerCase();
  const names = Object.keys(zip.files);
  return names.find((name) => {
    const n = normalizeZipPath(name).toLowerCase();
    return n === target || n.endsWith(`/${target}`);
  });
}

function parseYamlName(problemYaml) {
  const match = String(problemYaml || "").match(/^\s*name\s*:\s*['\"]?(.*?)['\"]?\s*$/mi);
  return match ? match[1].trim() : "";
}

function stripZipExtension(filename) {
  return String(filename || "").replace(/\.zip$/i, "");
}

function clearTests() {
  if (els.testsContainer) {
    els.testsContainer.innerHTML = "";
  }
}

async function loadFromZipFile(file) {
  if (!file) {
    throw new Error("Selecione um arquivo ZIP.");
  }
  if (!window.JSZip) {
    throw new Error("JSZip nao carregado.");
  }

  const zip = await window.JSZip.loadAsync(file);

  const yamlPath = findFirstFileBySuffix(zip, "problem.yaml");
  const iniPath = findFirstFileBySuffix(zip, "domjudge-problem.ini");
  const markdownPath = findFirstFileBySuffix(zip, "problem.md");
  const htmlPath = findFirstFileBySuffix(zip, "problem.html");
  const metadataPath = findFirstFileBySuffix(zip, "creator-metadata.json");

  if (metadataPath) {
    const metadataText = await zip.file(metadataPath).async("string");
    const metadata = JSON.parse(metadataText);
    if (metadata?.shortname) {
      els.creatorShortname.value = String(metadata.shortname).trim();
    }
  }

  if (yamlPath) {
    const yamlText = await zip.file(yamlPath).async("string");
    const name = parseYamlName(yamlText);
    if (name) els.creatorName.value = name;
  }

  if (!els.creatorShortname.value) {
    const rootCandidate = normalizeZipPath(yamlPath || "").split("/")[0];
    if (rootCandidate && rootCandidate !== "problem.yaml") {
      els.creatorShortname.value = rootCandidate;
    } else if (file?.name) {
      els.creatorShortname.value = stripZipExtension(file.name);
    }
  }

  if (iniPath) {
    const iniText = await zip.file(iniPath).async("string");
    const timeLimit = readIniValue(iniText, "timelimit");
    const memLimit = readIniValue(iniText, "memlimit");
    if (timeLimit) els.creatorTime.value = Number(timeLimit) || els.creatorTime.value;
    if (memLimit) els.creatorMemory.value = Number(memLimit) || els.creatorMemory.value;
  }

  if (markdownPath) {
    const markdownText = await zip.file(markdownPath).async("string");
    els.creatorMarkdown.value = markdownText;
    renderMarkdownPreview();
  } else if (htmlPath) {
    const htmlText = await zip.file(htmlPath).async("string");
    const body = extractBodyHtml(htmlText);
    els.creatorMarkdown.value = htmlToMarkdownBasic(body);
    renderMarkdownPreview();
  }

  const names = Object.keys(zip.files).map(normalizeZipPath);
  const testPairs = { sample: {}, secret: {} };

  for (const name of names) {
    const lower = name.toLowerCase();
    const match = lower.match(/data\/(sample|secret)\/(.+)\.(in|ans)$/);
    if (!match) continue;
    const type = match[1];
    const base = match[2];
    const ext = match[3];
    if (!testPairs[type][base]) testPairs[type][base] = {};
    testPairs[type][base][ext] = name;
  }

  clearTests();
  for (const type of ["sample", "secret"]) {
    const bases = Object.keys(testPairs[type]).sort((a, b) => a.localeCompare(b, "pt-BR"));
    for (const base of bases) {
      const pair = testPairs[type][base];
      const input = pair.in ? await zip.file(pair.in).async("string") : "";
      const ans = pair.ans ? await zip.file(pair.ans).async("string") : "";
      els.testsContainer.appendChild(createTestRow(type, input, ans));
    }
  }

  if (!els.testsContainer.children.length) {
    els.testsContainer.appendChild(createTestRow("sample"));
  }
}

function renderMarkdownPreview() {
  if (!els.markdownPreview) return;
  const markdown = els.creatorMarkdown?.value || "";
  els.markdownPreview.innerHTML = parseMdWithMath(markdown);
  highlightCodeBlocks(els.markdownPreview);
}

async function buildProblemZipBlob() {
  if (!window.JSZip) {
    throw new Error("JSZip nao carregado.");
  }

  const name = (els.creatorName?.value || "").trim();
  if (!name) {
    throw new Error("Informe o nome da questao.");
  }

  const shortname = (els.creatorShortname?.value || "").trim() || slugify(name);
  const timeLimit = Number(els.creatorTime?.value || 1);
  const memoryLimit = Number(els.creatorMemory?.value || 512);
  const markdown = els.creatorMarkdown?.value || "";
  const tests = collectTestsFromForm();

  if (!tests.length) {
    throw new Error("Adicione pelo menos um teste.");
  }

  const zip = new window.JSZip();

  zip.file("problem.yaml", `name: \"${name.replace(/\"/g, "\\\"")}\"\n`);
  zip.file("domjudge-problem.ini", `timelimit='${timeLimit}'\nmemlimit='${memoryLimit}'\n`);
  zip.file("creator-metadata.json", JSON.stringify({ shortname }, null, 2));
  zip.file("problem.md", markdown.endsWith("\n") ? markdown : `${markdown}\n`);
  zip.file("problem.html", buildProblemHtml(markdown));

  const sampleFolder = zip.folder("data")?.folder("sample");
  const secretFolder = zip.folder("data")?.folder("secret");
  if (!sampleFolder || !secretFolder) {
    throw new Error("Falha ao criar pastas de testes.");
  }

  const counter = { sample: 0, secret: 0 };
  tests.forEach((test) => {
    counter[test.type] += 1;
    const n = counter[test.type];
    const folder = test.type === "sample" ? sampleFolder : secretFolder;
    folder.file(`${n}.in`, test.input.endsWith("\n") ? test.input : `${test.input}\n`);
    folder.file(`${n}.ans`, test.answer.endsWith("\n") ? test.answer : `${test.answer}\n`);
  });

  return zip.generateAsync({ type: "blob" });
}

async function buildProblemZipBinaryFile() {
  const blob = await buildProblemZipBlob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const shortname = (els.creatorShortname?.value || "").trim() || slugify(els.creatorName?.value || "problema");
  return new File([bytes], `${shortname}.zip`, { type: "application/zip" });
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadProblemZip() {
  try {
    creatorMessage("Gerando ZIP...");
    const blob = await buildProblemZipBlob();
    const shortname = (els.creatorShortname?.value || "").trim() || slugify(els.creatorName?.value || "problema");
    downloadBlob(blob, `${shortname}.zip`);
    creatorMessage("ZIP gerado com sucesso.");
  } catch (error) {
    creatorMessage(`Erro: ${error.message}`);
  }
}

function normalizeApiBase(url) {
  const cleaned = String(url || "").trim().replace(/\/+$/, "");
  if (cleaned.endsWith("/api/v4") || cleaned.endsWith("/api")) return cleaned;
  return `${cleaned}/api/v4`;
}

function buildBasicAuthHeader(user, password) {
  return `Basic ${btoa(`${user}:${password}`)}`;
}

async function sendProblemToDomjudge() {
  try {
    const apiBase = normalizeApiBase(els.creatorApiBase?.value || "");
    const problemId = (els.creatorProblemId?.value || "").trim();
    console.log(problemId)
    const user = (els.creatorApiUser?.value || "").trim();
    const password = els.creatorApiPassword?.value || "";

    if (!apiBase || !user || !password) {
      throw new Error("Preencha API base, usuario e senha.");
    }

    creatorMessage("Gerando pacote e enviando...");
    const zipFile = await buildProblemZipBinaryFile();
    const formData = new FormData();
    formData.append("zip", zipFile);
    if (problemId) {
      formData.append("problem", problemId);
    }

    const endpoint = `${apiBase}/problems`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: buildBasicAuthHeader(user, password),
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Falha no envio (${response.status}): ${text}`);
    }

    creatorMessage(problemId ? "Problema atualizado com sucesso no DOMjudge." : "Problema criado com sucesso no DOMjudge.");
  } catch (error) {
    creatorMessage(`Erro: ${error.message}`);
  }
}

async function importZipToForm() {
  try {
    creatorMessage("Lendo ZIP e preenchendo formulario...");
    const file = els.importZipInput?.files?.[0];
    await loadFromZipFile(file);
    creatorMessage("Formulario preenchido a partir do ZIP.");
  } catch (error) {
    creatorMessage(`Erro: ${error.message}`);
  }
}

if (els.addSampleTest) {
  els.addSampleTest.addEventListener("click", () => {
    els.testsContainer.appendChild(createTestRow("sample"));
  });
}

if (els.addSecretTest) {
  els.addSecretTest.addEventListener("click", () => {
    els.testsContainer.appendChild(createTestRow("secret"));
  });
}

if (els.previewMarkdownBtn) {
  els.previewMarkdownBtn.addEventListener("click", renderMarkdownPreview);
}

if (els.downloadZipBtn) {
  els.downloadZipBtn.addEventListener("click", downloadProblemZip);
}

if (els.sendToDomjudgeBtn) {
  els.sendToDomjudgeBtn.addEventListener("click", sendProblemToDomjudge);
}

if (els.importZipBtn) {
  els.importZipBtn.addEventListener("click", importZipToForm);
}

if (els.testsContainer && !els.testsContainer.children.length) {
  els.testsContainer.appendChild(createTestRow("sample"));
}

if (els.creatorMarkdown) {
  els.creatorMarkdown.addEventListener("input", renderMarkdownPreview);
  renderMarkdownPreview();
}
