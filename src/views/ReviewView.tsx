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
  Users,
  BookOpen,
  GraduationCap,
  Award,
  AlertTriangle,
  Search,
  Check,
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
  UiTextInput,
  UiSelect,
  UiBadge,
  UiTable,
  UiSpinner,
  UiEmptyState,
  UiTabs,
  UiModal,
  UiMetricCard,
  Column,
} from "@/components/ui";
import { UiCodeViewer } from "@/components/domain";
import { useAuth } from "@/context/AuthContext";
import { useContest } from "@/context/ContestContext";
import { useToast } from "@/context/ToastContext";
import { DomjudgeApiService } from "@/services/domjudgeApi";
import { Problem, Submission, Team } from "@/types/domjudge";

export const ReviewView: React.FC = () => {
  const { credentials, isAuthenticated } = useAuth();
  const {
    contests,
    selectedContestId,
    setSelectedContestId,
    selectedClassFilter,
    refreshContests,
  } = useContest();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Sub-views pedagógicas
  const [viewMode, setViewMode] = useState<string>("question");
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [selectedProblemId, setSelectedProblemId] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Aluno por vez (step index)
  const [stepIndex, setStepIndex] = useState(0);

  // Cache de código fonte
  const [codeCache, setCodeCache] = useState<Record<string, { source: string; filename: string }>>({});
  const [inspectModalSub, setInspectModalSub] = useState<Submission | null>(null);
  const [inspectModalCode, setInspectModalCode] = useState<string>("");

  const api = useMemo(() => new DomjudgeApiService(credentials), [credentials]);

  // Carregar dados do contest selecionado
  const loadData = useCallback(async () => {
    if (!isAuthenticated || !selectedContestId) return;
    setLoading(true);
    try {
      const [probList, subList, teamList, judgeList] = await Promise.all([
        api.getProblems(selectedContestId).catch(() => []),
        api.getSubmissions(selectedContestId).catch(() => []),
        api.getTeams(selectedContestId).catch(() => []),
        api.getJudgements(selectedContestId).catch(() => []),
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
      setStepIndex(0);
    } catch (err: any) {
      console.error("[ReviewView] Erro ao carregar dados:", err);
      showToast(err.message || "Falha ao carregar submissões da lista.", "error");
    } finally {
      setLoading(false);
    }
  }, [api, isAuthenticated, selectedContestId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Obter código fonte com cache
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

  // Abrir modal de inspeção de código
  const handleOpenInspectModal = async (sub: Submission) => {
    setInspectModalSub(sub);
    const code = await fetchSource(sub);
    setInspectModalCode(code);
  };

  // Filtrar equipes pela turma global (selectedClassFilter)
  const classFilteredTeams = useMemo(() => {
    return teams.filter((t) => {
      if (selectedClassFilter === "all") return true;
      const labelStr = (t.label || "").toLowerCase();
      const nameStr = (t.name || "").toLowerCase();
      const target = selectedClassFilter.toLowerCase();
      return labelStr.includes(target) || nameStr.includes(target);
    });
  }, [teams, selectedClassFilter]);

  // Filtragem de estudantes por busca de texto
  const filteredTeams = useMemo(() => {
    return classFilteredTeams.filter((t) => {
      if (!studentSearch.trim()) return true;
      const q = studentSearch.toLowerCase();
      const name = (t.display_name || t.name || "").toLowerCase();
      const label = (t.label || "").toLowerCase();
      return name.includes(q) || label.includes(q) || t.id.toLowerCase().includes(q);
    });
  }, [classFilteredTeams, studentSearch]);

  // Filtragem de submissões
  const filteredSubmissions = useMemo(() => {
    const validTeamIds = new Set(filteredTeams.map((t) => t.id));

    return submissions.filter((sub) => {
      // Filtrar apenas alunos da turma / busca atual
      if (!validTeamIds.has(sub.team_id)) return false;

      // Filtrar por problema
      if (selectedProblemId !== "all" && sub.problem_id !== selectedProblemId) {
        return false;
      }

      // Filtrar por status / veredito
      if (selectedStatusFilter !== "all") {
        const type = sub.judgementType || "PENDING";
        if (type !== selectedStatusFilter) return false;
      }

      return true;
    });
  }, [submissions, filteredTeams, selectedProblemId, selectedStatusFilter]);

  // Métricas Pedagógicas
  const metrics = useMemo(() => {
    const totalStudents = classFilteredTeams.length;
    const activeStudentIds = new Set(submissions.map((s) => s.team_id));
    const activeStudents = classFilteredTeams.filter((t) => activeStudentIds.has(t.id)).length;

    const totalProblems = problems.length;
    let totalSolvedPairs = 0;

    classFilteredTeams.forEach((team) => {
      const studentSubs = submissions.filter((s) => s.team_id === team.id);
      const solvedProblems = new Set(
        studentSubs.filter((s) => s.judgementType === "AC").map((s) => s.problem_id)
      );
      totalSolvedPairs += solvedProblems.size;
    });

    const maxPossibleSolves = totalStudents * Math.max(1, totalProblems);
    const completionRate =
      maxPossibleSolves > 0 ? Math.round((totalSolvedPairs / maxPossibleSolves) * 100) : 0;

    const totalSubmissionsCount = filteredSubmissions.length;
    const acCount = filteredSubmissions.filter((s) => s.judgementType === "AC").length;
    const acRate =
      totalSubmissionsCount > 0 ? Math.round((acCount / totalSubmissionsCount) * 100) : 0;

    return {
      totalStudents,
      activeStudents,
      completionRate,
      totalSubmissionsCount,
      acRate,
    };
  }, [classFilteredTeams, submissions, problems, filteredSubmissions]);

  // Atalhos de teclado no modo "Correção Passo a Passo"
  useEffect(() => {
    if (viewMode !== "step") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setStepIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        setStepIndex((prev) => Math.min(filteredTeams.length - 1, prev + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, filteredTeams.length]);

  // Exportar Relatório CSV
  const handleExportCsv = () => {
    if (filteredSubmissions.length === 0) {
      showToast("Não há submissões para exportar com os filtros atuais.", "warning");
      return;
    }

    const teamMap = new Map(teams.map((t) => [t.id, t.name || t.display_name || t.id]));
    const probMap = new Map(problems.map((p) => [p.id, p.name || p.id]));

    const headers = ["ID", "Lista", "Aluno", "Exercício", "Linguagem", "Veredito", "Horário"];
    const rows = filteredSubmissions.map((s) => [
      s.id,
      s.contest_id,
      `"${teamMap.get(s.team_id) || s.team_id}"`,
      `"${probMap.get(s.problem_id) || s.problem_id}"`,
      s.language_id,
      s.judgementType || "PENDING",
      s.time,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `relatorio_turma_${selectedContestId}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Relatório pedagógico CSV exportado com sucesso!", "success");
  };

  // Sub-view 1: Por Exercício
  const renderQuestionView = () => {
    const probMap = new Map(problems.map((p) => [p.id, p]));
    const teamMap = new Map(teams.map((t) => [t.id, t]));

    // Agrupar submissões por exercício
    const grouped = new Map<string, Submission[]>();
    problems.forEach((p) => grouped.set(p.id, []));
    filteredSubmissions.forEach((sub) => {
      const arr = grouped.get(sub.problem_id) || [];
      arr.push(sub);
      grouped.set(sub.problem_id, arr);
    });

    if (problems.length === 0) {
      return (
        <UiEmptyState
          title="Nenhum exercício encontrado nesta lista"
          description="Certifique-se de que a lista de exercícios contém problemas cadastrados no DOMjudge."
        />
      );
    }

    return (
      <UiStack gap={20}>
        {Array.from(grouped.entries()).map(([probId, subs]) => {
          const prob = probMap.get(probId);
          const acSubs = subs.filter((s) => s.judgementType === "AC");
          const uniqueStudentsWithAc = new Set(acSubs.map((s) => s.team_id)).size;
          const classSize = classFilteredTeams.length || 1;
          const percentSolved = Math.round((uniqueStudentsWithAc / classSize) * 100);
          const referenceAc = acSubs[0];

          return (
            <UiCard key={probId} variant="default">
              <UiCardHeader
                action={
                  <UiFlex gap={8} align="center">
                    <UiBadge variant={percentSolved > 60 ? "success" : percentSolved > 30 ? "warning" : "neutral"} size="md">
                      {uniqueStudentsWithAc} / {classSize} alunos resolveram ({percentSolved}%)
                    </UiBadge>
                    <UiBadge variant="brand" size="md">
                      {subs.length} submissões
                    </UiBadge>
                  </UiFlex>
                }
              >
                <UiCardTitle>
                  <UiFlex gap={10} align="center">
                    <span className="text-brand font-mono font-bold">{prob?.label || "Ex"}</span>
                    <span>{prob?.name || probId}</span>
                  </UiFlex>
                </UiCardTitle>
              </UiCardHeader>

              <UiCardContent>
                {subs.length === 0 ? (
                  <p className="text-sm text-muted" style={{ padding: "12px 0" }}>
                    Nenhum envio registrado para este exercício com os filtros selecionados.
                  </p>
                ) : (
                  <UiStack gap={10}>
                    {subs.map((sub) => {
                      const student = teamMap.get(sub.team_id);
                      const isAc = sub.judgementType === "AC";

                      return (
                        <div
                          key={sub.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: "var(--radius-md)",
                            background: "var(--surface-subtle)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <UiFlex gap={12} align="center" wrap>
                            <span className="font-semibold text-sm">
                              {student?.display_name || student?.name || sub.team_id}
                            </span>
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
                            onClick={() => handleOpenInspectModal(sub)}
                          >
                            Inspecionar Código
                          </UiButton>
                        </div>
                      );
                    })}
                  </UiStack>
                )}
              </UiCardContent>
            </UiCard>
          );
        })}
      </UiStack>
    );
  };

  // Sub-view 2: Por Aluno
  const renderStudentView = () => {
    const probMap = new Map(problems.map((p) => [p.id, p]));

    if (filteredTeams.length === 0) {
      return (
        <UiEmptyState
          title="Nenhum aluno encontrado"
          description="Tente ajustar a busca por nome ou o filtro de turma."
        />
      );
    }

    return (
      <UiStack gap={16}>
        {filteredTeams.map((team) => {
          const studentSubs = submissions.filter((s) => s.team_id === team.id);
          const solvedSet = new Set(
            studentSubs.filter((s) => s.judgementType === "AC").map((s) => s.problem_id)
          );
          const totalProblems = problems.length || 1;
          const progressPercent = Math.round((solvedSet.size / totalProblems) * 100);

          return (
            <UiCard key={team.id} variant="default">
              <UiCardHeader
                action={
                  <UiFlex gap={8} align="center">
                    <UiBadge
                      variant={progressPercent === 100 ? "success" : progressPercent > 0 ? "brand" : "neutral"}
                      size="md"
                    >
                      {solvedSet.size} de {totalProblems} resolvidos ({progressPercent}%)
                    </UiBadge>
                    <span className="text-xs text-muted">
                      {studentSubs.length} envios totais
                    </span>
                  </UiFlex>
                }
              >
                <UiCardTitle>
                  <UiFlex gap={8} align="center">
                    <Users size={18} className="text-brand" />
                    <span>{team.display_name || team.name}</span>
                    {team.label && (
                      <UiBadge variant="outline" size="sm">
                        {team.label}
                      </UiBadge>
                    )}
                  </UiFlex>
                </UiCardTitle>
              </UiCardHeader>

              <UiCardContent>
                {studentSubs.length === 0 ? (
                  <p className="text-sm text-muted">Este aluno ainda não enviou soluções para esta lista.</p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {problems.map((prob) => {
                      const probSubs = studentSubs.filter((s) => s.problem_id === prob.id);
                      const hasAc = probSubs.some((s) => s.judgementType === "AC");
                      const latestSub = probSubs[probSubs.length - 1];

                      return (
                        <div
                          key={prob.id}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "var(--radius-md)",
                            background: "var(--surface-subtle)",
                            border: `1px solid ${hasAc ? "var(--border-success)" : "var(--border-subtle)"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <span className="font-semibold text-sm block">
                              {prob.label ? `${prob.label}. ` : ""}
                              {prob.name}
                            </span>
                            <span className="text-xs text-muted">
                              {probSubs.length === 0
                                ? "Não tentou"
                                : `${probSubs.length} tentativa(s)`}
                            </span>
                          </div>

                          {probSubs.length > 0 && latestSub && (
                            <UiFlex gap={6} align="center">
                              <UiBadge variant={hasAc ? "success" : "danger"} size="sm">
                                {hasAc ? "AC" : latestSub.judgementType || "WA"}
                              </UiBadge>
                              <UiButton
                                size="sm"
                                variant="dim"
                                icon={<Code2 size={12} />}
                                onClick={() => handleOpenInspectModal(latestSub)}
                                title="Ver código"
                              />
                            </UiFlex>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </UiCardContent>
            </UiCard>
          );
        })}
      </UiStack>
    );
  };

  // Sub-view 3: Correção Passo a Passo
  const renderStepView = () => {
    if (filteredTeams.length === 0) {
      return (
        <UiEmptyState
          title="Nenhum aluno disponível"
          description="Ajuste os filtros de turma para iniciar a correção guiada."
        />
      );
    }

    const currentTeam = filteredTeams[stepIndex];
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
              Aluno Anterior (←)
            </UiButton>

            <UiStack align="center" gap={4}>
              <h3 className="font-bold text-lg">
                {currentTeam.display_name || currentTeam.name}
              </h3>
              <UiFlex gap={8} align="center">
                <span className="text-xs text-muted">
                  Aluno {stepIndex + 1} de {filteredTeams.length}
                </span>
                {currentTeam.label && (
                  <UiBadge variant="outline" size="sm">
                    {currentTeam.label}
                  </UiBadge>
                )}
              </UiFlex>
            </UiStack>

            <UiButton
              variant="secondary"
              disabled={stepIndex >= filteredTeams.length - 1}
              onClick={() => setStepIndex((prev) => prev + 1)}
              icon={<ChevronRight size={16} />}
              iconPosition="right"
            >
              Próximo Aluno (→)
            </UiButton>
          </UiFlex>
        </UiCard>

        {studentSubs.length === 0 ? (
          <UiEmptyState
            title="Nenhuma submissão deste aluno"
            description="Este estudante ainda não realizou envios para esta lista de exercícios."
          />
        ) : (
          studentSubs.map((sub) => {
            const prob = problems.find((p) => p.id === sub.problem_id);
            const cached = codeCache[sub.id];

            return (
              <UiCard key={sub.id} variant="default">
                <UiCardHeader
                  action={
                    <UiBadge
                      variant={sub.judgementType === "AC" ? "success" : "danger"}
                      size="md"
                      dot
                    >
                      {sub.judgementType || "PENDING"}
                    </UiBadge>
                  }
                >
                  <UiCardTitle>
                    <UiFlex gap={8} align="center">
                      <span className="text-brand font-mono font-bold">{prob?.label || "Ex"}</span>
                      <span>{prob?.name || sub.problem_id}</span>
                      <span className="text-xs text-muted font-mono font-normal">
                        ({sub.language_id})
                      </span>
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
                      Carregar Código Fonte do Aluno
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

  // Sub-view 4: Painel da Turma (Matriz Aluno x Exercício)
  const renderMatrixView = () => {
    const columns: Column<Team>[] = [
      {
        key: "name",
        title: "Aluno",
        render: (team) => (
          <div>
            <span className="font-bold block text-sm">
              {team.display_name || team.name}
            </span>
            {team.label && (
              <span className="text-xs text-muted">{team.label}</span>
            )}
          </div>
        ),
      },
      ...problems.map((prob) => ({
        key: prob.id,
        title: prob.label || prob.name,
        align: "center" as const,
        render: (team: Team) => {
          const subs = submissions.filter(
            (s) => s.team_id === team.id && s.problem_id === prob.id
          );
          if (subs.length === 0) {
            return <span className="text-muted text-xs opacity-40">-</span>;
          }
          const hasAc = subs.some((s) => s.judgementType === "AC");
          return (
            <UiBadge
              variant={hasAc ? "success" : "danger"}
              size="sm"
              title={`${subs.length} tentativa(s)`}
            >
              {hasAc ? "AC" : `${subs.length} tent.`}
            </UiBadge>
          );
        },
      })),
    ];

    return (
      <UiTable
        columns={columns}
        data={filteredTeams}
        keyField="id"
        emptyMessage="Nenhum aluno ou exercício encontrado com os filtros selecionados."
      />
    );
  };

  const activeContestObj = contests.find((c) => c.id === selectedContestId);

  return (
    <UiStack gap={24} className="animate-fade-in">
      {/* Top Header Hero */}
      <UiCard variant="glow">
        <UiFlex justify="between" align="center" wrap gap={16}>
          <UiStack gap={4}>
            <UiFlex gap={8} align="center">
              <GraduationCap className="text-brand" size={24} />
              <h2 className="text-xl font-bold">
                {activeContestObj ? activeContestObj.name : "Acompanhamento Pedagógico & Entregas"}
              </h2>
              {activeContestObj && (
                <UiBadge variant={activeContestObj.enabled ? "success" : "neutral"} size="sm">
                  {activeContestObj.enabled ? "Lista Aberta" : "Lista Encerrada"}
                </UiBadge>
              )}
            </UiFlex>
            <p className="text-muted text-sm">
              Monitore o progresso dos alunos nos exercícios práticos, analise dificuldades recorrentes e inspecione códigos fonte.
            </p>
          </UiStack>

          <UiFlex gap={10} wrap>
            <UiButton
              variant="primary"
              onClick={loadData}
              loading={loading}
              icon={<RefreshCw size={16} />}
            >
              Sincronizar Submissões
            </UiButton>
            <UiButton
              variant="dim"
              onClick={handleExportCsv}
              disabled={filteredSubmissions.length === 0}
              icon={<Download size={16} />}
            >
              Exportar Relatório CSV
            </UiButton>
          </UiFlex>
        </UiFlex>
      </UiCard>

      {/* Cartões de Métricas Pedagógicas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <UiMetricCard
          title="Alunos na Turma"
          value={`${metrics.activeStudents} / ${metrics.totalStudents}`}
          icon={<Users size={20} />}
          subtitle={`${metrics.activeStudents} já enviaram soluções`}
        />
        <UiMetricCard
          title="Taxa de Conclusão da Lista"
          value={`${metrics.completionRate}%`}
          icon={<Award size={20} />}
          subtitle="Exercícios resolvidos com AC"
        />
        <UiMetricCard
          title="Submissões Avaliadas"
          value={metrics.totalSubmissionsCount}
          icon={<Clock size={20} />}
          subtitle={`${metrics.acRate}% de acerto geral`}
        />
      </div>

      {/* Sub-navegação de Modos */}
      <UiTabs
        variant="pill"
        activeTab={viewMode}
        onChange={setViewMode}
        tabs={[
          { id: "question", label: "Por Exercício" },
          { id: "student", label: "Por Aluno" },
          { id: "step", label: "Correção Passo a Passo" },
          { id: "matrix", label: "Painel da Turma" },
        ]}
      />

      {/* Filtros Contextuais */}
      <UiCard variant="subtle">
        <UiGrid columns={3} gap={14}>
          <UiTextInput
            placeholder="Buscar aluno por nome ou matrícula..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            startIcon={<Search size={16} />}
          />

          <UiSelect
            label="Exercício Específico"
            options={[
              { value: "all", label: "Todos os Exercícios" },
              ...problems.map((p) => ({
                value: p.id,
                label: `${p.label ? `${p.label} - ` : ""}${p.name}`,
              })),
            ]}
            value={selectedProblemId}
            onChange={(val) => setSelectedProblemId(val as string)}
          />

          <UiSelect
            label="Filtrar por Veredito"
            options={[
              { value: "all", label: "Todos os Vereditos" },
              { value: "AC", label: "Accepted (AC)" },
              { value: "WA", label: "Wrong Answer (WA)" },
              { value: "TLE", label: "Time Limit (TLE)" },
              { value: "RTE", label: "Runtime Error (RTE)" },
              { value: "CE", label: "Compile Error (CE)" },
            ]}
            value={selectedStatusFilter}
            onChange={(val) => setSelectedStatusFilter(val as string)}
          />
        </UiGrid>
      </UiCard>

      {/* Conteúdo da Aba */}
      {loading ? (
        <UiCard>
          <UiFlex justify="center" align="center" style={{ padding: 48 }}>
            <UiSpinner size="lg" label="Carregando submissões e notas do juiz online..." />
          </UiFlex>
        </UiCard>
      ) : viewMode === "student" ? (
        renderStudentView()
      ) : viewMode === "step" ? (
        renderStepView()
      ) : viewMode === "matrix" ? (
        renderMatrixView()
      ) : (
        renderQuestionView()
      )}

      {/* Modal de Inspeção Detalhada de Código */}
      {inspectModalSub && (
        <UiModal
          isOpen={Boolean(inspectModalSub)}
          onClose={() => setInspectModalSub(null)}
          title={`Submissão #${inspectModalSub.id} — ${inspectModalSub.language_id}`}
          size="lg"
        >
          <UiStack gap={14}>
            <UiFlex justify="between" align="center">
              <UiFlex gap={8} align="center">
                <UiBadge
                  variant={inspectModalSub.judgementType === "AC" ? "success" : "danger"}
                  size="md"
                  dot
                >
                  {inspectModalSub.judgementType || "PENDING"}
                </UiBadge>
                <span className="text-xs text-muted">
                  Enviado em {new Date(inspectModalSub.time).toLocaleString()}
                </span>
              </UiFlex>
            </UiFlex>

            <UiCodeViewer
              code={inspectModalCode}
              filename={`solucao.${inspectModalSub.language_id}`}
              language={inspectModalSub.language_id}
              judgementType={inspectModalSub.judgementType}
            />
          </UiStack>
        </UiModal>
      )}
    </UiStack>
  );
};
