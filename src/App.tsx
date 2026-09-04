import React, { useState, useEffect } from "react";
import {
  Zap,
  BarChart3,
  PenTool,
  Trophy,
  Users,
  KeyRound,
  Settings,
  Shield,
} from "lucide-react";
import {
  UiContainer,
  UiTabs,
  UiFlex,
  UiButton,
  UiBadge,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { ReviewView } from "@/views/ReviewView";
import { CreatorView } from "@/views/CreatorView";
import { ContestManagerView } from "@/views/ContestManagerView";
import { UserManagerView } from "@/views/UserManagerView";
import { ChangePasswordView } from "@/views/ChangePasswordView";
import { AuthGateModal } from "@/views/AuthGateModal";
import "./App.css";

export const App: React.FC = () => {
  const { credentials, isAuthenticated, isDemo, openAuthModal } = useAuth();

  const checkIsStandalone = (): boolean => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    // Se acessou diretamente a rota /trocar-senha ou /change-password
    if (path === "/trocar-senha" || path === "/change-password") return true;
    // Se acessou via hash e não está autenticado
    if ((hash === "#trocar-senha" || hash === "#change-password") && !isAuthenticated) return true;
    return false;
  };

  const [isStandalone, setIsStandalone] = useState<boolean>(checkIsStandalone);

  // Ler rota inicial para navegação interna da suíte
  const getInitialTab = (): string => {
    const hash = window.location.hash.replace(/^#/, "");
    if (["review", "creator", "contests", "users", "trocar-senha"].includes(hash)) {
      return hash;
    }
    return "review";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  useEffect(() => {
    const handleUrlChange = () => {
      const standalone = checkIsStandalone();
      setIsStandalone(standalone);

      const hash = window.location.hash.replace(/^#/, "");
      if (["review", "creator", "contests", "users", "trocar-senha"].includes(hash)) {
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

  // Sincronizar hash ao trocar de aba se não for standalone
  useEffect(() => {
    if (!isStandalone) {
      window.location.hash = activeTab;
    }
  }, [activeTab, isStandalone]);

  const navTabs = [
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
      id: "trocar-senha",
      label: "Trocar Senha",
      icon: <KeyRound size={16} />,
    },
  ];

  // Caso 1: ROTA INDEPENDENTE / STANDALONE (Para competidores e alunos comuns)
  if (isStandalone) {
    return (
      <div className="app-shell">
        <div className="bg-grid" />

        {/* Header Exclusivo e Isolado para Troca de Senha */}
        <header className="app-header app-header-standalone">
          <UiContainer maxWidth="md">
            <UiFlex justify="between" align="center" wrap gap={12}>
              <div className="app-brand">
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
              </UiFlex>
            </UiFlex>
          </UiContainer>
        </header>

        {/* View Isolada sem nada do restante do sistema */}
        <main className="app-main">
          <ChangePasswordView />
        </main>
      </div>
    );
  }

  // Caso 2: SUÍTE COMPLETA SPA (Para jurados, professores e administradores)
  return (
    <div className="app-shell">
      <div className="bg-grid" />

      {/* Global Sticky Navbar */}
      <header className="app-header">
        <UiContainer maxWidth="xl">
          <UiFlex justify="between" align="center" wrap gap={16}>
            {/* Brand Logo */}
            <div className="app-brand" onClick={() => setActiveTab("review")}>
              <div className="app-brand-icon">
                <Zap size={22} className="text-brand fill-brand" />
              </div>
              <div className="app-brand-text">
                <span className="app-brand-title">DOMjudge Wizard</span>
                <span className="app-brand-tag">Competitive Suite</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <UiTabs
              variant="pill"
              size="md"
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={navTabs}
            />

            {/* Session Status & Auth Gate Trigger */}
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
                      : credentials.user || "Conectado"
                    : "Desconectado"}
                </span>
              </div>

              <UiButton
                size="sm"
                variant="dim"
                onClick={openAuthModal}
                icon={<Settings size={14} />}
              >
                Conexão
              </UiButton>
            </UiFlex>
          </UiFlex>
        </UiContainer>
      </header>

      {/* Main Viewport Container */}
      <main className="app-main">
        <UiContainer maxWidth="xl">
          {activeTab === "review" && <ReviewView />}
          {activeTab === "creator" && <CreatorView />}
          {activeTab === "contests" && <ContestManagerView />}
          {activeTab === "users" && <UserManagerView />}
          {activeTab === "trocar-senha" && <ChangePasswordView />}
        </UiContainer>
      </main>

      {/* Modal Global de Autenticação */}
      <AuthGateModal />
    </div>
  );
};
