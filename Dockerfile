FROM nginx:alpine

ARG PORT=7070
ENV PORT=${PORT}

# Copiar arquivos da aplicação para o diretório raiz do Nginx
COPY . /usr/share/nginx/html/

# Configurar script de entrypoint executável
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE ${PORT}

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
