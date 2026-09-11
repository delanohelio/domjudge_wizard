// Configurações e variáveis de ambiente injetadas
// Em ambiente Docker, este arquivo é sobrescrito dinamicamente na inicialização do container.
window.__ENV__ = window.__ENV__ || {
  DOMJUDGE_API_URL: "https://coderunner.cin.ufpe.br/api/v4",
  DOMJUDGE_API_BASE: "https://coderunner.cin.ufpe.br/api/v4",
  WIZARD_ADMIN_LABEL: "admin",
  SESSION_EXPIRATION_DAYS: 7,
  ENABLE_DEMO_MODE: true,
};
