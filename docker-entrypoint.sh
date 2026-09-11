#!/bin/sh
set -e

# Gerar config.js dinamicamente com base nas variáveis de ambiente passadas ao container
cat <<EOF > /usr/share/nginx/html/config.js
window.__ENV__ = {
  DOMJUDGE_API_URL: "${DOMJUDGE_API_URL:-${DOMJUDGE_API_BASE:-https://coderunner.cin.ufpe.br/api/v4}}",
  DOMJUDGE_API_BASE: "${DOMJUDGE_API_URL:-${DOMJUDGE_API_BASE:-https://coderunner.cin.ufpe.br/api/v4}}",
  WIZARD_ADMIN_LABEL: "${WIZARD_ADMIN_LABEL:-admin}",
  SESSION_EXPIRATION_DAYS: ${SESSION_EXPIRATION_DAYS:-7},
  ENABLE_DEMO_MODE: ${ENABLE_DEMO_MODE:-true},
  BASE_PATH: "${BASE_PATH:-}"
};
EOF

# Configurar arquivo de configuração do Nginx com a porta parametrizada e suporte a subrota
PORT=${PORT:-7070}
CLEAN_BASE=$(echo "${BASE_PATH:-}" | sed 's|^/*||;s|/*$||')

if [ -n "$CLEAN_BASE" ]; then
cat <<EOF > /etc/nginx/conf.d/default.conf
server {
    listen ${PORT};
    root /usr/share/nginx/html;
    index index.html;
    location /${CLEAN_BASE}/ {
        alias /usr/share/nginx/html/;
        try_files \$uri \$uri/ /index.html =404;
    }
    location / {
        try_files \$uri \$uri/ /index.html =404;
    }
}
EOF
else
cat <<EOF > /etc/nginx/conf.d/default.conf
server {
    listen ${PORT};
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html =404;
    }
}
EOF
fi

exec "$@"
