# Spec Delta

## MODIFIED Requirements

### Requirement: Casca Inicial da Interface Web e Tela de Acesso
O front-end da aplicação SHALL renderizar a casca desktop e a tela de login exibindo o nome e a especialidade corretos da clínica:
- **Nome da clínica**: "Clínica Apoio — Marília Sávia" (título principal)
- **Especialidade**: "Neuropsicopedagogia clínica e psicopedagogia clínica" (subtítulo)

Esses textos devem aparecer em toda superfície da interface que identifica a clínica: painel esquerdo da tela de login (desktop), versão mobile do cabeçalho de login e menu lateral (Sidebar).

#### Scenario: Visualização da tela de login inicial
- **WHEN** o usuário acessar a rota raiz da aplicação no navegador desktop
- **THEN** o sistema deve renderizar a tela de login com paleta de cores teal/slate, campos para e-mail e senha, e botão de ação primária sem travar ou acusar erros de console.

#### Scenario: Visualização da tela de login no desktop
- **WHEN** o usuário acessa a rota raiz da aplicação em um navegador desktop
- **THEN** o painel esquerdo verde deve exibir "Clínica Apoio — Marília Sávia" como título e "Neuropsicopedagogia clínica e psicopedagogia clínica" como subtítulo

#### Scenario: Visualização da tela de login no mobile
- **WHEN** o usuário acessa a rota raiz da aplicação em um dispositivo móvel
- **THEN** o cabeçalho mobile deve exibir "Clínica Apoio — Marília Sávia" sem o painel lateral

#### Scenario: Identificação da clínica no menu lateral
- **WHEN** um usuário autenticado acessa qualquer página do sistema
- **THEN** o menu lateral (Sidebar) deve exibir "Clínica Apoio" como título e "Neuropsicopedagogia clínica e psicopedagogia clínica" como subtítulo
