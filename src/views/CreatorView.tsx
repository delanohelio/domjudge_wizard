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
  Sparkles,
  BookOpen,
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
  UiSelect,
  UiCheckbox,
  UiAlert,
  UiBadge,
} from "@/components/ui";
import { UiMarkdownStudio, UiTestCaseCard } from "@/components/domain";
import { TestCase } from "@/types/domjudge";
import { useAuth } from "@/context/AuthContext";
import { useContest } from "@/context/ContestContext";
import { useToast } from "@/context/ToastContext";
import { generateProblemPdf } from "@/services/pdfService";
import { createProblemZip, parseProblemZip } from "@/services/zipService";
import { DomjudgeApiService } from "@/services/domjudgeApi";

export const CreatorView: React.FC = () => {
  const { credentials } = useAuth();
  const { contests, selectedContestId } = useContest();
  const { showToast } = useToast();

  const [title, setTitle] = useState("Soma de Dois Números");
  const [problemId, setProblemId] = useState("soma-dois-numeros");
  const [targetContestId, setTargetContestId] = useState<string>(selectedContestId || "");
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

  // Modelos Pedagógicos Rápidos
  const applyTemplate = (templateKey: string) => {
    switch (templateKey) {
      case "condicional":
        setTitle("Aprovação e Conceito do Aluno");
        setProblemId("aprovacao-conceito");
        setMarkdown(
          `# Aprovação e Conceito do Aluno\n\nEm uma disciplina universitária, um estudante realiza duas avaliações, $N_1$ e $N_2$. A média ponderada é calculada com pesos $2$ e $3$ respectivamente:\n\n$$M = \\frac{2 \\times N_1 + 3 \\times N_2}{5}$$\n\nSe $M \\ge 7.0$, o aluno é **APROVADO**. Se $5.0 \\le M < 7.0$, ele está de **RECUPERACAO**. Caso contrário, é **REPROVADO**.\n\n## Entrada\n\nA entrada consiste em dois números reais $N_1$ e $N_2$ ($0.0 \\le N_1, N_2 \\le 10.0$).\n\n## Saída\n\nImprima a situação do estudante em maiúsculas acompanhada de sua média com duas casas decimais.\n`
        );
        setTestCases([
          {
            id: "tc-c1",
            type: "sample",
            input: "8.0 7.0\n",
            output: "APROVADO 7.40\n",
            description: "Aluno aprovado com média 7.40",
          },
          {
            id: "tc-c2",
            type: "sample",
            input: "5.0 6.0\n",
            output: "RECUPERACAO 5.60\n",
            description: "Aluno em recuperação com média 5.60",
          },
          {
            id: "tc-c3",
            type: "secret",
            input: "3.0 4.0\n",
            output: "REPROVADO 3.60\n",
            description: "Caso reprovado",
          },
        ]);
        showToast("Modelo pedagógico 'Estruturas Condicionais' aplicado!", "success");
        break;

      case "repeticao":
        setTitle("Contagem de Múltiplos e Somatório");
        setProblemId("multiplos-somatorio");
        setMarkdown(
          `# Contagem de Múltiplos e Somatório\n\nDado um número inteiro positivo $N$ e um divisor $K$, calcule quantos números no intervalo $[1, N]$ são múltiplos de $K$ e determine a soma desses múltiplos.\n\n$$\\text{Soma} = \\sum_{i=1, i \\% K = 0}^{N} i$$\n\n## Entrada\n\nA primeira linha contém dois inteiros $N$ e $K$ ($1 \\le K \\le N \\le 10^6$).\n\n## Saída\n\nImprima dois inteiros separados por espaço: a quantidade de múltiplos e a soma total.\n`
        );
        setTestCases([
          {
            id: "tc-r1",
            type: "sample",
            input: "10 3\n",
            output: "3 18\n",
            description: "Múltiplos de 3 até 10: 3, 6, 9. Qtd = 3, Soma = 18",
          },
          {
            id: "tc-r2",
            type: "sample",
            input: "20 5\n",
            output: "4 50\n",
            description: "Múltiplos de 5 até 20: 5, 10, 15, 20. Qtd = 4, Soma = 50",
          },
          {
            id: "tc-r3",
            type: "secret",
            input: "1000000 2\n",
            output: "500000 250000500000\n",
            description: "Caso de estresse de 64 bits",
          },
        ]);
        showToast("Modelo pedagógico 'Laços de Repetição' aplicado!", "success");
        break;

      case "vetores":
        setTitle("Busca e Ocorrência em Vetores");
        setProblemId("busca-vetor");
        setMarkdown(
          `# Busca e Ocorrência em Vetores\n\nDado um vetor de $N$ inteiros e um elemento de consulta $X$, determine a primeira posição (índice 0-indexed) em que $X$ aparece no vetor e o número total de vezes que ele ocorre.\n\nSe $X$ não estiver presente no vetor, a primeira posição deve ser reportada como $-1$ e a frequência como $0$.\n\n## Entrada\n\nA primeira linha contém dois inteiros $N$ e $X$ ($1 \\le N \\le 10^5$).  \nA segunda linha contém os $N$ inteiros do vetor.\n\n## Saída\n\nImprima dois inteiros: o primeiro índice de ocorrência e a quantidade total de ocorrências.\n`
        );
        setTestCases([
          {
            id: "tc-v1",
            type: "sample",
            input: "6 4\n1 4 2 4 8 4\n",
            output: "1 3\n",
            description: "Elemento 4 aparece no índice 1 e ocorre 3 vezes",
          },
          {
            id: "tc-v2",
            type: "sample",
            input: "4 9\n1 2 3 5\n",
            output: "-1 0\n",
            description: "Elemento 9 não existe no vetor",
          },
          {
            id: "tc-v3",
            type: "secret",
            input: "1 10\n10\n",
            output: "0 1\n",
            description: "Vetor unitário presente",
          },
        ]);
        showToast("Modelo pedagógico 'Vetores e Arrays' aplicado!", "success");
        break;

      default:
        break;
    }
  };

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
      setProblemId(slug || "exercicio");
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
      showToast("Gerando PDF com renderização KaTeX vetorial...", "info");
      const blob = await generateProblemPdf({
        title,
        problemId,
        timeLimit,
        memoryLimit,
        markdownContent: markdown,
        testCases,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${problemId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("PDF gerado com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Falha ao gerar o PDF.", "error");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Download ZIP
  const handleDownloadZip = async () => {
    setIsExportingZip(true);
    try {
      showToast("Montando pacote ZIP do DOMjudge...", "info");
      const zipBlob = await createProblemZip({
        title,
        problemId,
        timeLimit,
        memoryLimit,
        markdownContent: markdown,
        testCases,
        includePdf: includePdfInZip,
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

  // Enviar direto para a lista no DOMjudge
  const handleSendToDomjudge = async () => {
    const activeContest = targetContestId || selectedContestId;
    if (!activeContest) {
      showToast("Selecione uma lista de exercícios para vincular este problema.", "warning");
      return;
    }

    setIsUploading(true);
    try {
      showToast("Gerando pacote e enviando para a lista de exercícios no DOMjudge...", "info");
      const api = new DomjudgeApiService(credentials);
      const zipBlob = await createProblemZip({
        title,
        problemId,
        timeLimit,
        memoryLimit,
        markdownContent: markdown,
        testCases,
      });

      await api.uploadProblemZip(activeContest, zipBlob);
      showToast(`Exercício enviado com sucesso para a lista '${activeContest}'!`, "success");
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
            <UiFlex gap={8} align="center">
              <BookOpen className="text-brand" size={24} />
              <h2 className="text-xl font-bold">Studio de Exercícios Práticos</h2>
            </UiFlex>
            <p className="text-muted text-sm">
              Elabore questões com equações KaTeX, configure casos de teste e exporte diretamente para o DOMjudge ou PDF.
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
              Publicar na Lista
            </UiButton>
          </UiFlex>
        </UiFlex>
      </UiCard>

      {/* Modelos Pedagógicos Rápidos */}
      <UiCard variant="subtle">
        <UiFlex justify="between" align="center" wrap gap={12}>
          <UiFlex gap={8} align="center">
            <Sparkles size={16} className="text-brand" />
            <span className="font-semibold text-sm">Modelos Didáticos Prontos:</span>
          </UiFlex>

          <UiFlex gap={8} wrap>
            <UiButton
              size="sm"
              variant="dim"
              onClick={() => applyTemplate("condicional")}
            >
              Estruturas Condicionais (if/else)
            </UiButton>
            <UiButton
              size="sm"
              variant="dim"
              onClick={() => applyTemplate("repeticao")}
            >
              Laços de Repetição & Acúmulo
            </UiButton>
            <UiButton
              size="sm"
              variant="dim"
              onClick={() => applyTemplate("vetores")}
            >
              Vetores & Busca
            </UiButton>
          </UiFlex>
        </UiFlex>
      </UiCard>

      {/* Metadados do Problema */}
      <UiCard variant="default">
        <UiCardHeader>
          <UiCardTitle>Configurações e Parâmetros Acadêmicos</UiCardTitle>
        </UiCardHeader>

        <UiCardContent>
          <UiGrid columns={4} gap={16}>
            <UiTextInput
              label="Nome do Exercício"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ex: Árvore Binária Balanceada"
              required
            />

            <UiTextInput
              label="Slug / Identificador"
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

            <UiSelect
              label="Vincular à Lista de Exercícios"
              options={[
                { value: "", label: "Nenhuma lista selecionada" },
                ...contests.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.id})`,
                })),
              ]}
              value={targetContestId || selectedContestId || ""}
              onChange={(val) => setTargetContestId(val as string)}
            />
          </UiGrid>

          <UiFlex gap={24} style={{ marginTop: 14 }}>
            <UiCheckbox
              checked={isEditMode}
              onChange={(e) => setIsEditMode(e.target.checked)}
              label="Personalizar slug da questão manualmente"
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
          <UiCardTitle>Enunciado do Problema (Markdown Studio com KaTeX)</UiCardTitle>
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
                + Exemplo Público (Sample)
              </UiButton>
              <UiButton
                size="sm"
                variant="dim"
                onClick={() => handleAddTest("secret")}
                icon={<Plus size={14} />}
              >
                + Caso Oculto de Avaliação (Secret)
              </UiButton>
            </UiFlex>
          }
        >
          <UiCardTitle>
            <UiFlex gap={8} align="center">
              <span>Casos de Teste Acadêmicos</span>
              <UiBadge variant="brand" size="sm">
                {testCases.length} testes configurados
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
