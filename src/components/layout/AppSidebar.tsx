import React, { useState } from "react";
import {
  GraduationCap,
  BarChart3,
  BookOpen,
  PenTool,
  KeyRound,
  Users,
  Shield,
  Lock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import "./layout.css";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface AppSidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user, isDemo, logout, canAccessPage } = useAuth();

  const sections: NavSection[] = [
    {
      title: "Pedagógico & Correção",
      items: [
        {
          id: "review",
          label: "Acompanhamento & Entregas",
          icon: <BarChart3 size={18} />,
        },
        {
          id: "contests",
          label: "Listas de Exercícios",
          icon: <BookOpen size={18} />,
        },
      ],
    },
    {
      title: "Elaboração de Conteúdo",
      items: [
        {
          id: "creator",
          label: "Studio de Exercícios",
          icon: <PenTool size={18} />,
        },
      ],
    },
    {
      title: "Gestão Acadêmica",
      items: [
        {
          id: "codes",
          label: "Inscrições & Turmas",
          icon: <KeyRound size={18} />,
        },
        {
          id: "users",
          label: "Alunos Matriculados",
          icon: <Users size={18} />,
        },
        {
          id: "permissions",
          label: "Papéis & Permissões",
          icon: <Shield size={18} />,
        },
      ],
    },
    {
      title: "Minha Conta",
      items: [
        {
          id: "trocar-senha",
          label: "Trocar Senha",
          icon: <Lock size={18} />,
        },
      ],
    },
  ];

  return (
    <aside className={`edu-sidebar ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Brand & Logo */}
      <div className="sidebar-brand">
        <div className="brand-logo-box">
          <GraduationCap size={22} className="text-brand" />
        </div>
        {!isCollapsed && (
          <div className="brand-titles">
            <span className="brand-main">DOMjudge Edu</span>
            <span className="brand-sub">Juiz Acadêmico</span>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {sections.map((section) => {
          const visibleItems = section.items.filter((item) => canAccessPage(item.id));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="sidebar-section">
              {!isCollapsed && <span className="section-title">{section.title}</span>}
              <ul className="section-list">
                {visibleItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`nav-item-btn ${isActive ? "active" : ""}`}
                        onClick={() => onSelectTab(item.id)}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <span className="item-icon">{item.icon}</span>
                        {!isCollapsed && <span className="item-label">{item.label}</span>}
                        {!isCollapsed && item.badge && (
                          <span className="item-badge">{item.badge}</span>
                        )}
                        {isActive && <span className="active-indicator" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User Card & Footer */}
      <div className="sidebar-footer">
        {!isCollapsed ? (
          <div className="user-profile-card">
            <div className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="user-meta">
              <span className="user-name" title={user?.name || user?.username}>
                {user?.name || user?.username || "Usuário"}
              </span>
              <span className="user-role-badge">
                {user?.isAdmin
                  ? "Professor / Admin"
                  : user?.labels && user.labels[0]
                  ? user.labels[0]
                  : "Aluno"}
              </span>
            </div>
            <button
              type="button"
              className="logout-btn"
              onClick={logout}
              title="Encerrar sessão"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="logout-btn-collapsed"
            onClick={logout}
            title="Encerrar sessão"
          >
            <LogOut size={16} />
          </button>
        )}

        {/* Toggle Collapse Button */}
        <button
          type="button"
          className="collapse-toggle-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
};
