import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ApiCredentials, AuthUser, LoginResponse } from "@/types/domjudge";

interface StoredSession {
  token: string;
  user: AuthUser;
  apiBase: string;
  savedAt: number;
  expiresAt: number;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  credentials: ApiCredentials;
  isAuthenticated: boolean;
  isDemo: boolean;
  isAuthModalOpen: boolean;
  login: (
    userOrApiBase: string,
    passOrUser: string,
    maybePass?: string | boolean,
    maybeRemember?: boolean
  ) => Promise<{ success: boolean; error?: string; detectedLabels?: string[] }>;
  logout: () => void;
  enableDemoMode: () => void;
  canAccessPage: (pageId: string) => boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  normalizeApiBase: (url: string) => string;
}

const STORAGE_SESSION_KEY = "domjudge_wizard_auth_v2";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

declare global {
  interface Window {
    __ENV__?: {
      DOMJUDGE_API_BASE?: string;
      WIZARD_ADMIN_LABEL?: string;
      STORAGE_EXPIRATION_DAYS?: number;
    };
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const env = window.__ENV__ || {};
  const defaultApiBase = env.DOMJUDGE_API_BASE || "https://coderunner.cin.ufpe.br/api/v4";
  const expirationDays = Number(env.STORAGE_EXPIRATION_DAYS) || 7;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);

  const [credentials, setCredentials] = useState<ApiCredentials>({
    apiBase: defaultApiBase,
    user: "",
    password: "",
    isAuthenticated: false,
    isDemo: false,
  });

  const isStandaloneRoute = (): boolean => {
    if (typeof window === "undefined") return false;
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    return (
      p === "/trocar-senha" ||
      p === "/change-password" ||
      p === "/cadastro" ||
      p === "/register" ||
      p === "/criar-conta" ||
      h === "#trocar-senha" ||
      h === "#change-password" ||
      h === "#cadastro" ||
      h === "#register"
    );
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(
    !credentials.isAuthenticated && !isStandaloneRoute()
  );

  const normalizeApiBase = (url: string): string => {
    const cleaned = String(url || "").trim().replace(/\/+$/, "");
    if (cleaned.endsWith("/api/v4") || cleaned.endsWith("/api")) return cleaned;
    return `${cleaned}/api/v4`;
  };

  // Carregar sessão persistida no início e validar com o backend
  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(STORAGE_SESSION_KEY) ||
        sessionStorage.getItem(STORAGE_SESSION_KEY);
      if (raw) {
        const parsed: StoredSession = JSON.parse(raw);
        if (parsed.expiresAt && Date.now() < parsed.expiresAt && parsed.token && parsed.user) {
          setUser(parsed.user);
          setToken(parsed.token);
          setCredentials({
            apiBase: parsed.apiBase || defaultApiBase,
            user: parsed.user.username,
            password: "",
            isAuthenticated: true,
            isDemo: false,
          });
          setIsAuthModalOpen(false);

          // Verificar sessão ativa em segundo plano
          fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${parsed.token}` },
          })
            .then((res) => {
              if (res.ok) {
                return res.json();
              }
              throw new Error("Sessão inválida");
            })
            .then((data) => {
              if (data.user) {
                setUser(data.user);
              }
            })
            .catch(() => {
              // Sessão expirou no servidor
              logout();
            });
        } else {
          localStorage.removeItem(STORAGE_SESSION_KEY);
          sessionStorage.removeItem(STORAGE_SESSION_KEY);
        }
      }
    } catch (e) {
      console.warn("Falha ao ler sessão persistida:", e);
    }
  }, []);

  const login = async (
    arg1: string,
    arg2: string,
    arg3?: string | boolean,
    arg4?: boolean
  ): Promise<{ success: boolean; error?: string; detectedLabels?: string[] }> => {
    let username = arg1;
    let password = arg2;
    let remember = typeof arg3 === "boolean" ? arg3 : Boolean(arg4);

    // Compatibilidade com v1 caso alguém passe (apiBase, user, pass, remember)
    if (typeof arg3 === "string") {
      username = arg2;
      password = arg3;
      remember = Boolean(arg4);
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data: LoginResponse = await res.json();

      if (!res.ok || !data.success || !data.user || !data.token) {
        return {
          success: false,
          error: data.error || "Credenciais inválidas no DOMjudge.",
          detectedLabels: data.detectedLabels,
        };
      }

      setUser(data.user);
      setToken(data.token);
      setIsDemo(false);

      const creds: ApiCredentials = {
        apiBase: defaultApiBase,
        user: data.user.username,
        password: password, // Mantido em memória para chamadas que exijam Basic Auth direta
        isAuthenticated: true,
        isDemo: false,
      };

      setCredentials(creds);
      setIsAuthModalOpen(false);

      // Persistir sessão
      const sessionData: StoredSession = {
        token: data.token,
        user: data.user,
        apiBase: defaultApiBase,
        savedAt: Date.now(),
        expiresAt: Date.now() + expirationDays * 24 * 60 * 60 * 1000,
      };

      if (remember) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
        sessionStorage.removeItem(STORAGE_SESSION_KEY);
      } else {
        sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }

      return { success: true };
    } catch (err: any) {
      console.error("Erro ao autenticar no servidor DOMjudge Wizard:", err);
      return {
        success: false,
        error: err.message || "Erro de conexão com o servidor. Verifique se o backend está ativo.",
      };
    }
  };

  const logout = () => {
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(STORAGE_SESSION_KEY);
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    setUser(null);
    setToken(null);
    setIsDemo(false);
    setCredentials({
      apiBase: defaultApiBase,
      user: "",
      password: "",
      isAuthenticated: false,
      isDemo: false,
    });
    if (!isStandaloneRoute()) {
      setIsAuthModalOpen(true);
    }
  };

  const enableDemoMode = () => {
    const demoUser: AuthUser = {
      id: "demo_admin",
      username: "demo_admin",
      name: "Administrador Demo",
      email: "demo@domjudge.local",
      roles: ["admin", "jury"],
      labels: ["admin"],
      isAdmin: true,
      allowedPages: [
        "review",
        "creator",
        "contests",
        "users",
        "codes",
        "permissions",
        "trocar-senha",
      ],
    };

    setUser(demoUser);
    setToken("demo_token");
    setIsDemo(true);
    setCredentials({
      apiBase: "https://demo.domjudge.local/api/v4",
      user: "demo_admin",
      password: "demo_password",
      isAuthenticated: true,
      isDemo: true,
    });
    setIsAuthModalOpen(false);
  };

  const canAccessPage = (pageId: string): boolean => {
    if (isDemo) return true;
    if (!user) return false;
    if (user.isAdmin) return true;
    return Array.isArray(user.allowedPages) && user.allowedPages.includes(pageId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        credentials,
        isAuthenticated: Boolean(user && credentials.isAuthenticated),
        isDemo,
        isAuthModalOpen,
        login,
        logout,
        enableDemoMode,
        canAccessPage,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => {
          if (credentials.isAuthenticated) setIsAuthModalOpen(false);
        },
        normalizeApiBase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}
