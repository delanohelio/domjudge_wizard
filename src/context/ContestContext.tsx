import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Contest } from "@/types/domjudge";
import { DomjudgeApiService } from "@/services/domjudgeApi";
import { useAuth } from "@/context/AuthContext";

interface ContestContextType {
  contests: Contest[];
  selectedContestId: string | null;
  selectedContest: Contest | null;
  selectedClassFilter: string;
  loading: boolean;
  setSelectedContestId: (id: string | null) => void;
  setSelectedClassFilter: (filter: string) => void;
  refreshContests: () => Promise<void>;
}

const ContestContext = createContext<ContestContextType | undefined>(undefined);

export const ContestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { credentials, isAuthenticated } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");

  const getInitialContestIdFromUrl = (): string | null => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("lista") || params.get("contest") || null;
  };

  const [selectedContestId, setSelectedContestIdState] = useState<string | null>(getInitialContestIdFromUrl);

  const setSelectedContestId = (id: string | null) => {
    setSelectedContestIdState(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set("lista", id);
      } else {
        url.searchParams.delete("lista");
        url.searchParams.delete("contest");
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  const refreshContests = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const api = new DomjudgeApiService(credentials);
      const data = await api.getContests();
      setContests(data || []);

      // Se não tem lista selecionada ou a atual não existe mais, seleciona a primeira ativa
      if (data && data.length > 0) {
        if (!selectedContestId || !data.some((c) => c.id === selectedContestId)) {
          const activeOne = data.find((c) => c.enabled) || data[0];
          setSelectedContestId(activeOne.id);
        }
      }
    } catch (err) {
      console.warn("[ContestContext] Falha ao carregar listas de exercícios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshContests();
    } else {
      setContests([]);
      setSelectedContestIdState(null);
    }
  }, [isAuthenticated, credentials.apiBase]);

  const selectedContest = contests.find((c) => c.id === selectedContestId) || null;

  return (
    <ContestContext.Provider
      value={{
        contests,
        selectedContestId,
        selectedContest,
        selectedClassFilter,
        loading,
        setSelectedContestId,
        setSelectedClassFilter,
        refreshContests,
      }}
    >
      {children}
    </ContestContext.Provider>
  );
};

export function useContest() {
  const context = useContext(ContestContext);
  if (!context) {
    throw new Error("useContest deve ser utilizado dentro de um ContestProvider");
  }
  return context;
}
