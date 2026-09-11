import { marked } from "marked";
import { TestCase } from "@/types/domjudge";
import { apiPath } from "./apiClient";

export interface ProblemPdfData {
  title: string;
  problemId: string;
  timeLimit?: number;
  memoryLimit?: number;
  htmlContent?: string;
  markdownContent?: string;
  testCases?: TestCase[];
}

export async function generateProblemHtml(data: ProblemPdfData): Promise<string> {
  const contentHtml = data.htmlContent || (data.markdownContent ? await marked.parse(data.markdownContent) : "");

  return `<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${data.title || "Problema"}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css" />
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Space Grotesk', sans-serif;
        font-size: 9pt;
        color: #64748b;
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #0f172a;
      margin: 0;
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 24px;
    }
    .problem-title {
      font-size: 20pt;
      font-weight: 800;
      margin: 0 0 8px 0;
      color: #0f172a;
    }
    .meta-box {
      font-size: 9.5pt;
      color: #475569;
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .meta-item strong {
      color: #0f172a;
    }
    .content h1, .content h2, .content h3 {
      color: #0f172a;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .content h1 { font-size: 15pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .content h2 { font-size: 13pt; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
    .content h3 { font-size: 11pt; }
    .content p { margin: 0 0 12px 0; text-align: justify; }
    .content table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10pt;
    }
    .content th, .content td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
    }
    .content th {
      background-color: #f1f5f9;
      font-weight: 700;
    }
    .content code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5pt;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
      color: #0f172a;
    }
    .content pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      line-height: 1.45;
    }
    .content pre code {
      background: transparent;
      padding: 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="problem-title">${data.title || "Problema"}</h1>
    <div class="meta-box">
      <span class="meta-item">ID: <strong>${data.problemId || "problema"}</strong></span>
      <span class="meta-item">Tempo Limite: <strong>${data.timeLimit || 1}s</strong></span>
      <span class="meta-item">Limite de Memória: <strong>${data.memoryLimit ? Math.round(data.memoryLimit / 1024) : 512} MB</strong></span>
    </div>
  </div>
  <div class="content">
    ${contentHtml}
  </div>
</body>
</html>`;
}

export async function generateProblemPdf(data: ProblemPdfData): Promise<Blob> {
  const fullHtml = await generateProblemHtml(data);

  const res = await fetch(apiPath("/api/pdf"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      html: fullHtml,
      title: data.title || "problema",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Falha ao gerar PDF (${res.status}): ${errText}`);
  }

  return res.blob();
}
