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
  if (window.__ENV__ && window.__ENV__.BASE_PATH !== undefined && window.__ENV__.BASE_PATH !== null) {
    const envBase = String(window.__ENV__.BASE_PATH).trim();
    if (envBase === "") return "";
    const clean = envBase.replace(/^\/+|\/+$/g, "");
    return clean ? `/${clean}` : "";
  }

  // 2. Base detectada no carregamento inicial do index.html
  if (window.__DETECTED_BASE_PATH__ !== undefined && window.__DETECTED_BASE_PATH__ !== "") {
    return window.__DETECTED_BASE_PATH__;
  }

  // 3. Fallback inteligente a partir do pathname atual
  const p = window.location.pathname || "/";
  const parts = p.split("/").filter(Boolean);
  const knownViews = [
    "review",
    "creator",
    "problems",
    "contests",
    "users",
    "codes",
    "permissions",
    "trocar-senha",
    "change-password",
    "cadastro",
    "register",
    "criar-conta",
    "api",
    "assets",
    "pdf",
  ];
  if (parts.length > 0 && !knownViews.includes(parts[0].toLowerCase())) {
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
