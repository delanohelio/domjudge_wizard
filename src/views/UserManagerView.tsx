import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  UserCheck,
  Tag,
  Shield,
  Plus,
  Save,
  Download,
  RefreshCw,
  Search,
  Key,
  Copy,
  AlertTriangle,
  CheckCircle,
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
} from "@/components/ui";
import { UiBatchUserPreview, ParsedBatchUser } from "@/components/domain";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { DomjudgeApiService } from "@/services/domjudgeApi";
import { generateSecurePassword } from "@/services/passwordService";
import { UserAccount, Team, TeamCategory } from "@/types/domjudge";

export const UserManagerView: React.FC = () => {
  const { credentials, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<TeamCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seleção e Paginação
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortKey, setSortKey] = useState<string>("username");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Filtros
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterEnabled, setFilterEnabled] = useState("all");

  // Ações em massa para selecionados
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkStatus, setBulkStatus] = useState<"keep" | "enable" | "disable">("keep");

  // Modal de Criação
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTab, setCreateTab] = useState<string>("single");

  // Formulário de Criação Individual
  const [singleUsername, setSingleUsername] = useState("");
  const [singleName, setSingleName] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [singlePassword, setSinglePassword] = useState("");
  const [singleTeam, setSingleTeam] = useState("");
  const [singleCategory, setSingleCategory] = useState("");
  const [singleRole, setSingleRole] = useState("team");

  // Criação em Lote
  const [batchText, setBatchText] = useState("");
  const [batchDefaultCategory, setBatchDefaultCategory] = useState("");
  const [batchDefaultRole, setBatchDefaultRole] = useState("team");

  // Modal de Gerador de Senha
  const [genPassModalOpen, setGenPassModalOpen] = useState(false);
  const [genPassTargetUser, setGenPassTargetUser] = useState<UserAccount | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState("");

  const api = useMemo(() => new DomjudgeApiService(credentials), [credentials]);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [userList, catList] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getCategories().catch(() => []),
      ]);

      const enriched: UserAccount[] = userList.map((u) => ({
        ...u,
        _original: {
          name: u.name,
          email: u.email,
          team_id: u.team_id,
          roles: [...u.roles],
          enabled: u.enabled !== false,
          category_id: u.category_id,
        },
        _changed: false,
      }));

      setUsers(enriched);
      setCategories(catList);
      showToast(`${enriched.length} usuários carregados com sucesso!`, "success");
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

  // Detecção de conflitos de username
  const usernameConflictMap = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach((u) => {
      const clean = u.username.trim().toLowerCase();
      counts.set(clean, (counts.get(clean) || 0) + 1);
    });
    return counts;
  }, [users]);

  // Edição inline
  const updateUserField = (username: string, field: keyof UserAccount, value: any) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.username !== username) return u;
        const updated = { ...u, [field]: value };
        const orig = updated._original;
        const isChanged = Boolean(
          orig &&
            (orig.name !== updated.name ||
              orig.email !== updated.email ||
              orig.team_id !== updated.team_id ||
              orig.enabled !== updated.enabled ||
              orig.category_id !== updated.category_id ||
              updated.password)
        );
        return { ...updated, _changed: isChanged };
      })
    );
  };

  // Parser em tempo real do lote CSV/TSV
  const parsedBatchUsers = useMemo<ParsedBatchUser[]>(() => {
    if (!batchText.trim()) return [];
    const lines = batchText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const existingUsernames = new Set(users.map((u) => u.username.toLowerCase()));

    return lines.map((line, idx) => {
      const errors: string[] = [];
      const parts = line.includes("\t") ? line.split("\t") : line.split(/[,;]/);
      const username = (parts[0] || "").trim();
      const name = (parts[1] || "").trim();
      const password = (parts[2] || "").trim();
      const email = (parts[3] || "").trim();
      const team = (parts[4] || "").trim();
      const category = (parts[5] || "").trim() || batchDefaultCategory || "Geral";
      const role = (parts[6] || "").trim() || batchDefaultRole || "team";

      if (!username) {
        errors.push("Nome de usuário ausente.");
      } else if (existingUsernames.has(username.toLowerCase())) {
        errors.push("Usuário já existente no sistema.");
      }

      if (!password && !password) {
        errors.push("Senha ausente ou inválida.");
      } else if (password && password.length < 10) {
        errors.push("Senha deve ter ao menos 10 caracteres.");
      }

      return {
        rowNumber: idx + 1,
        username,
        name: name || username,
        password,
        email: email || null,
        team_id: team || null,
        category_id: category,
        roles: [role],
        enabled: true,
        errors,
        isValid: errors.length === 0,
      };
    });
  }, [batchText, batchDefaultCategory, batchDefaultRole, users]);

  // Filtragem
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filterText) {
        const text = `${u.username} ${u.name || ""} ${u.email || ""} ${u.team_id || ""}`.toLowerCase();
        if (!text.includes(filterText.toLowerCase())) return false;
      }
      if (filterCategory !== "all" && u.category_id !== filterCategory) return false;
      if (filterRole !== "all" && !u.roles.includes(filterRole)) return false;
      if (filterEnabled !== "all") {
        const want = filterEnabled === "enabled";
        if (Boolean(u.enabled) !== want) return false;
      }
      return true;
    });
  }, [users, filterText, filterCategory, filterRole, filterEnabled]);

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

  // KPIs
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.enabled !== false).length;
  const categoriesCount = new Set(users.map((u) => u.category_id).filter(Boolean)).size;
  const teamsCount = new Set(users.map((u) => u.team_id).filter(Boolean)).size;
  const changedCount = users.filter((u) => u._changed).length;

  // Seleção de linhas
  const handleSelectRow = (username: string, selected: boolean) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(username);
      else next.delete(username);
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allCurrent = pagedUsers.map((u) => u.username);
      setSelectedUserIds((prev) => new Set([...prev, ...allCurrent]));
    } else {
      const currentIds = new Set(pagedUsers.map((u) => u.username));
      setSelectedUserIds((prev) => new Set([...prev].filter((id) => !currentIds.has(id))));
    }
  };

  // Gerar senha segura para um usuário
  const handleOpenGenPassword = (user: UserAccount) => {
    const newPass = generateSecurePassword(12);
    setGenPassTargetUser(user);
    setGeneratedPassword(newPass);
    setGenPassModalOpen(true);
  };

  const handleApplyGenPassword = () => {
    if (!genPassTargetUser) return;
    updateUserField(genPassTargetUser.username, "password", generatedPassword);
    setGenPassModalOpen(false);
    showToast(`Nova senha atribuída localmente a ${genPassTargetUser.username}! Lembre-se de salvar.`, "info");
  };

  // Aplicar alterações em massa nos selecionados
  const handleApplyBulkToSelected = () => {
    if (selectedUserIds.size === 0) {
      showToast("Selecione ao menos um usuário na tabela.", "warning");
      return;
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (!selectedUserIds.has(u.username)) return u;
        const updated = {
          ...u,
          category_id: bulkCategory || u.category_id,
          enabled: bulkStatus === "enable" ? true : bulkStatus === "disable" ? false : u.enabled,
        };
        return { ...updated, _changed: true };
      })
    );

    showToast(`Alterações aplicadas a ${selectedUserIds.size} usuários selecionados!`, "info");
  };

  // Salvar no DOMjudge
  const handleSaveChanges = async () => {
    const changed = users.filter((u) => u._changed);
    if (changed.length === 0) {
      showToast("Não há alterações para salvar.", "info");
      return;
    }

    setSaving(true);
    try {
      const payload = changed.map((u) => ({
        type: u.roles.includes("admin") ? "admin" : u.roles.includes("jury") ? "jury" : "team",
        name: u.name || u.username,
        username: u.username,
        email: u.email || null,
        team_id: u.team_id || null,
        roles: u.roles,
        enabled: u.enabled !== false,
        ...(u.password ? { password: u.password } : {}),
      }));

      await api.syncAccounts(payload);
      showToast(`${changed.length} usuários sincronizados com sucesso no DOMjudge!`, "success");

      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          _original: {
            name: u.name,
            email: u.email,
            team_id: u.team_id,
            roles: [...u.roles],
            enabled: u.enabled !== false,
            category_id: u.category_id,
          },
          _changed: false,
          password: undefined,
        }))
      );
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erro ao sincronizar usuários com o DOMjudge.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Exportar CSV
  const handleExportCsv = () => {
    const headers = ["Username", "Nome", "Email", "Team ID", "Categoria", "Papéis", "Ativo"];
    const rows = filteredUsers.map((u) => [
      u.username,
      `"${u.name || ""}"`,
      u.email || "",
      u.team_id || "",
      u.category_id || "",
      `"${u.roles.join(",")}"`,
      u.enabled !== false ? "Sim" : "Não",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `usuarios_domjudge_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exportação de usuários gerada com sucesso!", "success");
  };

  // Confirmar criação individual
  const handleCreateSingle = () => {
    if (!singleUsername || !singlePassword) {
      showToast("Preencha ao menos Usuário e Senha.", "warning");
      return;
    }

    const newUser: UserAccount = {
      username: singleUsername.trim(),
      name: singleName.trim() || singleUsername.trim(),
      email: singleEmail.trim() || null,
      password: singlePassword,
      team_id: singleTeam.trim() || null,
      category_id: singleCategory || "Geral",
      roles: [singleRole],
      enabled: true,
      _changed: true,
    };

    setUsers((prev) => [newUser, ...prev]);
    setIsCreateModalOpen(false);
    setSingleUsername("");
    setSingleName("");
    setSinglePassword("");
    setSingleEmail("");
    showToast(`Usuário ${newUser.username} criado localmente! Clique em Salvar para sincronizar.`, "success");
  };

  // Confirmar criação em lote
  const handleCreateBatch = () => {
    const valids = parsedBatchUsers.filter((u) => u.isValid);
    if (valids.length === 0) {
      showToast("Nenhum usuário válido detectado no lote para importar.", "warning");
      return;
    }

    const newAccounts: UserAccount[] = valids.map((v) => ({
      username: v.username,
      name: v.name,
      email: v.email,
      password: v.password,
      team_id: v.team_id,
      category_id: v.category_id,
      roles: v.roles,
      enabled: true,
      _changed: true,
    }));

    setUsers((prev) => [...newAccounts, ...prev]);
    setIsCreateModalOpen(false);
    setBatchText("");
    showToast(`${newAccounts.length} usuários importados localmente! Clique em Salvar para sincronizar.`, "success");
  };

  const columns: Column<UserAccount>[] = [
    {
      key: "username",
      title: "Usuário",
      sortable: true,
      render: (u) => {
        const isConflict = (usernameConflictMap.get(u.username.toLowerCase()) || 0) > 1;
        return (
          <UiFlex gap={6} align="center">
            <span className="font-mono font-bold text-brand">{u.username}</span>
            {isConflict && (
              <UiBadge variant="danger" size="sm" dot title="Conflito: nome de usuário duplicado!">
                Duplicado
              </UiBadge>
            )}
            {u._changed && (
              <UiBadge variant="warning" size="sm" dot>
                Modificado
              </UiBadge>
            )}
          </UiFlex>
        );
      },
    },
    {
      key: "name",
      title: "Nome Completo",
      sortable: true,
      render: (u) => (
        <UiTextInput
          size="sm"
          value={u.name || ""}
          onChange={(e) => updateUserField(u.username, "name", e.target.value)}
        />
      ),
    },
    {
      key: "team_id",
      title: "Time (Team)",
      sortable: true,
      render: (u) => (
        <UiTextInput
          size="sm"
          value={u.team_id || ""}
          placeholder="team-id..."
          onChange={(e) => updateUserField(u.username, "team_id", e.target.value)}
        />
      ),
    },
    {
      key: "category_id",
      title: "Categoria",
      sortable: true,
      render: (u) => (
        <UiSelect
          size="sm"
          options={[
            { value: "", label: "Nenhuma" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={u.category_id || ""}
          onChange={(val) => updateUserField(u.username, "category_id", val)}
        />
      ),
    },
    {
      key: "roles",
      title: "Papéis",
      render: (u) => (
        <UiFlex gap={4} wrap>
          {u.roles.map((r) => (
            <UiBadge
              key={r}
              variant={r === "admin" ? "danger" : r === "jury" ? "warning" : "info"}
              size="sm"
            >
              {r}
            </UiBadge>
          ))}
        </UiFlex>
      ),
    },
    {
      key: "enabled",
      title: "Status",
      width: "100px",
      align: "center",
      render: (u) => (
        <UiSwitch
          size="sm"
          checked={u.enabled !== false}
          onChange={(val) => updateUserField(u.username, "enabled", val)}
        />
      ),
    },
    {
      key: "actions",
      title: "Ações",
      width: "120px",
      align: "center",
      render: (u) => (
        <UiButton
          size="sm"
          variant="dim"
          icon={<Key size={14} />}
          onClick={() => handleOpenGenPassword(u)}
          title="Gerar nova senha segura para este usuário"
        >
          Senha
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
            <h2 className="text-xl font-bold">Gerenciador de Usuários e Times</h2>
            <p className="text-muted text-sm">
              Crie contas avulsas ou em lote (CSV/TSV), configure papéis, times e senhas seguras.
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
              variant="secondary"
              onClick={() => setIsCreateModalOpen(true)}
              icon={<Plus size={16} />}
            >
              + Novo Usuário / Lote
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
          title="Categorias"
          value={categoriesCount}
          icon={<Tag size={20} />}
          variant="info"
        />
        <UiMetricCard
          title="Times Registrados"
          value={teamsCount}
          icon={<Shield size={20} />}
          variant="warning"
        />
      </UiGrid>

      {/* Filtros e Barra em Massa */}
      <UiCard variant="default">
        <UiCardHeader>
          <UiCardTitle>Filtros e Operações em Massa</UiCardTitle>
        </UiCardHeader>

        <UiCardContent>
          <UiStack gap={16}>
            <UiGrid columns={4} gap={14}>
              <UiTextInput
                label="Buscar Usuários"
                placeholder="Nome, username, email ou time..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                startIcon={<Search size={16} />}
              />

              <UiSelect
                label="Categoria"
                options={[
                  { value: "all", label: "Todas as Categorias" },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={filterCategory}
                onChange={setFilterCategory}
              />

              <UiSelect
                label="Papel (Role)"
                options={[
                  { value: "all", label: "Todos os Papéis" },
                  { value: "team", label: "Times (team)" },
                  { value: "jury", label: "Jurados (jury)" },
                  { value: "admin", label: "Administradores (admin)" },
                ]}
                value={filterRole}
                onChange={setFilterRole}
              />

              <UiSelect
                label="Status"
                options={[
                  { value: "all", label: "Todos os Status" },
                  { value: "enabled", label: "Apenas Ativos" },
                  { value: "disabled", label: "Apenas Desativados" },
                ]}
                value={filterEnabled}
                onChange={setFilterEnabled}
              />
            </UiGrid>

            {/* Painel de ações para selecionados */}
            {selectedUserIds.size > 0 && (
              <UiCard variant="subtle">
                <UiFlex justify="between" align="center" wrap gap={12}>
                  <span className="font-bold text-sm">
                    {selectedUserIds.size} selecionados:
                  </span>

                  <UiFlex gap={12} wrap align="center">
                    <UiSelect
                      size="sm"
                      placeholder="Atribuir Categoria..."
                      options={[
                        { value: "", label: "Manter Categoria" },
                        ...categories.map((c) => ({ value: c.id, label: c.name })),
                      ]}
                      value={bulkCategory}
                      onChange={setBulkCategory}
                    />

                    <UiSelect
                      size="sm"
                      options={[
                        { value: "keep", label: "Manter Status" },
                        { value: "enable", label: "Habilitar Todos" },
                        { value: "disable", label: "Desabilitar Todos" },
                      ]}
                      value={bulkStatus}
                      onChange={(val) => setBulkStatus(val as any)}
                    />

                    <UiButton
                      size="sm"
                      variant="secondary"
                      onClick={handleApplyBulkToSelected}
                    >
                      Aplicar aos Selecionados
                    </UiButton>
                  </UiFlex>
                </UiFlex>
              </UiCard>
            )}
          </UiStack>
        </UiCardContent>
      </UiCard>

      {/* Tabela de Usuários */}
      <UiTable
        columns={columns}
        data={pagedUsers}
        keyField="username"
        selectable
        selectedKeys={selectedUserIds}
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
          onPageSizeChange: (s) => {
            setPageSize(s);
            setPage(1);
          },
        }}
      />

      {/* Modal de Criação Individual / Lote */}
      <UiModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Cadastrar Usuários"
        size="lg"
      >
        <UiStack gap={16}>
          <UiTabs
            variant="pill"
            activeTab={createTab}
            onChange={setCreateTab}
            tabs={[
              { id: "single", label: "Criação Individual" },
              { id: "batch", label: "Criação em Lote (CSV/TSV)" },
            ]}
          />

          {createTab === "single" ? (
            <UiStack gap={14}>
              <UiGrid columns={2} gap={12}>
                <UiTextInput
                  label="Nome de Usuário (Login)"
                  placeholder="ex: time01"
                  value={singleUsername}
                  onChange={(e) => setSingleUsername(e.target.value)}
                  required
                />
                <UiTextInput
                  label="Nome Completo"
                  placeholder="ex: Os Mestres do Código"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                />
              </UiGrid>

              <UiGrid columns={2} gap={12}>
                <UiTextInput
                  label="Email"
                  type="email"
                  placeholder="contato@time.org"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                />
                <UiTextInput
                  label="Senha Provisória (10+ caracteres)"
                  placeholder="••••••••••••"
                  value={singlePassword}
                  onChange={(e) => setSinglePassword(e.target.value)}
                  endIcon={
                    <UiButton
                      size="sm"
                      variant="dim"
                      onClick={() => setSinglePassword(generateSecurePassword(12))}
                      title="Gerar senha aleatória forte"
                    >
                      Gerar
                    </UiButton>
                  }
                  required
                />
              </UiGrid>

              <UiGrid columns={3} gap={12}>
                <UiTextInput
                  label="Time (Team ID)"
                  placeholder="ex: team-1"
                  value={singleTeam}
                  onChange={(e) => setSingleTeam(e.target.value)}
                />
                <UiSelect
                  label="Categoria"
                  options={[
                    { value: "Geral", label: "Geral" },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  value={singleCategory}
                  onChange={setSingleCategory}
                />
                <UiSelect
                  label="Papel (Role)"
                  options={[
                    { value: "team", label: "Team (Competidor)" },
                    { value: "jury", label: "Jury (Jurado)" },
                    { value: "admin", label: "Admin (Administrador)" },
                  ]}
                  value={singleRole}
                  onChange={setSingleRole}
                />
              </UiGrid>

              <UiFlex justify="end" gap={10} style={{ marginTop: 10 }}>
                <UiButton variant="dim" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </UiButton>
                <UiButton variant="primary" onClick={handleCreateSingle}>
                  Cadastrar Usuário
                </UiButton>
              </UiFlex>
            </UiStack>
          ) : (
            <UiStack gap={14}>
              <UiAlert variant="info">
                Cole linhas no formato: <strong>username, nome, senha, email, time, categoria, papel</strong> (suporta CSV ou TSV colado direto do Excel/Sheets).
              </UiAlert>

              <UiTextarea
                rows={6}
                mono
                placeholder="time01, Time Alpha, SenhaForte123!, alpha@icpc.org, team-1, Oficial, team&#10;time02, Time Beta, SenhaForte456!, beta@icpc.org, team-2, Oficial, team"
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
              />

              <UiBatchUserPreview users={parsedBatchUsers} />

              <UiFlex justify="end" gap={10} style={{ marginTop: 10 }}>
                <UiButton variant="dim" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </UiButton>
                <UiButton
                  variant="primary"
                  onClick={handleCreateBatch}
                  disabled={parsedBatchUsers.filter((u) => u.isValid).length === 0}
                >
                  Importar {parsedBatchUsers.filter((u) => u.isValid).length} Usuários Válidos
                </UiButton>
              </UiFlex>
            </UiStack>
          )}
        </UiStack>
      </UiModal>

      {/* Modal de Gerador de Senha */}
      <UiModal
        isOpen={genPassModalOpen}
        onClose={() => setGenPassModalOpen(false)}
        title="Nova Senha Gerada"
        size="sm"
      >
        <UiStack gap={16}>
          <p className="text-sm text-muted">
            Usuário selecionado:{" "}
            <strong className="text-brand">{genPassTargetUser?.username}</strong>
          </p>

          <UiTextInput
            label="Senha Criptográfica (12 caracteres)"
            value={generatedPassword}
            readOnly
            endIcon={
              <UiButton
                size="sm"
                variant="primary"
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

          <UiAlert variant="warning">
            Esta nova senha foi atribuída localmente. Clique em <strong>"Salvar Alterações"</strong> no topo da tela para sincronizar no DOMjudge.
          </UiAlert>

          <UiFlex justify="end" gap={10}>
            <UiButton variant="primary" onClick={handleApplyGenPassword}>
              Concluído
            </UiButton>
          </UiFlex>
        </UiStack>
      </UiModal>
    </UiStack>
  );
};
