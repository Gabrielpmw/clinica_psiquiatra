# Tasks

## 1. Dependências e Infraestrutura Backend

- [x] 1.1 Adicionar `google-genai` (ou SDK oficial do Gemini) e `reportlab` em `backend/requirements.txt` e verificar instalação no ambiente virtual
- [x] 1.2 Configurar leitura segura de `GEMINI_API_KEY` e definir backend de e-mail (com fallback `console.EmailBackend`) em `backend/core/settings.py`

## 2. Desafio 8: Serviço de Sanitização e Anonimização (LGPD)

- [x] 2.1 Implementar `apps/prontuario/services/sanitizer.py` para substituir nomes de paciente e responsáveis por tags genéricas e mascarar documentos/contatos
- [x] 2.2 Criar testes unitários em `apps/prontuario/tests_sanitizer.py` e verificar aprovação com `python manage.py test apps.prontuario`

## 3. Desafio 9: Catálogo de Prompts, Integração com Gemini e Persistência de Resumos

- [x] 3.1 Criar catálogo imutável dos 4 prompts clínicos em `apps/prontuario/services/prompt_catalog.py` mapeados por código numérico (1 a 4)
- [x] 3.2 Criar serviço de integração com a API Gemini em `apps/prontuario/services/gemini_service.py` que consome as notas sanitizadas e o prompt selecionado
- [x] 3.3 Adicionar model `ResumoIa` (suporte a múltiplos registros, título customizado e prompt_tipo) em `apps/prontuario/models.py`, gerar e aplicar migrações
- [x] 3.4 Implementar serializers e endpoints REST em `apps/prontuario/` para geração de prévia (`POST .../ia/gerar/`), salvamento (`POST .../ia/resumos/`) e histórico (`GET .../ia/resumos/`) com permissão `IsDoctorOrAdmin`
- [x] 3.5 Criar testes de integração da API de IA e verificar que o perfil Secretária recebe 403 Forbidden

## 4. Módulo de Parecer Conclusivo, PDF e E-mail

- [x] 4.1 Adicionar model `ParecerConclusivo` em `apps/prontuario/models.py`, criar serializers e endpoints de CRUD
- [x] 4.2 Implementar gerador de PDF padronizado com cabeçalho institucional em `apps/prontuario/services/pdf_generator.py` e rota para download
- [x] 4.3 Implementar funcionalidade de envio do Parecer Conclusivo em PDF por e-mail em `apps/prontuario/services/email_service.py` e endpoint correspondente
- [x] 4.4 Criar testes para CRUD de parecer, emissão de PDF e proteção de acesso por perfil

## 5. Interface Front-end: Apoio de IA no Prontuário

- [x] 5.1 Criar componente de seleção de prompts da IA na tela do Prontuário com os 4 cards descritivos e indicador de loading durante a chamada
- [x] 5.2 Criar modal de prévia da IA com campo para nomear o resumo, botões para "Salvar no Prontuário", "Descartar" e, no prompt 4, ação "Ir para o Parecer Conclusivo"
- [x] 5.3 Implementar componente de histórico de resumos de IA salvos exibindo título, data e opção de expansão do conteúdo

## 6. Interface Front-end: Parecer Conclusivo e Painel de Referência

- [x] 6.1 Criar tela/aba de Parecer Conclusivo com editor em texto livre, botões de ação e feedback visual
- [x] 6.2 Integrar painel de referência lateral (split-view) exibindo o rascunho de IA (do prompt 4) ao lado do editor do parecer com opções de salvá-lo ou descartá-lo
- [x] 6.3 Implementar ações de download/impressão de PDF e modal de envio de e-mail com preenchimento sugerido do responsável legal

## 7. Verificação Integrada e Homologação

- [x] 7.1 Executar testes ponta a ponta no backend (`python manage.py test`) e validar no frontend o fluxo completo com dados simulados
- [x] 7.2 Verificar conformidade LGPD garantindo que nenhuma requisição externa contenha nomes ou dados reais dos pacientes
