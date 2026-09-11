import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  FileText,
  Search,
  RefreshCw,
  Plus,
  Edit3,
  Eye,
  Download,
  UploadCloud,
  CheckCircle,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  Code,
  HardDrive,
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
  UiBadge,
  UiTable,
  Column,
  UiModal,
  UiSpinner,
} from "@/components/ui";
import { DomjudgeApiService } from "@/services/domjudgeApi";
import { useToast } from "@/context/ToastContext";
import { generateProblemHtml, generateProblemPdf } from "@/services/pdfService";

interface ProblemsListViewProps {
  credentials?: any;
  isAuthenticated: boolean;
}

export const ProblemsListView: React.FC<ProblemsListViewProps> = ({
  credentials,
  isAuthenticated,
}) => {
  const { showToast } = useToast();
  const api = useMemo(() => new DomjudgeApiService(credentials), [credentials]);

  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Visualização de HTML em modal
  const [viewingHtmlProblem, setViewingHtmlProblem] = useState<any | null>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false);

  // Geração e download de PDF
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // Upload direto de ZIP no banco
  const [isUploadingZip, setIsUploadingZip] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const loadProblems = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await api.getProblemBank();
      setProblems(data || []);
      showToast(`${data.length} questões carregadas do banco de dados!`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro ao carregar banco de questões.", "error");
    } finally {
      setLoading(false);
    }
  }, [api, isAuthenticated, showToast]);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  // Filtragem
  const filteredProblems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return problems;
    return problems.filter((p) => {
      const idMatch = p.id?.toLowerCase().includes(q);
      const titleMatch = (p.title || p.name || "").toLowerCase().includes(q);
      const contestMatch = Array.isArray(p.linkedContests) && p.linkedContests.some((c: string) => c.toLowerCase().includes(q));
      return idMatch || titleMatch || contestMatch;
    });
  }, [problems, searchQuery]);

  // Paginação
  const pagedProblems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProblems.slice(start, start + pageSize);
  }, [filteredProblems, page, pageSize]);

  // Ação: Editar no Studio
  const handleEditInStudio = (prob: any) => {
    try {
      sessionStorage.setItem(
        "wizard_edit_problem",
        JSON.stringify({
          id: prob.id,
          title: prob.title || prob.name || prob.id,
          timeLimit: prob.time_limit || prob.timeLimit || 1.0,
          memoryLimit: prob.memory_limit || prob.memoryLimit || 512,
          markdown: prob.markdown || prob.markdownContent || "",
          testCases: prob.testCases || [],
          contestId: prob.contestId || (prob.linkedContests?.[0] ?? ""),
        })
      );
      window.location.hash = "#creator";
    } catch (err) {
      console.error(err);
      showToast("Erro ao abrir questão no Studio.", "error");
    }
  };

  // Ação: Ver HTML
  const handleOpenHtmlPreview = async (prob: any) => {
    setViewingHtmlProblem(prob);
    setIsGeneratingHtml(true);
    try {
      const html = await generateProblemHtml({
        title: prob.title || prob.name || prob.id,
        problemId: prob.id,
        timeLimit: prob.time_limit || prob.timeLimit || 1.0,
        memoryLimit: prob.memory_limit || prob.memoryLimit || 512,
        markdownContent: prob.markdown || prob.markdownContent || `# ${prob.title || prob.name || prob.id}\n\n*Sem enunciado markdown disponível para visualização direta.*`,
        testCases: prob.testCases || [],
      });
      setRenderedHtml(html);
    } catch (err: any) {
      console.error(err);
      showToast("Erro ao gerar visualização HTML da questão.", "error");
      setRenderedHtml("<p>Erro ao gerar pré-visualização HTML.</p>");
    } finally {
      setIsGeneratingHtml(false);
    }
  };

  // Ação: Baixar PDF
  const handleDownloadPdf = async (prob: any) => {
    setDownloadingPdfId(prob.id);
    try {
      showToast(`Gerando PDF de '${prob.title || prob.id}'...`, "info");
      const pdfBlob = await generateProblemPdf({
        title: prob.title || prob.name || prob.id,
        problemId: prob.id,
        timeLimit: prob.time_limit || prob.timeLimit || 1.0,
        memoryLimit: prob.memory_limit || prob.memoryLimit || 512,
        markdownContent: prob.markdown || prob.markdownContent || `# ${prob.title || prob.name || prob.id}\n\n*Sem enunciado markdown.*`,
        testCases: prob.testCases || [],
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${prob.id}-statement.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("PDF baixado com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro ao gerar PDF da questão.", "error");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Upload direto de ZIP
  const handleUploadZipToBank = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingZip(true);
    try {
      showToast(`Processando e salvando pacote ZIP '${file.name}' no banco...`, "info");
      const slug = file.name.replace(/\.zip$/i, "").toLowerCase();
      await api.uploadProblemZip(undefined, file, slug);
      showToast("Questão importada com sucesso para o banco de exercícios!", "success");
      await loadProblems();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro ao importar pacote ZIP.", "error");
    } finally {
      setIsUploadingZip(false);
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
  };

  const columns: Column<any>[] = [
    {
      key: "id",
      title: "Slug / ID",
      width: "140px",
      sortable: true,
      render: (p) => <span className="font-mono text-brand font-bold">{p.id}</span>,
    },
    {
      key: "title",
      title: "Título do Exercício",
      sortable: true,
      render: (p) => (
        <UiStack gap={2}>
          <span className="font-bold">{p.title || p.name || p.id}</span>
          {p.markdown && (
            <span className="text-xs text-muted" style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.markdown.replace(/[#*`]/g, "").slice(0, 60)}...
            </span>
          )}
        </UiStack>
      ),
    },
    {
      key: "limits",
      title: "Limites",
      width: "140px",
      align: "center",
      render: (p) => (
        <UiFlex gap={6} justify="center" align="center">
          <UiBadge variant="neutral" size="sm" title="Tempo Limite">
            <Clock size={11} />
            <span>{p.time_limit || p.timeLimit || 1.0}s</span>
          </UiBadge>
          <UiBadge variant="neutral" size="sm" title="Memória Limite">
            <HardDrive size={11} />
            <span>{p.memory_limit || p.memoryLimit || 512}MB</span>
          </UiBadge>
        </UiFlex>
      ),
    },
    {
      key: "tests",
      title: "Casos de Teste",
      width: "120px",
      align: "center",
      render: (p) => {
        const count = Array.isArray(p.testCases) ? p.testCases.length : (p.test_data_count ?? "—");
        return (
          <span className="font-mono text-xs text-muted">
            {count} {typeof count === "number" ? (count === 1 ? "caso" : "casos") : ""}
          </span>
        );
      },
    },
    {
      key: "contests",
      title: "Listas Vinculadas",
      width: "180px",
      render: (p) => {
        const contests = p.linkedContests || (p.contestId ? [p.contestId] : []);
        if (!contests || contests.length === 0) {
          return <span className="text-xs text-muted italic">Não vinculada</span>;
        }
        return (
          <UiFlex gap={4} wrap>
            {contests.map((cid: string) => (
              <UiBadge key={cid} variant="neutral" size="sm">
                {cid}
              </UiBadge>
            ))}
          </UiFlex>
        );
      },
    },
    {
      key: "actions",
      title: "Ações",
      width: "280px",
      align: "center",
      render: (p) => (
        <UiFlex gap={6} justify="center">
          <UiButton
            size="sm"
            variant="primary"
            icon={<Edit3 size={13} />}
            onClick={() => handleEditInStudio(p)}
            title="Abrir no Studio de Exercícios para editar enunciado e casos de teste"
          >
            Editar
          </UiButton>

          <UiButton
            size="sm"
            variant="dim"
            icon={<Eye size={13} />}
            onClick={() => handleOpenHtmlPreview(p)}
            title="Visualizar documento HTML formatado"
          >
            Ver HTML
          </UiButton>

          <UiButton
            size="sm"
            variant="dim"
            icon={<Download size={13} />}
            loading={downloadingPdfId === p.id}
            onClick={() => handleDownloadPdf(p)}
            title="Gerar e baixar PDF do exercício"
          >
            PDF
          </UiButton>
        </UiFlex>
      ),
    },
  ];

  return (
    <UiStack gap={24} className="animate-fade-in">
      {/* Top Banner */}
      <UiCard variant="glow">
        <UiFlex justify="between" align="center" wrap gap={16}>
          <UiStack gap={4}>
            <UiFlex gap={8} align="center">
              <FileText className="text-brand" size={24} />
              <h2 className="text-xl font-bold">Banco Central de Questões e Exercícios</h2>
            </UiFlex>
            <p className="text-muted text-sm">
              Gerencie todas as questões cadastradas no Wizard, edite enunciados com KaTeX, pré-visualize em HTML e exporte PDFs prontos para impressão.
            </p>
          </UiStack>

          <UiFlex gap={10} wrap>
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              style={{ display: "none" }}
              onChange={handleUploadZipToBank}
            />
            <UiButton
              variant="dim"
              icon={<UploadCloud size={16} />}
              loading={isUploadingZip}
              onClick={() => zipInputRef.current?.click()}
            >
              Importar ZIP
            </UiButton>

            <UiButton
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                sessionStorage.removeItem("wizard_edit_problem");
                window.location.hash = "#creator";
              }}
            >
              Criar no Studio
            </UiButton>
          </UiFlex>
        </UiFlex>
      </UiCard>

      {/* Barra de Filtros e Busca */}
      <UiCard variant="subtle">
        <UiFlex justify="between" align="center" wrap gap={12}>
          <div style={{ flex: "1 1 320px" }}>
            <UiTextInput
              placeholder="Buscar por título, identificador ou lista..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              startIcon={<Search size={16} />}
            />
          </div>

          <UiFlex gap={8} align="center">
            <span className="text-xs text-muted">
              {filteredProblems.length} {filteredProblems.length === 1 ? "exercício encontrado" : "exercícios encontrados"}
            </span>
            <UiButton
              size="sm"
              variant="dim"
              icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
              onClick={loadProblems}
              loading={loading}
              title="Recarregar banco de questões"
            >
              Atualizar
            </UiButton>
          </UiFlex>
        </UiFlex>
      </UiCard>

      {/* Tabela de Questões */}
      <UiCard>
        {loading && problems.length === 0 ? (
          <UiFlex justify="center" align="center" style={{ padding: "60px 0" }}>
            <UiSpinner size="lg" />
          </UiFlex>
        ) : filteredProblems.length === 0 ? (
          <UiStack gap={8} align="center" style={{ padding: "48px 0" }}>
            <FileText className="text-muted" size={42} />
            <p className="font-bold">Nenhum exercício cadastrado no banco ainda.</p>
            <p className="text-xs text-muted">
              Crie uma nova questão usando o Studio de Exercícios ou importe pacotes ZIP pedagógicos.
            </p>
            <UiButton
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => {
                sessionStorage.removeItem("wizard_edit_problem");
                window.location.hash = "#creator";
              }}
              style={{ marginTop: 8 }}
            >
              Criar Primeira Questão
            </UiButton>
          </UiStack>
        ) : (
          <UiTable
            columns={columns}
            data={pagedProblems}
            keyField="id"
            pagination={{
              page,
              pageSize,
              total: filteredProblems.length,
              onPageChange: setPage,
            }}
          />
        )}
      </UiCard>

      {/* Modal: Visualizar HTML do Exercício */}
      <UiModal
        isOpen={Boolean(viewingHtmlProblem)}
        onClose={() => setViewingHtmlProblem(null)}
        title={
          <UiFlex gap={8} align="center">
            <Eye className="text-brand" size={20} />
            <span>Enunciado HTML: {viewingHtmlProblem?.title || viewingHtmlProblem?.id}</span>
          </UiFlex>
        }
        subtitle="Visualização fiel do documento HTML com KaTeX pronto para exibição didática."
        size="xl"
        footer={
          <UiFlex justify="between" align="center" style={{ width: "100%" }}>
            <UiButton
              size="sm"
              variant="dim"
              icon={<Download size={14} />}
              onClick={() => {
                if (viewingHtmlProblem) handleDownloadPdf(viewingHtmlProblem);
              }}
            >
              Baixar Versão em PDF
            </UiButton>

            <UiFlex gap={8}>
              <UiButton
                size="sm"
                variant="primary"
                icon={<Edit3 size={14} />}
                onClick={() => {
                  if (viewingHtmlProblem) {
                    const prob = viewingHtmlProblem;
                    setViewingHtmlProblem(null);
                    handleEditInStudio(prob);
                  }
                }}
              >
                Editar no Studio
              </UiButton>
              <UiButton variant="dim" size="sm" onClick={() => setViewingHtmlProblem(null)}>
                Fechar
              </UiButton>
            </UiFlex>
          </UiFlex>
        }
      >
        {isGeneratingHtml ? (
          <UiFlex justify="center" align="center" style={{ padding: "60px 0" }}>
            <UiSpinner size="md" />
          </UiFlex>
        ) : (
          <div
            style={{
              background: "#ffffff",
              color: "#0f172a",
              borderRadius: 8,
              padding: 24,
              maxHeight: "65vh",
              overflowY: "auto",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <iframe
              srcDoc={renderedHtml}
              style={{
                width: "100%",
                minHeight: "500px",
                border: "none",
                background: "#ffffff",
              }}
              title="HTML Preview"
            />
          </div>
        )}
      </UiModal>
    </UiStack>
  );
};
