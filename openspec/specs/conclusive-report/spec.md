# conclusive-report Specification

## Purpose

Gerencia a elaboração, consulta, exportação em PDF e envio por e-mail do Parecer Conclusivo do paciente, integrando painel de referência para rascunhos gerados pela IA.

## Requirements

### Requirement: Redação de Parecer Conclusivo em Texto Livre
O sistema DEVE disponibilizar uma área dedicada à redação e edição do Parecer Conclusivo (laudo final) do paciente em texto livre, isolada das anotações cotidianas de sessão (RF13). O parecer DEVE conter corpo do texto, data de emissão e histórico de atualização associados ao paciente.

#### Scenario: Doutora redige e salva Parecer Conclusivo
- **WHEN** a doutora insere o laudo clínico no campo de texto livre e aciona "Salvar Parecer"
- **THEN** o sistema armazena o documento vinculado ao paciente com a data atual e disponibiliza as opções de exportação

#### Scenario: Doutora atualiza parecer existente
- **WHEN** a doutora modifica o texto de um parecer previamente registrado e confirma a edição
- **THEN** o sistema atualiza o conteúdo mantendo o registro cronológico atualizado

### Requirement: Painel de Referência com Subsídios de IA
O sistema DEVE disponibilizar uma visualização integrada (painel de referência ou visualização lado a lado) na tela de redação do Parecer Conclusivo quando a usuária for direcionada pelo fluxo do prompt "Estruturação para Parecer Conclusivo". O resumo gerado pela IA DEVE permanecer visível para consulta enquanto a doutora redige o texto final, permitindo que ela decida salvar ou não aquele resumo no histórico de resumos.

#### Scenario: Redação com apoio de rascunho da IA
- **WHEN** a doutora acessa a tela de Parecer originada do prompt de IA para parecer
- **THEN** a tela exibe o texto gerado pela IA em painel lateral de consulta e mantém o campo de edição do Parecer Conclusivo focado para digitação

#### Scenario: Decisão de salvar ou descartar rascunho de IA durante redação
- **WHEN** a doutora está utilizando o painel de referência da IA
- **THEN** o sistema disponibiliza botão para salvar aquele rascunho no banco de resumos com um nome, ou simplesmente fechá-lo sem salvar

### Requirement: Exportação do Parecer Conclusivo em PDF
O sistema DEVE permitir a geração e download do Parecer Conclusivo em documento PDF formatado e padronizado (RF14). O PDF DEVE conter o cabeçalho padrão da clínica, identificação do paciente, texto integral do parecer redigido pela profissional, data de emissão e linha de assinatura para a médica.

#### Scenario: Doutora solicita impressão/download em PDF
- **WHEN** a doutora aciona a opção "Exportar PDF" ou "Imprimir Parecer"
- **THEN** o sistema gera o arquivo PDF correspondente e inicia o download ou abre a janela nativa de impressão

### Requirement: Envio do Parecer Conclusivo por E-mail
O sistema DEVE fornecer funcionalidade para enviar o Parecer Conclusivo por e-mail. O modal de envio DEVE sugerir como destinatário padrão o e-mail do responsável legal cadastrado (se disponível) e permitir à doutora confirmar ou alterar o endereço antes do disparo.

#### Scenario: Envio de laudo por e-mail com sucesso
- **WHEN** a doutora aciona "Enviar por E-mail", confirma o destinatário e clica em enviar
- **THEN** o backend despacha a mensagem contendo o parecer em PDF ou em corpo de mensagem seguro e exibe notificação de confirmação

#### Scenario: Tentativa de envio com e-mail inválido
- **WHEN** a doutora tenta enviar para um formato de e-mail inválido
- **THEN** o sistema impede o disparo e exibe mensagem de validação orientando a correção

### Requirement: Bloqueio de Acesso por Perfil (RBAC)
O acesso à criação, edição, visualização, exportação em PDF e envio por e-mail do Parecer Conclusivo DEVE ser exclusivo de profissionais autorizadas (Doutora e Administrador). Usuários com perfil de Secretária DEVEM ter seu acesso sumariamente bloqueado com HTTP 403 Forbidden (RF08, RNF03).

#### Scenario: Secretária tenta acessar endpoint ou tela de parecer
- **WHEN** um usuário autenticado com perfil de Secretária requisita qualquer rota de parecer conclusivo
- **THEN** o sistema retorna status HTTP 403 Forbidden e impede a visualização das informações clínicas
