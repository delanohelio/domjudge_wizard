# DOMjudge Wizard ⚡

Uma suíte web moderna, rápida e de alta usabilidade (**Single Page Application**) para professores, jurados e administradores do **DOMjudge**.

---

## 🚀 Principais Recursos

1. **🔒 Conexão e Autenticação Centralizada**:
   - Gate de acesso inicial com validação direta na API do DOMjudge (`/api/v4`).
   - Suporte a **auto-login e pré-configuração via variáveis de ambiente** (`.env` ou Docker).
   - Opção de persistência segura das credenciais no navegador com expiração automática parametrizada (padrão de 7 dias).
   - Sessão compartilhada automaticamente entre todos os 4 módulos da suíte.
   - Botão no cabeçalho (*"Trocar Conexão"*) para alterar usuário ou servidor a qualquer momento.

2. **📊 Visualização & Review de Submissões (`#review`)**:
   - Carregamento de contests, questões, submissões e código-fonte direto da API.
   - 5 modos de visualização: *Por Questão*, *Por Estudante*, *Por Contest*, *Aluno por Vez* (com atalhos `←` e `→` no teclado) e *Resumo Geral*.
   - Comparação visual imediata entre a resposta correta (*Accepted*) e as demais tentativas dos estudantes.
   - Visualizador de código-fonte integrado com realce de sintaxe (*Highlight.js*) e botão de cópia rápida.
   - Exportação de dados para CSV.

3. **✍️ Criador de Questões com Markdown Studio (`#creator`)**:
   - **Markdown Studio Integrado**:
     - Barra de ferramentas com formatação rápida (Títulos `#`, Negrito, Itálico, Código, Equações Matemáticas KaTeX inline `$O(N)$` e bloco `$$\sum$$`, Tabelas e Template ICPC/OBI).
     - **Split View em Tempo Real**: Editor de um lado e Preview renderizado do outro.
     - Botão inteligente *"Inserir Tabela de Exemplos"*: gera automaticamente a tabela Markdown de Entrada/Saída com base nos Casos de Teste (*Samples*) cadastrados!
     - Suporte a atalhos de teclado (`Ctrl+B`, `Ctrl+I`, indentação com `Tab`).
   - **Gerenciador de Testes**: Cadastro de testes *Sample* (públicos) e *Secret* (ocultos) com duplicação e exclusão.
   - **Importação/Exportação**: Importação de arquivos ZIP existentes, download de PDF formatado, geração de pacote ZIP padrão DOMjudge (`problem.yaml`, `domjudge-problem.ini`, `problem.pdf`, `data/sample`, `data/secret`) e upload direto para a API.

4. **🏆 Gerenciador de Contests (`#contests`)**:
   - Cards de métricas (Total, Ativos, Agendados, Alterações Pendentes).
   - Busca em tempo real e filtros por status e alterações.
   - Edição rápida inline de horário de início, horário de fim e status habilitado/desabilitado.
   - Aplicação de horários e status em massa com escopo personalizável (página atual ou filtrados).
   - Botão de salvamento em lote via API com feedback visual das linhas modificadas.

5. **👥 Gerenciador de Usuários e Times (`#users`)**:
   - Dashboard com KPIs (Usuários Totais, Ativos, Categorias, Times).
   - Tabela com ordenação em todas as colunas, seleção múltipla por checkbox e paginação.
   - **Criação Individual**: Formulário completo com atribuição de Teams e roles (*team*, *jury*, *admin*).
   - **Criação em Lote (CSV/TSV)**: Campo de texto com **tabela de preview em tempo real** dos dados parseados antes de submeter!
   - Aplicação de categoria, labels e status em lote.
   - Exportação da listagem de usuários para CSV.

---

## 🐳 Executando com Docker e Docker Compose

Você pode subir a aplicação rapidamente com **Docker Compose** e passar credenciais e configurações através de variáveis de ambiente no arquivo `.env`.

### 1. Criar o arquivo `.env`
Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

Edite o `.env` com suas configurações desejadas:
```ini
PORT=7070
DOMJUDGE_API_BASE=https://coderunner.cin.ufpe.br/api/v4
DOMJUDGE_API_USER=seu_usuario
DOMJUDGE_API_PASSWORD=sua_senha
STORAGE_EXPIRATION_DAYS=7
```

> **Dica para Localhost**: Ao preencher `DOMJUDGE_API_USER` e `DOMJUDGE_API_PASSWORD` no `.env`, o sistema conecta automaticamente na inicialização, eliminando a necessidade de digitar credenciais na interface!

### 2. Subir o container
```bash
docker compose up -d --build
```

Acesse em: `http://localhost:7070`

---

## 💻 Como Executar Sem Docker

Como a aplicação é uma Single Page Application pura (HTML5, Vanilla CSS e JavaScript moderno), você também pode servi-la com qualquer servidor HTTP estático:

```bash
# Opção 1: Usando Python 3
python3 -m http.server 8080

# Opção 2: Usando Node.js (npx serve)
npx serve . -l 8080
```
