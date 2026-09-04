import React, { useState, useRef } from "react";
import {
  FileUp,
  FileDown,
  UploadCloud,
  Plus,
  FileText,
  Clock,
  HardDrive,
  CheckCircle2,
} from "lucide-react";
import {
  UiCard,
  UiCardHeader,
  UiCardTitle,
  UiCardContent,
  UiStack,
  UiFlex,
  UiGrid,
  UiButton,
  UiTextInput,
  UiCheckbox,
  UiAlert,
  UiBadge,
} from "@/components/ui";
import { UiMarkdownStudio, UiTestCaseCard } from "@/components/domain";
import { TestCase } from "@/types/domjudge";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { generateProblemPdf } from "@/services/pdfService";
import { createProblemZip, parseProblemZip } from "@/services/zipService";
import { DomjudgeApiService } from "@/services/domjudgeApi";

export const CreatorView: React.FC = () => {
  const { credentials } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState("Soma de Dois Números");
  const [problemId, setProblemId] = useState("soma-dois-numeros");
  const [timeLimit, setTimeLimit] = useState(1.0);
  const [memoryLimit, setMemoryLimit] = useState(524288); // 512 MB
  const [markdown, setMarkdown] = useState(
    `# Soma de Dois Números\n\nDado dois inteiros $A$ e $B$, determine a sua soma $A + B$.\n\n## Entrada\n\nA primeira e única linha da entrada contém dois inteiros $A$ e $B$ ($1 \\le A, B \\le 10^9$).\n\n## Saída\n\nImprima um único inteiro representando a soma dos valores.\n`
  );

  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: "tc-1",
      type: "sample",
      input: "2 3\n",
      output: "5\n",
      description: "Exemplo básico 2 + 3 = 5",
    },
    {
      id: "tc-2",
      type: "sample",
      input: "10 20\n",
      output: "30\n",
      description: "Exemplo adicional",
    },
    {
      id: "tc-3",
      type: "secret",
      input: "1000000000 1000000000\n",
      output: "2000000000\n",
      description: "Caso limite com inteiros de 64 bits",
    },
  ]);

  const [includePdfInZip, setIncludePdfInZip] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditMode) {
      const slug = val
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setProblemId(slug || "problema");
    }
  };

  const handleAddTest = (type: "sample" | "secret") => {
    const newTest: TestCase = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      input: "",
      output: "",
      description: "",
    };
    setTestCases((prev) => [...prev, newTest]);
    showToast(`Teste ${type === "sample" ? "Sample" : "Secret"} adicionado.`, "info");
  };

  const handleUpdateTest = (index: number, updated: TestCase) => {
    setTestCases((prev) => {
      const arr = [...prev];
      arr[index] = updated;
      return arr;
    });
  };

  const handleDuplicateTest = (index: number) => {
    const target = testCases[index];
    const duplicate: TestCase = {
      ...target,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      description: target.description ? `${target.description} (Cópia)` : "Cópia",
    };
    setTestCases((prev) => {
      const arr = [...prev];
      arr.splice(index + 1, 0, duplicate);
      return arr;
    });
    showToast("Caso de teste duplicado.", "info");
  };

  const handleRemoveTest = (index: number) => {
    setTestCases((prev) => prev.filter((_, i) => i !== index));
    showToast("Caso de teste removido.", "warning");
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      showToast("Gerando PDF vetorial de alta resolução com Puppeteer...", "info");
      const blob = await generateProblemPdf({
        title,
        problemId,
        timeLimit,
        memoryLimit,
        htmlContent: markdown, // o backend processa o html/markdown
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${problemId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("PDF baixado com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Falha ao gerar PDF.", "error");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Download ZIP
  const handleDownloadZip = async () => {
    setIsExportingZip(true);
    try {
      showToast("Criando pacote ZIP no padrão DOMjudge...", "info");
      let pdfBlob: Blob | null = null;
      if (includePdfInZip) {
        try {
          pdfBlob = await generateProblemPdf({
            title,
            problemId,
            timeLimit,
            memoryLimit,
            htmlContent: markdown,
          });
        } catch (pdfErr) {
          console.warn("PDF não pôde ser gerado para o ZIP, continuando sem ele:", pdfErr);
        }
      }

      const zipBlob = await createProblemZip({
        title,
        problemId,
        timeLimit,
        memoryLimit,
        markdownContent: markdown,
        testCases,
        pdfBlob,
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${problemId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Pacote ZIP gerado com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Falha ao criar ZIP.", "error");
    } finally {
      setIsExportingZip(false);
    }
  };

  // Importar ZIP
  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast("Importando e descompactando problema ZIP...", "info");
      const parsed = await parseProblemZip(file);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.timeLimit) setTimeLimit(parsed.timeLimit);
      if (parsed.memoryLimit) setMemoryLimit(parsed.memoryLimit);
      if (parsed.testCases && parsed.testCases.length > 0) {
        setTestCases(parsed.testCases);
      }
      showToast(`Problema importado com ${parsed.testCases.length} casos de teste!`, "success");
    } catch (err: any) {
      console.error(err);
      showToast("Falha ao importar o arquivo ZIP.", "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Enviar direto para o DOMjudge
  const handleSendToDomjudge = async () => {
    setIsUploading(true);
    try {
      showToast("Gerando pacote e enviando para o DOMjudge...", "info");
      const api = new DomjudgeApiService(credentials);
      const zipBlob = await createProblemZip({
        title,
        problemId,
        timeLimit,
        memoryLimit,
        markdownContent: markdown,
        testCases,
      });

      await api.uploadProblemZip("fase0-2026", zipBlob);
      showToast("Problema enviado com sucesso para o DOMjudge!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro no upload do problema.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <UiStack gap={24} className="animate-fade-in">
      {/* Hero Header */}
      <UiCard variant="glow">
        <UiFlex justify="between" align="center" wrap gap={16}>
          <UiStack gap={4}>
            <h2 className="text-xl font-bold">Criador de Questões com Markdown Studio</h2>
            <p className="text-muted text-sm">
              Edite o enunciado com fórmulas matemáticas KaTeX, gerencie casos de teste e exporte em PDF e ZIP DOMjudge.
            </p>
          </UiStack>

          <UiFlex gap={10} wrap>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              style={{ display: "none" }}
              onChange={handleImportZip}
            />
            <UiButton
              variant="dim"
              onClick={() => fileInputRef.current?.click()}
              icon={<FileUp size={16} />}
            >
              Importar ZIP
            </UiButton>

            <UiButton
              variant="dim"
              onClick={handleDownloadPdf}
              loading={isExportingPdf}
              icon={<FileDown size={16} />}
            >
              Baixar PDF
            </UiButton>

            <UiButton
              variant="secondary"
              onClick={handleDownloadZip}
              loading={isExportingZip}
              icon={<FileDown size={16} />}
            >
              Baixar ZIP
            </UiButton>

            <UiButton
              variant="primary"
              onClick={handleSendToDomjudge}
              loading={isUploading}
              icon={<UploadCloud size={16} />}
            >
              Enviar ao DOMjudge
            </UiButton>
          </UiFlex>
        </UiFlex>
      </UiCard>

      {/* Metadados do Problema */}
      <UiCard variant="default">
        <UiCardHeader>
          <UiCardTitle>Configurações e Limites do Problema</UiCardTitle>
        </UiCardHeader>

        <UiCardContent>
          <UiGrid columns={4} gap={16}>
            <UiTextInput
              label="Nome do Problema"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ex: Árvore Binária Balanceada"
              required
            />

            <UiTextInput
              label="Identificador (Problem ID / Slug)"
              value={problemId}
              onChange={(e) => setProblemId(e.target.value)}
              placeholder="ex: arvore-balanceada"
              disabled={!isEditMode}
              helperText={!isEditMode ? "Gerado automaticamente pelo nome" : "Edição manual habilitada"}
              required
            />

            <UiTextInput
              label="Tempo Limite (segundos)"
              type="number"
              step="0.1"
              min="0.1"
              max="60"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseFloat(e.target.value) || 1)}
              startIcon={<Clock size={16} />}
            />

            <UiTextInput
              label="Limite de Memória (KB)"
              type="number"
              step="1024"
              min="16384"
              value={memoryLimit}
              onChange={(e) => setMemoryLimit(parseInt(e.target.value, 10) || 524288)}
              helperText={`Aprox. ${Math.round(memoryLimit / 1024)} MB`}
              startIcon={<HardDrive size={16} />}
            />
          </UiGrid>

          <UiFlex gap={24} style={{ marginTop: 14 }}>
            <UiCheckbox
              checked={isEditMode}
              onChange={(e) => setIsEditMode(e.target.checked)}
              label="Personalizar ID da questão manualmente"
            />
            <UiCheckbox
              checked={includePdfInZip}
              onChange={(e) => setIncludePdfInZip(e.target.checked)}
              label="Incluir problem.pdf dentro do pacote ZIP gerado"
            />
          </UiFlex>
        </UiCardContent>
      </UiCard>

      {/* Markdown Studio */}
      <UiCard variant="default">
        <UiCardHeader>
          <UiCardTitle>Enunciado do Problema (Markdown Studio)</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <UiMarkdownStudio
            value={markdown}
            onChange={setMarkdown}
            testCases={testCases}
          />
        </UiCardContent>
      </UiCard>

      {/* Gerenciador de Casos de Teste */}
      <UiCard variant="default">
        <UiCardHeader
          action={
            <UiFlex gap={8}>
              <UiButton
                size="sm"
                variant="secondary"
                onClick={() => handleAddTest("sample")}
                icon={<Plus size={14} />}
              >
                + Adicionar Sample (Público)
              </UiButton>
              <UiButton
                size="sm"
                variant="dim"
                onClick={() => handleAddTest("secret")}
                icon={<Plus size={14} />}
              >
                + Adicionar Secret (Oculto)
              </UiButton>
            </UiFlex>
          }
        >
          <UiCardTitle>
            <UiFlex gap={8} align="center">
              <span>Casos de Teste (Samples & Secrets)</span>
              <UiBadge variant="brand" size="sm">
                {testCases.length} testes
              </UiBadge>
            </UiFlex>
          </UiCardTitle>
        </UiCardHeader>

        <UiCardContent>
          <UiStack gap={10}>
            {testCases.map((tc, index) => (
              <UiTestCaseCard
                key={tc.id || index}
                index={index}
                testCase={tc}
                onUpdate={(updated) => handleUpdateTest(index, updated)}
                onDuplicate={() => handleDuplicateTest(index)}
                onRemove={() => handleRemoveTest(index)}
              />
            ))}
          </UiStack>
        </UiCardContent>
      </UiCard>
    </UiStack>
  );
};
