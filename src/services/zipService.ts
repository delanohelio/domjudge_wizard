import JSZip from "jszip";
import { TestCase } from "@/types/domjudge";
import { generateProblemHtml, generateProblemPdf } from "./pdfService";

export interface ProblemZipData {
  title: string;
  problemId: string;
  timeLimit: number;
  memoryLimit: number;
  markdownContent: string;
  testCases: TestCase[];
  htmlContent?: string | null;
  pdfBlob?: Blob | null;
  includePdf?: boolean;
}

export async function createProblemZip(data: ProblemZipData): Promise<Blob> {
  const zip = new JSZip();

  // 1. problem.yaml
  const yamlContent = `name: '${data.title.replace(/'/g, "''")}'
limits:
  time: ${data.timeLimit || 1}
  memory: ${data.memoryLimit ? Math.round(data.memoryLimit / 1024) : 512}
`;
  zip.file("problem.yaml", yamlContent);

  // 2. domjudge-problem.ini
  const iniContent = `short-name = '${data.problemId || "problem"}'
timelimit = '${data.timeLimit || 1}'
color = '#6366f1'
`;
  zip.file("domjudge-problem.ini", iniContent);

  // 3. statement.md
  if (data.markdownContent) {
    zip.file("statement.md", data.markdownContent);
  }

  // 4. problem.html (gerado a partir do Markdown com KaTeX e estilos)
  let htmlContent = data.htmlContent;
  if (!htmlContent && data.markdownContent) {
    try {
      htmlContent = await generateProblemHtml({
        title: data.title,
        problemId: data.problemId,
        timeLimit: data.timeLimit,
        memoryLimit: data.memoryLimit,
        markdownContent: data.markdownContent,
      });
    } catch (e) {
      console.warn("Aviso ao gerar problem.html para o ZIP:", e);
    }
  }
  if (htmlContent) {
    zip.file("problem.html", htmlContent);
  }

  // 5. problem.pdf (gera via Puppeteer se não fornecido)
  let pdfBlob = data.pdfBlob;
  if (!pdfBlob && data.includePdf !== false) {
    try {
      pdfBlob = await generateProblemPdf({
        title: data.title,
        problemId: data.problemId,
        timeLimit: data.timeLimit,
        memoryLimit: data.memoryLimit,
        markdownContent: data.markdownContent,
        htmlContent: htmlContent || undefined,
      });
    } catch (e) {
      console.warn("Aviso ao gerar problem.pdf para o ZIP:", e);
    }
  }
  if (pdfBlob) {
    zip.file("problem.pdf", pdfBlob);
  }

  // 5. Casos de Teste (data/sample e data/secret)
  const sampleFolder = zip.folder("data/sample");
  const secretFolder = zip.folder("data/secret");

  let sampleIdx = 1;
  let secretIdx = 1;

  data.testCases.forEach((tc) => {
    const isSample = tc.type === "sample";
    const folder = isSample ? sampleFolder : secretFolder;
    const idx = isSample ? sampleIdx++ : secretIdx++;

    folder?.file(`${idx}.in`, tc.input || "");
    folder?.file(`${idx}.ans`, tc.output || "");
    if (tc.description) {
      folder?.file(`${idx}.desc`, tc.description);
    }
  });

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: {
      level: 9,
    },
  });
}

export interface ParsedProblemZip {
  title?: string;
  timeLimit?: number;
  memoryLimit?: number;
  markdownContent?: string;
  htmlContent?: string;
  testCases: TestCase[];
}

export async function parseProblemZip(file: File): Promise<ParsedProblemZip> {
  const zip = await JSZip.loadAsync(file);
  const testCases: TestCase[] = [];
  let title: string | undefined;
  let timeLimit: number | undefined;
  let memoryLimit: number | undefined;
  let markdownContent: string | undefined;
  let htmlContent: string | undefined;

  const allFiles = Object.keys(zip.files);

  // 1. Procurar statement.md ou similar (com fallback para problem.html se não houver md)
  const statementCandidates = allFiles.filter((f) => {
    const lower = f.toLowerCase();
    return (
      !lower.startsWith("__macosx") &&
      (lower.endsWith("statement.md") ||
        lower.endsWith("problem.md") ||
        lower.endsWith("description.md") ||
        (lower.endsWith(".md") &&
          !lower.includes("readme") &&
          !lower.includes("solution") &&
          !lower.includes("editorial")))
    );
  });

  // Priorizar arquivos chamados statement.md
  statementCandidates.sort((a, b) => {
    const aIsStatement = a.toLowerCase().includes("statement.md") ? -1 : 1;
    const bIsStatement = b.toLowerCase().includes("statement.md") ? -1 : 1;
    return aIsStatement - bIsStatement;
  });

  if (statementCandidates.length > 0) {
    const mdFile = zip.file(statementCandidates[0]);
    if (mdFile) {
      markdownContent = await mdFile.async("string");
    }
  }

  // Se não houver Markdown, verificar se há problem.html
  const htmlFile = zip.file("problem.html") || zip.file("statement.html");
  if (htmlFile) {
    htmlContent = await htmlFile.async("string");
  }

  // 2. Ler problem.yaml se existir
  const yamlFile = zip.file("problem.yaml");
  if (yamlFile) {
    const text = await yamlFile.async("string");
    const nameMatch = text.match(/name:\s*['"]?([^'"\n]+)['"]?/i);
    if (nameMatch) title = nameMatch[1].trim();

    const timeMatch = text.match(/time:\s*([0-9.]+)/i);
    if (timeMatch) timeLimit = parseFloat(timeMatch[1]);

    const memMatch = text.match(/memory:\s*([0-9.]+)/i);
    if (memMatch) memoryLimit = parseInt(memMatch[1], 10) * 1024;
  }

  // 3. Ler domjudge-problem.ini se YAML não tiver
  const iniFile = zip.file("domjudge-problem.ini");
  if (iniFile && !timeLimit) {
    const text = await iniFile.async("string");
    const timeMatch = text.match(/timelimit\s*=\s*['"]?([0-9.]+)['"]?/i);
    if (timeMatch) timeLimit = parseFloat(timeMatch[1]);
  }

  // Se o título não veio do problem.yaml, inferir do primeiro cabeçalho # do markdown
  if (!title && markdownContent) {
    const titleMatch = markdownContent.match(/^#\s+([^\n]+)/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
  }

  // 4. Ler data/sample e data/secret (ordenando numericamente de forma natural)
  // Ignora explicitamente outros arquivos como problem.html, problem.pdf, solutions, etc.
  const inFiles = allFiles
    .filter((f) => !f.startsWith("__MACOSX") && f.match(/^data\/(sample|secret)\/.*\.in$/i))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  for (const inFile of inFiles) {
    const isSample = inFile.toLowerCase().includes("/sample/");
    const baseName = inFile.replace(/\.in$/i, "");

    const ansKey = allFiles.find(
      (f) =>
        f.toLowerCase() === `${baseName.toLowerCase()}.ans` ||
        f.toLowerCase() === `${baseName.toLowerCase()}.out`
    );
    const descKey = allFiles.find((f) => f.toLowerCase() === `${baseName.toLowerCase()}.desc`);

    const input = (await zip.file(inFile)?.async("string")) || "";
    const output = (ansKey && (await zip.file(ansKey)?.async("string"))) || "";
    const description = (descKey && (await zip.file(descKey)?.async("string"))) || "";

    testCases.push({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: isSample ? "sample" : "secret",
      input,
      output,
      description,
    });
  }

  return { title, timeLimit, memoryLimit, markdownContent, testCases };
}
