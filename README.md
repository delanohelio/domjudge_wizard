# DOMjudge Wizard ⚡ (Versão 2.0)

Uma plataforma web moderna, rápida e de alta usabilidade que atua como **extensão oficial do DOMjudge** para professores, jurados, monitores e estudantes.

---

## 🚀 O que há de novo na Versão 2.0

1. **🔐 Autenticação Centralizada baseada no DOMjudge**:
   - As credenciais administrativas do DOMjudge (`DOMJUDGE_ADMIN_USER`, `DOMJUDGE_ADMIN_PASSWORD`) são configuradas exclusivamente no servidor via `.env` ou Docker, sem exposição ao cliente.
   - Qualquer usuário se autentica no Wizard utilizando o seu próprio usuário e senha do DOMjudge.

2. **🏷️ Controle de Acesso por Labels (RBAC)**:
   - O acesso é concedido com base nas labels vinculadas ao time do usuário no DOMjudge.
   - Variável de ambiente `WIZARD_ADMIN_LABEL` (padrão: `admin`): concede privilégios de administrador total no Wizard a qualquer conta que possua essa label (ou que tenha a role `admin` no DOMjudge).
   - Administradores configuram no painel **Permissões & Labels** (`#permissions`) exatamente quais módulos e abas cada label pode acessar (ex.: `professor` acessa todas as abas; `monitor` acessa review e criador de questões).

3. **🎫 Auto-Cadastro com Código de Acesso (`/cadastro`)**:
   - Rota pública e amigável para registro de novos alunos e competidores via código de acesso (ex.: `/cadastro?codigo=TURMA-2026-1`).
   - O código classifica o tipo de usuário e define as labels atribuídas no DOMjudge.
   - Criação automática da equipe com a label padrão do sistema `[username]` + as labels configuradas no código.
   - Bloqueio imediato caso o código de acesso esteja desativado.

4. **⚙️ Gerenciador de Códigos de Acesso (`#codes`)**:
   - Painel para administradores criarem, editarem e monitorarem códigos de acesso.
   - Ativação/desativação em tempo real com switch interativo.
   - Botão para cópia do link direto de convite (`/cadastro?codigo=...`).
   - Métricas de uso e registros efetuados por código.

---

## 📦 Módulos da Plataforma

- **📊 Visualização & Review (`#review`)**: Análise de submissões, split de código-fonte com syntax highlighting, comparativo de vereditos e exportação CSV.
- **✍️ Criador de Questões (`#creator`)**: Markdown Studio com KaTeX, gerador de pacotes ZIP (`problem.yaml`), renderização vetorial de PDF via Puppeteer e upload direto para a API.
- **🏆 Gerenciador de Contests (`#contests`)**: Edição inline de horários, ativação/desativação e freeze de placar em lote.
- **👥 Gerenciador de Usuários (`#users`)**: Edição em lote de categorias, status, senhas e importação de planilhas CSV/TSV com preview em tempo real.
- **🎫 Códigos de Acesso (`#codes`)**: Gestão de convites e auto-cadastro por turma com labels pré-definidas.
- **🛡️ Permissões & Labels (`#permissions`)**: Mapeamento granular de quais páginas cada label do DOMjudge pode acessar.
- **🔑 Troca de Senha Autônoma (`/trocar-senha`)**: Interface isolada para competidores atualizarem sua senha do DOMjudge.

---

## 🐳 Executando com Docker e Docker Compose

```bash
# 1. Copiar o arquivo de exemplo de ambiente
cp .env.example .env

# 2. Configurar as variáveis no .env
PORT=7070
DOMJUDGE_API_URL=https://coderunner.cin.ufpe.br/api/v4
DOMJUDGE_ADMIN_USER=admin
DOMJUDGE_ADMIN_PASSWORD=sua_senha_admin
WIZARD_ADMIN_LABEL=admin
SESSION_EXPIRATION_DAYS=7

# 3. Subir com Docker Compose
docker compose up -d --build
```

Acesse a plataforma em: `http://localhost:7070`
- Rota de auto-cadastro: `http://localhost:7070/cadastro`
- Rota de troca de senha: `http://localhost:7070/trocar-senha`

---

## 💻 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Compilar frontend
npm run build

# Iniciar servidor Node.js
npm start
```
