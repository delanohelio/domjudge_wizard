import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  BookOpen,
  BarChart3,
  FileText,
  PenTool,
  KeyRound,
  Users,
  Shield,
  Lock,
  PlusCircle,
  LogOut,
  Sparkles,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { useContest } from "@/context/ContestContext";
import { useAuth } from "@/context/AuthContext";
import "./layout.css";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Navegação" | "Listas de Exercícios" | "Ações Rápidas";
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { contests, setSelectedContestId } = useContest();
  const { logout, canAccessPage } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Montar lista de comandos disponíveis
  const allCommands: CommandItem[] = [
    // Seção de Módulos (com verificação de RBAC)
    ...(canAccessPage("review")
      ? [
          {
            id: "nav-review",
            title: "Acompanhamento & Entregas",
            subtitle: "Painel de submissões e progresso dos alunos",
            category: "Navegação" as const,
            icon: <BarChart3 size={16} />,
            onSelect: () => {
              onNavigate("review");
              onClose();
            },
          },
        ]
      : []),
    ...(canAccessPage("contests")
      ? [
          {
            id: "nav-contests",
            title: "Listas de Exercícios",
            subtitle: "Prazos, status e criação de novas listas",
            category: "Navegação" as const,
            icon: <BookOpen size={16} />,
            onSelect: () => {
              onNavigate("contests");
              onClose();
            },
          },
        ]
      : []),
    ...(canAccessPage("problems")
      ? [
          {
            id: "nav-problems",
            title: "Banco de Questões",
            subtitle: "Visualizar, editar enunciados, exportar PDF e HTML",
            category: "Navegação" as const,
            icon: <FileText size={16} />,
            onSelect: () => {
              onNavigate("problems");
              onClose();
            },
          },
        ]
      : []),
    ...(canAccessPage("creator")
      ? [
          {
            id: "nav-creator",
            title: "Studio de Exercícios",
            subtitle: "Elaboração com KaTeX, casos de teste e pacotes ZIP",
            category: "Navegação" as const,
            icon: <PenTool size={16} />,
            onSelect: () => {
              onNavigate("creator");
              onClose();
            },
          },
        ]
      : []),
    ...(canAccessPage("codes")
      ? [
          {
            id: "nav-codes",
            title: "Inscrições & Turmas",
            subtitle: "Gerenciar códigos de auto-cadastro por turma",
            category: "Navegação" as const,
            icon: <KeyRound size={16} />,
            onSelect: () => {
              onNavigate("codes");
              onClose();
            },
          },
        ]
      : []),
    ...(canAccessPage("users")
      ? [
          {
            id: "nav-users",
            title: "Usuários Cadastrados",
            subtitle: "Gestão de contas, turmas e papéis individuais ou em lote",
            category: "Navegação" as const,
            icon: <Users size={16} />,
            onSelect: () => {
              onNavigate("users");
              onClose();
            },
          },
        ]
      : []),
    ...(canAccessPage("permissions")
      ? [
          {
            id: "nav-permissions",
            title: "Papéis & Permissões",
            subtitle: "Configuração de controle de acesso por label",
            category: "Navegação" as const,
            icon: <Shield size={16} />,
            onSelect: () => {
              onNavigate("permissions");
              onClose();
            },
          },
        ]
      : []),
    ...(canAccessPage("trocar-senha")
      ? [
          {
            id: "nav-password",
            title: "Trocar Senha",
            subtitle: "Atualizar credenciais de acesso",
            category: "Navegação" as const,
            icon: <Lock size={16} />,
            onSelect: () => {
              onNavigate("trocar-senha");
              onClose();
            },
          },
        ]
      : []),

    // Listas de Exercícios do DOMjudge (Ativar rapidamente)
    ...contests.map((c) => ({
      id: `contest-${c.id}`,
      title: c.name,
      subtitle: c.enabled ? "Lista ativa — Clique para focar" : "Lista encerrada",
      category: "Listas de Exercícios" as const,
      icon: <GraduationCap size={16} />,
      onSelect: () => {
        setSelectedContestId(c.id);
        onNavigate("review");
        onClose();
      },
    })),

    // Ações Rápidas
    ...(canAccessPage("creator")
      ? [
          {
            id: "action-new-exercise",
            title: "Criar Novo Exercício",
            subtitle: "Abrir o editor Studio de problemas",
            category: "Ações Rápidas" as const,
            icon: <PlusCircle size={16} />,
            onSelect: () => {
              onNavigate("creator");
              onClose();
            },
          },
        ]
      : []),
    ...(canAccessPage("codes")
      ? [
          {
            id: "action-new-code",
            title: "Gerar Código de Inscrição",
            subtitle: "Criar novo link de matrícula para turma",
            category: "Ações Rápidas" as const,
            icon: <KeyRound size={16} />,
            onSelect: () => {
              onNavigate("codes");
              onClose();
            },
          },
        ]
      : []),
    {
      id: "action-logout",
      title: "Encerrar Sessão",
      subtitle: "Desconectar do sistema",
      category: "Ações Rápidas" as const,
      icon: <LogOut size={16} />,
      onSelect: () => {
        logout();
        onClose();
      },
    },
  ];

  // Filtragem
  const filteredCommands = allCommands.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  // Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].onSelect();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Scroll sincronizado para item selecionado
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(".palette-item.selected");
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Agrupar por categorias
  const categories = Array.from(
    new Set(filteredCommands.map((item) => item.category))
  );

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div
        className="palette-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de Comandos Rápidos"
      >
        {/* Barra de Busca Superior */}
        <div className="palette-header">
          <Search size={18} className="palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Buscar por módulo, lista, turma ou comando rápido..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="palette-esc-badge" onClick={onClose}>
            ESC
          </kbd>
        </div>

        {/* Lista de Resultados */}
        <div className="palette-list" ref={listRef}>
          {filteredCommands.length === 0 ? (
            <div className="palette-empty">
              <Sparkles size={28} className="empty-icon" />
              <p>Nenhum resultado encontrado para "{query}"</p>
              <span>Tente buscar por termos como "review", "lista", ou "aluno".</span>
            </div>
          ) : (
            categories.map((cat) => {
              const catItems = filteredCommands.filter(
                (item) => item.category === cat
              );
              return (
                <div key={cat} className="palette-group">
                  <div className="palette-group-title">{cat}</div>
                  {catItems.map((item) => {
                    const globalIdx = filteredCommands.indexOf(item);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`palette-item ${isSelected ? "selected" : ""}`}
                        onClick={item.onSelect}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <span className="item-icon-box">{item.icon}</span>
                        <div className="item-text-box">
                          <span className="item-title">{item.title}</span>
                          {item.subtitle && (
                            <span className="item-subtitle">{item.subtitle}</span>
                          )}
                        </div>
                        <ArrowRight size={14} className="item-arrow" />
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="palette-footer">
          <div className="palette-hints">
            <span>
              <kbd className="hint-kbd">↑</kbd> <kbd className="hint-kbd">↓</kbd> Navegar
            </span>
            <span>
              <kbd className="hint-kbd">↵</kbd> Selecionar
            </span>
            <span>
              <kbd className="hint-kbd">ESC</kbd> Fechar
            </span>
          </div>
          <span className="palette-tagline">DOMjudge Edu Platform</span>
        </div>
      </div>
    </div>
  );
};
