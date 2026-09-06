import React, { useState, useEffect } from "react";
import {
  Zap,
  BarChart3,
  PenTool,
  Trophy,
  Users,
  KeyRound,
  Shield,
  Lock,
  LogOut,
  Sparkles,
  UserPlus,
} from "lucide-react";
import {
  UiContainer,
  UiTabs,
  UiFlex,
  UiButton,
  UiBadge,
  UiAlert,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { ReviewView } from "@/views/ReviewView";
import { CreatorView } from "@/views/CreatorView";
import { ContestManagerView } from "@/views/ContestManagerView";
import { UserManagerView } from "@/views/UserManagerView";
import { ChangePasswordView } from "@/views/ChangePasswordView";
import { AccessCodesView } from "@/views/AccessCodesView";
import { LabelPermissionsView } from "@/views/LabelPermissionsView";
import { RegisterView } from "@/views/RegisterView";
import { AuthGateModal } from "@/views/AuthGateModal";
import "./App.css";

export const App: React.FC = () => {
  const { user, isAuthenticated, isDemo, logout, openAuthModal, canAccessPage } = useAuth();

  type StandaloneType = "password" | "register" | null;

  const checkStandaloneType = (): StandaloneType => {
    if (typeof window === "undefined") return null;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (
      path === "/cadastro" ||
      path === "/register" ||
      path === "/criar-conta" ||
      hash === "#cadastro" ||
      hash === "#register"
    ) {
      return "register";
    }

    if (
      path === "/trocar-senha" ||
      path === "/change-password" ||
      ((hash === "#trocar-senha" || hash === "#change-password") && !isAuthenticated)
    ) {
      return "password";
    }

    return null;
  };

  const [standaloneType, setStandaloneType] = useState<StandaloneType>(checkStandaloneType);

  const allNavTabs = [
    {
      id: "review",
      label: "Visualização & Review",
      icon: <BarChart3 size={16} />,
    },
    {
      id: "creator",
      label: "Criador de Questões",
      icon: <PenTool size={16} />,
    },
    {
      id: "contests",
      label: "Gerenciar Contests",
      icon: <Trophy size={16} />,
    },
    {
      id: "users",
      label: "Gerenciar Usuários",
      icon: <Users size={16} />,
    },
    {
      id: "codes",
      label: "Códigos de Acesso",
      icon: <KeyRound size={16} />,
    },
    {
      id: "permissions",
      label: "Permissões & Labels",
      icon: <Shield size={16} />,
    },
    {
      id: "trocar-senha",
      label: "Trocar Senha",
      icon: <Lock size={16} />,
    },
  ];

  // Abas disponíveis para o usuário autenticado
  const allowedNavTabs = allNavTabs.filter((tab) => canAccessPage(tab.id));

  // Ler rota inicial para navegação interna da suíte
  const getInitialTab = (): string => {
    const hash = window.location.hash.replace(/^#/, "");
    if (allNavTabs.some((t) => t.id === hash)) {
      return hash;
    }
    return allowedNavTabs[0]?.id || "review";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

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
                onClick={() => {
                  window.location.hash = "#review";
                  setStandaloneType(null);
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="app-brand-icon">
                  <Zap size={22} className="text-brand fill-brand" />
                </div>
                <div className="app-brand-text">
                  <span className="app-brand-title">DOMjudge</span>
                  <span className="app-brand-tag">Portal do Competidor</span>
                </div>
              </div>

              <UiFlex gap={8} align="center">
                <UiBadge variant="brand" size="md">
                  <Sparkles size={12} /> Inscrição de Alunos
                </UiBadge>
                <UiButton
                  size="sm"
                  variant="dim"
                  onClick={() => {
                    window.location.hash = "#review";
                    setStandaloneType(null);
                    openAuthModal();
                  }}
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
                onClick={() => {
                  window.location.hash = "#review";
                  setStandaloneType(null);
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="app-brand-icon">
                  <Zap size={22} className="text-brand fill-brand" />
                </div>
                <div className="app-brand-text">
                  <span className="app-brand-title">DOMjudge</span>
                  <span className="app-brand-tag">Portal do Competidor</span>
                </div>
              </div>

              <UiFlex gap={8} align="center">
                <UiBadge variant="brand" size="md">
                  <Shield size={12} /> Troca de Senha Autônoma
                </UiBadge>
                <UiButton
                  size="sm"
                  variant="dim"
                  onClick={() => {
                    window.location.hash = "#review";
                    setStandaloneType(null);
                    openAuthModal();
                  }}
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

  // CASO 3: SUÍTE COMPLETA SPA DA PLATAFORMA WIZARD
  return (
    <div className="app-shell">
      <div className="bg-grid" />

      {/* Global Sticky Navbar */}
      <header className="app-header">
        <UiContainer maxWidth="xl">
          <UiFlex justify="between" align="center" wrap gap={16}>
            {/* Brand Logo */}
            <div className="app-brand" onClick={() => setActiveTab(allowedNavTabs[0]?.id || "review")}>
              <div className="app-brand-icon">
                <Zap size={22} className="text-brand fill-brand" />
              </div>
              <div className="app-brand-text">
                <span className="app-brand-title">DOMjudge Wizard</span>
                <span className="app-brand-tag">Extensão da Plataforma</span>
              </div>
            </div>

            {/* Navigation Tabs filtradas por permissões */}
            {allowedNavTabs.length > 0 && (
              <UiTabs
                variant="pill"
                size="md"
                activeTab={activeTab}
                onChange={setActiveTab}
                tabs={allowedNavTabs}
              />
            )}

            {/* Session Status & User Controls */}
            <UiFlex gap={10} align="center">
              <div className="app-session-pill">
                <span
                  className={`app-status-dot ${
                    isAuthenticated ? (isDemo ? "dot-demo" : "dot-active") : "dot-offline"
                  }`}
                />
                <span className="app-session-user">
                  {isAuthenticated
                    ? isDemo
                      ? "Modo Demo"
                      : user?.name || user?.username || "Conectado"
                    : "Desconectado"}
                </span>

                {user && (
                  <span
                    style={{
                      marginLeft: 4,
                      fontSize: "0.74rem",
                      background: user.isAdmin
                        ? "rgba(239, 68, 68, 0.2)"
                        : "rgba(99, 102, 241, 0.2)",
                      color: user.isAdmin ? "var(--danger)" : "var(--brand)",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      fontWeight: 600,
                    }}
                  >
                    {user.isAdmin ? "Admin" : user.labels && user.labels[0] ? user.labels[0] : "Usuário"}
                  </span>
                )}
              </div>

              {isAuthenticated ? (
                <UiButton
                  size="sm"
                  variant="dim"
                  onClick={logout}
                  icon={<LogOut size={14} />}
                  title="Sair da conta"
                >
                  Sair
                </UiButton>
              ) : (
                <UiButton
                  size="sm"
                  variant="primary"
                  onClick={openAuthModal}
                  icon={<KeyRound size={14} />}
                >
                  Login DOMjudge
                </UiButton>
              )}
            </UiFlex>
          </UiFlex>
        </UiContainer>
      </header>

      {/* Main Viewport Container */}
      <main className="app-main">
        <UiContainer maxWidth="xl">
          {/* Se a aba atual não for permitida para este usuário */}
          {!canAccessPage(activeTab) && (
            <div style={{ margin: "30px 0" }}>
              <UiAlert variant="warning">
                Você não possui permissões associadas às suas labels para acessar este módulo.
              </UiAlert>
            </div>
          )}

          {activeTab === "review" && canAccessPage("review") && <ReviewView />}
          {activeTab === "creator" && canAccessPage("creator") && <CreatorView />}
          {activeTab === "contests" && canAccessPage("contests") && <ContestManagerView />}
          {activeTab === "users" && canAccessPage("users") && <UserManagerView />}
          {activeTab === "codes" && canAccessPage("codes") && <AccessCodesView />}
          {activeTab === "permissions" && canAccessPage("permissions") && <LabelPermissionsView />}
          {activeTab === "trocar-senha" && canAccessPage("trocar-senha") && <ChangePasswordView />}
        </UiContainer>
      </main>

      {/* Modal Global de Autenticação */}
      <AuthGateModal />
    </div>
  );
};
