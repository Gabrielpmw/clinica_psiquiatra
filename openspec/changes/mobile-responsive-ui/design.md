# Design

## Context

O front-end do projeto é uma SPA React com Vite, estilizada com Tailwind CSS e usando `lucide-react` para ícones. O layout atual é composto por:

- **`Sidebar`** (`w-64` fixo, `h-screen sticky top-0`) — componente compartilhado em todas as páginas autenticadas. Renderiza sempre visível, independente do tamanho da tela.
- **Páginas** (`DashboardPage`, `PatientsPage`, `AgendaPage`, `ProntuarioPage`) — cada uma monta a estrutura `flex h-screen` com `<Sidebar>` + área `flex-1`, sem qualquer variação por breakpoint.
- **Modais** (`PatientFormModal`, `SessionFormModal`, `BloqueioModal`, `ProfileModal`) — usam `fixed inset-0 z-50 flex items-center justify-center p-4`, com caixa interna de largura fixa (`max-w-2xl`), geralmente compatível com telas grandes.
- **LoginPage** — já parcialmente responsiva: painel esquerdo com `hidden lg:flex` e logo mobile com `lg:hidden`. O formulário usa `max-w-md` centralizado, mas o wrapper pode apresentar overflow horizontal em telas muito estreitas.

Nenhuma biblioteca de UI de terceiros (como Material UI ou Chakra) está em uso. O Tailwind configurado inclui os breakpoints padrão: `sm` (640px), `md` (768px), `lg` (1024px).

## Goals / Non-Goals

**Goals:**
- Tornar a `Sidebar` um drawer off-canvas em mobile (`< md`), com botão hambúrguer no header e backdrop escuro clicável para fechar.
- Adaptar os headers de cada página para exibir o botão hambúrguer no mobile, compactando ou omitindo elementos secundários (breadcrumb, seletor de paciente).
- Garantir que todos os modais funcionem corretamente no mobile: largura fluida com margens de segurança, rolagem interna vertical e botões de ação acessíveis.
- Adaptar grids e tabelas para exibição vertical empilhada (single-column) no mobile.
- Priorizar visão diária (`DayView`) na `AgendaPage` em viewports móveis, com layout de barra de ações que caiba em telas estreitas sem overflow.
- Adaptar `ProntuarioPage` para empilhar as seções verticalmente no mobile.

**Non-Goals:**
- Nenhuma alteração de back-end, API ou modelos de banco de dados.
- Nenhuma nova biblioteca de terceiros (sem instalar `headlessui`, `shadcn`, `radix`, etc.).
- Não redesenhar a identidade visual (paleta de cores, tipografia, design tokens) existente.
- Não alterar comportamento em desktop (telas `>= md`): a sidebar permanece exatamente como hoje.
- Não implementar PWA, notificações push ou outros recursos nativos mobile.

## Decisions

### D1: Drawer off-canvas via estado React no Sidebar + prop de controle no header

**Decisão**: Transformar `Sidebar` para aceitar props `isOpen` e `onClose` e renderizar como gaveta sobreposta (`fixed inset-y-0 left-0 z-40 translate-x-...`) no mobile, e continuar como `sticky` no desktop. O controle de estado (`sidebarOpen`) fica na página-raiz compartilhada — ou introduzir um wrapper de layout reutilizável (`AppLayout`).

**Alternativa considerada**: Criar um contexto global `SidebarContext`. Rejeitado por ser mais pesado do que necessário; o estado é local a cada página e a passagem de prop é mais simples.

**Alternativa considerada**: Usar um componente de Drawer de biblioteca como `@headlessui/react Dialog`. Rejeitado para não adicionar dependências externas.

**Implementação preferida**: Criar um componente wrapper `AppLayout` que contenha a lógica de `sidebarOpen`, renderize a `Sidebar` e o botão hambúrguer no header, recebendo `children` como conteúdo da página. Todas as páginas autenticadas passam a usar `<AppLayout activePage="...">` em vez de incluírem `<Sidebar>` individualmente. Isso elimina duplicação e centraliza a lógica de drawer.

### D2: Tailwind breakpoint `md` (768px) como divisor mobile/desktop

