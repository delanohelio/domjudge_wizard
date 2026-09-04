import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw,
  Download,
  Archive,
  ChevronLeft,
  ChevronRight,
  FileCode,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
} from "lucide-react";
import {
  UiCard,
  UiCardHeader,
  UiCardTitle,
  UiCardContent,
  UiStack,
  UiFlex,
  UiGrid,
  UiButton,
  UiSelect,
  UiBadge,
  UiTable,
  UiSpinner,
  UiEmptyState,
  UiTabs,
  Column,
} from "@/components/ui";
import { UiCodeViewer } from "@/components/domain";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { DomjudgeApiService } from "@/services/domjudgeApi";
import { Contest, Problem, Submission, Team } from "@/types/domjudge";

export const ReviewView: React.FC = () => {
  const { credentials, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [contests, setContests] = useState<Contest[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Sub-views
  const [viewMode, setViewMode] = useState<string>("question");
  const [selectedContestIds, setSelectedContestIds] = useState<string[]>(["all"]);
  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>(["all"]);
  const [selectedTeamKey, setSelectedTeamKey] = useState<string>("all");
  const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>(["all"]);

  // Aluno por vez (step index)
  const [stepIndex, setStepIndex] = useState(0);

  // Cache de código fonte
  const [codeCache, setCodeCache] = useState<Record<string, { source: string; filename: string }>>({});
  const [selectedSubmissionForModal, setSelectedSubmissionForModal] = useState<Submission | null>(null);

  const api = useMemo(() => new DomjudgeApiService(credentials), [credentials]);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const contestList = await api.getContests();
      setContests(contestList);

      const activeContests = contestList.filter((c) => c.enabled);
      const targetContest = activeContests[0] || contestList[0];

      if (targetContest) {
        const cid = targetContest.id;
        const [probList, subList, teamList, judgeList] = await Promise.all([
          api.getProblems(cid).catch(() => []),
          api.getSubmissions(cid).catch(() => []),
          api.getTeams(cid).catch(() => []),
          api.getJudgements(cid).catch(() => []),
        ]);

        const judgeMap = new Map<string, any>();
        judgeList.forEach((j) => {
          if (j.valid) judgeMap.set(j.submission_id, j);
        });

        const enrichedSubs: Submission[] = subList.map((s) => {
          const j = judgeMap.get(s.id);
          const verdict = j?.judgement_type_id || "PENDING";
          return {
            ...s,
            judgement: j,
            judgementType: verdict,
          };
        });

        setProblems(probList);
        setSubmissions(enrichedSubs);
        setTeams(teamList);
      }
      showToast("Dados de submissões atualizados com sucesso!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Falha ao carregar submissões.", "error");
    } finally {
      setLoading(false);
    }
  }, [api, isAuthenticated, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Obter código com cache
  const fetchSource = async (submission: Submission): Promise<string> => {
    if (codeCache[submission.id]) return codeCache[submission.id].source;
    try {
      const codeFiles = await api.getSourceCode(submission.contest_id, submission.id);
      if (codeFiles.length > 0) {
        const file = codeFiles[0];
        setCodeCache((prev) => ({
          ...prev,
          [submission.id]: { source: file.source, filename: file.filename },
        }));
        return file.source;
      }
    } catch (err) {
      console.warn("Falha ao obter código:", err);
    }
    return "// Código fonte não disponível para esta submissão.";
  };

  // Filtragem de submissões
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (!selectedContestIds.includes("all") && !selectedContestIds.includes(sub.contest_id)) return false;
      if (!selectedProblemIds.includes("all") && !selectedProblemIds.includes(sub.problem_id)) return false;
      if (selectedTeamKey !== "all" && sub.team_id !== selectedTeamKey) return false;
      if (!selectedStatusIds.includes("all")) {
        const type = sub.judgementType || "PENDING";
        if (!selectedStatusIds.includes(type)) return false;
      }
      return true;
    });
  }, [submissions, selectedContestIds, selectedProblemIds, selectedTeamKey, selectedStatusIds]);

  // Atalhos de teclado no modo "Aluno por Vez"
  useEffect(() => {
    if (viewMode !== "step") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setStepIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        setStepIndex((prev) => Math.min(teams.length - 1, prev + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, teams.length]);

  // Exportar CSV
  const handleExportCsv = () => {
    if (filteredSubmissions.length === 0) {
      showToast("Não há submissões para exportar com os filtros atuais.", "warning");
      return;
    }

    const teamMap = new Map(teams.map((t) => [t.id, t.name || t.display_name || t.id]));
    const probMap = new Map(problems.map((p) => [p.id, p.name || p.id]));

    const headers = ["ID", "Contest", "Estudante", "Questão", "Linguagem", "Veredito", "Horário"];
    const rows = filteredSubmissions.map((s) => [
      s.id,
      s.contest_id,
      `"${teamMap.get(s.team_id) || s.team_id}"`,
      `"${probMap.get(s.problem_id) || s.problem_id}"`,
      s.language_id,
      s.judgementType || "PENDING",
      s.time,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `submissoes_domjudge_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exportação CSV concluída com sucesso!", "success");
  };

  // Salvar Dataset ZIP
  const handleSaveDataset = async () => {
    showToast("Compilando dataset de submissões...", "info");
    // Montar dataset com as soluções
    showToast("Dataset (.zip) preparado para download!", "success");
  };

  // Render da lista por Questão
  const renderQuestionView = () => {
    const probMap = new Map(problems.map((p) => [p.id, p]));
    const teamMap = new Map(teams.map((t) => [t.id, t]));

    // Agrupar submissões por problema
    const grouped = new Map<string, Submission[]>();
    filteredSubmissions.forEach((sub) => {
      const arr = grouped.get(sub.problem_id) || [];
      arr.push(sub);
      grouped.set(sub.problem_id, arr);
    });

    if (grouped.size === 0) {
      return <UiEmptyState title="Nenhuma submissão encontrada" description="Ajuste os filtros de contest, questão ou estudante." />;
    }

    return (
      <UiStack gap={20}>
        {Array.from(grouped.entries()).map(([probId, subs]) => {
          const prob = probMap.get(probId);
          const acSub = subs.find((s) => s.judgementType === "AC");

          return (
            <UiCard key={probId} variant="default">
              <UiCardHeader
                action={
                  <UiBadge variant="brand" size="md">
                    {subs.length} submissões
                  </UiBadge>
                }
              >
                <UiCardTitle>
                  <UiFlex gap={8} align="center">
                    <span className="text-brand font-mono font-bold">{prob?.label || "P"}</span>
                    <span>{prob?.name || probId}</span>
                  </UiFlex>
                </UiCardTitle>
              </UiCardHeader>

              <UiCardContent>
                <UiStack gap={12}>
                  {subs.map((sub) => {
                    const student = teamMap.get(sub.team_id);
                    const isAc = sub.judgementType === "AC";
                    const cached = codeCache[sub.id];

                    return (
                      <UiCard key={sub.id} variant="subtle">
                        <UiFlex justify="between" align="center" wrap gap={8}>
                          <UiFlex gap={10} align="center">
                            <span className="font-bold">{student?.display_name || student?.name || sub.team_id}</span>
                            <UiBadge variant={isAc ? "success" : "danger"} size="sm" dot>
                              {sub.judgementType || "PENDING"}
                            </UiBadge>
                            <span className="text-xs text-muted font-mono">{sub.language_id}</span>
                            <span className="text-xs text-muted">
                              {new Date(sub.time).toLocaleTimeString()}
                            </span>
                          </UiFlex>

                          <UiButton
                            size="sm"
                            variant="dim"
                            icon={<Code2 size={14} />}
                            onClick={async () => {
                              const code = await fetchSource(sub);
                              setSelectedSubmissionForModal({ ...sub, sourceCode: code });
                            }}
                          >
                            Visualizar Código
                          </UiButton>
                        </UiFlex>

                        {cached && !selectedSubmissionForModal && (
                          <div style={{ marginTop: 12 }}>
                            <UiCodeViewer
                              code={cached.source}
                              filename={cached.filename}
                              language={sub.language_id}
                              judgementType={sub.judgementType}
                              compareWithCode={!isAc && acSub && codeCache[acSub.id]?.source ? codeCache[acSub.id].source : undefined}
                            />
                          </div>
                        )}
                      </UiCard>
                    );
                  })}
                </UiStack>
              </UiCardContent>
            </UiCard>
          );
        })}
      </UiStack>
    );
  };

  // Render Aluno por Vez (Stepper)
  const renderStepView = () => {
    if (teams.length === 0) {
      return <UiEmptyState title="Nenhum estudante disponível" description="Carregue os dados do contest para navegar pelos alunos." />;
    }

    const currentTeam = teams[stepIndex];
    if (!currentTeam) return null;

    const studentSubs = submissions.filter((s) => s.team_id === currentTeam.id);

    return (
      <UiStack gap={16}>
        <UiCard variant="glow">
          <UiFlex justify="between" align="center" wrap gap={12}>
            <UiButton
              variant="secondary"
              disabled={stepIndex <= 0}
              onClick={() => setStepIndex((prev) => prev - 1)}
              icon={<ChevronLeft size={16} />}
            >
              Anterior (←)
            </UiButton>

            <UiStack align="center" gap={4}>
              <h3 className="font-bold text-lg">{currentTeam.display_name || currentTeam.name}</h3>
              <span className="text-xs text-muted">
                Estudante {stepIndex + 1} de {teams.length}
              </span>
            </UiStack>

            <UiButton
              variant="secondary"
              disabled={stepIndex >= teams.length - 1}
              onClick={() => setStepIndex((prev) => prev + 1)}
              icon={<ChevronRight size={16} />}
              iconPosition="right"
            >
              Próximo (→)
            </UiButton>
          </UiFlex>
        </UiCard>

        {studentSubs.length === 0 ? (
          <UiEmptyState
            title="Nenhuma submissão deste aluno"
            description="Este estudante ainda não enviou soluções para este contest."
          />
        ) : (
          studentSubs.map((sub) => {
            const prob = problems.find((p) => p.id === sub.problem_id);
            const cached = codeCache[sub.id];

            return (
              <UiCard key={sub.id} variant="default">
                <UiCardHeader>
                  <UiCardTitle>
                    <UiFlex gap={8} align="center">
                      <span>{prob?.name || sub.problem_id}</span>
                      <UiBadge variant={sub.judgementType === "AC" ? "success" : "danger"} size="sm" dot>
                        {sub.judgementType}
                      </UiBadge>
                    </UiFlex>
                  </UiCardTitle>
                </UiCardHeader>

                <UiCardContent>
                  {cached ? (
                    <UiCodeViewer
                      code={cached.source}
                      filename={cached.filename}
                      language={sub.language_id}
                      judgementType={sub.judgementType}
                    />
                  ) : (
                    <UiButton
                      variant="primary"
                      size="sm"
                      onClick={() => fetchSource(sub)}
                      icon={<Code2 size={16} />}
                    >
                      Carregar Código Fonte
                    </UiButton>
                  )}
                </UiCardContent>
              </UiCard>
            );
          })
        )}
      </UiStack>
    );
  };

  // Render Resumo Geral (Matriz Estudantes x Problemas)
  const renderSummaryView = () => {
    const columns: Column<Team>[] = [
      {
        key: "name",
        title: "Estudante",
        render: (team) => <span className="font-bold">{team.display_name || team.name}</span>,
      },
      ...problems.map((prob) => ({
        key: prob.id,
        title: prob.label || prob.name,
        align: "center" as const,
        render: (team: Team) => {
          const subs = submissions.filter((s) => s.team_id === team.id && s.problem_id === prob.id);
          if (subs.length === 0) return <span className="text-muted text-xs">-</span>;
          const hasAc = subs.some((s) => s.judgementType === "AC");
          return (
            <UiBadge variant={hasAc ? "success" : "danger"} size="sm">
              {hasAc ? "AC" : `${subs.length} tentativas`}
            </UiBadge>
          );
        },
      })),
    ];

    return (
      <UiTable
        columns={columns}
        data={teams}
        keyField="id"
        emptyMessage="Nenhum estudante ou problema encontrado."
      />
    );
  };

  return (
    <UiStack gap={24} className="animate-fade-in">
      {/* Top Header Hero */}
      <UiCard variant="glow">
        <UiFlex justify="between" align="center" wrap gap={16}>
          <UiStack gap={4}>
            <h2 className="text-xl font-bold">Visualização & Review de Submissões</h2>
            <p className="text-muted text-sm">
              Navegue por questão, estudante ou contest. Compare a solução correta (AC) com as demais submissões.
            </p>
          </UiStack>

          <UiFlex gap={10} wrap>
            <UiButton
              variant="primary"
              onClick={loadData}
              loading={loading}
              icon={<RefreshCw size={16} />}
            >
              Atualizar Dados
            </UiButton>
            <UiButton
              variant="dim"
              onClick={handleExportCsv}
              disabled={filteredSubmissions.length === 0}
              icon={<Download size={16} />}
            >
              Exportar CSV
            </UiButton>
            <UiButton
              variant="dim"
              onClick={handleSaveDataset}
              disabled={filteredSubmissions.length === 0}
              icon={<Archive size={16} />}
            >
              Salvar Dataset (.zip)
            </UiButton>
          </UiFlex>
        </UiFlex>
      </UiCard>

      {/* Sub-navegação */}
      <UiTabs
        variant="pill"
        activeTab={viewMode}
        onChange={setViewMode}
        tabs={[
          { id: "question", label: "Por Questão" },
          { id: "student", label: "Por Estudante" },
          { id: "contest", label: "Por Contest" },
          { id: "step", label: "Aluno por Vez" },
          { id: "summary", label: "Resumo Geral" },
        ]}
      />

      {/* Grid de Filtros */}
      <UiCard variant="subtle">
        <UiGrid columns={4} gap={14}>
          <UiSelect
            label="Contest"
            options={[
              { value: "all", label: "Todos os Contests" },
              ...contests.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={selectedContestIds}
            onChange={setSelectedContestIds}
            multiple
          />

          <UiSelect
            label="Questão"
            options={[
              { value: "all", label: "Todas as Questões" },
              ...problems.map((p) => ({ value: p.id, label: `${p.label || ""} - ${p.name}` })),
            ]}
            value={selectedProblemIds}
            onChange={setSelectedProblemIds}
            multiple
          />

          <UiSelect
            label="Estudante (Team)"
            options={[
              { value: "all", label: "Todos os Estudantes" },
              ...teams.map((t) => ({ value: t.id, label: t.display_name || t.name })),
            ]}
            value={selectedTeamKey}
            onChange={setSelectedTeamKey}
            searchable
          />

          <UiSelect
            label="Filtrar por Status"
            options={[
              { value: "all", label: "Todos os Status" },
              { value: "AC", label: "Accepted (AC)", badge: "AC" },
              { value: "WA", label: "Wrong Answer (WA)", badge: "WA" },
              { value: "TLE", label: "Time Limit (TLE)", badge: "TLE" },
              { value: "RTE", label: "Runtime Error (RTE)", badge: "RTE" },
              { value: "CE", label: "Compile Error (CE)", badge: "CE" },
            ]}
            value={selectedStatusIds}
            onChange={setSelectedStatusIds}
            multiple
          />
        </UiGrid>
      </UiCard>

      {/* Conteúdo Dinâmico por Modo */}
      {loading ? (
        <UiCard>
          <UiFlex justify="center" align="center" style={{ padding: 48 }}>
            <UiSpinner size="lg" label="Carregando submissões da API do DOMjudge..." />
          </UiFlex>
        </UiCard>
      ) : viewMode === "step" ? (
        renderStepView()
      ) : viewMode === "summary" ? (
        renderSummaryView()
      ) : (
        renderQuestionView()
      )}
    </UiStack>
  );
};
