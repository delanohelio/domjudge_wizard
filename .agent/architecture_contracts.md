# Architecture Contracts & Shared Specifications (DOMjudge Edu)

## 1. Mapeamento de Domínio Educacional

| Conceito DOMjudge | Tradução para Plataforma Edu | Descrição / Papel no Sistema |
|---|---|---|
| `Contest` | **Lista de Exercícios** | Uma lista prática com prazo de entrega (deadline) e conjunto de problemas para a turma resolver. |
| `Team` | **Aluno / Matrícula** | Cada aluno possui seu próprio perfil isolado onde submete os códigos individualmente. |
| `Scoreboard` | **Painel de Entregas & Progresso** | Visão do professor sobre quantos exercícios cada aluno concluiu e quais questões geraram mais dúvidas. |
| `Submission / Judgement` | **Tentativa / Avaliação Automática** | O código submetido pelo aluno e a resposta imediata do juiz (AC, WA, TLE, etc.). |
| `Problem` | **Exercício Prático** | Enunciado com contextualização, restrições, exemplos comentados e casos de teste. |
| `Access Code` | **Código de Inscrição da Turma** | Chave distribuída pelo professor para que os alunos façam auto-cadastro direto na turma. |
| `Team Label` | **Turma & Período Letivo** | Identificador de turma (ex.: `turma-a`, `2026.1`, `algoritmos`). |

---

## 2. Workspaces da Plataforma Educacional

```
DOMjudge Edu Studio
├── 🎓 PEDAGÓGICO & CORREÇÃO
│   ├── 📊 Acompanhamento de Entregas  (Taxa de conclusão por aluno, estatísticas de erros)
│   ├── 🔍 Inspeção de Submissões      (Código do aluno, diff com gabarito, evolução)
│   └── 📋 Listas de Exercícios        (Prazos de entrega, status aberta/encerrada)
│
├── ✍️ ELABORAÇÃO DE QUESTÕES
│   └── 📝 Studio de Exercícios        (Markdown, KaTeX, testes de exemplo e pacote ZIP/PDF)
│
├── 👥 TURMAS & ACADEMIA
│   ├── 🎫 Códigos de Inscrição        (Links de auto-cadastro por turma com labels)
│   ├── 👥 Alunos Matriculados         (Roster da turma, e-mails, status)
│   └── 🛡️ Permissões & Papéis         (Professor, Monitor, Aluno via labels)
│
└── 👤 MINHA CONTA
    ├── 🔑 Trocar Senha
    └── 🔌 Status do Servidor
```

---

## 3. Contratos de Estado Educacional

1. **Contexto Ativo (Header Global)**:
   - `activeContestId` (Lista de Exercícios selecionada, ex: *"Lista 01 - Estruturas de Dados"*).
   - `activeClassFilter` (Turma filtrada, ex: *"Turma A - 2026.1"*).
2. **URL State**:
   - `?lista=...&turma=...&aluno=...&questao=...`
   - Permite ao professor enviar um link direto para o monitor: *"Veja o código do aluno X na questão B"*.
3. **Command Palette (`⌘K`)**:
   - Busca rápida por: Nome do Aluno, Nome da Questão, Lista de Exercícios, Ação rápida (Ex: *"Criar Código para Nova Turma"*).
