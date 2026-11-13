# Spec Delta

## MODIFIED Requirements

### Requirement: Casca Inicial da Interface Web e Tela de Acesso
The front-end application SHALL render a responsive multi-device shell styled according to the clinic's design system using React and Tailwind CSS, adapting its layout seamlessly across desktop and mobile screens (smartphones and tablets), while preserving access to authentication, system navigation, and clinical workflows.

#### Scenario: Visualização da tela de login inicial em desktop e dispositivos móveis
- **WHEN** o usuário acessar a rota raiz da aplicação em qualquer tamanho de tela (desktop ou smartphone)
- **THEN** o sistema deve renderizar a tela de login perfeitamente centralizada e contida na tela, com campos de e-mail e senha ajustados à largura da viewport sem barra de rolagem horizontal indesejada.

#### Scenario: Adaptação da estrutura de tela para larguras móveis
- **WHEN** a largura da janela for inferior a 768 pixels (breakpoint mobile)
- **THEN** a barra lateral de navegação fixa deve ser ocultada da tela principal para maximizar a área de trabalho clínica, exibindo um botão de menu no cabeçalho superior.

## ADDED Requirements

### Requirement: Navegação e Gaveta Responsiva em Dispositivos Móveis
The front-end application SHALL provide an off-canvas drawer navigation mechanism on viewports smaller than 768px, triggered by a hamburger menu button and dismissible via backdrop touch, route navigation, or close button.

#### Scenario: Abertura do menu lateral em smartphone
- **WHEN** o usuário tocar no botão de menu (hambúrguer) no cabeçalho em dispositivo móvel
- **THEN** a gaveta de navegação deve deslizar suavemente sobre o conteúdo com um fundo semitransparente (backdrop), apresentando todas as opções de navegação pertinentes ao papel do usuário e seu perfil.

#### Scenario: Fechamento da gaveta de navegação
- **WHEN** o usuário tocar no botão de fechar, tocar no fundo escurecido (backdrop) ou selecionar um item de navegação
- **THEN** a gaveta deve se fechar automaticamente e restaurar o foco e visão da página selecionada.

### Requirement: Janelas Modais e Formulários Adaptáveis à Tela
The front-end application SHALL present modal dialogs, forms, and clinical timelines with responsive constraints, ensuring that dialog containers never exceed 95% of mobile viewport width and provide dedicated internal vertical scrolling without truncating action buttons or form fields.

#### Scenario: Interação com modais clínicos em smartphone
- **WHEN** qualquer modal for aberto em viewport móvel (cadastro de paciente, agendamento de sessão, perfil ou redefinição de senha)
- **THEN** a janela deve ocupar a largura disponível respeitando margens de segurança, manter os botões de ação (salvar/cancelar) visíveis e acessíveis por toque, e habilitar rolagem vertical interna caso o formulário ultrapasse a altura da tela.

#### Scenario: Exibição de tabelas de dados em telas estreitas
- **WHEN** tabelas de listagem (pacientes, usuários cadastrados, agenda) forem visualizadas em telas com largura reduzida
- **THEN** o contêiner deve permitir rolagem horizontal suave ou empilhamento em cartões sem quebrar o layout da página externa.
