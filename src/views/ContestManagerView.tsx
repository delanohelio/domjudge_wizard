import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Column,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useContest } from "@/context/ContestContext";
import { useToast } from "@/context/ToastContext";
import { DomjudgeApiService } from "@/services/domjudgeApi";
import { Contest } from "@/types/domjudge";

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

  const api = useMemo(() => new DomjudgeApiService(credentials), [credentials]);

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
          start_time: c.start_time,
          end_time: c.end_time,
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
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const handleFocusContest = (contestId: string) => {
    setSelectedContestId(contestId);
    window.location.hash = "#review";
  };

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
      key: "start_time",
      title: "Abertura da Lista",
      width: "220px",
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
      width: "220px",
      sortable: true,
      render: (c) => (
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
      width: "130px",
      align: "center",
      render: (c) => (
        <UiButton
          size="sm"
          variant="dim"
          icon={<Eye size={14} />}
          onClick={() => handleFocusContest(c.id)}
          title="Abrir no Acompanhamento de Entregas"
        >
          Acompanhar
        </UiButton>
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
              Defina prazos de entrega, datas de liberação e controle o período em que os alunos podem submeter resoluções.
            </p>
          </UiStack>

          <UiFlex gap={10} wrap>
            <UiButton
              variant="secondary"
              onClick={loadContests}
              loading={loading}
              icon={<RefreshCw size={16} />}
            >
              Recarregar
            </UiButton>
            <UiButton
              variant="primary"
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
    </UiStack>
  );
};
