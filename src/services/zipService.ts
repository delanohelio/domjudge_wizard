import JSZip from "jszip";
import { TestCase } from "@/types/domjudge";

export interface ProblemZipData {
  title: string;
  problemId: string;
  timeLimit: number;
  memoryLimit: number;
  markdownContent: string;
  testCases: TestCase[];
  pdfBlob?: Blob | null;
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
  const iniContent = `timelimit = '${data.timeLimit || 1}'
color = '#6366f1'
`;
  zip.file("domjudge-problem.ini", iniContent);

  // 3. problem.pdf (se fornecido)
  if (data.pdfBlob) {
    zip.file("problem.pdf", data.pdfBlob);
  }

  // 4. Casos de Teste (data/sample e data/secret)
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

  return zip.generateAsync({ type: "blob" });
}

export async function parseProblemZip(file: File): Promise<{
  title?: string;
  timeLimit?: number;
  memoryLimit?: number;
  testCases: TestCase[];
}> {
  const zip = await JSZip.loadAsync(file);
  const testCases: TestCase[] = [];
  let title: string | undefined;
  let timeLimit: number | undefined;
  let memoryLimit: number | undefined;

  // 1. Ler problem.yaml se existir
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

  // 2. Ler domjudge-problem.ini se YAML não tiver
  const iniFile = zip.file("domjudge-problem.ini");
  if (iniFile && !timeLimit) {
    const text = await iniFile.async("string");
    const timeMatch = text.match(/timelimit\s*=\s*['"]?([0-9.]+)['"]?/i);
    if (timeMatch) timeLimit = parseFloat(timeMatch[1]);
  }

  // 3. Ler data/sample e data/secret
  const files = Object.keys(zip.files);
  const inFiles = files.filter((f) => f.match(/^data\/(sample|secret)\/.*\.in$/));

  for (const inFile of inFiles) {
    const isSample = inFile.includes("/sample/");
    const baseName = inFile.replace(/\.in$/, "");
    const ansFile = `${baseName}.ans`;
    const descFile = `${baseName}.desc`;

    const input = await zip.file(inFile)?.async("string") || "";
    const output = (zip.file(ansFile) ? await zip.file(ansFile)?.async("string") : "") || "";
    const description = (zip.file(descFile) ? await zip.file(descFile)?.async("string") : "") || "";

    testCases.push({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: isSample ? "sample" : "secret",
      input,
      output,
      description,
    });
  }

  return { title, timeLimit, memoryLimit, testCases };
}
