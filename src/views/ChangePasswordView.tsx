import React, { useState } from "react";
import { KeyRound, ShieldCheck, CheckCircle2 } from "lucide-react";
import {
  UiCard,
  UiCardHeader,
  UiCardTitle,
  UiCardSubtitle,
  UiCardContent,
  UiStack,
  UiFlex,
  UiTextInput,
  UiPasswordInput,
  UiButton,
  UiAlert,
  UiContainer,
} from "@/components/ui";
import { UiPasswordStrengthBar } from "@/components/domain";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { submitChangePassword } from "@/services/passwordService";

export const ChangePasswordView: React.FC = () => {
  const { credentials } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState(credentials.user || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim()) {
      setErrorMsg("O nome de usuário é obrigatório.");
      return;
    }
    if (!currentPassword) {
      setErrorMsg("A senha anterior é obrigatória.");
      return;
    }
    if (newPassword.length < 10) {
      setErrorMsg("A nova senha deve ter pelo menos 10 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("A nova senha e a confirmação de senha não coincidem.");
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg("A nova senha deve ser diferente da senha anterior.");
      return;
    }

    setLoading(true);
    try {
      const res = await submitChangePassword({
        username: username.trim(),
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setSuccessMsg(res.message || "Senha alterada com sucesso! Você já pode utilizar sua nova senha.");
        showToast("Senha alterada com sucesso!", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setErrorMsg(res.error || "Não foi possível alterar a senha. Verifique os dados informados.");
        showToast("Falha ao alterar senha.", "error");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro de conexão ao alterar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <UiContainer maxWidth="sm" className="animate-fade-in" style={{ marginTop: 16, marginBottom: 48 }}>
      <UiStack gap={20}>
        {/* Card Principal do Formulário */}
        <UiCard variant="glow">
          <UiCardHeader>
            <UiCardTitle>
              <UiFlex gap={8} align="center">
                <KeyRound size={22} className="text-brand" />
                <span>Alteração de Senha</span>
              </UiFlex>
            </UiCardTitle>
            <UiCardSubtitle>
              Altere sua senha de acesso ao DOMjudge. A nova senha deve ter no mínimo 10 caracteres.
            </UiCardSubtitle>
          </UiCardHeader>

          <UiCardContent>
            <form onSubmit={handleSubmit}>
              <UiStack gap={16}>
                {errorMsg && (
                  <UiAlert variant="danger" onClose={() => setErrorMsg(null)}>
                    {errorMsg}
                  </UiAlert>
                )}

                {successMsg && (
                  <UiAlert
                    variant="success"
                    icon={<CheckCircle2 size={18} />}
                    onClose={() => setSuccessMsg(null)}
                  >
                    {successMsg}
                  </UiAlert>
                )}

                <UiTextInput
                  label="Nome de Usuário (Login)"
                  placeholder="Seu usuário no DOMjudge (ex: time01)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />

                <UiPasswordInput
                  label="Senha Anterior / Provisória"
                  placeholder="Digite sua senha anterior"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <UiPasswordInput
                  label="Nova Senha"
                  placeholder="Mínimo de 10 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                {newPassword && <UiPasswordStrengthBar password={newPassword} />}

                <UiPasswordInput
                  label="Confirmar Nova Senha"
                  placeholder="Repita exatamente a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  error={
                    confirmPassword && newPassword !== confirmPassword
                      ? "As senhas não coincidem"
                      : undefined
                  }
                  required
                />

                <UiButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  fullWidth
                  icon={<ShieldCheck size={18} />}
                  style={{ marginTop: 8 }}
                >
                  Salvar Nova Senha no DOMjudge
                </UiButton>
              </UiStack>
            </form>
          </UiCardContent>
        </UiCard>
      </UiStack>
    </UiContainer>
  );
};
