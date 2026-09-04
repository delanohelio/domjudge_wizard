// Serviço de senhas seguras e integração com endpoint de troca de senha

export function generateSecurePassword(length: number = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem I e O ambíguos
  const lower = "abcdefghijkmnopqrstuvwxyz"; // sem l ambíguo
  const digits = "23456789"; // sem 0 e 1 ambíguos
  const symbols = "!@#$%^&*()_+~=";
  const all = upper + lower + digits + symbols;

  const getRandomChar = (chars: string) => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return chars[array[0] % chars.length];
  };

  const passwordChars = [
    getRandomChar(upper),
    getRandomChar(lower),
    getRandomChar(digits),
    getRandomChar(symbols),
  ];

  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(getRandomChar(all));
  }

  // Embaralhar Fisher-Yates com crypto
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const j = array[0] % (i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
}

export async function submitChangePassword(payload: {
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch("/api/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({ success: false, error: "Resposta inválida do servidor." }));
  if (!res.ok) {
    return {
      success: false,
      error: data.error || `Erro HTTP ${res.status}`,
    };
  }
  return data;
}
