import React from "react";
import {
  BookOpen,
  Search,
  Users,
  Radio,
  Settings,
  Sparkles,
} from "lucide-react";
import { useContest } from "@/context/ContestContext";
import { useAuth } from "@/context/AuthContext";
import "./layout.css";

interface AppHeaderProps {
  onOpenCommandPalette: () => void;
  onOpenAuthModal: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenCommandPalette,
  onOpenAuthModal,
}) => {
  const {
    contests,
    selectedContestId,
    setSelectedContestId,
    selectedClassFilter,
    setSelectedClassFilter,
  } = useContest();

  const { isDemo, isAuthenticated } = useAuth();

  return (
    <header className="edu-header">
      {/* Lado Esquerdo: Contexto Global de Lista & Turma */}
      <div className="header-context-controls">
        {/* Seletor de Lista de Exercícios Ativa */}
        <div className="context-select-wrapper" title="Lista de exercícios ativa no sistema">
          <BookOpen size={16} className="context-icon" />
          <span className="context-label">Lista:</span>
          <select
            className="context-select"
            value={selectedContestId || ""}
            onChange={(e) => setSelectedContestId(e.target.value || null)}
          >
            {contests.length === 0 && <option value="">Nenhuma lista cadastrada</option>}
            {contests.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.enabled ? "" : "(Encerrada)"}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Turma / Matrículas */}
        <div className="context-select-wrapper" title="Filtrar por turma ou período">
          <Users size={16} className="context-icon" />
          <span className="context-label">Turma:</span>
          <select
            className="context-select"
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
          >
            <option value="all">Todas as Turmas</option>
            <option value="turma-a">Turma A</option>
            <option value="turma-b">Turma B</option>
            <option value="2026.1">2026.1</option>
          </select>
        </div>
      </div>

      {/* Centro: Gatilho do Command Palette */}
      <div className="header-command-box">
        <button
          type="button"
          className="command-trigger-btn"
          onClick={onOpenCommandPalette}
          title="Buscar rapidamente (Atalho: ⌘K ou Ctrl+K)"
        >
          <Search size={15} />
          <span className="command-placeholder">Buscar aluno, exercício ou lista...</span>
          <kbd className="command-kbd">⌘K</kbd>
        </button>
      </div>

      {/* Lado Direito: Status e Ferramentas */}
      <div className="header-right-actions">
        {isDemo ? (
          <div className="status-pill status-demo" title="Operando com dados locais simulados">
            <Sparkles size={13} />
            <span>Modo Demo</span>
          </div>
        ) : (
          <div className="status-pill status-online" title="Juiz online conectado com sucesso">
            <Radio size={12} className="pulse-icon" />
            <span>Juiz Online</span>
          </div>
        )}

        <button
          type="button"
          className="header-tool-btn"
          onClick={onOpenAuthModal}
          title="Configurações de conexão"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
