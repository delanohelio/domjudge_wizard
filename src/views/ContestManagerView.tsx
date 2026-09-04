import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Trophy,
  Activity,
  Calendar,
  Save,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
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
import { useToast } from "@/context/ToastContext";
import { DomjudgeApiService } from "@/services/domjudgeApi";
import { Contest } from "@/types/domjudge";

export const ContestManagerView: React.FC = () => {
  const { credentials, isAuthenticated } = useAuth();
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
      showToast(`${enriched.length} contests carregados com sucesso!`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Falha ao carregar contests.", "error");
    } finally {
      setLoading(false);
    }
  }, [api, isAuthenticated, showToast]);

  useEffect(() => {
    loadContests();
  }, [loadContests]);

  // Edição inline de contest
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
  const upcomingCount = contests.filter((c) => {
    if (!c.start_time) return false;
    return new Date(c.start_time).getTime() > Date.now();
  }).length;
  const changedCount = contests.filter((c) => c._changed).length;

  // Aplicar alteração em massa
  const handleApplyBulk = () => {
    const targets = bulkScope === "page" ? pagedContests : filteredContests;
    if (targets.length === 0) {
      showToast("Nenhum contest selecionado no escopo definido.", "warning");
      return;
    }

    const targetIds = new Set(targets.map((t) => t.id));

    setContests((prev) =>
      prev.map((c) => {
        if (!targetIds.has(c.id)) return c;
        const updated = {
          ...c,
          start_time: bulkStart ? new Date(bulkStart).toISOString() : c.start_time,
          end_time: bulkEnd ? new Date(bulkEnd).toISOString() : c.end_time,
          enabled: bulkEnabled !== null ? bulkEnabled : c.enabled,
        };
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

    showToast(`Alterações aplicadas a ${targets.length} contests! Lembre-se de salvar.`, "info");
  };

  // Salvar alterações via API
  const handleSaveChanges = async () => {
    const changed = contests.filter((c) => c._changed);
    if (changed.length === 0) {
      showToast("Não há alterações pendentes para salvar.", "info");
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
        console.error(`Falha ao salvar contest ${c.id}:`, err);
        failCount++;
      }
    }

    setSaving(false);
    if (failCount === 0) {
      showToast(`${successCount} contests atualizados com sucesso no DOMjudge!`, "success");
      // Atualizar originais
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
    } else {
      showToast(`${successCount} salvos, mas ${failCount} falharam.`, "error");
    }
  };

  // Helpers para formatação de data
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
      title: "Contest",
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
      title: "Início",
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
      title: "Fim",
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
      title: "Status",
      width: "140px",
      sortable: true,
      align: "center",
      render: (c) => (
        <UiSwitch
          size="sm"
          checked={Boolean(c.enabled)}
          onChange={(val) => updateContestField(c.id, "enabled", val)}
          label={c.enabled ? "Ativo" : "Inativo"}
        />
      ),
    },
    {
      key: "_changed",
      title: "Alteração",
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
            Sincronizado
          </UiBadge>
        );
      },
    },
  ];

  return (
    <UiStack gap={24} className="animate-fade-in">
      {/* Top Header */}
      <UiCard variant="glow">
        <UiFlex justify="between" align="center" wrap gap={16}>
          <UiStack gap={4}>
            <h2 className="text-xl font-bold">Gerenciador de Contests</h2>
            <p className="text-muted text-sm">
              Altere datas, horários e status de múltiplos contests diretamente via API do DOMjudge.
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
      <UiGrid columns={4} gap={16}>
        <UiMetricCard
          title="Total de Contests"
          value={totalCount}
          icon={<Trophy size={20} />}
          variant="brand"
        />
        <UiMetricCard
          title="Contests Ativos"
          value={activeCount}
          icon={<Activity size={20} />}
          variant="success"
        />
        <UiMetricCard
          title="Agendados"
          value={upcomingCount}
          icon={<Calendar size={20} />}
          variant="info"
        />
        <UiMetricCard
          title="Alterações Pendentes"
          value={changedCount}
          icon={<AlertCircle size={20} />}
          variant={changedCount > 0 ? "warning" : "brand"}
        />
      </UiGrid>

      {/* Filtros e Ações em Massa */}
      <UiCard variant="default">
        <UiCardHeader>
          <UiCardTitle>Filtros e Operações em Massa</UiCardTitle>
        </UiCardHeader>

        <UiCardContent>
          <UiStack gap={16}>
            <UiGrid columns={3} gap={14}>
              <UiTextInput
                label="Buscar Contests"
                placeholder="Filtrar por nome, ID ou shortname..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                startIcon={<Search size={16} />}
              />

              <UiSelect
                label="Filtrar por Status"
                options={[
                  { value: "all", label: "Todos os Status" },
                  { value: "enabled", label: "Apenas Ativos" },
                  { value: "disabled", label: "Apenas Inativos" },
                ]}
                value={filterEnabled}
                onChange={setFilterEnabled}
              />

              <UiSelect
                label="Filtrar Alterações"
                options={[
                  { value: "all", label: "Todos" },
                  { value: "changed", label: "Somente Modificados" },
                  { value: "unchanged", label: "Somente Sincronizados" },
                ]}
                value={filterChanged}
                onChange={setFilterChanged}
              />
            </UiGrid>

            {/* Painel de Aplicação em Massa */}
            <UiCard variant="subtle">
              <UiFlex justify="between" align="center" wrap gap={12}>
                <span className="font-bold text-sm">Aplicar em Massa:</span>

                <UiFlex gap={12} wrap align="center">
                  <UiTextInput
                    size="sm"
                    type="datetime-local"
                    value={bulkStart}
                    onChange={(e) => setBulkStart(e.target.value)}
                    placeholder="Início em massa"
                  />

                  <UiTextInput
                    size="sm"
                    type="datetime-local"
                    value={bulkEnd}
                    onChange={(e) => setBulkEnd(e.target.value)}
                    placeholder="Fim em massa"
                  />

                  <UiSelect
                    size="sm"
                    options={[
                      { value: "keep", label: "Manter Status" },
                      { value: "enable", label: "Habilitar Todos" },
                      { value: "disable", label: "Desabilitar Todos" },
                    ]}
                    value={bulkEnabled === true ? "enable" : bulkEnabled === false ? "disable" : "keep"}
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
                      { value: "filtered", label: "Todos Filtrados" },
                    ]}
                    value={bulkScope}
                    onChange={(val) => setBulkScope(val as any)}
                  />

                  <UiButton
                    size="sm"
                    variant="secondary"
                    onClick={handleApplyBulk}
                  >
                    Aplicar Valores
                  </UiButton>
                </UiFlex>
              </UiFlex>
            </UiCard>
          </UiStack>
        </UiCardContent>
      </UiCard>

      {/* Tabela de Contests */}
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
