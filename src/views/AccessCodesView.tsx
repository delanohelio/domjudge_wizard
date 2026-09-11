import React, { useState, useEffect } from "react";
import {
  KeyRound,
  Plus,
  Search,
  Copy,
  Check,
  Edit2,
  Trash2,
  Shield,
  Tag,
  Users,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  UiCard,
  UiStack,
  UiFlex,
  UiButton,
  UiTextInput,
  UiBadge,
  UiModal,
  UiSwitch,
  UiAlert,
  UiMetricCard,
  UiSelect,
} from "@/components/ui";
import { AccessCode } from "@/types/domjudge";
import {
  fetchAccessCodes,
  createAccessCode,
  updateAccessCode,
  deleteAccessCode,
} from "@/services/adminService";
import { getBasePath } from "@/services/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export const AccessCodesView: React.FC = () => {
  const { token, isDemo } = useAuth();
  const { showToast } = useToast();

  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Estado do Modal de Criação/Edição
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCode, setEditingCode] = useState<AccessCode | null>(null);
  const [formCode, setFormCode] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formLabels, setFormLabels] = useState<string>("");
  const [formCategory, setFormCategory] = useState<string>("Participants");
  const [formRole, setFormRole] = useState<string>("team");
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Controle de cópia
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadCodes = async () => {
    setLoading(true);
    try {
      if (isDemo) {
        setCodes([
          {
            id: "code_demo_1",
            code: "TURMA-2026-1",
            name: "Turma 2026.1 - Algoritmos e Programação",
            labels: ["turma-2026-1", "aluno"],
            category: "Participants",
            roles: ["team"],
            active: true,
            createdAt: new Date().toISOString(),
            usageCount: 42,
          },
          {
            id: "code_demo_2",
            code: "MONITORES-2026",
            name: "Equipe de Monitoria 2026.1",
            labels: ["monitor"],
            category: "Professores / Jury",
            roles: ["jury"],
            active: true,
            createdAt: new Date().toISOString(),
            usageCount: 5,
          },
          {
            id: "code_demo_3",
            code: "TREINO-EXTRA",
            name: "Inscrições Encerradas - Treino Especial",
            labels: ["treino-especial"],
            category: "Participants",
            roles: ["team"],
            active: false,
            createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
            usageCount: 18,
          },
        ]);
        setLoading(false);
        return;
      }

      const data = await fetchAccessCodes(token || undefined);
      setCodes(data);
    } catch (err: any) {
      console.error("Erro ao carregar códigos:", err);
      showToast(err.message || "Erro ao carregar códigos de acesso", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, [token, isDemo]);

  const handleOpenCreateModal = () => {
    setEditingCode(null);
    setFormCode("");
    setFormName("");
    setFormLabels("");
    setFormCategory("Participants");
    setFormRole("team");
    setFormActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: AccessCode) => {
    setEditingCode(c);
    setFormCode(c.code);
    setFormName(c.name);
    setFormLabels((c.labels || []).join(", "));
    setFormCategory(c.category || "Participants");
    setFormRole((c.roles && c.roles[0]) || "team");
    setFormActive(c.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const year = new Date().getFullYear();
    setFormCode(`TURMA-${year}-${rand}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      setFormError("Informe o código de acesso.");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const labelsArray = formLabels
      .split(/[,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const payload = {
      code: formCode.trim().toUpperCase(),
      name: formName.trim() || formCode.trim().toUpperCase(),
      labels: labelsArray,
      category: formCategory.trim() || "Participants",
      roles: [formRole],
      active: formActive,
    };

    try {
      if (isDemo) {
        if (editingCode) {
          setCodes((prev) =>
            prev.map((item) =>
              item.id === editingCode.id ? { ...item, ...payload } : item
            )
          );
          showToast("Código atualizado (Modo Demo)!", "success");
        } else {
          const newDemo: AccessCode = {
            id: `demo_${Date.now()}`,
            ...payload,
            createdAt: new Date().toISOString(),
            usageCount: 0,
          };
          setCodes((prev) => [newDemo, ...prev]);
          showToast("Código criado (Modo Demo)!", "success");
        }
        setIsModalOpen(false);
        return;
      }

      if (editingCode) {
        const updated = await updateAccessCode(editingCode.id, payload, token || undefined);
        setCodes((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        showToast(`Código '${updated.code}' atualizado com sucesso!`, "success");
      } else {
        const created = await createAccessCode(payload, token || undefined);
        setCodes((prev) => [created, ...prev]);
        showToast(`Código '${created.code}' criado com sucesso!`, "success");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erro ao salvar código de acesso");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (codeItem: AccessCode) => {
    const nextStatus = !codeItem.active;
    try {
      if (isDemo) {
        setCodes((prev) =>
          prev.map((c) => (c.id === codeItem.id ? { ...c, active: nextStatus } : c))
        );
        showToast(
          `Código ${nextStatus ? "ativado" : "desativado"} com sucesso!`,
          "info"
        );
        return;
      }

      const updated = await updateAccessCode(
        codeItem.id,
        { active: nextStatus },
        token || undefined
      );
      setCodes((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      showToast(
        `Código '${updated.code}' ${nextStatus ? "ativado" : "desativado"} com sucesso!`,
        "success"
      );
    } catch (err: any) {
      showToast(err.message || "Falha ao alterar status do código", "error");
    }
  };

  const handleDelete = async (codeItem: AccessCode) => {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir o código '${codeItem.code}'? Usuários já criados não serão apagados.`
      )
    ) {
      return;
    }

    try {
      if (isDemo) {
        setCodes((prev) => prev.filter((c) => c.id !== codeItem.id));
        showToast("Código excluído (Modo Demo)!", "info");
        return;
      }

      await deleteAccessCode(codeItem.id, token || undefined);
      setCodes((prev) => prev.filter((c) => c.id !== codeItem.id));
      showToast(`Código '${codeItem.code}' excluído com sucesso!`, "success");
    } catch (err: any) {
      showToast(err.message || "Falha ao excluir código", "error");
    }
  };

  const copyRegistrationLink = (codeStr: string, id: string) => {
    const host = window.location.origin;
    const base = getBasePath();
    const link = `${host}${base}/cadastro?codigo=${encodeURIComponent(codeStr)}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    showToast("Link direto de cadastro copiado para a área de transferência!", "success");
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  // Filtragem
  const filteredCodes = codes.filter((c) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesTerm =
      !term ||
      c.code.toLowerCase().includes(term) ||
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.labels && c.labels.some((l) => l.toLowerCase().includes(term)));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && c.active) ||
      (statusFilter === "inactive" && !c.active);

    return matchesTerm && matchesStatus;
  });

  const totalCodes = codes.length;
  const activeCodes = codes.filter((c) => c.active).length;
  const totalRegistrations = codes.reduce((acc, c) => acc + (c.usageCount || 0), 0);

  return (
    <UiStack gap={24} className="animate-fade-in">
      {/* Header com título e métricas */}
      <UiFlex justify="between" align="center" wrap gap={16}>
        <div>
          <h1 style={{ fontSize: "1.75rem", display: "flex", alignItems: "center", gap: 10 }}>
            <KeyRound className="text-brand" size={28} />
            Gerenciador de Códigos de Acesso
          </h1>
          <p style={{ color: "var(--ink-muted)", marginTop: 4 }}>
            Classifique novos usuários com labels automáticas e controle quais turmas podem se cadastrar.
          </p>
        </div>

        <UiFlex gap={10}>
          <UiButton
            variant="dim"
            onClick={loadCodes}
            icon={<RefreshCw size={16} />}
            loading={loading}
          >
            Atualizar
          </UiButton>
          <UiButton
            variant="primary"
            onClick={handleOpenCreateModal}
            icon={<Plus size={16} />}
          >
            Novo Código de Acesso
          </UiButton>
        </UiFlex>
      </UiFlex>

      {/* Cards de Métricas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <UiMetricCard
          title="Total de Códigos"
          value={totalCodes}
          icon={<KeyRound size={22} />}
          subtitle="Configurados"
        />
        <UiMetricCard
          title="Códigos Ativos"
          value={activeCodes}
          icon={<Shield size={22} />}
          subtitle={`${activeCodes} aceitando cadastro`}
        />
        <UiMetricCard
          title="Usuários Cadastrados"
          value={totalRegistrations}
          icon={<Users size={22} />}
          subtitle="Total de auto-registros"
        />
      </div>

      {/* Barra de Filtros */}
      <UiCard variant="elevated">
        <UiFlex gap={16} wrap align="center" justify="between">
          <div style={{ flex: 1, minWidth: 260 }}>
            <UiTextInput
              placeholder="Buscar por código, turma ou label..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startIcon={<Search size={16} />}
            />
          </div>

          <UiFlex gap={10} align="center">
            <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>Status:</span>
            <UiSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "Todos os Status" },
                { value: "active", label: "Apenas Ativos" },
                { value: "inactive", label: "Apenas Inativos" },
              ]}
              size="sm"
            />
          </UiFlex>
        </UiFlex>
      </UiCard>

      {/* Tabela de Códigos */}
      <UiCard variant="elevated">
        {filteredCodes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <KeyRound size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <h3 style={{ fontSize: "1.1rem" }}>Nenhum código de acesso encontrado</h3>
            <p style={{ color: "var(--ink-muted)", marginTop: 4, fontSize: "0.9rem" }}>
              {searchTerm || statusFilter !== "all"
                ? "Tente ajustar os filtros de busca."
                : "Crie o primeiro código para permitir o auto-cadastro de novos competidores."}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <UiButton
                variant="primary"
                size="sm"
                onClick={handleOpenCreateModal}
                icon={<Plus size={14} />}
                style={{ marginTop: 16 }}
              >
                Criar Código Agora
              </UiButton>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "0.9rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    color: "var(--ink-muted)",
                    fontSize: "0.8rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <th style={{ padding: "12px 16px" }}>Código</th>
                  <th style={{ padding: "12px 16px" }}>Descrição / Turma</th>
                  <th style={{ padding: "12px 16px" }}>Labels Aplicadas</th>
                  <th style={{ padding: "12px 16px" }}>Categoria</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Usos</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((item) => {
                  const isCopied = copiedId === item.id;
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        transition: "background 0.2s ease",
                      }}
                      className="hover:bg-surface-hover"
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <UiFlex gap={8} align="center">
                          <code
                            style={{
                              background: "rgba(99, 102, 241, 0.12)",
                              color: "var(--brand)",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontWeight: 700,
                              fontSize: "0.95rem",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {item.code}
                          </code>
                        </UiFlex>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--ink-muted)",
                            marginTop: 2,
                          }}
                        >
                          Criado em {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <UiFlex gap={6} wrap align="center">
                          {/* Label padrão do sistema obrigatória */}
                          <UiBadge
                            variant="neutral"
                            size="sm"
                            title="Label automática do sistema: o username do usuário é sempre incluído"
                          >
                            [username] (padrão)
                          </UiBadge>

                          {/* Labels configuradas */}
                          {item.labels && item.labels.length > 0 ? (
                            item.labels.map((lbl) => (
                              <UiBadge key={lbl} variant="brand" size="sm">
                                <Tag size={10} style={{ marginRight: 3 }} />
                                {lbl}
                              </UiBadge>
                            ))
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
                              (somente username)
                            </span>
                          )}
                        </UiFlex>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--ink)" }}>
                          {item.category || "Participants"}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <UiBadge variant="neutral" size="sm">
                          {item.usageCount || 0}
                        </UiBadge>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <UiSwitch
                          checked={item.active}
                          onChange={() => handleToggleStatus(item)}
                          label={item.active ? "Ativo" : "Inativo"}
                        />
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <UiFlex gap={6} justify="end">
                          <UiButton
                            size="sm"
                            variant="dim"
                            onClick={() => copyRegistrationLink(item.code, item.id)}
                            title="Copiar link direto para auto-cadastro"
                            icon={isCopied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                          >
                            {isCopied ? "Copiado!" : "Link"}
                          </UiButton>

                          <UiButton
                            size="sm"
                            variant="dim"
                            onClick={() => handleOpenEditModal(item)}
                            title="Editar código"
                            icon={<Edit2 size={14} />}
                          />

                          <UiButton
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(item)}
                            title="Excluir código"
                            icon={<Trash2 size={14} />}
                          />
                        </UiFlex>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </UiCard>

      {/* Modal de Criação / Edição de Código */}
      <UiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          <UiFlex gap={8} align="center">
            <KeyRound size={20} className="text-brand" />
            <span>{editingCode ? "Editar Código de Acesso" : "Novo Código de Acesso"}</span>
          </UiFlex>
        }
        subtitle="Defina o identificador do código, as labels atribuídas e se o código está liberado."
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <UiStack gap={16}>
            {formError && <UiAlert variant="danger">{formError}</UiAlert>}

            <div>
              <UiFlex justify="between" align="center" style={{ marginBottom: 6 }}>
                <label style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                  Código de Acesso <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <UiButton
                  type="button"
                  variant="dim"
                  size="sm"
                  onClick={generateRandomCode}
                  icon={<Sparkles size={12} />}
                >
                  Gerar Aleatório
                </UiButton>
              </UiFlex>
              <UiTextInput
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="Ex: TURMA-2026-1"
                required
                helperText="O código que os alunos/competidores utilizarão para se cadastrar."
              />
            </div>

            <UiTextInput
              label="Descrição / Nome da Turma"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Turma 2026.1 - Introdução aos Algoritmos"
              helperText="Identificação amigável exibida na tela de cadastro."
            />

            <div>
              <label style={{ fontSize: "0.88rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Labels Adicionadas (Separadas por vírgula)
              </label>
              <UiTextInput
                value={formLabels}
                onChange={(e) => setFormLabels(e.target.value)}
                placeholder="Ex: turma-a, 2026-1, aluno"
                helperText="A label do próprio username é sempre adicionada automaticamente pelo sistema."
              />
              <div
                style={{
                  marginTop: 6,
                  padding: "8px 12px",
                  background: "rgba(99, 102, 241, 0.08)",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  color: "var(--ink-muted)",
                }}
              >
                💡 <strong>Labels prévias do time:</strong>{" "}
                <code>[username]</code> +{" "}
                {formLabels
                  .split(/[,;]+/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((l) => `[${l}]`)
                  .join(" ") || "nenhuma"}
              </div>
            </div>

            <UiTextInput
              label="Categoria no DOMjudge"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              placeholder="Participants"
              helperText="Nome ou ID da categoria do time criado no DOMjudge."
            />

            <UiSelect
              label="Papel (Role) Inicial no DOMjudge"
              value={formRole}
              onChange={setFormRole}
              options={[
                { value: "team", label: "Team (Competidor / Aluno Padrão)" },
                { value: "jury", label: "Jury (Jurado / Monitor)" },
                { value: "admin", label: "Admin (Administrador)" },
              ]}
            />

            <div
              style={{
                background: "var(--surface)",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <UiSwitch
                checked={formActive}
                onChange={(checked) => setFormActive(checked)}
                label="Código Ativo (Permitir novos cadastros imediatamente)"
              />
              <p style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: 4 }}>
                Quando desativado, nenhum usuário conseguirá se registrar utilizando este código.
              </p>
            </div>

            <UiFlex gap={10} justify="end" style={{ marginTop: 8 }}>
              <UiButton
                type="button"
                variant="dim"
                onClick={() => setIsModalOpen(false)}
                disabled={formSubmitting}
              >
                Cancelar
              </UiButton>
              <UiButton
                type="submit"
                variant="primary"
                loading={formSubmitting}
              >
                {editingCode ? "Salvar Alterações" : "Criar Código"}
              </UiButton>
            </UiFlex>
          </UiStack>
        </form>
      </UiModal>
    </UiStack>
  );
};
