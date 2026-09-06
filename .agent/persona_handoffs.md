# Persona Handoff Log

## 🧭 Handoff: web-dev-orchestrator -> Planning & Design
- **Data**: 2026-09-06
- **Decisão Arquitetural Principal**:
  - Abandonar a barra de navegação superior horizontal de 7 abas desconexas.
  - Adotar um **App Shell de Classe Enterprise** com:
    1. **Sidebar Recolhível**: Organizada por domínios de trabalho (*Operação & Avaliação*, *Estúdio de Criação*, *Gestão & Turmas*).
    2. **Global Header**:
       - Context Selector de Contest ativo (sincroniza o contexto de questões e submissões sem exigir que o usuário re-selecione o contest em cada tela).
       - Botão e atalho do **Command Palette (`⌘K`)**.
       - Badge de status de conexão DOMjudge com latência.
       - Perfil do usuário com suas labels ativas e badge de permissão.
    3. **Command Palette (`⌘K`)**:
       - Busca instantânea e atalhos de teclado para navegação veloz.
    4. **Design Tokens Modernos (OKLCH)**:
       - Fim dos tons genéricos de cinza e gradientes pesados.
       - Paleta refinada Obsidian Dark com acentos Luminous Iris/Indigo e feedback visual tátil.
