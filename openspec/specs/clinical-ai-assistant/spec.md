# clinical-ai-assistant Specification

## Purpose

Fornece assistência clínica baseada em inteligência artificial (Google Gemini 1.5 Flash) com anonimização obrigatória prévia, catálogo engessado de prompts no backend e persistência de múltiplos resumos clínicos nomeados pela doutora.

## Requirements

### Requirement: Sanitização Prévia de Dados Sensíveis (LGPD)
O sistema DEVE executar obrigatoriamente a sanitização e anonimização de dados no servidor (backend) antes de qualquer transmissão de texto clínico para a API da IA. O mecanismo DEVE varrer o texto de anotações e anamnese substituindo o nome do paciente por `[Paciente]`, nomes de responsáveis por `[Responsável]`, além de mascarar CPFs, telefones e e-mails eventualmente contidos no texto livre. Nenhum dado pessoal identificável (PII) DEVE ser repassado ao provedor externo (RF10, RNF04).

#### Scenario: Envio de notas com nome do paciente e responsável
- **WHEN** a doutora solicita a geração de resumo para um paciente cujo prontuário cita o nome da criança e de seus responsáveis
- **THEN** o payload enviado à API da IA contém apenas as marcações `[Paciente]` e `[Responsável]`, sem os nomes reais

#### Scenario: Tentativa de envio com dados já sanitizados
- **WHEN** o texto clínico não contém ocorrências de dados identificáveis diretos
- **THEN** o sistema mantém a estrutura íntegra das anotações e prossegue com a chamada ao serviço de IA

### Requirement: Catálogo Rígido de Prompts Clínicos no Backend
O sistema DEVE implementar um catálogo imutável de 4 prompts no backend, proibindo que a usuária envie comandos ou instruções livres à IA (RF11). O frontend DEVE enviar exclusivamente o identificador numérico (1 a 4) do prompt desejado:
1. **Síntese Evolutiva**: Linha do tempo, progressos, estagnações e regressões.
2. **Mapeamento de Gatilhos e Padrões**: Cruzamento da anamnese com sessões para identificar gatilhos sensoriais e rotineiros.
3. **Alerta de Pontos Críticos**: Extração de riscos imediatos (agressividade, crises, conflitos, intercorrências).
4. **Estruturação para Parecer Conclusivo**: Organização analítica e formal para embasamento do laudo final.

#### Scenario: Seleção de prompt válido
- **WHEN** a doutora seleciona no frontend o prompt "Síntese Evolutiva" (código 1)
- **THEN** o backend processa as anotações do paciente exclusivamente com a instrução do prompt 1 e aciona a IA

#### Scenario: Envio de prompt inválido ou manipulado
- **WHEN** uma requisição é enviada com código de prompt diferente de 1, 2, 3 ou 4
- **THEN** o backend rejeita a solicitação com erro 400 Bad Request informando que o identificador de prompt é inválido

### Requirement: Prévia do Resumo com Ações de Decisão
O sistema DEVE exibir a resposta gerada pela IA em um painel/modal de prévia, apresentando feedback de carregamento (*loading state*) durante o processamento. A doutora DEVE ter opções claras para:
- Descartar o conteúdo (sem persistência no banco);
- Salvar no prontuário (com definição de título);
- No caso do prompt 4, utilizar o resumo como referência para redação do Parecer Conclusivo.

#### Scenario: Doutora descarta prévia gerada
- **WHEN** a doutora visualiza o resumo gerado na tela de prévia e clica em "Descartar"
- **THEN** o modal é fechado e nenhum registro é inserido no banco de dados

#### Scenario: Doutora prossegue para o Parecer a partir do prompt 4
- **WHEN** a doutora gera o resumo do prompt 4 ("Estruturação para Parecer Conclusivo") e clica em "Ir para o Parecer Conclusivo"
- **THEN** o sistema direciona a navegação para a tela de Parecer Conclusivo mantendo o texto gerado pela IA visível em painel de referência

### Requirement: Persistência de Múltiplos Resumos com Título Customizado
O sistema DEVE permitir o armazenamento de múltiplos resumos de IA para um mesmo paciente. Ao confirmar o salvamento de um resumo, a doutora DEVE informar um título/nome identificador para a anotação, que será persistida junto com o conteúdo gerado, a identificação do prompt utilizado e o timestamp de geração.

#### Scenario: Doutora salva resumo com título personalizado
- **WHEN** a doutora preenche o título "Resumo Semestral - Evolução Verbal" e confirma o salvamento da prévia
- **THEN** o sistema persiste o novo registro de resumo vinculado ao paciente com o título informado

#### Scenario: Consulta ao histórico de resumos de IA
- **WHEN** a doutora acessa a listagem de resumos de IA do paciente
- **THEN** o sistema exibe todos os resumos previamente salvos com seus respectivos títulos, datas de criação e conteúdo completo

### Requirement: Bloqueio de Acesso por Perfil (RBAC)
O sistema DEVE restringir todas as operações de geração, consulta e salvamento de resumos de IA exclusivamente para usuários com perfil de Doutora (ou Administrador). Usuários com perfil de Secretária DEVEM ter seu acesso bloqueado com código HTTP 403 Forbidden (RF08, RNF03).

#### Scenario: Secretária tenta acessar endpoint de IA
- **WHEN** uma requisição autenticada com perfil de Secretária tenta acessar qualquer endpoint de IA
- **THEN** o servidor rejeita a requisição imediatamente com código HTTP 403 Forbidden
