# Design: Desafio 08 e 09 — IA, Anonimização e Parecer Conclusivo

## Context

O sistema já possui a gestão de pacientes e prontuário (anamnese estruturada com campo livre e anotações cronológicas de sessão em `apps/prontuario`). Para atender aos Desafios 8 e 9 do plano de estágio, precisamos integrar o Google Gemini 1.5 Flash com segurança LGPD ponta a ponta: sanitização prévia no backend, catálogo engessado de prompts fechados, persistência de múltiplos resumos com títulos definidos pela doutora, além do módulo completo de Parecer Conclusivo com exportação em PDF e envio por e-mail.

## Goals / Non-Goals

**Goals:**
- Implementar serviço de sanitização determinístico no backend antes de qualquer chamada ao Gemini.
- Centralizar o catálogo dos 4 prompts exclusivos no servidor, aceitando apenas códigos numéricos (1 a 4).
- Permitir à doutora visualizar a prévia gerada pela IA, nomear o resumo e salvar múltiplos registros no prontuário.
- Prover transição direta do prompt 4 ("Estruturação para Parecer Conclusivo") para a tela de Parecer Conclusivo, exibindo o rascunho em painel lateral de referência.
- Implementar CRUD do Parecer Conclusivo em texto livre com download em PDF padronizado e funcionalidade de envio por e-mail.
- Garantir isolamento de segurança: `GEMINI_API_KEY` apenas em variáveis de ambiente e perfil Secretária bloqueado em todas as novas rotas (403 Forbidden).

**Non-Goals:**
- Não permitir chat livre ou inserção de prompts customizados pelo usuário.
- Não enviar nenhum dado pessoal identificável (PII) à API do Google Gemini.
- Não utilizar assinaturas digitais ICP-Brasil pesadas no PDF (apenas layout formal com cabeçalho institucional e assinatura profissional).

## Decisions

### Decisão 1: Mecanismo de Sanitização Determinístico no Servidor
- **Opção Escolhida:** Serviço em `apps/prontuario/services/sanitizer.py` que obtém o nome completo e variações dos nomes do paciente e responsáveis cadastrados, aplicando regex insensível a maiúsculas/minúsculas para substituir por `[Paciente]` e `[Responsável]`. Remove também padrões de CPF (`\d{3}\.\d{3}\.\d{3}-\d{2}`), telefones e e-mails.
- **Alternativas Consideradas:** Bibliotecas de NLP completas (ex.: Microsoft Presidio ou SpaCy). Descartadas por demandarem modelos pesados (centenas de MBs em memória) para uma VPS pequena, enquanto o sanitizador determinístico baseado nos dados do cadastro resolve com exatidão o escopo do MVP.

### Decisão 2: Catálogo Fixo de Prompts Clínicos no Backend
- **Opção Escolhida:** Dicionário imutável no backend (`apps/prontuario/services/prompt_catalog.py`):
  1. `SINTESE_EVOLUTIVA`: foca na linha do tempo, progressão de marcos e regressões.
  2. `GATILHOS_E_PADROES`: cruza anamnese (sensibilidade, seletividade, rotina) com relatos de sessões.
  3. `PONTOS_CRITICOS`: destaca situações agudas, crises e riscos imediatos.
  4. `ESTRUTURACAO_PARECER`: estrutura os achados em formato formal/técnico agrupado para servir de base ao laudo.
- **Rationale:** Impede que o usuário execute prompt injection, altere o comportamento da IA ou faça uso indevido da API médica.

### Decisão 3: Modelagem de Dados em `apps.prontuario`
- **Model `ResumoIa`:**
  - `id`: UUID v4
  - `paciente`: ForeignKey para `pacientes.Paciente`
  - `titulo`: CharField(max_length=150) (definido pela doutora ao salvar)
  - `prompt_tipo`: PositiveSmallIntegerField(choices=[1, 2, 3, 4])
  - `conteudoGerado`: TextField
  - `dataGeracao`: DateTimeField(auto_now_add=True)
- **Model `ParecerConclusivo`:**
  - `id`: UUID v4
  - `paciente`: ForeignKey para `pacientes.Paciente`
  - `corpoTexto`: TextField
  - `dataEmissao`: DateTimeField(auto_now_add=True)
  - `dataUltimaAtualizacao`: DateTimeField(auto_now=True)

### Decisão 4: Geração de PDF com ReportLab
- **Opção Escolhida:** Utilizar a biblioteca `reportlab` no backend para geração do PDF do Parecer Conclusivo em memória (`BytesIO`).
- **Rationale:** Biblioteca pure-python madura, que não necessita de pacotes extras do sistema operacional (ao contrário de WeasyPrint que requer Pango/Cairo e bibliotecas C).

### Decisão 5: Envio de E-mail via Django Mail com Fallback
- **Opção Escolhida:** Utilizar `EmailMessage` do Django. Em ambiente de desenvolvimento, utiliza o `console.EmailBackend` exibindo o e-mail no console, permitindo teste imediato sem necessidade de credenciais SMTP reais.

### Decisão 6: Interface de Apoio e Painel de Referência
- **Opção Escolhida:** Na tela do Prontuário, aba ou seção "Apoio de IA" com cards descritivos para os 4 prompts, botão de geração, modal de prévia com campo de título e ações. Se o prompt for o 4 ("Estruturação para Parecer Conclusivo"), a doutora tem o botão "Ir para o Parecer Conclusivo", abrindo a tela de parecer com split-screen: à direita o rascunho de IA (com opção de salvá-lo ou fechá-lo) e à esquerda o editor de texto livre do Parecer Conclusivo.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| Paciente citado no texto por apelido não cadastrado | O sanitizador foca nos nomes cadastrados; incluir aviso visual para a doutora no prontuário reforçando o uso do nome formal nas anotações de sessão |
| Latência da API do Gemini (2 a 5 segundos) | Implementação de loading spinner explícito no frontend com mensagem explicativa e bloqueio de botão para evitar envios duplicados |
| Falha no envio de e-mail por bloqueio de porta SMTP | Tratamento com try/except no backend retornando mensagem de erro clara sem derrubar a aplicação |
| Secretária tentar chamar endpoints de IA ou Parecer | Permissão `IsDoctorOrAdmin` aplicada em todas as Views, retornando 403 Forbidden automaticamente |
