import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  UserCheck,
  Shield,
  BookOpen,
  Plus,
  Save,
  Download,
  RefreshCw,
  Search,
  Key,
  Copy,
  Edit3,
  CheckCircle,
  AlertTriangle,
  X,
  Check,
  Layers,
  GraduationCap,
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
  UiTabs,
  UiTextarea,
  UiAlert,
  Column,
  UiSpinner,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { DomjudgeApiService } from "@/services/domjudgeApi";
import { generateSecurePassword } from "@/services/passwordService";

export interface AdminUserItem {
  id?: string;
  username: string;
  name: string;
  email: string | null;
  team_id: string | null;
  roles: string[];
  enabled: boolean;
  roleLabel: string;
  turmasLabels: string[];
  labels: string[];
}

export const UserManagerView: React.FC = () => {
  const { credentials, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const api = useMemo(() => new DomjudgeApiService(credentials), [credentials]);

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [knownRoles, setKnownRoles] = useState<string[]>([]);
  const [knownTurmas, setKnownTurmas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Seleção e Paginação
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<string>("username");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Filtros
  const [filterText, setFilterText] = useState("");
  const [isMultilineSearch, setIsMultilineSearch] = useState(false);
  const [filterRole, setFilterRole] = useState("all");
  const [filterTurma, setFilterTurma] = useState("all");
  const [filterEnabled, setFilterEnabled] = useState("all");

  // Modal de Edição Individual
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRoleLabel, setEditRoleLabel] = useState("");
  const [editTurmasLabels, setEditTurmasLabels] = useState<string[]>([]);
  const [newCustomTurmaInput, setNewCustomTurmaInput] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Ações em Lote para Selecionados
  const [batchActionRole, setBatchActionRole] = useState("");
  const [batchActionAddTurma, setBatchActionAddTurma] = useState("");
  const [batchActionRemoveTurma, setBatchActionRemoveTurma] = useState("");
  const [batchActionStatus, setBatchActionStatus] = useState<"keep" | "enable" | "disable">("keep");
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);

  // Modal de Criação de Usuário
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTab, setCreateTab] = useState<string>("single");
  const [singleUsername, setSingleUsername] = useState("");
  const [singleName, setSingleName] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [singlePassword, setSinglePassword] = useState("");
  const [singleRoleLabel, setSingleRoleLabel] = useState("");
  const [singleTurmas, setSingleTurmas] = useState<string[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Criação em Lote (CSV/TSV)
  const [batchText, setBatchText] = useState("");
  const [batchDefaultRole, setBatchDefaultRole] = useState("");
  const [batchDefaultTurma, setBatchDefaultTurma] = useState("");

  // Modal de Gerador de Senha
  const [genPassModalOpen, setGenPassModalOpen] = useState(false);
  const [genPassTargetUser, setGenPassTargetUser] = useState<AdminUserItem | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.getAdminUsers();
      setUsers(res.users || []);
      setKnownRoles(res.roles || ["aluno", "professor", "monitor", "admin"]);
      setKnownTurmas(res.turmas || []);
      showToast(`${res.users?.length || 0} usuários carregados!`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Falha ao carregar usuários.", "error");
    } finally {
      setLoading(false);
    }
  }, [api, isAuthenticated, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Parser de termos de busca (permite separar por vírgula, ponto-e-vírgula ou quebras de linha para OR)
  const searchTerms = useMemo(() => {
    return filterText
      .split(/[\n,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }, [filterText]);

  // Filtragem
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (searchTerms.length > 0) {
        const uUsername = (u.username || "").toLowerCase();
        const uName = (u.name || "").toLowerCase();
        const uEmail = (u.email || "").toLowerCase();
        const uCombined = `${uUsername} ${uName} ${uEmail}`;

        // Regra OR: usuário é exibido se coincidir com qualquer um dos termos pesquisados
        const matchesAny = searchTerms.some(
          (term) =>
            uUsername === term ||
            uUsername.includes(term) ||
            uName.includes(term) ||
            uEmail.includes(term) ||
            uCombined.includes(term)
        );
        if (!matchesAny) return false;
      }
      if (filterRole !== "all") {
        if (u.roleLabel?.toLowerCase() !== filterRole.toLowerCase()) return false;
      }
      if (filterTurma !== "all") {
        const hasTurma = Array.isArray(u.turmasLabels) && u.turmasLabels.some(
          (t) => t.toLowerCase() === filterTurma.toLowerCase()
        );
        if (!hasTurma) return false;
      }
      if (filterEnabled !== "all") {
        const wantEnabled = filterEnabled === "enabled";
        if (Boolean(u.enabled) !== wantEnabled) return false;
      }
      return true;
    });
  }, [users, searchTerms, filterRole, filterTurma, filterEnabled]);

  // Ordenação
  const sortedUsers = useMemo(() => {
    const list = [...filteredUsers];
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
  }, [filteredUsers, sortKey, sortDir]);

  // Paginação
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, page, pageSize]);

  // Estatísticas
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.enabled !== false).length;
  const rolesCount = knownRoles.length;
  const turmasCount = knownTurmas.length;

  // Seleção
  const handleSelectRow = (username: string, checked: boolean) => {
    setSelectedUsernames((prev) => {
      const next = new Set(prev);
      if (checked) next.add(username);
      else next.delete(username);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsernames(new Set(filteredUsers.map((u) => u.username)));
    } else {
      setSelectedUsernames(new Set());
    }
  };

  // Abrir Modal de Edição Individual
  const handleOpenEditUser = (user: AdminUserItem) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditPassword("");
    setEditRoleLabel(user.roleLabel || knownRoles[0] || "aluno");
    setEditTurmasLabels(Array.isArray(user.turmasLabels) ? [...user.turmasLabels] : []);
    setNewCustomTurmaInput("");
    setEditEnabled(user.enabled !== false);
  };

  const handleSaveIndividualEdit = async () => {
    if (!editingUser) return;
    setIsSavingUser(true);
    try {
      await api.updateAdminUser(editingUser.username, {
        name: editName.trim() || editingUser.username,
        email: editEmail.trim() || undefined,
        password: editPassword.trim() || undefined,
        roleLabel: editRoleLabel.trim() || "aluno",
        turmasLabels: editTurmasLabels,
        enabled: editEnabled,
      });

      showToast(`Usuário '${editingUser.username}' atualizado com sucesso!`, "success");
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro ao atualizar usuário.", "error");
    } finally {
      setIsSavingUser(false);
    }
  };

  // Aplicar Operações em Lote
  const handleApplyBatchActions = async () => {
    if (selectedUsernames.size === 0) {
      showToast("Selecione ao menos um usuário para a operação em lote.", "warning");
      return;
    }

    if (!batchActionRole && !batchActionAddTurma && !batchActionRemoveTurma && batchActionStatus === "keep") {
      showToast("Selecione ao menos uma ação em lote (papel, adicionar/remover turma ou status).", "warning");
      return;
    }

    setIsApplyingBatch(true);
    try {
      await api.batchAdminUsers({
        usernames: Array.from(selectedUsernames),
        setRole: batchActionRole || undefined,
        addTurmas: batchActionAddTurma ? [batchActionAddTurma] : undefined,
        removeTurmas: batchActionRemoveTurma ? [batchActionRemoveTurma] : undefined,
        setEnabled: batchActionStatus === "enable" ? true : batchActionStatus === "disable" ? false : undefined,
      });

      showToast(`Ação em lote aplicada com sucesso para ${selectedUsernames.size} usuários!`, "success");
      setSelectedUsernames(new Set());
      setBatchActionRole("");
      setBatchActionAddTurma("");
      setBatchActionRemoveTurma("");
      setBatchActionStatus("keep");
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro ao aplicar ações em lote.", "error");
    } finally {
      setIsApplyingBatch(false);
    }
  };

  // Gerador de Senha
  const handleOpenGenPassword = (user: AdminUserItem) => {
    setGenPassTargetUser(user);
    setGeneratedPassword(generateSecurePassword(12));
    setGenPassModalOpen(true);
  };

  const handleApplyGenPassword = async () => {
    if (!genPassTargetUser || !generatedPassword) return;
    setIsSavingPassword(true);
    try {
      await api.updateAdminUser(genPassTargetUser.username, {
        password: generatedPassword,
      });
      showToast(`Nova senha salva para o usuário '${genPassTargetUser.username}'!`, "success");
      setGenPassModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro ao salvar nova senha.", "error");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Criação Individual
  const handleCreateSingle = async () => {
    if (!singleUsername.trim() || !singlePassword.trim()) {
      showToast("Informe o Usuário e a Senha.", "warning");
      return;
    }

    setIsCreatingUser(true);
    try {
      const role = singleRoleLabel || knownRoles[0] || "aluno";
      const payload = {
        name: singleName.trim() || singleUsername.trim(),
        username: singleUsername.trim(),
        email: singleEmail.trim() || null,
        password: singlePassword,
        roles: role === "admin" ? ["admin", "jury"] : role === "professor" || role === "monitor" ? ["jury"] : ["team"],
        enabled: true,
      };

      await api.syncAccounts([payload as any]);

      // Atualiza labels de papel e turma
      await api.updateAdminUser(singleUsername.trim(), {
        name: singleName.trim() || singleUsername.trim(),
        email: singleEmail.trim() || undefined,
        roleLabel: role,
        turmasLabels: singleTurmas,
      }).catch(console.error);

      showToast(`Usuário '${singleUsername}' criado com sucesso!`, "success");
      setIsCreateModalOpen(false);
      setSingleUsername("");
      setSingleName("");
      setSinglePassword("");
      setSingleEmail("");
      setSingleTurmas([]);
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro ao criar usuário.", "error");
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Exportar CSV
  const handleExportCsv = () => {
    const headers = ["Username", "Nome", "Email", "Papel", "Turmas", "Ativo"];
    const rows = filteredUsers.map((u) => [
      u.username,
      `"${u.name || ""}"`,
      u.email || "",
      u.roleLabel || "aluno",
      `"${(u.turmasLabels || []).join(";")}"`,
      u.enabled !== false ? "Sim" : "Não",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `usuarios_cadastrados_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Planilha CSV exportada com sucesso!", "success");
  };

  // Colunas da Tabela
  const columns: Column<AdminUserItem>[] = [
    {
      key: "username",
      title: "Usuário",
      sortable: true,
      render: (u) => (
        <UiFlex gap={6} align="center">
          <span className="font-mono font-bold text-brand">{u.username}</span>
          {u.roles?.includes("admin") && (
            <UiBadge variant="brand" size="sm">
              Admin
            </UiBadge>
          )}
        </UiFlex>
      ),
    },
    {
      key: "name",
      title: "Nome Completo",
      sortable: true,
      render: (u) => <span className="font-semibold">{u.name || u.username}</span>,
    },
    {
      key: "email",
      title: "E-mail",
      render: (u) => <span className="text-muted text-xs font-mono">{u.email || "—"}</span>,
    },
    {
      key: "roleLabel",
      title: "Papel",
      sortable: true,
      width: "140px",
      render: (u) => {
        const role = (u.roleLabel || "aluno").toLowerCase();
        const variant =
          role === "admin"
            ? "brand"
            : role === "professor"
            ? "warning"
            : role === "monitor"
            ? "info"
            : "neutral";
        return (
          <UiBadge variant={variant as any} size="sm">
            {role.toUpperCase()}
          </UiBadge>
        );
      },
    },
    {
      key: "turmasLabels",
      title: "Turmas",
      render: (u) => {
        const turmas = u.turmasLabels || [];
        if (turmas.length === 0) {
          return <span className="text-xs text-muted italic">Sem turma</span>;
        }
        return (
          <UiFlex gap={4} wrap>
            {turmas.map((t) => (
              <UiBadge key={t} variant="neutral" size="sm">
                {t}
              </UiBadge>
            ))}
          </UiFlex>
        );
      },
    },
    {
      key: "enabled",
      title: "Status",
      width: "110px",
      align: "center",
      render: (u) => (
        <UiBadge variant={u.enabled !== false ? "success" : "neutral"} size="sm" dot>
          {u.enabled !== false ? "Ativo" : "Inativo"}
        </UiBadge>
      ),
    },
    {
      key: "actions",
      title: "Ações",
      width: "170px",
      align: "center",
      render: (u) => (
        <UiFlex gap={6} justify="center">
          <UiButton
            size="sm"
            variant="secondary"
            icon={<Edit3 size={13} />}
            onClick={() => handleOpenEditUser(u)}
            title="Editar dados, papel e turmas deste usuário"
          >
            Editar
          </UiButton>

          <UiButton
            size="sm"
            variant="dim"
            icon={<Key size={13} />}
            onClick={() => handleOpenGenPassword(u)}
            title="Gerar e salvar nova senha segura"
          >
            Senha
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
              <Users className="text-brand" size={24} />
              <h2 className="text-xl font-bold">Usuários Cadastrados</h2>
            </UiFlex>
            <p className="text-muted text-sm">
              Gestão acadêmica de contas, papéis do Wizard e vinculação a múltiplas turmas por labels.
            </p>
          </UiStack>

          <UiFlex gap={10} wrap>
            <UiButton
              variant="secondary"
              onClick={loadData}
              loading={loading}
              icon={<RefreshCw size={16} />}
            >
              Recarregar
            </UiButton>

            <UiButton
              variant="dim"
              onClick={handleExportCsv}
              disabled={users.length === 0}
              icon={<Download size={16} />}
            >
              Exportar CSV
            </UiButton>

            <UiButton
              variant="primary"
              onClick={() => {
                setSingleRoleLabel(knownRoles[0] || "aluno");
                setIsCreateModalOpen(true);
              }}
              icon={<Plus size={16} />}
            >
              + Novo Usuário
            </UiButton>
          </UiFlex>
        </UiFlex>
      </UiCard>

      {/* KPI Cards */}
      <UiGrid columns={4} gap={16}>
        <UiMetricCard
          title="Total de Usuários"
          value={totalCount}
          icon={<Users size={20} />}
          variant="brand"
        />
        <UiMetricCard
          title="Usuários Ativos"
          value={activeCount}
          icon={<UserCheck size={20} />}
          variant="success"
        />
        <UiMetricCard
          title="Papéis Cadastrados"
          value={rolesCount}
          icon={<Shield size={20} />}
          variant="info"
        />
        <UiMetricCard
          title="Turmas Ativas"
          value={turmasCount}
          icon={<BookOpen size={20} />}
          variant="warning"
        />
      </UiGrid>

      {/* Barra de Filtros e Busca */}
      <UiCard variant="default">
        <UiCardHeader>
          <UiCardTitle>Filtros de Busca</UiCardTitle>
        </UiCardHeader>

        <UiCardContent>
          <UiStack gap={16}>
            {/* Campo de Busca em Lote / Texto Grande Expandido */}
            {isMultilineSearch && (
              <UiCard variant="subtle" style={{ padding: 14 }}>
                <UiStack gap={10}>
                  <UiFlex justify="between" align="center" wrap gap={8}>
                    <UiFlex gap={8} align="center">
                      <Search size={16} className="text-brand" />
                      <span className="font-bold text-sm">Busca Rápida de Usuários (Texto Grande / OR)</span>
                      {searchTerms.length > 0 && (
                        <UiBadge variant="brand" size="sm">
                          {searchTerms.length} {searchTerms.length === 1 ? "termo ativo" : "termos OR ativos"}
                        </UiBadge>
                      )}
                    </UiFlex>

                    <UiFlex gap={8} align="center">
                      {filterText && (
                        <UiButton
                          size="sm"
                          variant="dim"
                          onClick={() => {
                            setFilterText("");
                            setPage(1);
                          }}
                        >
                          Limpar
                        </UiButton>
                      )}
                      <UiButton
                        size="sm"
                        variant="dim"
                        onClick={() => setIsMultilineSearch(false)}
                      >
                        Recolher para Campo Simples
                      </UiButton>
                    </UiFlex>
                  </UiFlex>

                  <UiTextarea
                    rows={4}
                    placeholder={"Cole aqui uma lista de usuários, logins ou e-mails separados por vírgula ou uma por linha (ex:\ndelano.oliveira\njoao.silva, maria.santos\n...)"}
                    value={filterText}
                    onChange={(e) => {
                      setFilterText(e.target.value);
                      setPage(1);
                    }}
                  />
                  <span className="text-xs text-muted">
                    Qualquer usuário que contenha um dos termos no login, nome ou e-mail será exibido (lógica OR).
                  </span>
                </UiStack>
              </UiCard>
            )}

            <UiGrid columns={isMultilineSearch ? 3 : 4} gap={14}>
              {!isMultilineSearch && (
                <UiStack gap={4}>
                  <UiFlex justify="between" align="center">
                    <span className="text-xs font-semibold">Buscar Usuários (OR por vírgula)</span>
                    <button
                      type="button"
                      className="text-xs text-brand hover:underline font-semibold bg-transparent border-0 cursor-pointer p-0"
                      onClick={() => setIsMultilineSearch(true)}
                      title="Expandir caixa de texto para colar muitos usuários de uma vez"
                    >
                      + Texto Grande
                    </button>
                  </UiFlex>
                  <UiTextInput
                    placeholder="delano, joao, maria..."
                    value={filterText}
                    onChange={(e) => {
                      setFilterText(e.target.value);
                      setPage(1);
                    }}
                    startIcon={<Search size={16} />}
                  />
                  {searchTerms.length > 1 && (
                    <span className="text-xs text-brand font-medium">
                      ✓ {searchTerms.length} termos de busca ativos (OR)
                    </span>
                  )}
                </UiStack>
              )}

              <UiSelect
                label="Filtrar por Papel"
                options={[
                  { value: "all", label: "Todos os Papéis" },
                  ...knownRoles.map((r) => ({ value: r, label: r.toUpperCase() })),
                ]}
                value={filterRole}
                onChange={(val) => {
                  setFilterRole(val);
                  setPage(1);
                }}
              />

              <UiSelect
                label="Filtrar por Turma"
                options={[
                  { value: "all", label: "Todas as Turmas" },
                  ...knownTurmas.map((t) => ({ value: t, label: t })),
                ]}
                value={filterTurma}
                onChange={(val) => {
                  setFilterTurma(val);
                  setPage(1);
                }}
              />

              <UiSelect
                label="Status da Conta"
                options={[
                  { value: "all", label: "Todos os Status" },
                  { value: "enabled", label: "Apenas Ativos" },
                  { value: "disabled", label: "Apenas Desativados" },
                ]}
                value={filterEnabled}
                onChange={(val) => {
                  setFilterEnabled(val);
                  setPage(1);
                }}
              />
            </UiGrid>

            {/* Painel de Ações em Lote para Selecionados */}
            {selectedUsernames.size > 0 && (
              <UiCard variant="subtle">
                <UiStack gap={12}>
                  <UiFlex justify="between" align="center" wrap gap={12}>
                    <UiFlex gap={8} align="center">
                      <UiBadge variant="brand" size="sm">
                        {selectedUsernames.size} selecionados
                      </UiBadge>
                      <span className="font-bold text-sm">Operações em Lote:</span>
                    </UiFlex>

                    <UiButton
                      size="sm"
                      variant="dim"
                      onClick={() => setSelectedUsernames(new Set())}
                    >
                      Desmarcar Todos
                    </UiButton>
                  </UiFlex>

                  <UiGrid columns={4} gap={10}>
                    <UiSelect
                      size="sm"
                      label="Alterar Papel em Lote"
                      options={[
                        { value: "", label: "Não alterar papel" },
                        ...knownRoles.map((r) => ({ value: r, label: `Definir: ${r.toUpperCase()}` })),
                      ]}
                      value={batchActionRole}
                      onChange={setBatchActionRole}
                    />

                    <UiSelect
                      size="sm"
                      label="Adicionar à Turma"
                      options={[
                        { value: "", label: "Nenhuma turma a adicionar" },
                        ...knownTurmas.map((t) => ({ value: t, label: `+ Adicionar ${t}` })),
                      ]}
                      value={batchActionAddTurma}
                      onChange={setBatchActionAddTurma}
                    />

                    <UiSelect
                      size="sm"
                      label="Remover da Turma"
                      options={[
                        { value: "", label: "Nenhuma turma a remover" },
                        ...knownTurmas.map((t) => ({ value: t, label: `- Remover ${t}` })),
                      ]}
                      value={batchActionRemoveTurma}
                      onChange={setBatchActionRemoveTurma}
                    />

                    <UiSelect
                      size="sm"
                      label="Status"
                      options={[
                        { value: "keep", label: "Manter Status Atual" },
                        { value: "enable", label: "Ativar Todos" },
                        { value: "disable", label: "Desativar Todos" },
                      ]}
                      value={batchActionStatus}
                      onChange={(val) => setBatchActionStatus(val as any)}
                    />
                  </UiGrid>

                  <UiFlex justify="end">
                    <UiButton
                      size="sm"
                      variant="primary"
                      onClick={handleApplyBatchActions}
                      loading={isApplyingBatch}
                      icon={<Save size={14} />}
                    >
                      Aplicar em Lote ({selectedUsernames.size})
                    </UiButton>
                  </UiFlex>
                </UiStack>
              </UiCard>
            )}
          </UiStack>
        </UiCardContent>
      </UiCard>

      {/* Tabela de Usuários */}
      <UiCard>
        {loading && users.length === 0 ? (
          <UiFlex justify="center" align="center" style={{ padding: "60px 0" }}>
            <UiSpinner size="lg" />
          </UiFlex>
        ) : filteredUsers.length === 0 ? (
          <UiStack gap={8} align="center" style={{ padding: "48px 0" }}>
            <Users className="text-muted" size={42} />
            <p className="font-bold">Nenhum usuário encontrado com os filtros atuais.</p>
            <p className="text-xs text-muted">Ajuste os termos de busca ou recarregue a lista.</p>
          </UiStack>
        ) : (
          <UiTable
            columns={columns}
            data={pagedUsers}
            keyField="username"
            selectable
            selectedKeys={selectedUsernames}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={(key) => {
              if (sortKey === key) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
              else {
                setSortKey(key);
                setSortDir("asc");
              }
            }}
            pagination={{
              page,
              pageSize,
              total: sortedUsers.length,
              onPageChange: setPage,
            }}
          />
        )}
      </UiCard>

      {/* ========================================================================= */}
      {/* MODAL: EDITAR USUÁRIO INDIVIDUALMENTE */}
      {/* ========================================================================= */}
      <UiModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title={
          <UiFlex gap={8} align="center">
            <Edit3 className="text-brand" size={20} />
            <span>Editar Usuário: {editingUser?.username}</span>
          </UiFlex>
        }
        subtitle="Atualize o papel, vincule ou remova turmas e defina permissões deste usuário."
        size="lg"
        footer={
          <UiFlex justify="end" gap={10}>
            <UiButton variant="dim" onClick={() => setEditingUser(null)}>
              Cancelar
            </UiButton>
            <UiButton
              variant="primary"
              onClick={handleSaveIndividualEdit}
              loading={isSavingUser}
              icon={<Save size={15} />}
            >
              Salvar Alterações
            </UiButton>
          </UiFlex>
        }
      >
        <UiStack gap={16}>
          <UiGrid columns={2} gap={14}>
            <UiTextInput
              label="Nome Completo"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <UiTextInput
              label="E-mail"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="aluno@instituicao.edu.br"
            />
          </UiGrid>

          <UiTextInput
            label="Nova Senha (deixe em branco para manter a atual)"
            type="text"
            value={editPassword}
            onChange={(e) => setEditPassword(e.target.value)}
            placeholder="Preencha apenas para redefinir..."
            endIcon={
              <UiButton
                size="sm"
                variant="dim"
                onClick={() => setEditPassword(generateSecurePassword(12))}
              >
                Gerar Forte
              </UiButton>
            }
          />

          {/* Seleção do Papel Obrigatório do Usuário */}
          <UiStack gap={6}>
            <span className="text-xs font-semibold">Papel do Usuário (Obrigatório - Exatamente 1):</span>
            <UiFlex gap={8} wrap>
              {knownRoles.map((r) => {
                const isSelected = editRoleLabel?.toLowerCase() === r.toLowerCase();
                return (
                  <UiButton
                    key={r}
                    size="sm"
                    variant={isSelected ? "primary" : "dim"}
                    onClick={() => setEditRoleLabel(r)}
                  >
                    {isSelected && <Check size={13} style={{ marginRight: 4 }} />}
                    {r.toUpperCase()}
                  </UiButton>
                );
              })}
            </UiFlex>
            <p className="text-xs text-muted">
              O papel define as páginas e permissões que o usuário terá no Wizard (aluno, professor, monitor, admin).
            </p>
          </UiStack>

          {/* Associação de Turmas por Labels */}
          <UiStack gap={8}>
            <span className="text-xs font-semibold">Turmas Associadas (Pode pertencer a múltiplas):</span>
            <UiFlex gap={6} wrap>
              {knownTurmas.map((t) => {
                const isSelected = editTurmasLabels.includes(t);
                return (
                  <UiBadge
                    key={t}
                    variant={isSelected ? "brand" : "neutral"}
                    size="md"
                    className="cursor-pointer"
                    onClick={() => {
                      setEditTurmasLabels((prev) =>
                        prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
                      );
                    }}
                  >
                    {isSelected ? `✓ ${t}` : `+ ${t}`}
                  </UiBadge>
                );
              })}
            </UiFlex>

            {/* Adicionar nova turma customizada */}
            <UiFlex gap={8} align="center">
              <div style={{ flex: 1 }}>
                <UiTextInput
                  placeholder="Nova turma (ex: turma-2026-3)..."
                  value={newCustomTurmaInput}
                  onChange={(e) => setNewCustomTurmaInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                />
              </div>
              <UiButton
                size="sm"
                variant="dim"
                onClick={() => {
                  const val = newCustomTurmaInput.trim();
                  if (val && !editTurmasLabels.includes(val)) {
                    setEditTurmasLabels((prev) => [...prev, val]);
                    setNewCustomTurmaInput("");
                  }
                }}
              >
                Adicionar Turma
              </UiButton>
            </UiFlex>
          </UiStack>

          <UiSwitch
            checked={editEnabled}
            onChange={setEditEnabled}
            label={editEnabled ? "Usuário Ativo (Pode efetuar login)" : "Usuário Desativado"}
          />
        </UiStack>
      </UiModal>

      {/* ========================================================================= */}
      {/* MODAL: NOVO USUÁRIO */}
      {/* ========================================================================= */}
      <UiModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Cadastrar Novo Usuário"
        subtitle="Crie uma nova conta com papel definido e vinculação de turma."
        size="lg"
      >
        <UiStack gap={16}>
          <UiGrid columns={2} gap={14}>
            <UiTextInput
              label="Nome Completo"
              placeholder="ex: Lucas Andrade"
              value={singleName}
              onChange={(e) => setSingleName(e.target.value)}
              required
            />
            <UiTextInput
              label="Nome de Usuário (login)"
              placeholder="ex: lucas.andrade"
              value={singleUsername}
              onChange={(e) => setSingleUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
              required
            />
          </UiGrid>

          <UiGrid columns={2} gap={14}>
            <UiTextInput
              label="E-mail (opcional)"
              placeholder="ex: lucas@cin.ufpe.br"
              value={singleEmail}
              onChange={(e) => setSingleEmail(e.target.value)}
            />
            <UiTextInput
              label="Senha Inicial"
              value={singlePassword}
              onChange={(e) => setSinglePassword(e.target.value)}
              placeholder="••••••••••••"
              endIcon={
                <UiButton
                  size="sm"
                  variant="dim"
                  onClick={() => setSinglePassword(generateSecurePassword(12))}
                >
                  Gerar
                </UiButton>
              }
              required
            />
          </UiGrid>

          {/* Papel */}
          <UiStack gap={6}>
            <span className="text-xs font-semibold">Papel no Wizard:</span>
            <UiFlex gap={8} wrap>
              {knownRoles.map((r) => {
                const isSelected = singleRoleLabel === r;
                return (
                  <UiButton
                    key={r}
                    size="sm"
                    variant={isSelected ? "primary" : "dim"}
                    onClick={() => setSingleRoleLabel(r)}
                  >
                    {isSelected && <Check size={13} style={{ marginRight: 4 }} />}
                    {r.toUpperCase()}
                  </UiButton>
                );
              })}
            </UiFlex>
          </UiStack>

          {/* Turmas */}
          {knownTurmas.length > 0 && (
            <UiStack gap={6}>
              <span className="text-xs font-semibold">Vincular a Turmas Iniciais:</span>
              <UiFlex gap={6} wrap>
                {knownTurmas.map((t) => {
                  const isSelected = singleTurmas.includes(t);
                  return (
                    <UiBadge
                      key={t}
                      variant={isSelected ? "brand" : "neutral"}
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => {
                        setSingleTurmas((prev) =>
                          prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
                        );
                      }}
                    >
                      {isSelected ? `✓ ${t}` : `+ ${t}`}
                    </UiBadge>
                  );
                })}
              </UiFlex>
            </UiStack>
          )}

          <UiFlex justify="end" gap={10} style={{ marginTop: 10 }}>
            <UiButton variant="dim" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </UiButton>
            <UiButton
              variant="primary"
              onClick={handleCreateSingle}
              loading={isCreatingUser}
              icon={<Plus size={15} />}
            >
              Criar Conta
            </UiButton>
          </UiFlex>
        </UiStack>
      </UiModal>

      {/* ========================================================================= */}
      {/* MODAL: GERAR / DEFINIR SENHA */}
      {/* ========================================================================= */}
      <UiModal
        isOpen={genPassModalOpen}
        onClose={() => setGenPassModalOpen(false)}
        title="Definir Senha do Usuário"
        size="sm"
      >
        <UiStack gap={16}>
          <p className="text-sm text-muted">
            Usuário: <strong className="text-brand font-mono">{genPassTargetUser?.username}</strong>
          </p>

          <UiTextInput
            label="Senha Criptográfica (12 caracteres)"
            value={generatedPassword}
            onChange={(e) => setGeneratedPassword(e.target.value)}
            endIcon={
              <UiButton
                size="sm"
                variant="dim"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPassword);
                  showToast("Senha copiada para a área de transferência!", "success");
                }}
                icon={<Copy size={14} />}
              >
                Copiar
              </UiButton>
            }
          />

          <UiFlex justify="between" align="center">
            <UiButton
              size="sm"
              variant="dim"
              onClick={() => setGeneratedPassword(generateSecurePassword(12))}
            >
              Gerar Outra
            </UiButton>

            <UiButton
              size="sm"
              variant="primary"
              onClick={handleApplyGenPassword}
              loading={isSavingPassword}
            >
              Salvar Senha no DOMjudge
            </UiButton>
          </UiFlex>
        </UiStack>
      </UiModal>
    </UiStack>
  );
};
