# Proposal

## Why

Atualmente, o prontuário clínico da clínica armazena anamnese e anotações cronológicas, mas a doutora precisa despender tempo significativo relendo todo o histórico antes de cada atendimento ou ao elaborar laudos clínicos complexos. Além disso, não há uma área dedicada à redação, exportação e compartilhamento do Parecer Conclusivo (laudo final). 

Para cumprir os Desafios 8 e 9 do plano de estágio, mantendo total conformidade com a LGPD e protegendo dados sensíveis de menores, é necessário implementar a sanitização/anonimização obrigatória no servidor antes de qualquer contato com o provedor de IA (Google Gemini 1.5 Flash). O uso da IA deve ser estritamente controlado por um catálogo fechado de prompts no backend para evitar engenharia de prompt inadequada, com capacidade de salvar múltiplos resumos nomeados e transferir diretamente subsídios clínicos para a confecção e emissão (PDF/e-mail) do Parecer Conclusivo.

## What Changes

- **Serviço de Sanitização e Anonimização de Dados Sensíveis (Desafio 8 / RF10 / RNF04)**: Varredura de PII (nome do paciente, nomes dos responsáveis, contatos e documentos) no backend, substituindo por tags genéricas (`[Paciente]`, `[Responsável]`) antes do envio à IA. Nenhum dado identificável é enviado para a API externa.
- **Integração com Google Gemini 1.5 Flash via Chave de Ambiente (Desafio 9 / RF11)**: Utilização exclusiva de variável de ambiente (`GEMINI_API_KEY`) no backend Django, sem exposição no frontend ou repositório.
- **Catálogo Fixo de 4 Prompts no Backend**: A doutora não digita prompts livres; o frontend envia apenas o identificador do prompt desejado:
  1. *Síntese Evolutiva*: Resumo cronológico da linha do tempo, progressos, estagnações e regressões.
  2. *Mapeamento de Gatilhos e Padrões*: Cruzamento de critérios da anamnese (sensibilidade, seletividade, etc.) com notas de sessão para identificar fatores de desregulação.
  3. *Alerta de Pontos Críticos*: Identificação focada em riscos imediatos (picos de agressividade, automutilação, crises agudas, conflitos graves).
  4. *Estruturação para Parecer Conclusivo*: Organização analítica e formal por categorias clínicas para subsidiar o laudo final.
- **Múltiplos Resumos de IA com Título Customizado (RF12 estendido)**: Permitir que a doutora salve múltiplos resumos por paciente, definindo um título/nome descritivo para cada registro salvo no prontuário.
- **Fluxo de Prévia e Decisão da Médica (RF12)**: Prévia do texto gerado exibida em tela com botões para "Salvar no Prontuário", "Descartar" ou "Ir para o Parecer Conclusivo".
- **Módulo de Parecer Conclusivo (RF13 e RF14)**:
  - Redação do Parecer Conclusivo em texto livre pela doutora.
  - Painel de referência em split-screen / side-by-side mantendo o resumo da IA gerado na tela para consulta durante a escrita, permitindo decidir salvá-lo ou não.
  - Exportação do Parecer Conclusivo em formato PDF pronto para impressão.
  - Funcionalidade de envio do Parecer Conclusivo por e-mail com anexo.

## Capabilities

### New Capabilities
- `clinical-ai-assistant`: Sanitização e anonimização de PII no backend, catálogo imutável de prompts clínicos, integração com a API Gemini 1.5 Flash, exibição de prévia e persistência de múltiplos resumos com título personalizado pela doutora.
- `conclusive-report`: Criação, edição e persistência do Parecer Conclusivo em texto livre, exportação em PDF, disparo por e-mail e visualização referencial integrada ao rascunho gerado pela IA.

### Modified Capabilities
- *(nenhuma)* – as capacidades existentes (`patient-record`, `agenda-management`, etc.) continuam intactas; as novas funcionalidades estendem o fluxo em módulos especializados.

## Impact

- **Backend (Django)**:
  - Nova dependência no `requirements.txt`: biblioteca de integração com o Gemini (`google-genai` ou `google-generativeai`) e utilitário para geração de PDF (`reportlab` ou `weasyprint`).
  - Nova entidade `ResumoIa` (suporte a múltiplos registros por paciente e título personalizado) e entidade `ParecerConclusivo` em `apps.prontuario`.
  - Serviço `sanitizer.py` para detecção e substituição de dados sensíveis antes da chamada externa.
  - Serviço `gemini_service.py` com dicionário fixo de prompts e leitura da `GEMINI_API_KEY`.
  - Endpoints REST dedicados para geração de resumo, persistência de resumos, CRUD de Parecer Conclusivo, download de PDF e envio de e-mail.
- **Frontend (React)**:
  - Nova aba ou seção no prontuário: "Apoio de IA", com seletor dos 4 prompts fixos, loading state e modal/painel de prévia com campo para nomear o resumo.
  - Nova tela/área de "Parecer Conclusivo" com editor de texto livre, botões de imprimir/baixar PDF e enviar por e-mail, além de gaveta/painel lateral exibindo o rascunho de IA para referência direta.
- **Segurança & LGPD**:
  - Validação estrita de RBAC (`IsDoctorOrAdmin`): bloqueio total de secretárias a resumos de IA e pareceres (retorno 403 Forbidden).
  - Garantia de não vazamento de PII nos payloads externos.
