import React, { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Check,
  RefreshCw,
  Info,
  BarChart3,
  PenTool,
  Trophy,
  Users,
  KeyRound,
  Lock,
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
  UiCheckbox,
} from "@/components/ui";
import { LabelPermission } from "@/types/domjudge";
import {
  fetchLabelPermissions,
  saveLabelPermissions,
} from "@/services/adminService";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface PageDefinition {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const AVAILABLE_PAGES: PageDefinition[] = [
  {
    id: "review",
    name: "Visualização & Review",
    icon: <BarChart3 size={15} />,
    description: "Análise de submissões, código-fonte e vereditos",
  },
  {
    id: "creator",
    name: "Criador de Questões",
    icon: <PenTool size={15} />,
    description: "Criação de problemas e exportação de pacotes ZIP/PDF",
  },
  {
    id: "contests",
    name: "Gerenciar Contests",
    icon: <Trophy size={15} />,
    description: "Configuração de horários, ativação e freeze de placar",
  },
  {
    id: "users",
    name: "Gerenciar Usuários",
    icon: <Users size={15} />,
    description: "Edição em lote de categorias, status e senhas",
  },
  {
    id: "codes",
    name: "Gerenciar Códigos",
    icon: <KeyRound size={15} />,
    description: "Criação e controle de códigos de acesso para registro",
  },
  {
    id: "permissions",
    name: "Permissões & Labels",
    icon: <Shield size={15} />,
    description: "Configuração de regras de acesso por labels do DOMjudge",
  },
  {
    id: "trocar-senha",
    name: "Trocar Senha",
    icon: <Lock size={15} />,
    description: "Permite que os usuários alterem a sua própria senha",
  },
];

export const LabelPermissionsView: React.FC = () => {
  const { token, isDemo } = useAuth();
  const { showToast } = useToast();

  const [permissions, setPermissions] = useState<LabelPermission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal de edição / criação
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formLabel, setFormLabel] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formIsAdmin, setFormIsAdmin] = useState<boolean>(false);
  const [formAllowedPages, setFormAllowedPages] = useState<string[]>([]);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const adminSystemLabel = (window.__ENV__?.WIZARD_ADMIN_LABEL || "admin").toLowerCase();

  const loadPermissions = async () => {
    setLoading(true);
    try {
      if (isDemo) {
        setPermissions([
          {
            label: adminSystemLabel,
            description: "Administradores do Wizard (Acesso Total)",
            allowedPages: AVAILABLE_PAGES.map((p) => p.id),
            isAdmin: true,
          },
          {
            label: "professor",
            description: "Professores e Coordenadores",
            allowedPages: ["review", "creator", "contests", "users", "codes", "trocar-senha"],
            isAdmin: false,
          },
          {
            label: "monitor",
            description: "Monitores da Disciplina",
            allowedPages: ["review", "creator", "trocar-senha"],
            isAdmin: false,
          },
          {
            label: "aluno",
            description: "Alunos / Competidores",
            allowedPages: ["trocar-senha"],
            isAdmin: false,
          },
        ]);
        setLoading(false);
        return;
      }

      const data = await fetchLabelPermissions(token || undefined);
      setPermissions(data);
    } catch (err: any) {
      console.error("Erro ao carregar permissões:", err);
      showToast(err.message || "Erro ao carregar permissões de labels", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [token, isDemo]);

  const handleOpenCreateModal = () => {
    setEditingIndex(null);
    setFormLabel("");
    setFormDescription("");
    setFormIsAdmin(false);
    setFormAllowedPages(["review", "trocar-senha"]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: LabelPermission, index: number) => {
    setEditingIndex(index);
    setFormLabel(p.label);
    setFormDescription(p.description || "");
    setFormIsAdmin(Boolean(p.isAdmin));
    setFormAllowedPages(p.allowedPages || []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const togglePageSelection = (pageId: string) => {
    setFormAllowedPages((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  const selectAllPages = () => {
    setFormAllowedPages(AVAILABLE_PAGES.map((p) => p.id));
  };

  const clearAllPages = () => {
    setFormAllowedPages(["trocar-senha"]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      setFormError("Informe a label correspondente.");
      return;
    }

    const cleanLabel = formLabel.trim().toLowerCase();

    // Se estiver criando, verificar duplicatas
    if (
      editingIndex === null &&
      permissions.some((p) => p.label.toLowerCase() === cleanLabel)
    ) {
      setFormError(`A label '${cleanLabel}' já possui uma regra cadastrada.`);
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const updatedRule: LabelPermission = {
      label: cleanLabel,
      description: formDescription.trim() || undefined,
      isAdmin: formIsAdmin,
      allowedPages: formIsAdmin ? AVAILABLE_PAGES.map((p) => p.id) : formAllowedPages,
    };

    let updatedList: LabelPermission[];
    if (editingIndex !== null) {
      updatedList = permissions.map((p, idx) =>
        idx === editingIndex ? updatedRule : p
      );
    } else {
      updatedList = [...permissions, updatedRule];
    }

    try {
      if (isDemo) {
        setPermissions(updatedList);
        showToast("Regra de permissão salva (Modo Demo)!", "success");
        setIsModalOpen(false);
        return;
      }

      await saveLabelPermissions(updatedList, token || undefined);
      setPermissions(updatedList);
      showToast(`Regras de acesso para '${cleanLabel}' salvas com sucesso!`, "success");
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erro ao salvar regra de permissões.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (index: number) => {
    const target = permissions[index];
    if (target.label.toLowerCase() === adminSystemLabel) {
      showToast("A label raiz do administrador não pode ser removida.", "warning");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir a regra da label '${target.label}'?`)) {
      return;
    }

    const nextList = permissions.filter((_, idx) => idx !== index);

    try {
      if (isDemo) {
        setPermissions(nextList);
        showToast("Regra excluída (Modo Demo)!", "info");
        return;
      }

      await saveLabelPermissions(nextList, token || undefined);
      setPermissions(nextList);
      showToast(`Regra da label '${target.label}' excluída com sucesso!`, "success");
    } catch (err: any) {
      showToast(err.message || "Erro ao excluir regra.", "error");
    }
  };

  return (
    <UiStack gap={24} className="animate-fade-in">
      {/* Header */}
      <UiFlex justify="between" align="center" wrap gap={16}>
        <div>
          <h1 style={{ fontSize: "1.75rem", display: "flex", alignItems: "center", gap: 10 }}>
            <Shield className="text-brand" size={28} />
            Permissões & Controle de Acesso por Labels
          </h1>
          <p style={{ color: "var(--ink-muted)", marginTop: 4 }}>
            Configure quais labels do DOMjudge têm permissão de login no Wizard e quais módulos podem utilizar.
          </p>
        </div>

        <UiFlex gap={10}>
          <UiButton
            variant="dim"
            onClick={loadPermissions}
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
            Adicionar Label
          </UiButton>
        </UiFlex>
      </UiFlex>

      {/* Alerta Informativo */}
      <UiAlert variant="info">
        <UiFlex gap={10} align="start">
          <Info size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Como funciona o controle de acesso:</strong>
            <p style={{ marginTop: 4, fontSize: "0.88rem" }}>
              Quando um usuário entra com o login e senha do DOMjudge, o Wizard verifica as labels
              do seu time. Se o usuário possuir a label de administrador raiz (<code>{adminSystemLabel}</code>)
              ou a role <code>admin</code> no DOMjudge, o acesso é irrestrito. Para as demais labels, o
              usuário ganha acesso à união de todas as páginas habilitadas nas regras abaixo. Contas sem
              nenhuma label autorizada têm o acesso bloqueado com mensagem informativa.
            </p>
          </div>
        </UiFlex>
      </UiAlert>

      {/* Grid de Regras de Labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        {permissions.map((rule, idx) => {
          const isSystemAdmin = rule.label.toLowerCase() === adminSystemLabel;
          return (
            <UiCard key={rule.label} variant="elevated" style={{ display: "flex", flexDirection: "column" }}>
              <UiFlex justify="between" align="start" style={{ marginBottom: 12 }}>
                <div>
                  <UiFlex gap={8} align="center">
                    <code
                      style={{
                        background: rule.isAdmin
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(99, 102, 241, 0.15)",
                        color: rule.isAdmin ? "var(--danger)" : "var(--brand)",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontWeight: 700,
                        fontSize: "1rem",
                      }}
                    >
                      {rule.label}
                    </code>

                    {rule.isAdmin && (
                      <UiBadge variant="danger" size="sm">
                        <Shield size={10} style={{ marginRight: 3 }} /> Admin Total
                      </UiBadge>
                    )}

                    {isSystemAdmin && (
                      <UiBadge variant="brand" size="sm">
                        Padrão (.env)
                      </UiBadge>
                    )}
                  </UiFlex>

                  {rule.description && (
                    <p style={{ fontSize: "0.85rem", color: "var(--ink-muted)", marginTop: 6 }}>
                      {rule.description}
                    </p>
                  )}
                </div>

                <UiFlex gap={6}>
                  <UiButton
                    size="sm"
                    variant="dim"
                    onClick={() => handleOpenEditModal(rule, idx)}
                    title="Editar permissões"
                    icon={<Edit2 size={13} />}
                  />
                  {!isSystemAdmin && (
                    <UiButton
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(idx)}
                      title="Excluir regra"
                      icon={<Trash2 size={13} />}
                    />
                  )}
                </UiFlex>
              </UiFlex>

              {/* Módulos Habilitados */}
              <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                <span
                  style={{
                    fontSize: "0.78rem",
                    textTransform: "uppercase",
                    color: "var(--ink-muted)",
                    letterSpacing: "0.05em",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Páginas Permitidas ({rule.isAdmin ? "Todas" : (rule.allowedPages || []).length}):
                </span>

                <UiFlex gap={6} wrap>
                  {AVAILABLE_PAGES.map((page) => {
                    const isAllowed = rule.isAdmin || (rule.allowedPages || []).includes(page.id);
                    if (!isAllowed) return null;
                    return (
                      <UiBadge
                        key={page.id}
                        variant={rule.isAdmin ? "neutral" : "brand"}
                        size="sm"
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {page.icon}
                          <span>{page.name}</span>
                        </span>
                      </UiBadge>
                    );
                  })}
                </UiFlex>
              </div>
            </UiCard>
          );
        })}
      </div>

      {/* Modal de Criação / Edição de Regra */}
      <UiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          <UiFlex gap={8} align="center">
            <Shield size={20} className="text-brand" />
            <span>
              {editingIndex !== null ? `Editar Regra: ${formLabel}` : "Nova Regra de Label"}
            </span>
          </UiFlex>
        }
        subtitle="Defina o nome da label do DOMjudge e marque as páginas que os usuários terão acesso."
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <UiStack gap={16}>
            {formError && <UiAlert variant="danger">{formError}</UiAlert>}

            <UiTextInput
              label="Nome da Label (Conforme cadastrada no DOMjudge)"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value.toLowerCase())}
              placeholder="Ex: professor, monitor, turma-a"
              disabled={editingIndex !== null && formLabel === adminSystemLabel}
              required
              helperText="Insira exatamente o identificador da label (sem espaços extras)."
            />

            <UiTextInput
              label="Descrição ou Finalidade"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Ex: Monitores de Algoritmos 2026.1"
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
                checked={formIsAdmin}
                onChange={(checked) => setFormIsAdmin(checked)}
                label="Privilégios de Administrador Total (Acesso irrestrito a tudo)"
              />
              <p style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: 4 }}>
                Contas com essa label poderão gerenciar códigos de acesso, alterar permissões e acessar todas as abas.
              </p>
            </div>

            {!formIsAdmin && (
              <div>
                <UiFlex justify="between" align="center" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                    Módulos e Páginas Habilitadas:
                  </label>
                  <UiFlex gap={8}>
                    <UiButton
                      type="button"
                      size="sm"
                      variant="dim"
                      onClick={selectAllPages}
                    >
                      Marcar Todas
                    </UiButton>
                    <UiButton
                      type="button"
                      size="sm"
                      variant="dim"
                      onClick={clearAllPages}
                    >
                      Limpar
                    </UiButton>
                  </UiFlex>
                </UiFlex>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 8,
                  }}
                >
                  {AVAILABLE_PAGES.map((page) => {
                    const isChecked = formAllowedPages.includes(page.id);
                    return (
                      <div
                        key={page.id}
                        onClick={() => togglePageSelection(page.id)}
                        style={{
                          display: "flex",
                          alignItems: "start",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: "6px",
                          background: isChecked ? "rgba(99, 102, 241, 0.12)" : "var(--surface)",
                          border: `1px solid ${
                            isChecked ? "var(--brand)" : "var(--border)"
                          }`,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <UiCheckbox
                          checked={isChecked}
                          onChange={() => {}} // tratado no wrapper
                        />
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontWeight: 600,
                              fontSize: "0.88rem",
                            }}
                          >
                            {page.icon}
                            <span>{page.name}</span>
                          </div>
                          <p style={{ fontSize: "0.78rem", color: "var(--ink-muted)", marginTop: 2 }}>
                            {page.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <UiFlex gap={10} justify="end" style={{ marginTop: 12 }}>
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
                {editingIndex !== null ? "Salvar Regra" : "Adicionar Regra"}
              </UiButton>
            </UiFlex>
          </UiStack>
        </form>
      </UiModal>
    </UiStack>
  );
};
