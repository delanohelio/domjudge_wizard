/**
 * Utilitário central para resolução de subrotas (BASE_PATH).
 * Suporta execução na raiz (/) ou em subrotas configuradas (ex.: /wizard, /domjudge, etc.)
 */

declare global {
  interface Window {
    __DETECTED_BASE_PATH__?: string;
  }
}

export function getBasePath(): string {
  if (typeof window === "undefined") return "";

  // 1. Variável de ambiente pública injetada pelo backend (/config.js)
  const envBase = window.__ENV__?.BASE_PATH;
  if (envBase !== undefined && envBase !== null && String(envBase).trim() !== "") {
    const clean = String(envBase).trim().replace(/^\/+|\/+$/g, "");
    return clean ? `/${clean}` : "";
  }

  // 2. Base detectada no carregamento inicial do index.html
  if (window.__DETECTED_BASE_PATH__ !== undefined && window.__DETECTED_BASE_PATH__ !== "") {
    return window.__DETECTED_BASE_PATH__;
  }

  // 3. Fallback inteligente a partir do pathname atual
  const p = window.location.pathname || "/";
  const parts = p.split("/").filter(Boolean);
  if (
    parts.length > 0 &&
    !["cadastro", "register", "trocar-senha", "change-password", "criar-conta", "api", "assets"].includes(
      parts[0].toLowerCase()
    )
  ) {
    return `/${parts[0]}`;
  }

  return "";
}

/**
 * Concatena uma rota interna ao BASE_PATH configurado.
 * Exemplo: apiPath("/api/auth/login") -> "/wizard/api/auth/login" (se BASE_PATH=/wizard)
 */
export function apiPath(path: string): string {
  const base = getBasePath();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
