import React, { useState } from "react";
import { Zap, ShieldCheck, UserPlus, KeyRound, AlertCircle } from "lucide-react";
import {
  UiModal,
  UiStack,
  UiFlex,
  UiTextInput,
  UiPasswordInput,
  UiCheckbox,
  UiButton,
  UiAlert,
  UiBadge,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export const AuthGateModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, enableDemoMode, user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detectedLabels, setDetectedLabels] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg("Informe seu usuário e senha do DOMjudge.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setDetectedLabels([]);

    const result = await login(username.trim(), password, remember);
    setLoading(false);

    if (result.success) {
      showToast("Conexão autenticada no DOMjudge com sucesso!", "success");
    } else {
      setErrorMsg(result.error || "Falha na autenticação com o DOMjudge.");
      if (result.detectedLabels && result.detectedLabels.length > 0) {
        setDetectedLabels(result.detectedLabels);
      }
      showToast(result.error || "Acesso negado.", "error");
    }
  };

  const handleDemo = () => {
    enableDemoMode();
    showToast("Modo de demonstração ativado com sucesso!", "info");
  };

  const handleGoToRegister = () => {
    window.location.hash = "#cadastro";
    closeAuthModal();
  };

  const handleGoToChangePassword = () => {
    window.location.hash = "#trocar-senha";
    closeAuthModal();
  };

  return (
    <UiModal
      isOpen={isAuthModalOpen}
      onClose={() => {
        if (isAuthenticated) closeAuthModal();
      }}
      closeOnEsc={isAuthenticated}
      closeOnOverlay={isAuthenticated}
      title={
        <UiFlex gap={8} align="center">
          <span className="text-brand flex items-center">
            <Zap size={22} className="text-brand fill-brand" />
          </span>
          <span>{isAuthenticated ? "Trocar Conta do DOMjudge" : "Acesso à Plataforma"}</span>
        </UiFlex>
      }
      subtitle="Entre com suas credenciais do DOMjudge para acessar os módulos permitidos da suíte."
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <UiStack gap={16}>
          {errorMsg && (
            <UiAlert variant="danger" onClose={() => setErrorMsg(null)}>
              <UiStack gap={6}>
                <div>{errorMsg}</div>
                {detectedLabels.length > 0 && (
                  <UiFlex gap={6} align="center" wrap style={{ marginTop: 4 }}>
                    <span style={{ fontSize: "0.82rem", opacity: 0.8 }}>Labels encontradas:</span>
                    {detectedLabels.map((lbl) => (
                      <UiBadge key={lbl} variant="neutral" size="sm">
                        {lbl}
                      </UiBadge>
                    ))}
                  </UiFlex>
                )}
              </UiStack>
            </UiAlert>
          )}

          <UiTextInput
            label="Usuário do DOMjudge (Login)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ex: seu.usuario"
            autoComplete="username"
            required
            autoFocus
          />

          <UiPasswordInput
            label="Senha do DOMjudge"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
            required
          />

          <UiCheckbox
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            label="Manter conectado neste navegador"
          />

          <UiFlex gap={10} style={{ marginTop: 8 }}>
            <UiButton
              type="submit"
              variant="primary"
              loading={loading}
              fullWidth
              icon={<ShieldCheck size={18} />}
            >
              Entrar no Wizard
            </UiButton>

            <UiButton
              type="button"
              variant="dim"
              onClick={handleDemo}
              title="Acessar com perfil simulado de testes"
            >
              Modo Demo
            </UiButton>
          </UiFlex>

          {/* Links para auto-serviço (Cadastro e Troca de Senha) */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 14,
              borderTop: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: "0.86rem",
            }}
          >
            <button
              type="button"
              onClick={handleGoToRegister}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--brand)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "inherit",
                textAlign: "left",
              }}
            >
              <UserPlus size={15} />
              <span>Possui um Código de Acesso? <strong>Cadastre-se aqui</strong></span>
            </button>

            <button
              type="button"
              onClick={handleGoToChangePassword}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--ink-muted)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "inherit",
                textAlign: "left",
              }}
            >
              <KeyRound size={15} />
              <span>Esqueceu ou precisa alterar a senha? <strong>Trocar Senha</strong></span>
            </button>
          </div>
        </UiStack>
      </form>
    </UiModal>
  );
};
