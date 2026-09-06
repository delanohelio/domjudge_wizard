# Project State & Execution Pipeline

- **Project Name**: DOMjudge Edu Platform (Ambiente Educacional de Juiz Online & Listas de Exercícios)
- **Contexto Central**: Plataforma educacional para ensino prático de programação. Cada *contest* representa uma **Lista de Exercícios** com prazo de entrega, e cada *team* representa um **Aluno individual** realizando suas tarefas e recebendo correções automatizadas.
- **Current Phase**: `PHASE_1_DISCOVERY` (Refined with Educational Domain)
- **Active Persona**: `web-dev-orchestrator`
- **Last Updated**: 2026-09-06 19:05

## 🎯 Project Goals & Scope (Foco Educacional)
1. **Ressignificação do Domínio (Juiz Educacional vs Competição)**:
   - `Contest` ➔ **Lista de Exercícios / Atividade Prática** (com prazo de entrega / deadline).
   - `Team` ➔ **Aluno Individual** (um usuário, uma equipe isolada para submissões).
   - `Scoreboard` ➔ **Painel de Acompanhamento & Conclusão de Tarefas** (progresso da turma).
   - `Review` ➔ **Correção Pedagógica & Análise de Dificuldades** (ver código, histórico de erros WA/TLE, comparar com gabarito).
   - `Access Codes` ➔ **Códigos de Inscrição da Turma** (ex: `ALGO-2026.1`, `PROG2-TURMA-B`).
   - `Labels` ➔ **Turmas, Semestres e Papéis Acadêmicos** (ex: `turma-a`, `2026.1`, `monitor`, `professor`).
2. **App Shell & Workspaces Pedagógicos**:
   - **🎓 Acompanhamento & Correção**: Visão por Lista, Visão por Aluno (taxa de conclusão da lista), Replay de Aprendizado do Aluno e Comparador de Soluções.
   - **✍️ Elaboração de Exercícios**: Markdown Studio com KaTeX, formatação de enunciados acadêmicos, testes de exemplo explicados, testes ocultos e exportação para PDF da lista.
   - **📋 Gestão de Listas de Exercícios**: Prazos de entrega (deadlines), liberação de listas para turmas específicas, status (Aberta, Fechada, Agendada).
   - **👥 Turmas & Alunos**: Códigos de convite por turma com auto-cadastro em 1 link, gerenciamento de matrículas e papéis (Professor, Monitor, Aluno).
3. **Experiência do Aluno**:
   - Onboarding simples e acolhedor (`/cadastro?codigo=TURMA`), portal direto para suas listas e troca de senha.

## 📋 Phase Progress Tracker
- [x] **Phase 1: Discovery & Scope (Educacional)**
  - [x] Alinhamento conceitual: Juiz online para listas de exercícios de alunos.
  - [x] Mapeamento de terminologias e fluxos acadêmicos.
- [x] **Phase 2: Product Design & Design System** (`web-app-designer`)
  - [x] Tokens OKLCH voltados para clareza didática e superfícies dark obsidian com alto contraste.
  - [x] Layout com Sidebar recolhível: Menu dividido em *Pedagógico & Correção*, *Elaboração de Conteúdo*, *Gestão Acadêmica*, *Minha Conta*.
  - [x] Componentes de métricas educacionais: Alunos na Turma, Taxa de Conclusão da Lista, Submissões Avaliadas.
- [x] **Phase 3: Architecture & Contracts** (`senior-backend-dev` & `senior-frontend-dev`)
  - [x] Contexto global de Lista Ativa e Turma Ativa (`ContestContext.tsx`).
  - [x] Command Palette global (`CommandPalette.tsx`) ativado por `⌘K`.
  - [x] Contratos de visualização de progresso do aluno por exercício e por aluno.
- [x] **Phase 4: Phased Implementation**
  - [x] `AppSidebar`, `AppHeader`, `CommandPalette`, `layout.css`.
  - [x] Atualização de `ReviewView` com métricas pedagógicas e modal de inspeção com diff.
  - [x] Atualização de `ContestManagerView` para gestão de listas de exercícios e sincronização global.
  - [x] Atualização de `CreatorView` com Modelos Didáticos Prontos (KaTeX) e vínculo com a lista ativa.
  - [x] Fluxo de matrícula por link com código (`/cadastro?codigo=TURMA-2026-1`).
- [x] **Phase 5: Quality Gate & Review**
  - [x] Compilação TypeScript com zero erros (`npm run build`).
  - [x] Validação visual ponta a ponta com subagente de navegação no browser.
