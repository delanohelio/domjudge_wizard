import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BookOpen,
  Activity,
  Calendar,
  Save,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Check,
  Plus,
  Copy,
  Trash2,
  FileText,
  UploadCloud,
  ExternalLink,
  Layers,
  Sparkles,
  Timer,
  FastForward,
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
  UiSwitch,
  UiBadge,
  UiTable,
  UiMetricCard,
  UiModal,
  UiCheckbox,
  Column,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useContest } from "@/context/ContestContext";
import { useToast } from "@/context/ToastContext";
import { DomjudgeApiService } from "@/services/domjudgeApi";
import { Contest, Problem } from "@/types/domjudge";

export const ContestManagerView: React.FC = () => {
  const { credentials, isAuthenticated } = useAuth();
  const { setSelectedContestId, refreshContests: refreshGlobalContests } = useContest();
  const { showToast } = useToast();

  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtros
  const [filterText, setFilterText] = useState("");
  const [filterEnabled, setFilterEnabled] = useState("all");
  const [filterChanged, setFilterChanged] = useState("all");

  // Ações em massa
  const [bulkStart, setBulkStart] = useState("");
  const [bulkEnd, setBulkEnd] = useState("");
  const [bulkEnabled, setBulkEnabled] = useState<boolean | null>(null);
  const [bulkScope, setBulkScope] = useState<"page" | "filtered">("page");

  // Paginação & Ordenação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortKey, setSortKey] = useState<string>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ==============================================================================
  // ESTADOS DOS MODAIS DE GESTÃO (CRIAÇÃO, DUPLICAÇÃO, QUESTÕES, PRORROGAÇÃO)
  // ==============================================================================

  // 1. Nova Lista
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newContest, setNewContest] = useState({
    id: "",
    name: "",
    formal_name: "",
    start_time: "",
    end_time: "",
    enabled: true,
  });

  // 2. Duplicar Lista
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [sourceContestForDup, setSourceContestForDup] = useState<Contest | null>(null);
  const [dupContestData, setDupContestData] = useState({
    id: "",
    name: "",
    formal_name: "",
    start_time: "",
    end_time: "",
    copyProblems: true,
  });

  // 3. Questões Vinculadas
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [targetContestForQuestions, setTargetContestForQuestions] = useState<Contest | null>(null);
  const [contestProblems, setContestProblems] = useState<Problem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [unlinkingProbId, setUnlinkingProbId] = useState<string | null>(null);
  const [addProbId, setAddProbId] = useState("");
  const [addProbLabel, setAddProbLabel] = useState("A");
  const [isLinkingProb, setIsLinkingProb] = useState(false);
  const [isUploadingProbZip, setIsUploadingProbZip] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // 4. Prorrogação Rápida de Prazo
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [targetContestForExtend, setTargetContestForExtend] = useState<Contest | null>(null);
  const [customExtendDatetime, setCustomExtendDatetime] = useState("");
  const [isExtending, setIsExtending] = useState(false);

  const api = useMemo(() => new DomjudgeApiService(credentials), [credentials]);

  const toLocalInputFormat = (date: Date): string => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const formatIsoForDomjudge = (d: Date): string => {
    const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    const secs = pad(d.getSeconds());
    const offset = -d.getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const offsetHours = pad(offset / 60);
    const offsetMins = pad(offset % 60);
    return `${year}-${month}-${day}T${hours}:${mins}:${secs}${sign}${offsetHours}:${offsetMins}`;
  };

  const loadContests = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await api.getContests();
      const enriched: Contest[] = data.map((c) => ({
        ...c,
        _original: {
          start_time: c.start_time,
          end_time: c.end_time,
          enabled: c.enabled,
        },
        _changed: false,
      }));
      setContests(enriched);
      showToast(`${enriched.length} listas de exercícios carregadas!`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Falha ao carregar listas de exercícios.", "error");
    } finally {
      setLoading(false);
    }
  }, [api, isAuthenticated, showToast]);

  useEffect(() => {
    loadContests();
  }, [loadContests]);

  // Edição inline de lista
  const updateContestField = (id: string, field: "start_time" | "end_time" | "enabled", value: any) => {
    setContests((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, [field]: value };
        const orig = updated._original;
        const isChanged = Boolean(
          orig &&
            (orig.start_time !== updated.start_time ||
              orig.end_time !== updated.end_time ||
              orig.enabled !== updated.enabled)
        );
        return { ...updated, _changed: isChanged };
      })
    );
  };

  // Filtragem
  const filteredContests = useMemo(() => {
    return contests.filter((c) => {
      if (filterText) {
        const text = `${c.id} ${c.name} ${c.formal_name || ""} ${c.shortname || ""}`.toLowerCase();
        if (!text.includes(filterText.toLowerCase())) return false;
      }
      if (filterEnabled !== "all") {
        const wantEnabled = filterEnabled === "enabled";
        if (Boolean(c.enabled) !== wantEnabled) return false;
      }
      if (filterChanged !== "all") {
        const wantChanged = filterChanged === "changed";
        if (Boolean(c._changed) !== wantChanged) return false;
      }
      return true;
    });
  }, [contests, filterText, filterEnabled, filterChanged]);

  // Ordenação
  const sortedContests = useMemo(() => {
    const list = [...filteredContests];
    list.sort((a, b) => {
      let valA = (a as any)[sortKey] ?? "";
      let valB = (b as any)[sortKey] ?? "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredContests, sortKey, sortDir]);

  // Paginação
  const pagedContests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedContests.slice(start, start + pageSize);
  }, [sortedContests, page, pageSize]);

  // KPIs
  const totalCount = contests.length;
  const activeCount = contests.filter((c) => c.enabled).length;
  const changedCount = contests.filter((c) => c._changed).length;

  // Ação em massa
  const handleApplyBulk = () => {
    const targets = bulkScope === "page" ? pagedContests : filteredContests;
    const targetIds = new Set(targets.map((c) => c.id));

    setContests((prev) =>
      prev.map((c) => {
        if (!targetIds.has(c.id)) return c;
        const updated = { ...c };
        if (bulkStart) updated.start_time = new Date(bulkStart).toISOString();
        if (bulkEnd) updated.end_time = new Date(bulkEnd).toISOString();
        if (bulkEnabled !== null) updated.enabled = bulkEnabled;

        const orig = updated._original;
        const isChanged = Boolean(
          orig &&
            (orig.start_time !== updated.start_time ||
              orig.end_time !== updated.end_time ||
              orig.enabled !== updated.enabled)
        );
        return { ...updated, _changed: isChanged };
      })
    );

    showToast(`Parâmetros aplicados a ${targetIds.size} listas de exercícios.`, "info");
  };

  // Salvar alterações na API do DOMjudge
  const handleSaveChanges = async () => {
    const changed = contests.filter((c) => c._changed);
    if (changed.length === 0) {
      showToast("Nenhuma alteração pendente para salvar.", "info");
      return;
    }

    setSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const c of changed) {
      try {
        await api.patchContest(c.id, {
          start_time: c.start_time ? formatIsoForDomjudge(new Date(c.start_time)) : null,
          enabled: c.enabled,
        });
        successCount++;
      } catch (err) {
        console.error(`Erro ao atualizar lista ${c.id}:`, err);
        failCount++;
      }
    }

    setSaving(false);

    if (failCount === 0) {
      showToast(`${successCount} listas de exercícios atualizadas no DOMjudge!`, "success");
      setContests((prev) =>
        prev.map((c) => ({
          ...c,
          _original: {
            start_time: c.start_time,
            end_time: c.end_time,
            enabled: c.enabled,
          },
          _changed: false,
        }))
      );
      refreshGlobalContests();
    } else {
      showToast(`${successCount} listas salvas, mas ${failCount} falharam.`, "error");
    }
  };

  const formatDateForInput = (isoString: string | null): string => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return toLocalInputFormat(d);
    } catch {
      return "";
    }
  };

  const handleFocusContest = (contestId: string) => {
    setSelectedContestId(contestId);
    window.location.hash = "#review";
  };

  // ==============================================================================
  // 1. CRIAR NOVA LISTA DE EXERCÍCIOS
  // ==============================================================================
  const handleOpenCreate = () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setNewContest({
      id: `lista-${Date.now().toString(36)}`,
      name: "",
      formal_name: "",
      start_time: toLocalInputFormat(now),
      end_time: toLocalInputFormat(nextWeek),
      enabled: true,
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateContest = async () => {
    if (!newContest.id.trim() || !newContest.name.trim()) {
      showToast("Informe o Identificador e o Nome da lista.", "warning");
      return;
    }

    setIsCreating(true);
    try {
      const startDate = new Date(newContest.start_time || Date.now());
      const endDate = newContest.end_time ? new Date(newContest.end_time) : new Date(startDate.getTime() + 7 * 86400000);

      await api.createContest({
        id: newContest.id.trim(),
        name: newContest.name.trim(),
        formal_name: newContest.formal_name.trim() || newContest.name.trim(),
        shortname: newContest.id.trim(),
        start_time: formatIsoForDomjudge(startDate),
        end_time: formatIsoForDomjudge(endDate),
        enabled: newContest.enabled,
      });

      showToast(`Lista de exercícios '${newContest.name}' criada com sucesso!`, "success");
      setIsCreateModalOpen(false);
      await loadContests();
      refreshGlobalContests();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro ao criar nova lista de exercícios.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // ==============================================================================
  // 2. DUPLICAR LISTA DE EXERCÍCIOS
  // ==============================================================================
  const handleOpenDuplicate = (source: Contest) => {
    setSourceContestForDup(source);
    const now = new Date();
    const durationMs =
      source.start_time && source.end_time
        ? new Date(source.end_time).getTime() - new Date(source.start_time).getTime()
        : 7 * 86400000;
    const nextEnd = new Date(now.getTime() + durationMs);

    setDupContestData({
      id: `${source.id}-copia`,
      name: `${source.name} (Cópia)`,
      formal_name: source.formal_name ? `${source.formal_name} (Cópia)` : `${source.name} (Cópia)`,
      start_time: toLocalInputFormat(now),
      end_time: toLocalInputFormat(nextEnd),
      copyProblems: true,
    });
    setIsDuplicateModalOpen(true);
  };

  const handleDuplicateContest = async () => {
    if (!sourceContestForDup || !dupContestData.id.trim() || !dupContestData.name.trim()) {
      showToast("Informe o identificador e nome da lista duplicada.", "warning");
      return;
    }

    setIsDuplicating(true);
    try {
      const startDate = new Date(dupContestData.start_time || Date.now());
      const endDate = dupContestData.end_time ? new Date(dupContestData.end_time) : new Date(startDate.getTime() + 7 * 86400000);

      await api.duplicateContest(
        sourceContestForDup.id,
        {
          id: dupContestData.id.trim(),
          name: dupContestData.name.trim(),
          formal_name: dupContestData.formal_name.trim() || dupContestData.name.trim(),
          shortname: dupContestData.id.trim(),
          start_time: formatIsoForDomjudge(startDate),
          end_time: formatIsoForDomjudge(endDate),
        },
        dupContestData.copyProblems
      );

      showToast(`Lista duplicada com sucesso como '${dupContestData.name}'!`, "success");
      setIsDuplicateModalOpen(false);
      await loadContests();
      refreshGlobalContests();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Falha ao duplicar lista de exercícios.", "error");
    } finally {
      setIsDuplicating(false);
    }
  };

  // ==============================================================================
  // 3. CARREGAR E GERENCIAR QUESTÕES DA LISTA (VINCULAR / DESVINCULAR)
  // ==============================================================================
  const handleOpenQuestions = async (contest: Contest) => {
    setTargetContestForQuestions(contest);
    setIsQuestionsModalOpen(true);
    setLoadingProblems(true);
    setAddProbId("");
    setAddProbLabel("A");

    try {
      const problems = await api.getProblems(contest.id);
      setContestProblems(problems || []);
    } catch (err: any) {
      console.error(err);
      showToast("Não foi possível carregar as questões desta lista.", "error");
      setContestProblems([]);
    } finally {
      setLoadingProblems(false);
    }
  };

  const handleUnlinkProblem = async (problemId: string) => {
    if (!targetContestForQuestions) return;
    setUnlinkingProbId(problemId);

    try {
      await api.unlinkProblemFromContest(targetContestForQuestions.id, problemId);
      setContestProblems((prev) => prev.filter((p) => p.id !== problemId));
      showToast(`Questão '${problemId}' desvinculada da lista.`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro ao desvincular questão.", "error");
    } finally {
      setUnlinkingProbId(null);
    }
  };

  const handleLinkExistingProblem = async () => {
    if (!targetContestForQuestions || !addProbId.trim()) {
      showToast("Informe o identificador/slug da questão.", "warning");
      return;
    }

    setIsLinkingProb(true);
    try {
      const label = (addProbLabel || "A").trim().toUpperCase();
      await api.linkProblemToContest(targetContestForQuestions.id, addProbId.trim(), label);
      showToast(`Questão '${addProbId}' vinculada com o rótulo [${label}]!`, "success");

      // Recarrega as questões
      const updated = await api.getProblems(targetContestForQuestions.id);
      setContestProblems(updated || []);
      setAddProbId("");
      setAddProbLabel(String.fromCharCode(label.charCodeAt(0) + 1));
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro ao vincular questão. Verifique se o ID existe.", "error");
    } finally {
      setIsLinkingProb(false);
    }
  };

  const handleUploadZipToContest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetContestForQuestions) return;

    setIsUploadingProbZip(true);
    try {
      showToast(`Enviando pacote ZIP para a lista '${targetContestForQuestions.id}'...`, "info");
      await api.uploadProblemZip(targetContestForQuestions.id, file);
      showToast("Exercício ZIP adicionado com sucesso à lista!", "success");

      const updated = await api.getProblems(targetContestForQuestions.id);
      setContestProblems(updated || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro ao subir ZIP para a lista.", "error");
    } finally {
      setIsUploadingProbZip(false);
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
  };

  // ==============================================================================
  // 4. ATUALIZAÇÃO E PRORROGAÇÃO RÁPIDA DE PRAZO
  // ==============================================================================
  const handleOpenExtend = (contest: Contest) => {
    setTargetContestForExtend(contest);
    const end = contest.end_time ? new Date(contest.end_time) : new Date();
    setCustomExtendDatetime(toLocalInputFormat(end));
    setIsExtendModalOpen(true);
  };

  const handleApplyTimeAdjustment = async (newEnd: Date, labelDesc: string) => {
    if (!targetContestForExtend) return;
    setIsExtending(true);

    try {
      // Shifting/ajustando a data e aplicando via patch
      const contestId = targetContestForExtend.id;
      const formattedEnd = formatIsoForDomjudge(newEnd);

      // Atualiza localmente no estado
      updateContestField(contestId, "end_time", newEnd.toISOString());

      // Atualiza no DOMjudge via patchContest se aplicável
      await api.patchContest(contestId, {
        start_time: targetContestForExtend.start_time
          ? formatIsoForDomjudge(new Date(targetContestForExtend.start_time))
          : null,
        force: true,
      });

      showToast(`Prazo da lista '${targetContestForExtend.name}' prorrogado (${labelDesc})!`, "success");
      setIsExtendModalOpen(false);
      refreshGlobalContests();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Falha ao prorrogar prazo.", "error");
    } finally {
      setIsExtending(false);
    }
  };

  const handleQuickExtendMinutes = (minutesToAdd: number) => {
    if (!targetContestForExtend) return;
    const baseDate = targetContestForExtend.end_time
      ? new Date(Math.max(Date.now(), new Date(targetContestForExtend.end_time).getTime()))
      : new Date();
    const newEnd = new Date(baseDate.getTime() + minutesToAdd * 60000);
    handleApplyTimeAdjustment(newEnd, `+${minutesToAdd >= 60 ? `${minutesToAdd / 60}h` : `${minutesToAdd}m`}`);
  };

  const handleQuickExtendUntil2359 = () => {
    if (!targetContestForExtend) return;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    handleApplyTimeAdjustment(today, "Até 23:59 de hoje");
  };

  const handleCreateExtraTimeList = (contest: Contest) => {
    setIsExtendModalOpen(false);
    setSourceContestForDup(contest);
    const now = new Date();
    const nextEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    setDupContestData({
      id: `${contest.id}-extra`,
      name: `${contest.name} - Tempo Extra`,
      formal_name: `${contest.name} - Prorrogação de Entrega`,
      start_time: toLocalInputFormat(now),
      end_time: toLocalInputFormat(nextEnd),
      copyProblems: true,
    });
    setIsDuplicateModalOpen(true);
  };

  // ==============================================================================
  // COLUNAS DA TABELA
  // ==============================================================================
  const columns: Column<Contest>[] = [
    {
      key: "id",
      title: "ID",
      width: "90px",
      sortable: true,
      render: (c) => <span className="font-mono text-brand font-bold">{c.id}</span>,
    },
    {
      key: "name",
      title: "Lista de Exercícios",
      sortable: true,
      render: (c) => (
        <UiStack gap={2}>
          <span className="font-bold">{c.name}</span>
          {c.formal_name && <span className="text-xs text-muted">{c.formal_name}</span>}
        </UiStack>
      ),
    },
    {
      key: "questions",
      title: "Questões",
      width: "120px",
      align: "center",
      render: (c) => (
        <UiButton
          size="sm"
          variant="dim"
          icon={<FileText size={14} />}
          onClick={() => handleOpenQuestions(c)}
          title="Ver e gerenciar questões vinculadas"
        >
          Questões
        </UiButton>
      ),
    },
    {
      key: "start_time",
      title: "Abertura da Lista",
      width: "210px",
      sortable: true,
      render: (c) => (
        <UiTextInput
          type="datetime-local"
          size="sm"
          value={formatDateForInput(c.start_time)}
          onChange={(e) =>
            updateContestField(
              c.id,
              "start_time",
              e.target.value ? new Date(e.target.value).toISOString() : null
            )
          }
        />
      ),
    },
    {
      key: "end_time",
      title: "Prazo de Entrega",
      width: "260px",
      sortable: true,
      render: (c) => (
        <UiFlex gap={6} align="center">
          <UiTextInput
            type="datetime-local"
            size="sm"
            value={formatDateForInput(c.end_time)}
            onChange={(e) =>
              updateContestField(
                c.id,
                "end_time",
                e.target.value ? new Date(e.target.value).toISOString() : null
              )
            }
          />
          <UiButton
            size="sm"
            variant="dim"
            icon={<Clock size={13} />}
            onClick={() => handleOpenExtend(c)}
            title="Prorrogar rapidamente (+15m, +1h, 23:59...)"
          />
        </UiFlex>
      ),
    },
    {
      key: "enabled",
      title: "Recebendo Envios",
      width: "140px",
      sortable: true,
      align: "center",
      render: (c) => (
        <UiSwitch
          size="sm"
          checked={Boolean(c.enabled)}
          onChange={(val) => updateContestField(c.id, "enabled", val)}
          label={c.enabled ? "Aberta" : "Encerrada"}
        />
      ),
    },
    {
      key: "_changed",
      title: "Status",
      width: "110px",
      align: "center",
      render: (c) => {
        if (c._changed) {
          return (
            <UiBadge variant="warning" size="sm" dot>
              Modificado
            </UiBadge>
          );
        }
        return (
          <UiBadge variant="neutral" size="sm">
            Salvo
          </UiBadge>
        );
      },
    },
    {
      key: "actions",
      title: "Ações",
      width: "180px",
      align: "center",
      render: (c) => (
        <UiFlex gap={6} justify="center">
          <UiButton
            size="sm"
            variant="dim"
            icon={<Eye size={14} />}
            onClick={() => handleFocusContest(c.id)}
            title="Abrir no Acompanhamento de Entregas"
          >
            Acompanhar
          </UiButton>

          <UiButton
            size="sm"
            variant="dim"
            icon={<Copy size={14} />}
            onClick={() => handleOpenDuplicate(c)}
            title="Duplicar esta lista (copiando suas questões)"
          >
            Duplicar
          </UiButton>
        </UiFlex>
      ),
    },
  ];

  return (
    <UiStack gap={24} className="animate-fade-in">
      {/* Top Header */}
      <UiCard variant="glow">
        <UiFlex justify="between" align="center" wrap gap={16}>
          <UiStack gap={4}>
            <UiFlex gap={8} align="center">
              <BookOpen className="text-brand" size={24} />
              <h2 className="text-xl font-bold">Gestão de Listas de Exercícios Práticos</h2>
            </UiFlex>
            <p className="text-muted text-sm">
              Crie novas listas, duplique tarefas com suas questões, gerencie vínculos e ajuste prazos com 1 clique para as turmas.
            </p>
          </UiStack>

          <UiFlex gap={10} wrap>
            <UiButton
              variant="primary"
              onClick={handleOpenCreate}
              icon={<Plus size={16} />}
            >
              Nova Lista
            </UiButton>

            <UiButton
              variant="secondary"
              onClick={loadContests}
              loading={loading}
              icon={<RefreshCw size={16} />}
            >
              Recarregar
            </UiButton>

            <UiButton
              variant="secondary"
              onClick={handleSaveChanges}
              loading={saving}
              disabled={changedCount === 0}
              icon={<Save size={16} />}
            >
              Salvar Alterações ({changedCount})
            </UiButton>
          </UiFlex>
        </UiFlex>
      </UiCard>

      {/* KPI Cards */}
      <UiGrid columns={3} gap={16}>
        <UiMetricCard
          title="Total de Listas"
          value={totalCount}
          icon={<BookOpen size={20} />}
          subtitle="Cadastradas no DOMjudge"
        />
        <UiMetricCard
          title="Listas Abertas"
          value={activeCount}
          icon={<Activity size={20} />}
          subtitle="Aceitando submissões dos alunos"
        />
        <UiMetricCard
          title="Alterações Pendentes"
          value={changedCount}
          icon={<AlertCircle size={20} />}
          subtitle={changedCount > 0 ? "Clique em 'Salvar Alterações'" : "Todas sincronizadas"}
        />
      </UiGrid>

      {/* Filtros e Ações em Massa */}
      <UiCard variant="default">
        <UiCardHeader>
          <UiCardTitle>Filtros e Prazos em Massa</UiCardTitle>
        </UiCardHeader>

        <UiCardContent>
          <UiStack gap={16}>
            <UiGrid columns={3} gap={14}>
              <UiTextInput
                label="Buscar Listas"
                placeholder="Filtrar por nome ou ID..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                startIcon={<Search size={16} />}
              />

              <UiSelect
                label="Filtrar por Status"
                options={[
                  { value: "all", label: "Todas as Listas" },
                  { value: "enabled", label: "Apenas Abertas" },
                  { value: "disabled", label: "Apenas Encerradas" },
                ]}
                value={filterEnabled}
                onChange={setFilterEnabled}
              />

              <UiSelect
                label="Filtrar Alterações"
                options={[
                  { value: "all", label: "Todas" },
                  { value: "changed", label: "Somente Modificadas" },
                  { value: "unchanged", label: "Somente Sincronizadas" },
                ]}
                value={filterChanged}
                onChange={setFilterChanged}
              />
            </UiGrid>

            {/* Painel de Aplicação em Massa */}
            <UiCard variant="subtle">
              <UiFlex justify="between" align="center" wrap gap={12}>
                <span className="font-bold text-sm">Prazo em Massa para a Turma:</span>

                <UiFlex gap={12} wrap align="center">
                  <UiTextInput
                    size="sm"
                    type="datetime-local"
                    value={bulkStart}
                    onChange={(e) => setBulkStart(e.target.value)}
                    placeholder="Início"
                  />

                  <UiTextInput
                    size="sm"
                    type="datetime-local"
                    value={bulkEnd}
                    onChange={(e) => setBulkEnd(e.target.value)}
                    placeholder="Prazo Final"
                  />

                  <UiSelect
                    size="sm"
                    options={[
                      { value: "keep", label: "Manter Status" },
                      { value: "enable", label: "Abrir Todas" },
                      { value: "disable", label: "Encerrar Todas" },
                    ]}
                    value={
                      bulkEnabled === true
                        ? "enable"
                        : bulkEnabled === false
                        ? "disable"
                        : "keep"
                    }
                    onChange={(val) => {
                      if (val === "enable") setBulkEnabled(true);
                      else if (val === "disable") setBulkEnabled(false);
                      else setBulkEnabled(null);
                    }}
                  />

                  <UiSelect
                    size="sm"
                    options={[
                      { value: "page", label: "Página Atual" },
                      { value: "filtered", label: "Todas Filtradas" },
                    ]}
                    value={bulkScope}
                    onChange={(val) => setBulkScope(val as any)}
                  />

                  <UiButton
                    size="sm"
                    variant="secondary"
                    onClick={handleApplyBulk}
                  >
                    Aplicar Datas
                  </UiButton>
                </UiFlex>
              </UiFlex>
            </UiCard>
          </UiStack>
        </UiCardContent>
      </UiCard>

      {/* Tabela de Listas */}
      <UiTable
        columns={columns}
        data={pagedContests}
        keyField="id"
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key) => {
          if (sortKey === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
          } else {
            setSortKey(key);
            setSortDir("asc");
          }
        }}
        pagination={{
          page,
          pageSize,
          total: sortedContests.length,
          onPageChange: setPage,
          onPageSizeChange: (s) => {
            setPageSize(s);
            setPage(1);
          },
        }}
      />

      {/* ============================================================================== */}
      {/* 1. MODAL DE CRIAÇÃO DE NOVA LISTA */}
      {/* ============================================================================== */}
      <UiModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={
          <UiFlex gap={8} align="center">
            <Plus className="text-brand" size={20} />
            <span>Criar Nova Lista de Exercícios</span>
          </UiFlex>
        }
        subtitle="Adicione uma nova lista prática com prazos e liberada para os alunos resolverem."
        size="lg"
        footer={
          <UiFlex justify="end" gap={10}>
            <UiButton variant="dim" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </UiButton>
            <UiButton
              variant="primary"
              onClick={handleCreateContest}
              loading={isCreating}
              icon={<CheckCircle size={16} />}
            >
              Criar Lista no DOMjudge
            </UiButton>
          </UiFlex>
        }
      >
        <UiStack gap={16}>
          <UiGrid columns={2} gap={14}>
            <UiTextInput
              label="Identificador / Slug da Lista"
              placeholder="ex: lista-02-estruturas"
              value={newContest.id}
              onChange={(e) =>
                setNewContest((prev) => ({
                  ...prev,
                  id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                }))
              }
              helperText="Identificador único (usado nas URLs e APIs do DOMjudge)"
              required
            />

            <UiTextInput
              label="Nome da Lista de Exercícios"
              placeholder="ex: Lista 02 - Pilhas e Filas"
              value={newContest.name}
              onChange={(e) =>
                setNewContest((prev) => ({
                  ...prev,
                  name: e.target.value,
                  formal_name: prev.formal_name || e.target.value,
                }))
              }
              required
            />
          </UiGrid>

          <UiTextInput
            label="Nome Formal ou Descrição Curta (Opcional)"
            placeholder="ex: Atividade Prática 02: Modularização e Estruturas Lineares"
            value={newContest.formal_name}
            onChange={(e) => setNewContest((prev) => ({ ...prev, formal_name: e.target.value }))}
          />

          <UiGrid columns={2} gap={14}>
            <UiTextInput
              type="datetime-local"
              label="Data de Liberação / Início"
              value={newContest.start_time}
              onChange={(e) => setNewContest((prev) => ({ ...prev, start_time: e.target.value }))}
              required
            />

            <UiTextInput
              type="datetime-local"
              label="Prazo Final de Entrega"
              value={newContest.end_time}
              onChange={(e) => setNewContest((prev) => ({ ...prev, end_time: e.target.value }))}
              required
            />
          </UiGrid>

          {/* Atalhos Rápidos de Duração */}
          <UiFlex gap={8} align="center" wrap>
            <span className="text-xs text-muted font-semibold">Atalhos de Prazo:</span>
            <UiButton
              size="sm"
              variant="dim"
              onClick={() => {
                const s = newContest.start_time ? new Date(newContest.start_time) : new Date();
                const e = new Date(s.getTime() + 7 * 86400000);
                setNewContest((prev) => ({ ...prev, end_time: toLocalInputFormat(e) }));
              }}
            >
              +7 Dias
            </UiButton>
            <UiButton
              size="sm"
              variant="dim"
              onClick={() => {
                const s = newContest.start_time ? new Date(newContest.start_time) : new Date();
                const e = new Date(s.getTime() + 14 * 86400000);
                setNewContest((prev) => ({ ...prev, end_time: toLocalInputFormat(e) }));
              }}
            >
              +14 Dias
            </UiButton>
            <UiButton
              size="sm"
              variant="dim"
              onClick={() => {
                const s = newContest.start_time ? new Date(newContest.start_time) : new Date();
                const e = new Date(s.getTime() + 30 * 86400000);
                setNewContest((prev) => ({ ...prev, end_time: toLocalInputFormat(e) }));
              }}
            >
              +30 Dias
            </UiButton>
          </UiFlex>

          <UiSwitch
            checked={newContest.enabled}
            onChange={(val) => setNewContest((prev) => ({ ...prev, enabled: val }))}
            label={newContest.enabled ? "Lista Aberta (alunos podem submeter imediatamente)" : "Lista Encerrada / Oculta"}
          />
        </UiStack>
      </UiModal>

      {/* ============================================================================== */}
      {/* 2. MODAL DE DUPLICAÇÃO DE LISTA */}
      {/* ============================================================================== */}
      <UiModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        title={
          <UiFlex gap={8} align="center">
            <Copy className="text-brand" size={20} />
            <span>Duplicar Lista de Exercícios</span>
          </UiFlex>
        }
        subtitle={
          sourceContestForDup
            ? `Clonando a partir de: '${sourceContestForDup.name}' (${sourceContestForDup.id})`
            : "Criar uma cópia idêntica da lista e suas questões."
        }
        size="lg"
        footer={
          <UiFlex justify="end" gap={10}>
            <UiButton variant="dim" onClick={() => setIsDuplicateModalOpen(false)}>
              Cancelar
            </UiButton>
            <UiButton
              variant="primary"
              onClick={handleDuplicateContest}
              loading={isDuplicating}
              icon={<Copy size={16} />}
            >
              Confirmar Duplicação
            </UiButton>
          </UiFlex>
        }
      >
        <UiStack gap={16}>
          <UiGrid columns={2} gap={14}>
            <UiTextInput
              label="Novo Identificador / Slug"
              value={dupContestData.id}
              onChange={(e) =>
                setDupContestData((prev) => ({
                  ...prev,
                  id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                }))
              }
              required
            />

            <UiTextInput
              label="Novo Nome da Lista"
              value={dupContestData.name}
              onChange={(e) => setDupContestData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </UiGrid>

          <UiTextInput
            label="Nome Formal / Descrição"
            value={dupContestData.formal_name}
            onChange={(e) => setDupContestData((prev) => ({ ...prev, formal_name: e.target.value }))}
          />

          <UiGrid columns={2} gap={14}>
            <UiTextInput
              type="datetime-local"
              label="Novo Início"
              value={dupContestData.start_time}
              onChange={(e) => setDupContestData((prev) => ({ ...prev, start_time: e.target.value }))}
              required
            />

            <UiTextInput
              type="datetime-local"
              label="Novo Prazo de Entrega"
              value={dupContestData.end_time}
              onChange={(e) => setDupContestData((prev) => ({ ...prev, end_time: e.target.value }))}
              required
            />
          </UiGrid>

          <UiCard variant="subtle">
            <UiCheckbox
              checked={dupContestData.copyProblems}
              onChange={(e) => setDupContestData((prev) => ({ ...prev, copyProblems: e.target.checked }))}
              label="Copiar e vincular automaticamente todas as questões da lista de origem"
            />
            <p className="text-xs text-muted" style={{ marginTop: 4, marginLeft: 24 }}>
              Mantém os mesmos problemas, rótulos (A, B, C...) e limites já configurados na lista original.
            </p>
          </UiCard>
        </UiStack>
      </UiModal>

      {/* ============================================================================== */}
      {/* 3. MODAL DE QUESTÕES VINCULADAS */}
      {/* ============================================================================== */}
      <UiModal
        isOpen={isQuestionsModalOpen}
        onClose={() => setIsQuestionsModalOpen(false)}
        title={
          <UiFlex gap={8} align="center">
            <Layers className="text-brand" size={20} />
            <span>Questões da Lista: {targetContestForQuestions?.name}</span>
          </UiFlex>
        }
        subtitle="Veja os exercícios vinculados, adicione novas questões ou desvincule itens desta lista."
        size="xl"
        footer={
          <UiFlex justify="between" align="center" style={{ width: "100%" }}>
            <span className="text-xs text-muted">
              {contestProblems.length} {contestProblems.length === 1 ? "questão vinculada" : "questões vinculadas"}
            </span>
            <UiButton variant="primary" onClick={() => setIsQuestionsModalOpen(false)}>
              Concluir
            </UiButton>
          </UiFlex>
        }
      >
        <UiStack gap={20}>
          {/* Tabela de Questões Vinculadas */}
          {loadingProblems ? (
            <UiFlex justify="center" align="center" style={{ padding: "40px 0" }}>
              <RefreshCw className="animate-spin text-brand" size={28} />
            </UiFlex>
          ) : contestProblems.length === 0 ? (
            <UiCard variant="subtle">
              <UiStack gap={8} align="center" style={{ padding: "24px 0" }}>
                <FileText className="text-muted" size={36} />
                <p className="font-bold">Nenhuma questão vinculada a esta lista ainda.</p>
                <p className="text-xs text-muted">
                  Use os formulários abaixo para vincular uma questão existente pelo ID ou enviar um arquivo ZIP.
                </p>
              </UiStack>
            </UiCard>
          ) : (
            <div style={{ maxHeight: "280px", overflowY: "auto" }}>
              <table className="ui-table">
                <thead>
                  <tr>
                    <th style={{ width: "70px", textAlign: "center" }}>Rótulo</th>
                    <th>Título do Exercício</th>
                    <th style={{ width: "120px", textAlign: "center" }}>Tempo Limite</th>
                    <th style={{ width: "120px", textAlign: "center" }}>Casos de Teste</th>
                    <th style={{ width: "100px", textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contestProblems.map((p) => (
                    <tr key={p.id}>
                      <td style={{ textAlign: "center" }}>
                        <UiBadge variant="brand" size="sm">
                          {p.label || p.short_name || p.id}
                        </UiBadge>
                      </td>
                      <td>
                        <UiStack gap={2}>
                          <span className="font-bold">{p.name || p.id}</span>
                          <span className="font-mono text-xs text-muted">{p.id}</span>
                        </UiStack>
                      </td>
                      <td style={{ textAlign: "center" }} className="font-mono text-xs">
                        {p.time_limit ? `${p.time_limit}s` : "1.0s"}
                      </td>
                      <td style={{ textAlign: "center" }} className="font-mono text-xs">
                        {(p as any).test_data_count ?? "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <UiButton
                          size="sm"
                          variant="dim"
                          onClick={() => handleUnlinkProblem(p.id)}
                          loading={unlinkingProbId === p.id}
                          icon={<Trash2 size={13} className="text-error" />}
                          title="Desvincular questão desta lista"
                        >
                          Remover
                        </UiButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Adicionar Questão à Lista */}
          <UiCard variant="default">
            <UiCardHeader>
              <UiCardTitle>Adicionar Questão a esta Lista</UiCardTitle>
            </UiCardHeader>

            <UiCardContent>
              <UiStack gap={14}>
                {/* Opção 1: Vincular por ID */}
                <UiFlex gap={10} align="end" wrap>
                  <div style={{ flex: "1 1 200px" }}>
                    <UiTextInput
                      label="Identificador / Slug da Questão"
                      placeholder="ex: arvore-binaria ou soma-dois-numeros"
                      value={addProbId}
                      onChange={(e) => setAddProbId(e.target.value)}
                    />
                  </div>

                  <div style={{ width: "90px" }}>
                    <UiTextInput
                      label="Rótulo"
                      placeholder="A"
                      value={addProbLabel}
                      onChange={(e) => setAddProbLabel(e.target.value.toUpperCase())}
                      maxLength={4}
                    />
                  </div>

                  <UiButton
                    variant="primary"
                    onClick={handleLinkExistingProblem}
                    loading={isLinkingProb}
                    icon={<Plus size={16} />}
                  >
                    Vincular à Lista
                  </UiButton>
                </UiFlex>

                {/* Opção 2 & 3: Upload ZIP ou Criar no Studio */}
                <UiFlex justify="between" align="center" wrap gap={10} style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
                  <UiFlex gap={8} align="center">
                    <input
                      ref={zipInputRef}
                      type="file"
                      accept=".zip"
                      style={{ display: "none" }}
                      onChange={handleUploadZipToContest}
                    />
                    <UiButton
                      size="sm"
                      variant="dim"
                      onClick={() => zipInputRef.current?.click()}
                      loading={isUploadingProbZip}
                      icon={<UploadCloud size={14} />}
                    >
                      Enviar ZIP Direto
                    </UiButton>
                  </UiFlex>

                  <UiButton
                    size="sm"
                    variant="secondary"
                    icon={<ExternalLink size={14} />}
                    onClick={() => {
                      if (targetContestForQuestions) {
                        setSelectedContestId(targetContestForQuestions.id);
                        window.location.hash = "#creator";
                      }
                    }}
                  >
                    Criar Nova no Studio
                  </UiButton>
                </UiFlex>
              </UiStack>
            </UiCardContent>
          </UiCard>
        </UiStack>
      </UiModal>

      {/* ============================================================================== */}
      {/* 4. MODAL DE PRORROGAÇÃO RÁPIDA DE PRAZO */}
      {/* ============================================================================== */}
      <UiModal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        title={
          <UiFlex gap={8} align="center">
            <Timer className="text-brand" size={20} />
            <span>Prorrogar Prazo da Lista</span>
          </UiFlex>
        }
        subtitle={
          targetContestForExtend
            ? `Lista: '${targetContestForExtend.name}' | Prazo atual: ${
                targetContestForExtend.end_time
                  ? new Date(targetContestForExtend.end_time).toLocaleString("pt-BR")
                  : "Sem prazo definido"
              }`
            : ""
        }
        size="md"
        footer={
          <UiFlex justify="end" gap={10}>
            <UiButton variant="dim" onClick={() => setIsExtendModalOpen(false)}>
              Fechar
            </UiButton>
          </UiFlex>
        }
      >
        <UiStack gap={16}>
          <p className="text-xs text-muted">
            Clique em um dos atalhos imediatos para estender o prazo da turma ou defina um horário específico:
          </p>

          <UiGrid columns={3} gap={10}>
            <UiButton
              variant="dim"
              icon={<FastForward size={14} />}
              onClick={() => handleQuickExtendMinutes(15)}
              loading={isExtending}
            >
              + 15 Minutos
            </UiButton>

            <UiButton
              variant="dim"
              icon={<FastForward size={14} />}
              onClick={() => handleQuickExtendMinutes(30)}
              loading={isExtending}
            >
              + 30 Minutos
            </UiButton>

            <UiButton
              variant="dim"
              icon={<FastForward size={14} />}
              onClick={() => handleQuickExtendMinutes(60)}
              loading={isExtending}
            >
              + 1 Hora
            </UiButton>

            <UiButton
              variant="dim"
              icon={<FastForward size={14} />}
              onClick={() => handleQuickExtendMinutes(1440)}
              loading={isExtending}
            >
              + 24 Horas
            </UiButton>

            <UiButton
              variant="dim"
              icon={<Clock size={14} />}
              onClick={handleQuickExtendUntil2359}
              loading={isExtending}
            >
              Até 23:59 Hoje
            </UiButton>

            <UiButton
              variant="dim"
              icon={<FastForward size={14} />}
              onClick={() => handleQuickExtendMinutes(10080)}
              loading={isExtending}
            >
              + 7 Dias
            </UiButton>
          </UiGrid>

          {/* Horário Personalizado */}
          <UiCard variant="subtle">
            <UiStack gap={10}>
              <span className="text-xs font-bold">Definir Novo Prazo Personalizado:</span>
              <UiFlex gap={8} align="center">
                <UiTextInput
                  type="datetime-local"
                  size="sm"
                  value={customExtendDatetime}
                  onChange={(e) => setCustomExtendDatetime(e.target.value)}
                />
                <UiButton
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    if (customExtendDatetime) {
                      handleApplyTimeAdjustment(new Date(customExtendDatetime), "Personalizado");
                    }
                  }}
                  loading={isExtending}
                >
                  Salvar Prazo
                </UiButton>
              </UiFlex>
            </UiStack>
          </UiCard>

          {/* Atalho Tempo Extra */}
          {targetContestForExtend && (
            <UiFlex justify="between" align="center" style={{ borderTop: "1px solid var(--border-color)", paddingTop: 10 }}>
              <span className="text-xs text-muted">Prefere preservar a lista original?</span>
              <UiButton
                size="sm"
                variant="secondary"
                icon={<Copy size={13} />}
                onClick={() => handleCreateExtraTimeList(targetContestForExtend)}
              >
                Criar Lista "Tempo Extra"
              </UiButton>
            </UiFlex>
          )}
        </UiStack>
      </UiModal>
    </UiStack>
  );
};
