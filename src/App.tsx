import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Sparkles,
  Shield,
  KeyRound,
} from "lucide-react";
import {
  UiContainer,
  UiFlex,
  UiButton,
  UiBadge,
  UiAlert,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ReviewView } from "@/views/ReviewView";
import { CreatorView } from "@/views/CreatorView";
import { ContestManagerView } from "@/views/ContestManagerView";
import { UserManagerView } from "@/views/UserManagerView";
import { ChangePasswordView } from "@/views/ChangePasswordView";
import { AccessCodesView } from "@/views/AccessCodesView";
import { LabelPermissionsView } from "@/views/LabelPermissionsView";
import { RegisterView } from "@/views/RegisterView";
import { AuthGateModal } from "@/views/AuthGateModal";
import { getBasePath } from "@/services/apiClient";
import "@/components/layout/layout.css";
import "./App.css";

export const App: React.FC = () => {
  const { user, isAuthenticated, isDemo, logout, openAuthModal, canAccessPage } = useAuth();

  type StandaloneType = "password" | "register" | null;

  const checkStandaloneType = (): StandaloneType => {
    if (typeof window === "undefined") return null;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (
      path.endsWith("/cadastro") ||
      path.endsWith("/register") ||
      path.endsWith("/criar-conta") ||
      hash === "#cadastro" ||
      hash === "#register"
    ) {
      return "register";
    }

    if (
      path.endsWith("/trocar-senha") ||
      path.endsWith("/change-password") ||
      ((hash === "#trocar-senha" || hash === "#change-password") && !isAuthenticated)
    ) {
      return "password";
    }

    return null;
  };

  const navigateToApp = (openLogin = false) => {
    const base = getBasePath();
    if (typeof window !== "undefined") {
      if (window.history && window.history.pushState) {
        window.history.pushState({}, "", (base || "") + "/#review");
      } else {
        window.location.hash = "#review";
      }
    }
    setStandaloneType(null);
    if (openLogin) {
      openAuthModal();
    }
  };

  const [standaloneType, setStandaloneType] = useState<StandaloneType>(checkStandaloneType);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("domjudge_sidebar_collapsed") === "true";
    }
    return false;
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("domjudge_sidebar_collapsed", String(next));
      return next;
    });
  };

  const allNavTabs = [
    { id: "review", label: "Acompanhamento & Entregas" },
    { id: "contests", label: "Listas de Exercícios" },
    { id: "creator", label: "Studio de Exercícios" },
    { id: "codes", label: "Inscrições & Turmas" },
    { id: "users", label: "Alunos Matriculados" },
    { id: "permissions", label: "Papéis & Permissões" },
    { id: "trocar-senha", label: "Trocar Senha" },
  ];

  // Abas disponíveis para o usuário autenticado
  const allowedNavTabs = allNavTabs.filter((tab) => canAccessPage(tab.id));

  // Ler rota inicial para navegação interna
  const getInitialTab = (): string => {
    const hash = window.location.hash.replace(/^#/, "");
    if (allNavTabs.some((t) => t.id === hash)) {
      return hash;
    }
    return allowedNavTabs[0]?.id || "review";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  // Escuta atalho global ⌘K e Ctrl+K para abrir a paleta de comandos
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const handleUrlChange = () => {
      const type = checkStandaloneType();
      setStandaloneType(type);

      const hash = window.location.hash.replace(/^#/, "");
      if (allNavTabs.some((t) => t.id === hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener("hashchange", handleUrlChange);
    window.addEventListener("popstate", handleUrlChange);
    return () => {
      window.removeEventListener("hashchange", handleUrlChange);
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, [isAuthenticated]);

  // Se a aba ativa atual não for permitida, redirecionar para a primeira permitida
  useEffect(() => {
    if (allowedNavTabs.length > 0 && !canAccessPage(activeTab)) {
      setActiveTab(allowedNavTabs[0].id);
    }
  }, [user, isDemo]);

  // Sincronizar hash ao trocar de aba se não for standalone
  useEffect(() => {
    if (!standaloneType) {
      window.location.hash = activeTab;
    }
  }, [activeTab, standaloneType]);

  // CASO 1: ROTA AUTÔNOMA DE REGISTRO COM CÓDIGO DE ACESSO (/cadastro)
  if (standaloneType === "register") {
    return (
      <div className="app-shell">
        <div className="bg-grid" />
        <header className="app-header app-header-standalone">
          <UiContainer maxWidth="md">
            <UiFlex justify="between" align="center" wrap gap={12}>
              <div
                className="app-brand"
                onClick={() => navigateToApp(false)}
                style={{ cursor: "pointer" }}
              >
                <div className="app-brand-icon">
                  <GraduationCap size={22} className="text-brand" />
                </div>
                <div className="app-brand-text">
                  <span className="app-brand-title">DOMjudge Edu</span>
                  <span className="app-brand-tag">Matrícula & Auto-Inscrição</span>
                </div>
              </div>

              <UiFlex gap={8} align="center">
                <UiBadge variant="brand" size="md">
                  <Sparkles size={12} /> Inscrição na Turma
                </UiBadge>
                <UiButton
                  size="sm"
                  variant="dim"
                  onClick={() => navigateToApp(true)}
                >
                  Entrar
                </UiButton>
              </UiFlex>
            </UiFlex>
          </UiContainer>
        </header>

        <main className="app-main">
          <RegisterView />
        </main>
      </div>
    );
  }

  // CASO 2: ROTA AUTÔNOMA DE TROCA DE SENHA (/trocar-senha)
  if (standaloneType === "password") {
    return (
      <div className="app-shell">
        <div className="bg-grid" />
        <header className="app-header app-header-standalone">
          <UiContainer maxWidth="md">
            <UiFlex justify="between" align="center" wrap gap={12}>
              <div
                className="app-brand"
                onClick={() => navigateToApp(false)}
                style={{ cursor: "pointer" }}
              >
                <div className="app-brand-icon">
                  <GraduationCap size={22} className="text-brand" />
                </div>
                <div className="app-brand-text">
                  <span className="app-brand-title">DOMjudge Edu</span>
                  <span className="app-brand-tag">Segurança da Conta</span>
                </div>
              </div>

              <UiFlex gap={8} align="center">
                <UiBadge variant="brand" size="md">
                  <Shield size={12} /> Troca de Senha de Aluno
                </UiBadge>
                <UiButton
                  size="sm"
                  variant="dim"
                  onClick={() => navigateToApp(true)}
                >
                  Entrar
                </UiButton>
              </UiFlex>
            </UiFlex>
          </UiContainer>
        </header>

        <main className="app-main">
          <ChangePasswordView />
        </main>
      </div>
    );
  }

  // CASO 3: PLATAFORMA EDU INTEGRADA (SIDEBAR + HEADER + COMMAND PALETTE)
  return (
    <div className="edu-app-layout">
      {/* Barra Lateral Navegacional Pedagógica */}
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={(tabId) => setActiveTab(tabId)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Invólucro do Conteúdo Principal */}
      <div className="edu-main-wrapper">
        {/* Cabeçalho de Contexto Global */}
        <AppHeader
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenAuthModal={openAuthModal}
        />

        {/* Corpo do Módulo Selecionado */}
        <main className="edu-content-body">
          {/* Se a aba atual não for permitida para este usuário */}
          {!canAccessPage(activeTab) && (
            <div style={{ margin: "24px 0" }}>
              <UiAlert variant="warning">
                Você não possui permissões associadas às suas labels para acessar este módulo.
              </UiAlert>
            </div>
          )}

          <div key={activeTab} className="edu-view-container view-enter">
            {activeTab === "review" && canAccessPage("review") && <ReviewView />}
            {activeTab === "creator" && canAccessPage("creator") && <CreatorView />}
            {activeTab === "contests" && canAccessPage("contests") && <ContestManagerView />}
            {activeTab === "users" && canAccessPage("users") && <UserManagerView />}
            {activeTab === "codes" && canAccessPage("codes") && <AccessCodesView />}
            {activeTab === "permissions" && canAccessPage("permissions") && <LabelPermissionsView />}
            {activeTab === "trocar-senha" && canAccessPage("trocar-senha") && <ChangePasswordView />}
          </div>
        </main>
      </div>

      {/* Paleta Global de Comandos (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tabId) => setActiveTab(tabId)}
      />

      {/* Modal Global de Autenticação / Configuração de Juiz */}
      <AuthGateModal />
    </div>
  );
};
