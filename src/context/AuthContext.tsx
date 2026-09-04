import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ApiCredentials } from "@/types/domjudge";

interface StoredSession {
  apiBase: string;
  user: string;
  password?: string;
  savedAt: number;
  expiresAt: number;
}

interface AuthContextType {
  credentials: ApiCredentials;
  isAuthenticated: boolean;
  isDemo: boolean;
  isAuthModalOpen: boolean;
  login: (apiBase: string, user: string, pass: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
  enableDemoMode: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  normalizeApiBase: (url: string) => string;
}

const STORAGE_SESSION_KEY = "domjudge_wizard_auth";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

declare global {
  interface Window {
    __ENV__?: {
      DOMJUDGE_API_BASE?: string;
      DOMJUDGE_API_USER?: string;
      DOMJUDGE_API_PASSWORD?: string;
      STORAGE_EXPIRATION_DAYS?: number;
    };
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const env = window.__ENV__ || {};
  const defaultApiBase = env.DOMJUDGE_API_BASE || "https://coderunner.cin.ufpe.br/api/v4";
  const expirationDays = Number(env.STORAGE_EXPIRATION_DAYS) || 7;

  const [credentials, setCredentials] = useState<ApiCredentials>({
    apiBase: defaultApiBase,
    user: env.DOMJUDGE_API_USER || "",
    password: env.DOMJUDGE_API_PASSWORD || "",
    isAuthenticated: Boolean(env.DOMJUDGE_API_USER && env.DOMJUDGE_API_PASSWORD),
    isDemo: false,
  });

  const isPasswordChangeRoute = (): boolean => {
    if (typeof window === "undefined") return false;
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    return (
      p === "/trocar-senha" ||
      p === "/change-password" ||
      h === "#trocar-senha" ||
      h === "#change-password"
    );
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(
    !credentials.isAuthenticated && !isPasswordChangeRoute()
  );

  const normalizeApiBase = (url: string): string => {
    const cleaned = String(url || "").trim().replace(/\/+$/, "");
    if (cleaned.endsWith("/api/v4") || cleaned.endsWith("/api")) return cleaned;
    return `${cleaned}/api/v4`;
  };

  // Carregar sessão persistida no início
  useEffect(() => {
    // Se já autenticou via .env/Docker, não precisa do storage
    if (env.DOMJUDGE_API_USER && env.DOMJUDGE_API_PASSWORD) {
      setCredentials({
        apiBase: normalizeApiBase(defaultApiBase),
        user: env.DOMJUDGE_API_USER,
        password: env.DOMJUDGE_API_PASSWORD,
        isAuthenticated: true,
        isDemo: false,
      });
      setIsAuthModalOpen(false);
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY) || sessionStorage.getItem(STORAGE_SESSION_KEY);
      if (raw) {
        const parsed: StoredSession = JSON.parse(raw);
        if (parsed.expiresAt && Date.now() < parsed.expiresAt && parsed.user) {
          setCredentials({
            apiBase: normalizeApiBase(parsed.apiBase || defaultApiBase),
            user: parsed.user,
            password: parsed.password || "",
            isAuthenticated: true,
            isDemo: false,
          });
          setIsAuthModalOpen(false);
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
    apiBase: string,
    user: string,
    pass: string,
    remember: boolean = true
  ): Promise<boolean> => {
    const normBase = normalizeApiBase(apiBase);
    const authHeader = `Basic ${btoa(`${user}:${pass}`)}`;

    try {
      // Testar conexão com /user
      const res = await fetch(`${normBase}/user`, {
        headers: { Authorization: authHeader },
      });

      if (!res.ok) {
        return false;
      }

      const creds: ApiCredentials = {
        apiBase: normBase,
        user,
        password: pass,
        isAuthenticated: true,
        isDemo: false,
      };

      setCredentials(creds);
      setIsAuthModalOpen(false);

      // Persistir
      const sessionData: StoredSession = {
        apiBase: normBase,
        user,
        password: pass,
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

      return true;
    } catch (err) {
      console.error("Erro ao validar credenciais DOMjudge:", err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    setCredentials({
      apiBase: defaultApiBase,
      user: "",
      password: "",
      isAuthenticated: false,
      isDemo: false,
    });
    setIsAuthModalOpen(true);
  };

  const enableDemoMode = () => {
    setCredentials({
      apiBase: "https://demo.domjudge.local/api/v4",
      user: "demo_admin",
      password: "demo_password",
      isAuthenticated: true,
      isDemo: true,
    });
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        credentials,
        isAuthenticated: credentials.isAuthenticated,
        isDemo: credentials.isDemo || false,
        isAuthModalOpen,
        login,
        logout,
        enableDemoMode,
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
