# Proposal

## Why

Atualmente, o sistema foi construído com layout rígido voltado para computadores desktop (`desktop-first`), com barra lateral fixa de 256px (`w-64`), tabelas com larguras fixas, modais com dimensões estáticas e grades não empilháveis. Ao acessar o sistema em dispositivos móveis (smartphones), a barra lateral ocupa a maior parte da tela, as janelas modais cortam conteúdos essenciais e as tabelas e botões sofrem overflow horizontal ou quebra estrutural. 

Esta mudança adapta todas as páginas, componentes de navegação, modais e formulários para oferecer uma experiência fluida, ergonômica e responsiva tanto em computadores quanto em dispositivos móveis, sem quebrar os fluxos clínicos existentes.

## What Changes

- **Navegação Responsiva e Menu Hambúrguer (Mobile Drawer)**:
  - Transformação da `Sidebar` fixa: em telas móveis (`< 768px` / `< md`), a barra lateral fica oculta por padrão e se abre como gaveta lateral (*drawer/off-canvas*) deslizante com botão de menu hambúrguer no cabeçalho superior e backdrop/overlay escuro para fechamento por toque.
  - Em telas de desktop (`>= md`), a sidebar permanece visível e fixa como já funciona.
- **Cabeçalho Superior Adaptativo (Header)**:
  - Inclusão do botão de alternância do menu (*hamburger toggle*) em telas móveis.
  - Ajuste na exibição do perfil e breadcrumb em larguras compactas para evitar quebra de linha ou sobreposição.
- **Layouts e Grades Flexíveis (Stacking)**:
  - As grades de formulários e dashboards (`DashboardPage`, `PatientsPage`, `AgendaPage`, `ProntuarioPage`) passam de divisões estáticas de 2 ou 3 colunas para colunas únicas no mobile (`grid-cols-1 md:grid-cols-2 lg:grid-cols-...`).
  - Redução proporcional de paddings externos no container principal (`p-4` no mobile, `sm:p-6`, `lg:p-8` no desktop).
- **Modais e Janelas Flutuantes Responsivos**:
  - Ajuste em todos os modais (`PatientFormModal`, `SessionFormModal`, `ProfileModal`, `BloqueioModal`, modais de redefinição de senha): largura dinâmica (`w-full max-w-lg md:max-w-2xl mx-3 sm:mx-auto`), altura máxima com rolagem interna vertical (`max-h-[90vh] overflow-y-auto`) e botões de ação empilhados ou com toque facilitado.
- **Tabelas e Listas Adaptativas**:
  - Contêineres de tabela com rolagem horizontal suave (`overflow-x-auto`) e indicadores visuais de rolagem, ou conversão para visualização de cartões em listas móveis.
- **Visualização de Agenda e Prontuário em Telas Menores**:
  - Na `AgendaPage`, a alternância entre visão diária e semanal passa a priorizar a visão diária no mobile (`DayView`) com scroll vertical limpo.
  - Na `ProntuarioPage`, as seções de Anamnese, Linha do Tempo e Assistente IA/Parecer são organizadas em abas ou seções empilhadas verticalmente no mobile em vez de colunas concorrentes.

## Capabilities

### New Capabilities
*(Nenhuma nova capacidade necessária; a responsividade expande a casca do sistema existente).*

### Modified Capabilities
- `system-foundation`: Atualiza o requisito de casca da interface web para exigir responsividade multi-dispositivo, adicionando cenários de layout móvel (abertura e fechamento de menu por drawer, modais adaptativos com rolagem interna, e ajuste de grade em telas com largura inferior a 768px).

## Impact

- **Código Afetado**:
  - `frontend/src/components/Sidebar.jsx` (Drawer móvel, backdrop, suporte a controle de estado aberto/fechado).
  - Componente de Topbar / Header (botão hambúrguer, compactação de breadcrumbs e dados do usuário logado).
  - `frontend/src/pages/DashboardPage.jsx` (grade de cadastro e tabela de usuários).
  - `frontend/src/pages/PatientsPage.jsx` e `frontend/src/components/PatientFormModal.jsx` (tabela de pacientes, filtros e modal de cadastro).
  - `frontend/src/pages/AgendaPage.jsx`, `DayView.jsx`, `WeekView.jsx` e modais da agenda (`SessionFormModal.jsx`, `BloqueioModal.jsx`).
  - `frontend/src/pages/ProntuarioPage.jsx` e subcomponentes (`AnamneseBlock.jsx`, `SessionNotesTimeline.jsx`, `AiAssistantSection.jsx`, `ParecerConclusivoSection.jsx`).
- **APIs e Banco de Dados**: Nenhuma alteração de API ou banco de dados; a mudança é estritamente no front-end (React + Tailwind CSS).
- **Dependências**: Nenhuma nova biblioteca necessária; aproveitamento dos ícones `Menu`, `X` do `lucide-react` já instalado e utilitários nativos do Tailwind CSS (`md:`, `sm:`, `hidden`, `block`, etc.).
