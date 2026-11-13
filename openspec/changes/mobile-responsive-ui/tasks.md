# Tasks

## 1. Componente AppLayout (Wrapper de Layout Responsivo)

- [x] 1.1 Criar `frontend/src/components/AppLayout.jsx` com estado `sidebarOpen` (booleano, inicia `false`), botão hambúrguer (`Menu`/`X` do `lucide-react`) visível apenas em mobile (`md:hidden`), backdrop escuro clicável para fechar e slot de `children` para o conteúdo da página — verificar que ao abrir o drawer em viewport < 768px a sidebar aparece sobre o conteúdo e ao clicar no backdrop ela fecha.
- [x] 1.2 Atualizar `frontend/src/components/Sidebar.jsx` para aceitar props `isOpen` (boolean) e `onClose` (função) e renderizar em mobile como `fixed inset-y-0 left-0 z-40 w-64 transition-transform transform` com `translate-x-0` quando `isOpen` ou `-translate-x-full` quando fechado, mantendo o comportamento `sticky` em `md:` — verificar que em desktop a sidebar continua visível e fixa sem nenhuma alteração visual.
- [x] 1.3 Garantir que ao navegar para qualquer item do menu no drawer mobile o `onClose` é chamado e a gaveta fecha — verificar clicando em cada item de menu no viewport mobile simulado.

## 2. Migração das Páginas para AppLayout

- [x] 2.1 Substituir `<Sidebar activePage="inicio" />` e o `<header>` inline de `DashboardPage.jsx` por `<AppLayout activePage="inicio">`, movendo o conteúdo de breadcrumb e perfil para slots internos do `AppLayout` ou mantendo-os como `children` imediatos — verificar que a página Dashboard renderiza corretamente em desktop e mobile, sem duplicação de header.
- [x] 2.2 Substituir `<Sidebar activePage="pacientes" />` e header de `PatientsPage.jsx` por `<AppLayout activePage="pacientes">` — verificar em mobile que o botão hambúrguer aparece e o menu abre/fecha corretamente.
- [x] 2.3 Substituir `<Sidebar activePage="agenda" />` e header de `AgendaPage.jsx` por `<AppLayout activePage="agenda">` — verificar em mobile.
- [x] 2.4 Substituir `<Sidebar activePage="prontuario" />` e header de `ProntuarioPage.jsx` por `<AppLayout activePage="prontuario">` — verificar em mobile, incluindo que o seletor de troca de paciente continua acessível (compactado com `max-w-[160px] truncate`).

## 3. Responsividade dos Modais

- [x] 3.1 Atualizar `PatientFormModal.jsx`: mudar a caixa interna de `max-w-2xl` para `w-full max-w-lg sm:max-w-2xl mx-4 sm:mx-auto` e o container do corpo do modal para `max-h-[90vh] overflow-y-auto` — verificar em mobile que o modal não ultrapassa a tela, os campos são acessíveis por scroll e os botões "Salvar" e "Cancelar" estão visíveis sem necessidade de scroll.
- [x] 3.2 Atualizar `SessionFormModal.jsx` (Agenda) com as mesmas classes responsivas de modal (`w-full max-w-lg sm:max-w-xl mx-4 sm:mx-auto`, `max-h-[90vh] overflow-y-auto`) — verificar em mobile.
- [x] 3.3 Atualizar `BloqueioModal.jsx` com classes responsivas de modal — verificar em mobile.
- [x] 3.4 Atualizar `ProfileModal.jsx` com classes responsivas de modal (`w-full max-w-sm sm:max-w-md mx-4 sm:mx-auto`, `max-h-[90vh] overflow-y-auto`) — verificar que alteração de senha e dados de perfil são acessíveis em mobile.
- [x] 3.5 Verificar os modais de redefinição de senha embutidos em `DashboardPage.jsx` (admin reset e solicitação) e aplicar restrições de largura mobile — verificar que nenhum modal transborda horizontalmente em tela de 375px de largura.

## 4. Tabelas e Listas Adaptativas

- [x] 4.1 Envolver a tabela de pacientes em `PatientsPage.jsx` em `<div className="overflow-x-auto">` e reduzir padding externo para `p-4 sm:p-6 lg:p-8` — verificar que em mobile a tabela pode ser rolada horizontalmente sem quebrar o layout da página.
- [x] 4.2 Envolver a tabela de usuários cadastrados em `DashboardPage.jsx` em `<div className="overflow-x-auto">` — verificar em mobile.
- [x] 4.3 Converter o grid de formulário + tabela em `DashboardPage.jsx` de `lg:grid-cols-5` para `grid-cols-1 lg:grid-cols-5` — verificar que em mobile o formulário de cadastro aparece acima da tabela em coluna única.

## 5. Agenda Responsiva

- [x] 5.1 Em `AgendaPage.jsx`, adicionar `useEffect` que detecta `window.innerWidth < 768` ao montar e define `setViewMode('dia')` — verificar que ao abrir a agenda em viewport mobile o modo padrão é "Dia" e não "Semana".
- [x] 5.2 Ajustar a barra de ações da agenda (`flex flex-wrap`) para que os grupos de controles (toggle Dia/Semana, navegação de datas, botões de ação) empilhem naturalmente em duas linhas em mobile sem overflow horizontal — verificar em 375px de largura.
- [x] 5.3 Reduzir padding interno da área central de `p-8` para `p-4 sm:p-6 lg:p-8` em `AgendaPage.jsx` — verificar que o conteúdo não está colado às bordas da tela em mobile.

## 6. Prontuário Responsivo

- [x] 6.1 Em `ProntuarioPage.jsx`, ajustar o header para mobile: adicionar `truncate` e `max-w-[160px]` ao `<select>` de troca de paciente, ocultar o label "Trocar Paciente:" em telas pequenas (`hidden sm:inline`) e reduzir padding do header de `px-8` para `px-4 sm:px-8` — verificar em mobile que o nome do paciente e o seletor são visíveis sem overflow.
- [x] 6.2 Ajustar padding da área rolável do prontuário de `p-8` para `p-4 sm:p-6 lg:p-8` — verificar que o conteúdo tem margem adequada em mobile.
- [x] 6.3 Verificar que os subcomponentes `AnamneseBlock.jsx`, `SessionNotesTimeline.jsx`, `AiAssistantSection.jsx` e `ParecerConclusivoSection.jsx` não possuem larguras fixas (`w-[NNNpx]`) que causem overflow horizontal — corrigir qualquer ocorrência substituindo por `w-full max-w-[NNNpx]` — verificar em mobile.

## 7. LoginPage e Verificação Final

- [x] 7.1 Verificar `LoginPage.jsx` em 320px de largura: garantir que o wrapper externo usa `min-h-screen` sem `overflow-x` indevido e que o card de login usa `px-4 sm:px-8` — corrigir se houver overflow horizontal — verificar em viewport 320×568px.
- [ ] 7.2 Testar fluxo completo em mobile: login → dashboard → abrir menu → navegar para pacientes → abrir modal de cadastro → fechar modal → navegar para agenda → abrir modal de sessão → navegar para prontuário — verificar que nenhuma tela apresenta barra de rolagem horizontal ou conteúdo cortado.
- [ ] 7.3 Testar fluxo completo em desktop (1280px): login → dashboard → todas as páginas — verificar que nenhuma regressão visual foi introduzida, especialmente que a sidebar permanece visível e fixa e que os grids continuam com múltiplas colunas.