**Decisão**: O breakpoint `md` (768px) é o limiar. Abaixo dele: sidebar oculta, hambúrguer visível, layouts de coluna única, modais full-width. Acima: comportamento atual.

**Alternativa considerada**: Usar `sm` (640px) como divisor. Rejeitado porque tablets (768px) devem ter a sidebar visível e aproveitar melhor o espaço horizontal.

### D3: Modais com `mx-4 sm:mx-auto` e `max-h-[90dvh] overflow-y-auto`

**Decisão**: Todos os modais recebem `w-full max-w-lg sm:max-w-2xl mx-4 sm:mx-auto` para a caixa interna, e `max-h-[90dvh] overflow-y-auto` no container de corpo do modal. Usar `dvh` (dynamic viewport height) para evitar problemas com a barra de endereços retrátil do Safari iOS.

**Alternativa considerada**: Modais em sheet de bottom sheet (deslizando de baixo). Rejeitado para manter consistência com a experiência desktop e não exigir animações CSS extras.

### D4: Tabelas com `overflow-x-auto` no container pai

**Decisão**: Envolver toda tabela de dados em `<div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">` para permitir rolagem horizontal suave no mobile sem quebrar o layout externo. As tabelas de pacientes e usuários permanecem em formato tabular (não card) para preservar densidade de informação.

**Alternativa considerada**: Converter tabelas em cards no mobile. Descartado como alteração de segunda fase por exigir mais reestruturação de JSX e possivelmente confundir usuários que alternam frequentemente entre dispositivos.

### D5: `AgendaPage` força `viewMode = 'dia'` ao entrar no mobile

**Decisão**: Em viewports móveis, o modo `semana` (`WeekView`) tem 7 colunas e dificilmente cabe. A barra de ações de Dia/Semana/Hoje/Data será empilhada em duas linhas (`flex-wrap`) no mobile. A tela iniciará sempre em modo `dia` em mobile (detectado via `window.innerWidth < 768` no `useEffect` de inicialização).

### D6: `ProntuarioPage` usa abas já existentes para organização mobile

**Decisão**: A `ProntuarioPage` já implementa abas (`abaAtiva`: `prontuario` | `ia` | `parecer`). No mobile, as abas permanecem no topo mas o header com seletor de paciente é compactado (texto truncado, `select` com `max-w-[160px]`). A área de conteúdo empilha naturalmente ao rolar.

## Risks / Trade-offs

- **[Risco] Regressão visual em desktop** → Mitigação: usar prefixos Tailwind (`md:` para desktop) em vez de media queries inline; testar em desktop após cada componente alterado.
- **[Risco] `AppLayout` introduz refatoração em todas as páginas** → Mitigação: a alteração é mecânica (substituição de `<Sidebar>` + header por `<AppLayout>`). Cada página pode ser migrada independentemente.
- **[Risco] `dvh` não suportado em navegadores muito antigos** → Mitigação: usar `max-h-[90dvh]` com fallback `max-h-[90vh]` via CSS duplo ou substituir apenas por `90vh` (diferença mínima na prática).
- **[Trade-off] Tabelas com rolagem horizontal em vez de cards** → Usuário precisa rolar lateralmente para ver todas as colunas em telas estreitas. Aceitável na primeira versão; cards podem ser adicionados na iteração seguinte.

## Migration Plan

1. Criar `AppLayout.jsx` em `frontend/src/components/`.
2. Atualizar `Sidebar.jsx` para suportar `isOpen/onClose` e renderizar como drawer no mobile.
3. Substituir `<Sidebar>` + header inline em `DashboardPage`, `PatientsPage`, `AgendaPage`, `ProntuarioPage` por `<AppLayout>`.
4. Ajustar todos os modais com as classes responsivas definidas (D3).
5. Ajustar tabelas com containers de overflow (D4).
6. Ajustar `AgendaPage` para modo `dia` padrão no mobile (D5).
7. Ajustar `ProntuarioPage` header para mobile (D6).
8. Verificar `LoginPage` para garantir ausência de overflow horizontal em telas muito estreitas (< 360px).

Rollback: todas as alterações são no front-end. Reverter por `git revert` ou desfazendo os arquivos modificados. Nenhuma migração de banco ou dado necessária.
