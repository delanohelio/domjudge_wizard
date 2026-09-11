import React, { useState, useEffect } from "react";
import {
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Shield,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Tag,
  Lock,
} from "lucide-react";
import {
  UiCard,
  UiStack,
  UiFlex,
  UiButton,
  UiTextInput,
  UiPasswordInput,
  UiAlert,
  UiBadge,
  UiContainer,
} from "@/components/ui";
import { validateAccessCode, registerWithCode } from "@/services/adminService";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export const RegisterView: React.FC = () => {
  const { openAuthModal } = useAuth();
  const { showToast } = useToast();

  // Ler código da URL se presente (?codigo=... ou ?code=...)
  const getInitialCode = (): string => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("codigo") || params.get("code") || "";
  };

  const [code, setCode] = useState<string>(getInitialCode);
  const [isValidatingCode, setIsValidatingCode] = useState<boolean>(false);
  const [codeValidated, setCodeValidated] = useState<boolean>(false);
  const [codeData, setCodeData] = useState<{
    name: string;
    labels: string[];
    category?: string;
  } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Campos do Formulário
  const [username, setUsername] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState<boolean>(false);
  const [registeredData, setRegisteredData] = useState<{
    username: string;
    labels: string[];
  } | null>(null);

  // Validar código automaticamente se veio na URL
  useEffect(() => {
    const initial = getInitialCode();
    if (initial) {
      handleValidateCode(initial);
    }
  }, []);

  const handleValidateCode = async (codeToValidate: string) => {
    const clean = codeToValidate.trim().toUpperCase();
    if (!clean) {
      setCodeError("Informe o código de acesso.");
      setCodeValidated(false);
      setCodeData(null);
      return;
    }

    setIsValidatingCode(true);
    setCodeError(null);

    try {
      const res = await validateAccessCode(clean);
      if (res.success && res.active) {
        setCodeData({
          name: res.name || clean,
          labels: res.labels || [],
          category: res.category,
        });
        setCodeValidated(true);
        setCodeError(null);
        showToast("Código de acesso validado com sucesso!", "success");
      } else {
        setCodeValidated(false);
        setCodeData(null);
        setCodeError(
          res.error ||
            "Este código de acesso está desativado pelo administrador e não aceita novos cadastros."
        );
      }
    } catch (err: any) {
      setCodeValidated(false);
      setCodeData(null);
      setCodeError(err.message || "Código de acesso inválido ou inativo.");
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codeValidated) {
      setSubmitError("Valide um código de acesso válido e ativo antes de continuar.");
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,32}$/.test(cleanUsername)) {
      setSubmitError(
        "O nome de usuário deve ter entre 2 e 32 caracteres (apenas letras minúsculas, números, hífen ou underline)."
      );
      return;
    }

    if (password.length < 10) {
      setSubmitError("A senha deve ter pelo menos 10 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("A senha e a confirmação de senha não conferem.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await registerWithCode({
        code: code.trim().toUpperCase(),
        username: cleanUsername,
        name: name.trim() || cleanUsername,
        email: email.trim() || undefined,
        password,
        confirmPassword,
      });

      if (res.success) {
        setRegisteredSuccess(true);
        setRegisteredData({
          username: cleanUsername,
          labels: [cleanUsername, ...(codeData?.labels || [])],
        });
        showToast("Conta criada com sucesso no DOMjudge!", "success");
      }
    } catch (err: any) {
      setSubmitError(err.message || "Erro ao registrar conta no DOMjudge.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    window.location.hash = "#review";
    openAuthModal();
  };

  const envApiUrl = window.__ENV__?.DOMJUDGE_API_URL || window.__ENV__?.DOMJUDGE_API_BASE;
  const domjudgeUrl = envApiUrl
    ? envApiUrl.replace(/\/api\/v4\/?$/, "").replace(/\/api\/?$/, "")
    : "https://coderunner.cin.ufpe.br";

  // TELA DE SUCESSO
  if (registeredSuccess && registeredData) {
    return (
      <UiContainer maxWidth="md" className="animate-fade-in" style={{ padding: "40px 16px" }}>
        <UiCard variant="elevated" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.15)",
              color: "var(--success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px auto",
            }}
          >
            <CheckCircle2 size={44} />
          </div>

          <h2 style={{ fontSize: "1.8rem", marginBottom: 8 }}>Cadastro Realizado com Sucesso!</h2>
          <p style={{ color: "var(--ink-muted)", fontSize: "1rem", maxWidth: 520, margin: "0 auto 24px auto" }}>
            Sua conta e equipe foram registradas no DOMjudge com a classificação e labels
            atribuídas pelo código de acesso.
          </p>

          {/* Detalhes da Conta Criada */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "20px",
              maxWidth: 480,
              margin: "0 auto 28px auto",
              textAlign: "left",
            }}
          >
            <UiStack gap={10}>
              <UiFlex justify="between">
                <span style={{ color: "var(--ink-muted)", fontSize: "0.9rem" }}>Login de Usuário:</span>
                <strong style={{ fontFamily: "var(--font-mono)", color: "var(--brand)" }}>
                  {registeredData.username}
                </strong>
              </UiFlex>

              <UiFlex justify="between">
                <span style={{ color: "var(--ink-muted)", fontSize: "0.9rem" }}>Turma / Grupo:</span>
                <strong>{codeData?.name || code}</strong>
              </UiFlex>

              <div>
                <span style={{ color: "var(--ink-muted)", fontSize: "0.85rem", display: "block", marginBottom: 6 }}>
                  Labels Atribuídas ao seu Time no DOMjudge:
                </span>
                <UiFlex gap={6} wrap>
                  {registeredData.labels.map((lbl) => (
                    <UiBadge key={lbl} variant="brand" size="sm">
                      <Tag size={10} style={{ marginRight: 3 }} />
                      {lbl}
                    </UiBadge>
                  ))}
                </UiFlex>
              </div>
            </UiStack>
          </div>

          <UiFlex gap={12} justify="center" wrap>
            <UiButton
              variant="primary"
              size="lg"
              onClick={handleGoToLogin}
              icon={<ArrowRight size={18} />}
            >
              Fazer Login no DOMjudge Wizard
            </UiButton>

            <UiButton
              variant="dim"
              size="lg"
              onClick={() => window.open(domjudgeUrl, "_blank")}
              icon={<ExternalLink size={16} />}
            >
              Ir para o DOMjudge Web
            </UiButton>
          </UiFlex>
        </UiCard>
      </UiContainer>
    );
  }

  // TELA DE FORMULÁRIO DE CADASTRO
  return (
    <UiContainer maxWidth="md" className="animate-fade-in" style={{ padding: "32px 16px" }}>
      <UiStack gap={24}>
        {/* Header da Página */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: "20px",
              background: "rgba(99, 102, 241, 0.12)",
              color: "var(--brand)",
              fontSize: "0.88rem",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            <Sparkles size={16} /> Auto-Cadastro de Competidores
          </div>
          <h1 style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
            Criar Conta no DOMjudge com Código de Acesso
          </h1>
          <p style={{ color: "var(--ink-muted)", marginTop: 6, fontSize: "0.95rem" }}>
            Insira o código fornecido pelo professor ou jurado para liberar seu cadastro na turma.
          </p>
        </div>

        <UiCard variant="elevated" style={{ maxWidth: 560, margin: "0 auto", width: "100%" }}>
          <UiStack gap={20}>
            {/* ETAPA 1: Validação do Código de Acesso */}
            <div>
              <label style={{ fontSize: "0.9rem", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Código de Acesso da Turma <span style={{ color: "var(--danger)" }}>*</span>
              </label>

              <UiFlex gap={8}>
                <div style={{ flex: 1 }}>
                  <UiTextInput
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setCodeValidated(false);
                      setCodeData(null);
                      setCodeError(null);
                    }}
                    placeholder="Ex: TURMA-2026-1"
                    startIcon={<KeyRound size={16} />}
                    autoFocus
                  />
                </div>

                <UiButton
                  type="button"
                  variant="dim"
                  onClick={() => handleValidateCode(code)}
                  loading={isValidatingCode}
                  disabled={!code.trim()}
                >
                  Validar Código
                </UiButton>
              </UiFlex>

              {codeError && (
                <div style={{ marginTop: 8 }}>
                  <UiAlert variant="danger">
                    <UiFlex gap={8} align="center">
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <span>{codeError}</span>
                    </UiFlex>
                  </UiAlert>
                </div>
              )}

              {codeValidated && codeData && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "12px 14px",
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                >
                  <UiFlex justify="between" align="start" wrap gap={8}>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--success)",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.95rem",
                        }}
                      >
                        <CheckCircle2 size={16} /> Código Válido & Liberado
                      </div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>{codeData.name}</div>
                      {codeData.category && (
                        <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: 2 }}>
                          Categoria: {codeData.category}
                        </div>
                      )}
                    </div>
                  </UiFlex>

                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--ink-muted)", display: "block", marginBottom: 4 }}>
                      Labels que serão aplicadas à sua conta:
                    </span>
                    <UiFlex gap={6} wrap>
                      <UiBadge variant="neutral" size="sm">
                        [username] (padrão)
                      </UiBadge>
                      {codeData.labels && codeData.labels.length > 0 ? (
                        codeData.labels.map((l) => (
                          <UiBadge key={l} variant="brand" size="sm">
                            <Tag size={10} style={{ marginRight: 3 }} />
                            {l}
                          </UiBadge>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>(somente username)</span>
                      )}
                    </UiFlex>
                  </div>
                </div>
              )}
            </div>

            {/* ETAPA 2: Formulário de Dados Cadastrais */}
            <form onSubmit={handleFormSubmit} style={{ opacity: codeValidated ? 1 : 0.45, pointerEvents: codeValidated ? "auto" : "none", transition: "opacity 0.2s ease" }}>
              <UiStack gap={14}>
                {submitError && <UiAlert variant="danger">{submitError}</UiAlert>}

                <UiTextInput
                  label="Nome de Usuário (Login no DOMjudge)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="Ex: ana.souza ou aluno01"
                  required
                  helperText="Letras minúsculas, números, hífen ou underline (sem espaços)."
                />

                <UiTextInput
                  label="Nome Completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ana Clara Souza"
                  required
                />

                <UiTextInput
                  label="E-mail (Opcional)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: ana@universidade.edu.br"
                />

                <UiPasswordInput
                  label="Senha (Mínimo de 10 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  helperText={
                    password.length > 0 && password.length < 10
                      ? `Faltam ${10 - password.length} caracteres para atingir o mínimo exigido.`
                      : undefined
                  }
                />

                <UiPasswordInput
                  label="Confirme a Senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />

                <UiButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  fullWidth
                  icon={<UserPlus size={18} />}
                  style={{ marginTop: 8 }}
                >
                  Concluir Cadastro no DOMjudge
                </UiButton>
              </UiStack>
            </form>

            <div
              style={{
                textAlign: "center",
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
                fontSize: "0.88rem",
              }}
            >
              <span style={{ color: "var(--ink-muted)" }}>Já possui uma conta ativa? </span>
              <button
                type="button"
                onClick={handleGoToLogin}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "var(--brand)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Fazer Login
              </button>
            </div>
          </UiStack>
        </UiCard>
      </UiStack>
    </UiContainer>
  );
};
