FROM nginx:alpine

ARG PORT=7070
ENV PORT=${PORT}

COPY . /usr/share/nginx/html/

EXPOSE ${PORT}

CMD sh -c "printf 'server {\n    listen %s;\n    root /usr/share/nginx/html;\n    index index.html;\n    location / {\n        try_files \$uri \$uri/ =404;\n    }\n}\n' \"${PORT}\" > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
