import {
  AccessCode,
  LabelPermission,
  ValidateCodeResponse,
} from "@/types/domjudge";
import { apiPath } from "./apiClient";

function getHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// 1. CÓDIGOS DE ACESSO
export async function fetchAccessCodes(token?: string): Promise<AccessCode[]> {
  const res = await fetch(apiPath("/api/admin/codes"), {
    headers: getHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ao carregar códigos (${res.status})`);
  }
  const data = await res.json();
  return data.codes || [];
}

export async function createAccessCode(
  payload: Partial<AccessCode>,
  token?: string
): Promise<AccessCode> {
  const res = await fetch(apiPath("/api/admin/codes"), {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Falha ao criar código de acesso");
  }
  return data.code;
}

export async function updateAccessCode(
  id: string,
  payload: Partial<AccessCode>,
  token?: string
): Promise<AccessCode> {
  const res = await fetch(apiPath(`/api/admin/codes/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Falha ao atualizar código de acesso");
  }
  return data.code;
}

export async function deleteAccessCode(id: string, token?: string): Promise<boolean> {
  const res = await fetch(apiPath(`/api/admin/codes/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: getHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Falha ao excluir código de acesso");
  }
  return true;
}

// 2. PERMISSÕES DE LABELS
export async function fetchLabelPermissions(token?: string): Promise<LabelPermission[]> {
  const res = await fetch(apiPath("/api/admin/permissions"), {
    headers: getHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ao carregar permissões (${res.status})`);
  }
  const data = await res.json();
  return data.permissions || [];
}

export async function saveLabelPermissions(
  permissions: LabelPermission[],
  token?: string
): Promise<LabelPermission[]> {
  const res = await fetch(apiPath("/api/admin/permissions"), {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({ permissions }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Falha ao salvar permissões de labels");
  }
  return data.permissions;
}

// 3. AUTO-CADASTRO E VALIDAÇÃO PÚBLICA
export async function validateAccessCode(code: string): Promise<ValidateCodeResponse> {
  const clean = encodeURIComponent(String(code || "").trim().toUpperCase());
  const res = await fetch(apiPath(`/api/register/validate/${clean}`));
  const data = await res.json();
  return data;
}

export async function registerWithCode(payload: {
  code: string;
  username: string;
  name: string;
  email?: string;
  password: string;
  confirmPassword?: string;
}): Promise<{ success: boolean; message?: string; error?: string; username?: string }> {
  const res = await fetch(apiPath("/api/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Falha ao realizar cadastro");
  }
  return data;
}
