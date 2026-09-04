// ==============================================================================
// LÓGICA DA PÁGINA AVULSA DE ALTERAÇÃO DE SENHA (trocar-senha.js)
// ==============================================================================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("changePasswordForm");
  const usernameInput = document.getElementById("usernameInput");
  const currentPasswordInput = document.getElementById("currentPasswordInput");
  const newPasswordInput = document.getElementById("newPasswordInput");
  const confirmPasswordInput = document.getElementById("confirmPasswordInput");

  const submitBtn = document.getElementById("submitBtn");
  const btnSpinner = document.getElementById("btnSpinner");
  const btnText = document.getElementById("btnText");

  const ruleLength = document.getElementById("ruleLength");
  const ruleMatch = document.getElementById("ruleMatch");
  const strengthFill = document.getElementById("strengthFill");

  const feedbackAlert = document.getElementById("feedbackAlert");
  const feedbackIcon = document.getElementById("feedbackIcon");
  const feedbackTitle = document.getElementById("feedbackTitle");
  const feedbackMessage = document.getElementById("feedbackMessage");
  const feedbackCloseBtn = document.getElementById("feedbackCloseBtn");

  // ----------------------------------------------------------------------------
  // 1. Alternar visibilidade de senhas (Botões de Olho)
  // ----------------------------------------------------------------------------
  const toggleButtons = document.querySelectorAll(".toggle-visibility-btn");
  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const targetInput = document.getElementById(targetId);
      if (!targetInput) return;

      const isPassword = targetInput.type === "password";
      targetInput.type = isPassword ? "text" : "password";

      const eyeOpen = btn.querySelector(".eye-open");
      const eyeClosed = btn.querySelector(".eye-closed");

      if (isPassword) {
        if (eyeOpen) eyeOpen.hidden = true;
        if (eyeClosed) eyeClosed.hidden = false;
        btn.setAttribute("aria-label", "Ocultar senha");
        btn.title = "Ocultar senha";
      } else {
        if (eyeOpen) eyeOpen.hidden = false;
        if (eyeClosed) eyeClosed.hidden = true;
        btn.setAttribute("aria-label", "Mostrar senha");
        btn.title = "Mostrar senha";
      }
    });
  });

  // ----------------------------------------------------------------------------
  // 2. Validações visuais em tempo real e Medidor de Força
  // ----------------------------------------------------------------------------
  function updateRealtimeValidation() {
    const newPass = newPasswordInput.value;
    const confirmPass = confirmPasswordInput.value;

    // Regra 1: Mínimo 10 caracteres
    const hasMinLength = newPass.length >= 10;
    setRuleState(ruleLength, hasMinLength);

    // Regra 2: Confirmação coincide
    const matches = Boolean(newPass && confirmPass && newPass === confirmPass);
    setRuleState(ruleMatch, matches);

    // Medidor de força da senha
    updateStrengthBar(newPass);
  }

  function setRuleState(element, isValid) {
    if (!element) return;
    if (isValid) {
      element.classList.remove("pending");
      element.classList.add("valid");
    } else {
      element.classList.remove("valid");
      element.classList.add("pending");
    }
  }

  function updateStrengthBar(password) {
    if (!strengthFill) return;
    strengthFill.className = "strength-fill";

    if (!password) {
      strengthFill.style.width = "0%";
      return;
    }

    let score = 0;
    if (password.length >= 10) score += 1;
    if (password.length >= 14) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (password.length < 10) {
      strengthFill.classList.add("weak");
    } else if (score < 4) {
      strengthFill.classList.add("medium");
    } else {
      strengthFill.classList.add("strong");
    }
  }

  newPasswordInput.addEventListener("input", updateRealtimeValidation);
  confirmPasswordInput.addEventListener("input", updateRealtimeValidation);

  // ----------------------------------------------------------------------------
  // 3. Exibição de Alertas de Feedback
  // ----------------------------------------------------------------------------
  function showAlert(type, title, message) {
    feedbackAlert.className = `feedback-alert ${type}`;
    feedbackTitle.textContent = title;
    feedbackMessage.textContent = message;

    if (type === "success") {
      feedbackIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      `;
    } else {
      feedbackIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
    }

    feedbackAlert.hidden = false;
    feedbackAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideAlert() {
    feedbackAlert.hidden = true;
    feedbackAlert.className = "feedback-alert";
  }

  if (feedbackCloseBtn) {
    feedbackCloseBtn.addEventListener("click", hideAlert);
  }

  // ----------------------------------------------------------------------------
  // 4. Submissão do Formulário
  // ----------------------------------------------------------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const username = usernameInput.value.trim();
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validações no cliente
    if (!username) {
      showAlert("error", "Campo obrigatório", "Por favor, informe seu usuário ou login.");
      usernameInput.focus();
      return;
    }

    if (!currentPassword) {
      showAlert("error", "Campo obrigatório", "Por favor, digite sua senha anterior (atual).");
      currentPasswordInput.focus();
      return;
    }

    if (!newPassword) {
      showAlert("error", "Campo obrigatório", "Por favor, digite a nova senha.");
      newPasswordInput.focus();
      return;
    }

    // Requisito 2.1: a senha precisa ter pelo menos 10 caracteres
    if (newPassword.length < 10) {
      showAlert(
        "error",
        "Requisito não atendido",
        "A nova senha deve ter pelo menos 10 caracteres."
      );
      newPasswordInput.focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert(
        "error",
        "Senhas não coincidem",
        "A confirmação da senha é diferente da nova senha digitada."
      );
      confirmPasswordInput.focus();
      return;
    }

    if (newPassword === currentPassword) {
      showAlert(
        "error",
        "Senha repetida",
        "A nova senha deve ser diferente da sua senha anterior."
      );
      newPasswordInput.focus();
      return;
    }

    // Estado de carregamento
    submitBtn.disabled = true;
    if (btnSpinner) btnSpinner.hidden = false;
    if (btnText) btnText.textContent = "Atualizando senha...";

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        showAlert(
          "success",
          "Senha alterada com sucesso!",
          data.message ||
            "Sua nova senha foi gravada no DOMjudge. Você já pode utilizá-la para fazer login."
        );
        form.reset();
        updateRealtimeValidation();
      } else {
        const errorMsg =
          data.error ||
          (response.status === 401
            ? "Usuário ou senha anterior inválidos."
            : "Não foi possível atualizar sua senha. Tente novamente mais tarde.");

        showAlert("error", "Falha ao alterar senha", errorMsg);
      }
    } catch (err) {
      console.error("Erro na requisição:", err);
      showAlert(
        "error",
        "Erro de conexão",
        "Não foi possível se comunicar com o servidor. Verifique sua conexão com a internet e tente novamente."
      );
    } finally {
      submitBtn.disabled = false;
      if (btnSpinner) btnSpinner.hidden = true;
      if (btnText) btnText.textContent = "Salvar Nova Senha";
    }
  });
});
