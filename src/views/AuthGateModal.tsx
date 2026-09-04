import React, { useState } from "react";
import { Zap, ShieldCheck } from "lucide-react";
import {
  UiModal,
  UiStack,
  UiFlex,
  UiTextInput,
  UiPasswordInput,
  UiCheckbox,
  UiButton,
  UiAlert,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export const AuthGateModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, enableDemoMode, credentials, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [apiBase, setApiBase] = useState(credentials.apiBase || "https://coderunner.cin.ufpe.br/api/v4");
  const [user, setUser] = useState(credentials.user || "");
  const [password, setPassword] = useState(credentials.password || "");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiBase || !user || !password) {
      setErrorMsg("Preencha todos os campos para autenticar.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const success = await login(apiBase, user, password, remember);
    setLoading(false);

    if (success) {
      showToast("Conexão estabelecida com o DOMjudge!", "success");
    } else {
      setErrorMsg("Credenciais inválidas ou servidor inalcançável. Verifique os dados.");
      showToast("Falha na autenticação com o DOMjudge.", "error");
    }
  };

  const handleDemo = () => {
    enableDemoMode();
    showToast("Modo de demonstração ativado com sucesso!", "info");
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
          <span>{isAuthenticated ? "Trocar Conexão da API" : "Acesso ao DOMjudge Wizard"}</span>
        </UiFlex>
      }
      subtitle="Informe as credenciais da API do DOMjudge para liberar a suíte completa."
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <UiStack gap={16}>
          {errorMsg && (
            <UiAlert variant="danger" onClose={() => setErrorMsg(null)}>
              {errorMsg}
            </UiAlert>
          )}

          <UiTextInput
            label="API Base URL"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="https://seu-domjudge.com/api/v4"
            helperText="Exemplo: https://coderunner.cin.ufpe.br/api/v4"
            required
          />

          <UiTextInput
            label="Usuário da API"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="admin ou jury"
            autoComplete="username"
            required
          />

          <UiPasswordInput
            label="Senha da API"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
            required
          />

          <UiCheckbox
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            label="Lembrar dados de acesso neste navegador (salvo com segurança)"
          />

          <UiFlex gap={10} style={{ marginTop: 8 }}>
            <UiButton
              type="submit"
              variant="primary"
              loading={loading}
              fullWidth
              icon={<ShieldCheck size={18} />}
            >
              Conectar ao DOMjudge
            </UiButton>

            <UiButton
              type="button"
              variant="dim"
              onClick={handleDemo}
              title="Carregar dados de simulação local"
            >
              Modo Demo
            </UiButton>
          </UiFlex>
        </UiStack>
      </form>
    </UiModal>
  );
};
