#!/bin/sh
set -e

# Gerar config.js dinamicamente com base nas variáveis de ambiente passadas ao container
cat <<EOF > /usr/share/nginx/html/config.js
window.__ENV__ = {
  DOMJUDGE_API_BASE: "${DOMJUDGE_API_BASE:-https://coderunner.cin.ufpe.br/api/v4}",
  DOMJUDGE_API_USER: "${DOMJUDGE_API_USER:-}",
  DOMJUDGE_API_PASSWORD: "${DOMJUDGE_API_PASSWORD:-}",
  STORAGE_EXPIRATION_DAYS: ${STORAGE_EXPIRATION_DAYS:-7}
};
EOF

# Configurar arquivo de configuração do Nginx com a porta parametrizada
PORT=${PORT:-7070}
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

exec "$@"
