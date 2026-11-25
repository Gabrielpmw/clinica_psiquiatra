"""
Gerador determinístico de bloqueios, sessões longitudinais e anotações clínicas elaboradas
para o comando `popular_dados`.

Garante:
- Sessões espalhadas equilibradamente por toda a semana (segunda a sexta) em todas as semanas,
  de ~7 semanas atrás até 15 de dezembro do ano corrente (inclusive).
- Mínimo de 8 sessões por paciente (8 a 10 por paciente nos 12 perfis clínicos).
- Ausência de sobreposição de horários entre sessões ativas e bloqueios.
- Anotações clínicas estruturadas, ricas e longitudinais em cada sessão realizada.
"""

from collections import Counter
from datetime import date, datetime, time, timedelta
from django.utils import timezone
from apps.agenda.models import Sessao

MORNING_SLOTS = [(8, 0), (9, 0), (10, 0), (11, 0)]
AFTERNOON_SLOTS = [(14, 0), (15, 0), (16, 0), (17, 0)]


def build_bloqueios_data(today: date, cutoff_date: date, tz):
    """Retorna bloqueios de agenda distribuídos entre hoje e a data limite (15/12)."""
    candidates = [
        (today, (12, 0), (13, 30), "Intervalo para almoço e discussão com equipe multidisciplinar"),
        (date(cutoff_date.year, 12, 2), (12, 0), (13, 0), "Reunião de Alinhamento Multidisciplinar Escolar"),
        (date(cutoff_date.year, 12, 4), (12, 0), (13, 30), "Participação em Fórum Clínico de Neuropsicopedagogia"),
        (date(cutoff_date.year, 12, 8), (8, 0), (9, 0), "Supervisão Clínica Institucional e Discussão de Casos"),
        (date(cutoff_date.year, 12, 14), (12, 0), (13, 30), "Reunião com Coordenação Pedagógica e Devolutiva Escolar"),
    ]
    bloqueios = []
    for d, ini, fim, motivo in candidates:
        if d > cutoff_date or d < today:
            continue
        dt_ini = timezone.make_aware(datetime.combine(d, time(*ini)), tz)
        dt_fim = timezone.make_aware(datetime.combine(d, time(*fim)), tz)
        bloqueios.append({
            "inicio_dt": dt_ini,
            "fim_dt": dt_fim,
            "motivo": motivo,
        })
    return bloqueios


def _overlaps(a_ini, a_fim, b_ini, b_fim) -> bool:
    return a_ini < b_fim and b_ini < a_fim


def _iter_weekdays(start_date: date, end_date: date):
    cur = start_date
    while cur <= end_date:
        if cur.weekday() < 5:
            yield cur
        cur += timedelta(days=1)


def _find_slot_on_date(
    target_date: date,
    preferred_slots: list,
    occupied_intervals: list,
    bloqueio_intervals: list,
    now,
    expect_future: bool,
):
    """Tenta alocar um horário de 50 minutos livre exatamente em `target_date`."""
    if target_date.weekday() >= 5:
        return None
    tz = timezone.get_current_timezone()
    for hour, minute in preferred_slots:
        dt_ini = timezone.make_aware(datetime.combine(target_date, time(hour, minute)), tz)
        dt_fim = dt_ini + timedelta(minutes=50)
        if expect_future and dt_ini < now + timedelta(minutes=15):
            continue
        if not expect_future and dt_fim > now:
            continue
        if any(_overlaps(dt_ini, dt_fim, b_ini, b_fim) for b_ini, b_fim in bloqueio_intervals):
            continue
        if any(_overlaps(dt_ini, dt_fim, o_ini, o_fim) for o_ini, o_fim in occupied_intervals):
            continue
        return dt_ini, dt_fim
    return None


def _pick_balanced_day(
    candidate_days: list,
    patient_used_dates: set,
    day_counts: Counter,
    preferred_slots: list,
    occupied_intervals: list,
    bloqueio_intervals: list,
    now,
    expect_future: bool,
):
    """
    Escolhe o dia útil mais equilibrado dentro de `candidate_days` (priorizando dias ainda pouco
    ocupados na semana e evitando sessões no mesmo dia ou em dias consecutivos do mesmo paciente).
    """
    def _rank_days(min_gap_days: int):
        eligible = []
        for d in candidate_days:
            if d in patient_used_dates:
                continue
            if any(abs((d - prev).days) < min_gap_days for prev in patient_used_dates):
                continue
            eligible.append(d)
        # Ordena pelo menor número de sessões já agendadas naquele dia (espalha Seg–Sex)
        eligible.sort(key=lambda d: (day_counts[d], d))
        return eligible

    for gap in (3, 2, 1):
        for d in _rank_days(gap):
            slot = _find_slot_on_date(
                d, preferred_slots, occupied_intervals, bloqueio_intervals, now, expect_future
            )
            if slot is not None:
                return d, slot
    raise RuntimeError(f"Sem horário disponível nos dias candidatos: {candidate_days[:3]}...")


PATIENT_HISTORIES = [
    {
        "paciente": "Lucas Silva Mendes",
        "preferred_slots": MORNING_SLOTS + AFTERNOON_SLOTS,
        "past_notes": [
            (
                "AVALIATIVA",
                True,
                "Contexto inicial: Primeira consulta de acolhimento psiquiátrico e levantamento clínico infantil após encaminhamento escolar por rigidez comportamental e restrição de interação com pares.\n"
                "Observação em sessão: A criança entrou na sala explorando inicialmente os cantos sem buscar contato visual imediato. Quando convidada a conhecer o material lúdico, demonstrou repertório verbal avançado e interesse restrito acentuado por mapas estelares e planetas do sistema solar, discorrendo sobre órbitas por cerca de quinze minutos sem perceber sinais de mudança de turno conversacional.\n"
                "Análise clínica: Observada dificuldade na reciprocidade socioemocional espontânea e baixa tolerância quando proposta alternância de brinquedo não anunciada previamente. Nega agressividade física ou comportamentos autoagressivos em casa.\n"
                "Condutas e encaminhamentos: Solicitado relatório pedagógico detalhado da escola, avaliação neuropsicológica complementar e diário observacional de gatilhos sensoriais pela família."
            ),
            (
                "AVALIATIVA",
                True,
                "Relato entre encontros: Responsável trouxe questionário sensorial preenchido relatando desconforto severo com etiquetas de camisetas, costuras internas de meias e barulho do sinal do recreio escolar. Sono preservado das 21h30 às 07h00.\n"
                "Observação em sessão: Aplicada testagem observacional estruturada de atenção compartilhada e flexibilidade cognitiva. O paciente conseguiu sustentar troca de turnos em jogo de cartas temáticas quando utilizadas pistas visuais explícitas sobre a ordem das jogadas, mas apresentou inquietação motora e necessidade de tampar os ouvidos brevemente diante de sirene externa na rua.\n"
                "Evolução e atenção: Quadro compatível com hipersensibilidade tátil-auditiva e necessidade elevada de previsibilidade ambiental. Não houve crises graves na semana.\n"
                "Condutas: Orientada retirada prévia de etiquetas das roupas escolares, uso de fone abafador opcional em eventos ruidosos e devolutiva agendada."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato inicial: Realizada devolutiva preliminar com a responsável com apresentação dos achados observacionais e pactuação de plano de intervenção interdisciplinar focado em autorregulação e comunicação social.\n"
                "Observação em sessão: Introduzido painel visual de rotina ('primeiro / depois') para estruturar os momentos de atendimento. O paciente aceitou o combinado visual com notável redução da ansiedade antecipatória, conseguindo concluir duas atividades de encaixe lógico antes de retornar ao tema de astronomia por dez minutos.\n"
                "Evolução longitudinal: Comparado ao primeiro atendimento, observou-se maior permanência na mesma mesa de trabalho e melhora no contato visual funcional durante solicitações diretas.\n"
                "Metas para a semana: Implantar quadro visual semelhante em casa para a rotina matinal antes da saída para a escola."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato escolar e familiar: A escola encaminhou parecer destacando excelente raciocínio lógico-matemático e interesse em ciências, porém tendência ao isolamento no recreio e choro intenso quando a professora altera o cronograma de aulas sem aviso.\n"
                "Observação em sessão: Trabalhadas estratégias lúdicas de resolução de conflitos e leitura de expressões faciais em situações cotidianas. Quando simulado um imprevisto proposital nas regras do jogo de tabuleiro, o paciente inicialmente protestou em tom elevado, mas utilizou a pausa respiratória orientada sem evoluir para crise de desregulação.\n"
                "Pontos de atenção: Manter vigilância quanto à transição entre anos/séries ou troca de professores substitutos.\n"
                "Condutas: Enviada carta técnica com recomendações de previsibilidade visual e avisos prévios de cinco minutos à equipe pedagógica."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Responsável relata melhora expressiva na rotina matinal após adoção do quadro visual doméstico, reduzindo episódios de recusa para vestir o uniforme de cinco para apenas um dia na quinzena. Alimentação segue seletiva para alimentos pastosos, porém mantendo boa ingestão calórica e hídrica.\n"
                "Observação em sessão: O paciente trouxe espontaneamente um desenho feito em casa e compartilhou uma curiosidade sobre satélites perguntando pela primeira vez o que a profissional achava do assunto, sinalizando avanço relevante na reciprocidade.\n"
                "Evolução: Mantém ausência de crises heteroagressivas e resposta progressivamente melhor a combinados visuais.\n"
                "Metas: Ampliar exposição lúdica gradual a novas texturas secas sem pressão durante as refeições."
            ),
            (
                "INTERVENTIVA",
                True,
                "Contexto atual: Última semana antes do período de avaliações escolares de encerramento de bimestre. Família refere leve apreensão antecipatória do paciente com mudança nos horários das provas.\n"
                "Observação em sessão: Sessão dedicada ao treino de flexibilização cognitiva e ensaio comportamental das situações escolares atípicas. O paciente participou de forma colaborativa, conseguiu alternar três jogos escolhidos pela profissional e identificou corretamente sinais corporais iniciais de irritação.\n"
                "Evolução longitudinal: Consolidado ganho consistente de autorregulação em comparação ao início do acompanhamento; episódios de desregulação motora reduziram em frequência e duração.\n"
                "Condutas: Mantido suporte familiar com calendário visual das avaliações de dezembro e reforço positivo ao esforço adaptativo."
            ),
        ],
        "missed": None,
        "future_count": 3,
    },
    {
        "paciente": "Sophia Carvalho Ferreira",
        "preferred_slots": AFTERNOON_SLOTS + MORNING_SLOTS,
        "past_notes": [
            (
                "AVALIATIVA",
                True,
                "Contexto inicial: Atendimento inicial para investigação de oscilações bruscas de humor, baixa tolerância à frustração e ansiedade antecipatória intensa aos domingos à noite diante do retorno às aulas.\n"
                "Observação em sessão: Criança muito comunicativa, articulada e criativa, com vínculo rápido. Contudo, ao errar o contorno de um desenho livre, rasgou a folha imediatamente e demonstrou choro intenso, verbalizando que 'nada ficava bom'.\n"
                "Análise clínica: Notado padrão acentuado de autocrítica precoce e dificuldade de regulação quando exposta à percepção de fracasso ou perda de protagonismo. Sem queixas sensoriais incapacitantes nem sinais de risco físico.\n"
                "Condutas: Orientada a família a acolher o desconforto emocional sem reforçar perfeccionismo e iniciar registro de gatilhos semanais."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Responsável informa que o último domingo apresentou choro antes de dormir por receio de avaliação de leitura na segunda-feira, embora a criança tenha frequentado a aula normalmente no dia seguinte.\n"
                "Observação em sessão: Introduzido o 'termômetro das emoções' em atividade lúdica para diferenciar níveis leves, moderados e intensos de raiva, medo e tristeza. A paciente demonstrou ótima capacidade de nomeação emocional e relacionou sua ansiedade a 'frio na barriga e coração acelerado'.\n"
                "Evolução: Boa adesão às metáforas visuais propostas.\n"
                "Metas: Praticar em casa o registro rápido da 'temperatura emocional' após situações desafiadoras."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Família relata dois episódios de oposição verbal em casa durante tarefas escolares quando solicitada a corrigir erros de caligrafia, porém com resolução mais rápida que no mês anterior.\n"
                "Observação em sessão: Realizado treino lúdico de tolerância à frustração por meio de jogos competitivos de tabuleiro com regras sorteadas. Na primeira rodada em que ficou em segundo lugar, fechou os braços e permaneceu em silêncio por dois minutos; com mediação gentil e uso da respiração guiada, aceitou retomar o jogo até o final.\n"
                "Pontos de atenção: Evitar comparações com colegas ou irmãs em casa.\n"
                "Condutas: Pactuado quadro de combinados positivos focado em cooperação e tentativas."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Grande avanço relatado pela família: implantação de ritual noturno tranquilo aos domingos (preparo prévio da mochila às 18h seguido de leitura compartilhada) reduziu significativamente a ansiedade de domingo à noite.\n"
                "Observação em sessão: Trabalhada identificação de 'pensamentos armadilha' ('se eu errar uma palavra, todos vão rir') e substituição por frases realistas de encorajamento. A paciente criou seu próprio cartão ilustrado de enfrentamento.\n"
                "Evolução longitudinal: Humor mais estável durante os atendimentos, sorridente e participativa.\n"
                "Condutas: Manter rotina estruturada aos domingos e reforçar autonomia na organização dos materiais."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato escolar e familiar: Professora relatou melhora visível na aceitação de rodízio de fila e liderança de grupo em sala de aula, sem episódios de choro na última quinzena.\n"
                "Observação em sessão: Aplicada dinâmica cooperativa de construção em equipe em que a paciente aceitou alternar entre o papel de líder e o de ajudante sem sinais de irritabilidade. Quando uma torre de blocos caiu perto do término, reagiu com bom humor e propôs reconstruir junto.\n"
                "Evolução: Clara evolução na flexibilidade emocional comparada às primeiras sessões.\n"
                "Metas: Generalizar estratégias de pausa respiratória para interações com pares em festas ou eventos sociais."
            ),
            (
                "INTERVENTIVA",
                True,
                "Contexto atual: Acompanhamento consolidado antes das férias de dezembro. Alimentação mantém leve seletividade a folhas cruas, sem prejuízo nutricional, e sono regular.\n"
                "Observação em sessão: Revisão conjunta das conquistas registradas no caderno terapêutico desde outubro. A paciente verbalizou sentir-se mais confiante para lidar com erros escolares e demonstrou autonomia para pedir ajuda antes de ficar irritada.\n"
                "Evolução longitudinal: Redução marcante das crises opositivas em casa e melhora sustentada da ansiedade antecipatória dominical.\n"
                "Condutas: Seguimento programado para acompanhar o fechamento do ano letivo e transição para férias escolares."
            ),
        ],
        "missed": None,
        "future_count": 3,
    },
    {
        "paciente": "Enzo Gabriel Santos",
        "preferred_slots": MORNING_SLOTS + AFTERNOON_SLOTS,
        "past_notes": [
            (
                "AVALIATIVA",
                True,
                "Contexto inicial: Consulta avaliativa psiquiátrica motivada por queixas escolares persistentes de agitação motora intensa, interrupções constantes em aula e perda frequente de cadernos e estojos.\n"
                "Observação em sessão: Adolescente de 11 anos bastante falante, colaborativo, porém com movimentação incessante de pernas na cadeira, manipulação constante de objetos sobre a mesa e mudança abrupta de assunto antes de concluir o raciocínio.\n"
                "Análise clínica: Aplicada escala SNAP-IV com o responsável, evidenciando escores elevados tanto no domínio de desatenção quanto de hiperatividade/impulsividade em dois ambientes. Sono preservado, nega queixas de tristeza ou fobia.\n"
                "Condutas: Solicitado relatório pedagógico detalhado e avaliação complementar de funções executivas."
            ),
            (
                "AVALIATIVA",
                True,
                "Relato entre encontros: Coordenadora escolar confirmou em parecer escrito que o aluno domina o raciocínio oral das matérias, mas deixa questões em branco por desatenção a enunciados longos e precipitação nas respostas.\n"
                "Observação em sessão: Realizadas atividades estruturadas de atenção sustentada, controle inibitório e memória operacional. Em tarefa visual de cancelamento de alvos, executou o início em ritmo acelerado cometendo erros por omissão, melhorando a precisão quando instruído a apontar item por item.\n"
                "Evolução: Dados reforçam prejuízo executivo compatível com perfil combinado em investigação.\n"
                "Condutas: Agendada devolutiva estruturada com a família e construção de estratégias práticas de organização."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato inicial: Sessão de psicoeducação com a família e o paciente explicando de maneira acessível o funcionamento atencional, retirando o estigma de 'preguiça' ou 'falta de esforço'.\n"
                "Observação em sessão: Definido junto ao paciente um checklist visual compacto preso ao estojo escolar e divisão das lições de casa em blocos de 15 minutos seguidos de 5 minutos de pausa ativa. O adolescente participou ativamente sugerindo lembretes no quadro do quarto.\n"
                "Evolução: Excelente engajamento quando incluído nas decisões da própria rotina.\n"
                "Metas: Testar o método de blocos de tempo durante uma semana e registrar quais horários rendem melhor concentração."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Responsável relata que a perda de materiais diminuiu pela metade após adoção da conferência com checklist antes de sair de sala. Ainda apresenta impulsividade verbal em refeições familiares.\n"
                "Observação em sessão: Treino cognitivo da sequência 'Parar – Ler com o dedo – Conferir' aplicado a problemas lógicos e interpretação de texto curto. O paciente obteve acerto pleno em três de quatro blocos ao desacelerar o ritmo inicial, celebrando o resultado.\n"
                "Pontos de atenção: Reforçar pausas para não responder antes do término das perguntas.\n"
                "Condutas: Mantidas orientações escolares de assento nas primeiras fileiras e parcelamento de instruções."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato escolar: Professora relatou melhora visível em trabalho em dupla, com maior disposição para ouvir o colega antes de começar a escrever. Houve apenas uma advertência verbal por conversa paralela na quinzena.\n"
                "Observação em sessão: Paciente compareceu disposto, trouxe boletim parcial positivo e manteve postura sentada mais estável durante os primeiros 35 minutos. Trabalhadas técnicas de auto-monitoramento e organização de mochila para semanas de provas.\n"
                "Evolução longitudinal: Boa aderência às estratégias comportamentais e ganho de autoestima acadêmica.\n"
                "Condutas: Prosseguir acompanhamento de funções executivas até o fechamento letivo."
            ),
            (
                "INTERVENTIVA",
                False,
                "Relato atual: Na última semana houve uma falta por indisposição gástrica leve, já recuperada. Família manteve o uso do checklist diário mesmo nos dias mais corridos.\n"
                "Observação em sessão: Sessão focada em autorregulação comportamental, planejamento semanal em calendário físico e revisão dos aprendizados do bimestre. O adolescente conseguiu manter foco sustentado nas propostas sem precisar de redirecionamentos frequentes.\n"
                "Evolução: Redução objetiva de esquecimentos cotidianos e melhora na conferência de provas.\n"
                "Condutas: Alinhar plano de revisão leve nas duas últimas sessões do ano antes das férias."
            ),
        ],
        "missed": ("FALTA", "INTERVENTIVA"),
        "future_count": 2,
    },
    {
        "paciente": "Laura Beatriz Lima",
        "preferred_slots": AFTERNOON_SLOTS + MORNING_SLOTS,
        "past_notes": [
            (
                "AVALIATIVA",
                True,
                "Contexto inicial: Primeira avaliação em criança em idade pré-escolar devido a rituais rígidos para adormecer, recusa alimentar seletiva (restrita a alimentos de cor clara/bege) e choro intenso no momento do banho.\n"
                "Observação em sessão: A criança permaneceu inicialmente próxima à responsável, observando o consultório. Ao explorar os blocos de madeira, organizou todas as peças em fila estrita por cor e tamanho, demonstrando choro breve quando uma peça foi movida sem aviso.\n"
                "Análise clínica: Hipersensibilidade tátil marcada (incômodo imediato com zíperes e golas) e forte necessidade de invariância ambiental.\n"
                "Condutas: Encaminhada para Terapia Ocupacional com abordagem de Integração Sensorial e solicitada avaliação detalhada da rotina noturna."
            ),
            (
                "AVALIATIVA",
                True,
                "Relato entre encontros: Responsável relata que iniciou o acompanhamento com Terapia Ocupacional e que barulhos de liquidificador ou secador ainda desencadeiam reação de proteção auditiva com fuga do cômodo.\n"
                "Observação em sessão: Avaliada comunicação funcional e jogo simbólico. A criança usa frases completas para solicitar objetos desejados, compreende comandos simples e compartilha sorriso social com a profissional ao brincar com fantoches de animais, embora evite toque direto com texturas ásperas.\n"
                "Evolução: Bom repertório linguístico expressivo preservado.\n"
                "Condutas: Orientada introdução de avisos sonoros previsíveis e ampulheta visual antes do banho e do horário de dormir."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Família implementou sequência visual ilustrada no banheiro e passou a antecipar o banho com ampulheta visual de três minutos, reduzindo significativamente a intensidade dos protestos noturnos.\n"
                "Observação em sessão: Sessão estruturada com estimulação de linguagem expressiva associada à dessensibilização sensorial gradual com materiais secos (areia cinética e grãos grandes). Pela primeira vez, tocou voluntariamente a areia com as pontas dos dedos por cerca de dois minutos.\n"
                "Evolução: Excelente resposta à previsibilidade visual e respeito ao limite sensorial sem imposição.\n"
                "Metas: Repetir brincadeiras táteis breves e lúdicas em casa sem associação com exigência alimentar."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Mantida estabilidade na sequência de sono noturno; houve episódio isolado de desorganização quando precisaram dormir fora de casa no feriado, recuperado após retorno à rotina habitual.\n"
                "Observação em sessão: Atividade lúdica de 'cozinha de mentirinha' utilizando frutas e legumes de brinquedo combinados com aproximação visual de texturas úmidas (massinha macia). A paciente participou da narrativa com os fantoches, demonstrando maior flexibilidade ao aceitar misturar duas cores diferentes.\n"
                "Pontos de atenção: Seletividade alimentar ainda exige abordagem gradual em conjunto com fonoaudiologia/TO.\n"
                "Condutas: Orientada substituição de roupas com zíper por peças de algodão macio sem costura aparente."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Responsável comemora aceitação de duas novas opções de frutas em formato crocante desidratado após trabalho conjunto com integração sensorial. Crises no banho reduziram para ocasionais.\n"
                "Observação em sessão: A criança entrou na sala já buscando o cesto de fantoches e propôs espontaneamente uma brincadeira de faz de conta de consulta veterinária, demonstrando ampliação do jogo simbólico e maior fluidez na interação social.\n"
                "Evolução longitudinal: Progresso claro no vínculo terapêutico, tolerância tátil e adaptação a pequenas variações na sala.\n"
                "Metas: Preparar antecipação visual para a mudança de turma escolar prevista para o próximo ano."
            ),
            (
                "INTERVENTIVA",
                True,
                "Contexto atual: Criança adaptada ao ritmo de atendimento semanal, sono consolidado mantendo os rituais previstos de forma tranquila e sem despertares noturnos.\n"
                "Observação em sessão: Durante os 50 minutos, aceitou alternar entre atividade de desenho livre, encaixe e manipulação de massinha terapêutica mantendo regulação comportamental plena e boa troca comunicativa com a profissional.\n"
                "Evolução longitudinal: Comparada à avaliação inicial, apresenta menor rigidez motora na manipulação de objetos e menor reatividade a ruídos moderados.\n"
                "Condutas: Seguir sessões de acompanhamento de transição até meados de dezembro."
            ),
        ],
        "missed": None,
        "future_count": 3,
    },
    {
        "paciente": "Matheus Henrique Rocha",
        "preferred_slots": AFTERNOON_SLOTS + MORNING_SLOTS,
        "past_notes": [
            (
                "AVALIATIVA",
                True,
                "Contexto inicial: Atendimento inicial de adolescente de 14 anos com queixas de fadiga mental, queda no rendimento escolar no último bimestre, procrastinação intensa e recolhimento prolongado no quarto.\n"
                "Observação em sessão: Compareceu inicialmente acompanhado do pai e depois permaneceu a sós. Postura reservada, tom de voz baixo e afeto discretamente rebaixado, mas estabeleceu bom diálogo quando questionado sobre interesses musicais e jogos eletrônicos.\n"
                "Análise clínica: Identificada inversão parcial do ciclo sono-vigília por uso de computador até após as 02h00, agravando cansaço diurno. Nega categoricamente ideação suicida ou autoagressão.\n"
                "Condutas: Pactuada avaliação semanal de rotina, higiene do sono e alinhamento aberto sem punições excessivas com o responsável."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Adolescente conseguiu antecipar o horário de desligar telas para 23h30 em quatro noites da semana, referindo acordar com menos sonolência nas aulas da manhã.\n"
                "Observação em sessão: Explorado o ciclo da procrastinação ansiosa ('quanto mais acumula, maior a sensação de incapacidade de começar'). Ensinada a regra prática dos 10 minutos para iniciar estudos sem esperar motivação prévia.\n"
                "Evolução: Boa compreensão cognitiva e abertura para testar estratégias concretas.\n"
                "Metas: Aplicar bloco mínimo de 10 minutos em uma disciplina pendente por dia útil."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Paciente trouxe relato de episódio pontual de conflito verbal na escola por considerar injusta a cobrança de um trabalho em grupo, tendo saído da sala para respirar em vez de discutir de modo impulsivo.\n"
                "Observação em sessão: Treino guiado de respiração diafragmática para alívio de sintomas físicos de ansiedade (aperto torácico) e role-play de comunicação assertiva diante de figuras de autoridade escolar.\n"
                "Pontos de atenção: Observar queixas de autocrítica severa comparando-se aos colegas.\n"
                "Condutas: Manter caminhadas ou prática esportiva leve duas vezes por semana com o pai."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Manteve duas caminhadas semanais no parque e cumpriu entregas de três atividades escolares atrasadas utilizando a fragmentação em blocos curtos.\n"
                "Observação em sessão: Humor visivelmente mais reativo e expressivo do que no primeiro mês. O adolescente trouxe lista própria de músicas e comentou sentir menor peso ao abrir os cadernos. Reafirmada ausência de ideação de risco ou automutilação.\n"
                "Evolução longitudinal: Melhora gradual e consistente da vitalidade diurna e da regularidade do sono.\n"
                "Condutas: Cancelamento pontual registrado na semana anterior por compromisso familiar foi remanejado sem prejuízo do vínculo."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Responsável confirma redução do isolamento no quarto nos finais de semana, com maior participação em refeições e conversas familiares.\n"
                "Observação em sessão: Sessão focada em reestruturação cognitiva de pensamentos dicotômicos ('ou faço perfeito ou não vale a pena') e planejamento realista para a reta final do 9º ano.\n"
                "Evolução: Consolidação de hábitos de autocuidado, melhora do humor basal e boa capacidade de autorreflexão.\n"
                "Metas: Sustentar horário regular de sono durante o período final de provas escolares."
            ),
            (
                "INTERVENTIVA",
                False,
                "Contexto atual: Retorno para acompanhamento próximo ao encerramento letivo. Paciente refere leve tensão normal de véspera de provas, porém sem episódios de crise ansiosa ou paralisia acadêmica.\n"
                "Observação em sessão: Revisados sinais precoces de sobrecarga mental para prevenção de recaídas nas férias e discutido equilíbrio saudável entre descanso com telas e atividades presenciais com amigos.\n"
                "Evolução longitudinal: Curva nítida de melhora nos sintomas ansiosos e na funcionalidade acadêmica.\n"
                "Condutas: Manter sessões quinzenais/semanais agendadas até 15 de dezembro para fechamento do semestre."
            ),
        ],
        "missed": ("CANCELADA", "INTERVENTIVA"),
        "future_count": 3,
    },
    {
        "paciente": "Isabella Duarte Nogueira",
        "preferred_slots": MORNING_SLOTS + AFTERNOON_SLOTS,
        "past_notes": [
            (
                "AVALIATIVA",
                True,
                "Contexto inicial: Primeira consulta de acolhimento motivada por perfeccionismo disfuncional, lentidão extrema em provas escolares e sofrimento intenso diante de pequenas rasuras em cadernos.\n"
                "Observação em sessão: Durante desenho livre inicial, a criança solicitou três novas folhas por considerar o primeiro traço assimétrico, demonstrando sudorese leve nas mãos e respiração curta diante do próprio erro.\n"
                "Análise clínica: Presença de rigidez de pontualidade, rituais de conferência repetitiva e ansiedade de desempenho significativa, com preservação intelectual e ótimo vocabulário.\n"
                "Condutas: Orientada a família a não validar checagens excessivas e elogiar o esforço de tentativa em vez do resultado estético."
            ),
            (
                "AVALIATIVA",
                True,
                "Relato entre encontros: Responsável relata que a paciente gasta cerca de três horas diárias em tarefas escolares simples por apagar e reescrever frases repetidas vezes. Seletividade alimentar leve para separação de alimentos no prato mantém-se estável.\n"
                "Observação em sessão: Avaliação neuropsicopedagógica complementar focada em velocidade de processamento e flexibilidade executiva. Observou-se bom desempenho cognitivo global quando retirada a pressão de cronômetro rígido.\n"
                "Evolução: Perfil sugere ansiedade de desempenho elevada sem déficit cognitivo associado.\n"
                "Condutas: Iniciar protocolo lúdico de tolerância ao erro e exposição gradual à imperfeição."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Família iniciou uso de timer visual para delimitar blocos de 20 minutos de lição de casa, diminuindo discussões noturnas.\n"
                "Observação em sessão: Aplicada dinâmica criativa do 'desenho a partir do borrão': a profissional fez um rabisco proposital e a criança foi convidada a transformá-lo em personagem. Inicialmente hesitou por alguns segundos, mas riu ao final e aceitou assinar a folha mesmo com traços irregulares.\n"
                "Evolução: Excelente abertura terapêutica às intervenções lúdicas não punitivas.\n"
                "Metas: Permitir pelo menos uma rasura simples marcada com um 'ok' simbólico por tarefa escolar."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Responsável relata diminuição progressiva do tempo diário de lição de casa de três horas para cerca de uma hora e quinze minutos, com menor choro vespertino.\n"
                "Observação em sessão: Trabalhadas frases de autoinstrução gentil ('um rascunho não precisa estar perfeito para cumprir o objetivo') e simulação de leitura com limite temporal realista. Paciente completou o exercício sem reiniciar a página.\n"
                "Pontos de atenção: Manter atenção às provas bimestrais onde a pressão por tempo aumenta.\n"
                "Condutas: Orientações encaminhadas à escola para estimular foco no conteúdo e não na estética impecável."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Paciente trouxe com orgulho o caderno de ciências mostrando um parágrafo corrigido com um traço simples sem rasgar a folha. Relata menos tensão no trajeto para a escola quanto à pontualidade extrema.\n"
                "Observação em sessão: Sessão dedicada a técnicas práticas de relaxamento pré-prova (respiração quadrada e relaxamento de ombros) associadas a jogos cooperativos em dupla.\n"
                "Evolução longitudinal: Melhora consistente da autoestima, redução de rituais de checagem e humor alegre.\n"
                "Condutas: Manter rotina leve e reforço familiar contínuo."
            ),
            (
                "INTERVENTIVA",
                True,
                "Contexto atual: Acompanhamento positivo durante avaliações do quarto bimestre, sem registro de bloqueio ou entrega de provas em branco.\n"
                "Observação em sessão: A criança relatou ter conseguido finalizar uma redação escolar no tempo estipulado usando estratégia de rascunho rápido ensinada em consultório. Demonstrou segurança emocional e sorriso espontâneo ao descrever sua conquista.\n"
                "Evolução longitudinal: Clara redução da ansiedade de desempenho comparada ao início do seguimento.\n"
                "Condutas: Seguir acompanhando fechamento escolar em dezembro."
            ),
        ],
        "missed": None,
        "future_count": 3,
    },
    {
        "paciente": "Theo Albuquerque Martins",
        "preferred_slots": MORNING_SLOTS + AFTERNOON_SLOTS,
        "past_notes": [
            (
                "AVALIATIVA",
                True,
                "Contexto inicial: Avaliação clínica inicial para investigação diagnóstica diferencial entre TDAH e ansiedade infantil em criança de 9 anos com queixas de inquietação verbal e resistência a encerrar brincadeiras.\n"
                "Observação em sessão: Criança afetuosa, curiosa e comunicativa, apresentando fala rápida, interrupções frequentes da profissional e dificuldade para aguardar a explicação das regras antes de iniciar o jogo.\n"
                "Análise clínica: Boa capacidade de vinculação e ausência de sintomas sensoriais táteis significativos; necessidade elevada de reforço positivo imediato e pistas visuais.\n"
                "Condutas: Orientada família sobre uso de combinados curtos e solicitação de parecer escolar."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Pais observaram melhora pontual quando antecipam o fim do tempo de videogame com aviso prévio de dez minutos, reduzindo birras.\n"
                "Observação em sessão: Realizadas dinâmicas de autocontrole e espera de turnos utilizando 'bastão da fala' lúdico. Nas primeiras rodadas tentou falar junto com a profissional, mas após lembrete visual respondeu adequadamente mantendo a espera por cerca de trinta segundos.\n"
                "Evolução: Boa responsividade a mediadores concretos externos.\n"
                "Metas: Adotar contagem visual regressiva em casa nas transições diárias."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato escolar e familiar: Escola implementou pausas motoras curtas (entrega de avisos ou apagamento do quadro) entre blocos extensos de cópia, resultando em queda de bilhetes disciplinares na agenda.\n"
                "Observação em sessão: Treino de organização atencional em atividade sequencial de montar modelos passo a passo. O paciente conseguiu checar cada etapa concluída antes de pegar novas peças, reduzindo erros por precipitação.\n"
                "Pontos de atenção: Sono preservado; sem ocorrências críticas ou agressividade.\n"
                "Condutas: Manter alinhamento próximo com professora regente."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Na última quinzena houve uma falta pontual por consulta odontológica familiar já justificada. Nas demais semanas manteve boa adesão em casa aos combinados de estudo curto.\n"
                "Observação em sessão: Intervenção focada em regulação emocional diante de encerramentos de tarefas prazerosas. Aceitou guardar os carrinhos após o toque do temporizador visual sem protesto prolongado, escolhendo rapidamente a atividade de transição.\n"
                "Evolução longitudinal: Ganho perceptível no tempo de tolerância à frustração comparado às primeiras sessões.\n"
                "Condutas: Reforçar elogios específicos ao comportamento de autocontrole."
            ),
            (
                "INTERVENTIVA",
                True,
                "Contexto atual: Criança animada com os projetos escolares de encerramento de semestre. Família refere convivência familiar mais leve e menor desgaste verbal nos deveres de casa.\n"
                "Observação em sessão: Prática combinada de respiração calma ('soprar a vela imaginária') seguida de jogo cognitivo de memória visual. O paciente completou todas as etapas sem episódios de desregulação motora e demonstrou orgulho de seu desempenho.\n"
                "Evolução longitudinal: Progresso sustentado no controle inibitório e na espera de turnos.\n"
                "Metas: Dar continuidade ao acompanhamento regular até 15 de dezembro."
            ),
        ],
        "missed": ("FALTA", "INTERVENTIVA"),
        "future_count": 3,
    },
    {
        "paciente": "Alice Fernandes Souza",
        "preferred_slots": AFTERNOON_SLOTS + MORNING_SLOTS,
        "past_notes": [
            (
                "AVALIATIVA",
                True,
                "Contexto inicial: Avaliação clínica de adolescente de 14 anos com histórico de timidez extrema, ansiedade social e fobia de desempenho diante de apresentações orais e mudanças no cronograma de provas.\n"
                "Observação em sessão: Postura inicialmente retraída, ombros tensionados e contato visual discreto, com fala baixa porém coerente e vocabulário rico. Relatou sensação de 'branco mental' e rubor facial intenso ao ser chamada pelo nome em sala.\n"
                "Análise clínica: Prejuízo social restrito a situações de exposição avaliativa; boa qualidade de vínculo com familiares e amigas próximas em ambiente reservado. Nega humor deprimido grave ou risco.\n"
                "Condutas: Mapeamento conjunto dos contextos temidos para construção gradual de hierarquia de exposição."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Paciente anotou situações da semana que geraram maior apreensão, destacando desconforto em sala barulhenta com iluminação fluorescente intensa durante simulados.\n"
                "Observação em sessão: Construída hierarquia graduada de dez passos para enfrentamento em contexto escolar, combinando exposição imaginária com reestruturação de pensamentos catastróficos sobre julgamento dos colegas.\n"
                "Evolução: Excelente insight clínico e motivação genuína para superar limitações acadêmicas.\n"
                "Metas: Testar o primeiro degrau da escada (fazer uma pergunta simples à professora no fim da aula)."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Cumpriu o desafio proposto falando com a professora em particular ao término da aula, notando que a resposta foi acolhedora e bem menos ameaçadora do que antecipava.\n"
                "Observação em sessão: Treinadas técnicas discretas de ancoragem sensorial (5-4-3-2-1 tátil) e postura corporal aberta para uso em sala antes de chamadas orais ou mudanças súbitas de cronograma escolar.\n"
                "Evolução: Redução inicial do comportamento de evitação escolar.\n"
                "Condutas: Alinhar suporte discreto da coordenação pedagógica para permitir fala em duplas antes de apresentações individuais."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato marcante: Vitória clínica importante na semana: a paciente apresentou um trabalho em grupo diante da turma com apoio prévio da professora orientadora, utilizando suas anotações e respiração de ancoragem sem precisar sair da sala.\n"
                "Observação em sessão: Processamento positivo da experiência, revisando a discrepância entre a expectativa catastrófica prévia e o resultado real satisfatório obtido.\n"
                "Evolução longitudinal: Aumento expressivo da autoconfiança e redução de sintomas autonômicos antecipatórios.\n"
                "Metas: Avançar para o próximo degrau participando de atividade extracurricular em pequeno grupo."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Participou de oficina escolar em pequeno grupo no contraturno escolar permanecendo até o término sem crise de ansiedade ou queixas somáticas.\n"
                "Observação em sessão: Sessão focada em prevenção de recaídas de evitação social e consolidação de estratégias assertivas para lidar com imprevistos de agenda no encerramento do 7º ano.\n"
                "Evolução: Discurso mais fluente, tom de voz firme e contato visual sustentado com naturalidade.\n"
                "Condutas: Seguir monitoramento nas últimas semanas de aula."
            ),
            (
                "INTERVENTIVA",
                True,
                "Contexto atual: Período de avaliações finais com boa qualidade de sono, alimentação regular e ausência de faltas escolares por mal-estar ansioso.\n"
                "Observação em sessão: Revisados ganhos acumulados ao longo das sessões e planejadas metas sociais leves para o período de férias escolares visando manter o repertório de exposição adquirido.\n"
                "Evolução longitudinal: Resposta terapêutica consistente e funcionalmente relevante.\n"
                "Condutas: Manter acompanhamento programado até meados de dezembro."
            ),
        ],
        "missed": None,
        "future_count": 2,
    },
    {
        "paciente": "Pedro Lucas Guimarães",
        "preferred_slots": MORNING_SLOTS + AFTERNOON_SLOTS,
        "past_notes": [
            (
                "AVALIATIVA",
                True,
                "Contexto inicial: Consulta de acolhimento e acompanhamento psiquiátrico de adolescente no 2º ano do Ensino Médio com quadro de humor depressivo e sintomas ansiosos após mudanças escolares, em seguimento conjunto com psicoterapia externa.\n"
                "Observação em sessão: Apresentou-se educado, cooperativo, com afeto discretamente entristecido e lentificação psicomotora leve ao relatar perda de interesse por atividades antes prazerosas.\n"
                "Análise clínica: Sem alterações sensoriais ou seletividade alimentar; sono fragmentado na madrugada. Questionado ativamente sobre segurança clínica: nega ideação suicida atual, planos ou comportamentos autoagressivos.\n"
                "Condutas: Estabelecer plano de ativação comportamental gradual e manter comunicação coordenada com psicoterapia externa e família."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Responsável informa que o jovem tem aceitado passeios breves fora de casa no fim de semana quando convidado com antecedência, embora ainda passe parte da tarde isolado.\n"
                "Observação em sessão: Mapeamento dos horários de maior queda energética e pactuação de micro-metas de ativação diária (exposição à luz solar matinal por 15 minutos e retomada de sessões curtas de desenho técnico).\n"
                "Evolução: Mantém vínculo terapêutico sólido e ausência de ideias de desesperança aguda.\n"
                "Metas: Registrar diariamente em escala de 0 a 10 energia e qualidade do sono."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Melhora discreta porém contínua da regularidade do sono após ajuste do horário de deitar para antes das 23h00 e redução de cafeína vespertina.\n"
                "Observação em sessão: Sessão matinal estruturada de treino de atenção sustentada e memória operacional voltada ao planejamento semanal de estudos do Ensino Médio sem sobrecarga cognitiva.\n"
                "Pontos de atenção: Monitorar pressão acadêmica próxima ao fechamento do ano letivo.\n"
                "Condutas: Reforçar alternância entre blocos de estudo e pausas restauradoras."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Retomou o hábito de desenhar duas vezes na semana e aceitou convite de dois colegas próximos para assistir a um filme no fim de semana, relatando sensação genuína de bem-estar.\n"
                "Observação em sessão: Humor visivelmente mais modulável, sorriso espontâneo presente durante a conversa sobre projetos de arte. Confirmada persistência da negação de risco autoagressivo.\n"
                "Evolução longitudinal: Recuperação progressiva de anedonia e aumento da iniciativa social.\n"
                "Condutas: Valorizar conquistas graduais junto à família sem cobranças bruscas de performance."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Simulados escolares realizados com cansaço esperado porém sem bloqueio emocional. Sono contínuo de aproximadamente sete horas e meia por noite.\n"
                "Observação em sessão: Trabalhadas estratégias de autogestão emocional e limites saudáveis perante demandas escolares acumuladas, identificando sinais precoces de retração caso o estresse aumente.\n"
                "Evolução: Estabilidade clínica satisfatória e boa adesão ao plano conjunto.\n"
                "Metas: Definir rotina estruturada de lazer e descanso para dezembro."
            ),
            (
                "INTERVENTIVA",
                True,
                "Contexto atual: Acompanhamento longitudinal positivo na reta final do ano escolar, mantendo parceria ativa com psicoterapia externa.\n"
                "Observação em sessão: Paciente trouxe caderno de esboços artísticos demonstrando retomada clara do prazer criativo e verbalizou planos concretos e otimistas para o próximo ano letivo.\n"
                "Evolução longitudinal: Remissão gradual dos sintomas de retração social e melhora sustentada da energia diurna.\n"
                "Condutas: Consolidar plano de prevenção de recaídas nas próximas sessões de dezembro."
            ),
        ],
        "missed": None,
        "future_count": 3,
    },
    {
        "paciente": "Manuela Costa Ribeiro",
        "preferred_slots": AFTERNOON_SLOTS + MORNING_SLOTS,
        "past_notes": [
            (
                "AVALIATIVA",
                True,
                "Contexto inicial: Primeira avaliação psiquiátrica infantil motivada por atraso expressivo de linguagem funcional, marcha esporádica na ponta dos pés e seletividade alimentar severa em idade pré-escolar.\n"
                "Observação em sessão: Criança observadora que se dirigiu rapidamente às rodas de um carrinho giratório, mantendo contato visual fugaz e utilizando a mão da responsável como instrumento para alcançar objetos no alto.\n"
                "Análise clínica: Reatividade sensorial tátil intensa a tecidos sintéticos e grande intolerância à mudança na disposição habitual de móveis em casa.\n"
                "Condutas: Solicitada avaliação integrada com Fonoaudiologia e Terapia Ocupacional e orientações iniciais de comunicação visual."
            ),
            (
                "AVALIATIVA",
                True,
                "Relato entre encontros: Responsável descreve choro inconsolável quando o trajeto habitual até a creche sofre desvio de trânsito, além de alimentação mantida apenas com purê e duas marcas fixas de biscoito.\n"
                "Observação em sessão: Avaliada resposta a comandos concretos apoiados por figuras reais (PECS/cartões visuais). Quando mostrado o cartão correspondente à troca de brinquedo, apresentou menor latência de resposta e menor protesto vocal do que diante de comandos apenas verbais.\n"
                "Evolução: Excelente potencial de ganho com suporte visual estruturado.\n"
                "Condutas: Orientado início imediato de prancha simples de comunicação visual doméstica."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Equipe de Fonoaudiologia e Terapia Ocupacional compartilhou relatório inicial positivo após introdução de cartões visuais para água, descanso e brincadeira.\n"
                "Observação em sessão: Sessão lúdica de brincadeira paralela e modelagem concreta. A paciente manteve tolerância à presença ativa da profissional no tapete de atividades por vinte minutos contínuos e aceitou alternar entre dois brinquedos com apoio do cartão visual.\n"
                "Evolução: Cancelamento prévio ocorrido na quinzena anterior por virose infantil não prejudicou o vínculo adquirido.\n"
                "Metas: Expandir repertório de cartões visuais para antecipar trajetos de carro."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Família relata redução importante das crises de choro em deslocamentos após utilização prévia de fotografias dos locais de destino mostradas antes de entrar no carro.\n"
                "Observação em sessão: Estimulação de atenção compartilhada com bolhas de sabão e músicas gestuais previsíveis. Pela primeira vez em consultório, realizou vocalização intencional acompanhada de apontamento direcionado à profissional solicitando repetição da brincadeira.\n"
                "Evolução longitudinal: Marco comunicativo bastante animador em comparação à sessão inicial.\n"
                "Condutas: Reforçar prontamente toda iniciativa de apontamento e troca vocal em casa."
            ),
            (
                "INTERVENTIVA",
                False,
                "Contexto atual: Rotina doméstica mais previsível e organizada, mantendo acompanhamento multidisciplinar regular e melhora gradual na tolerância a peças de algodão confortável.\n"
                "Observação em sessão: Durante os 50 minutos, aceitou participar de circuitos motores simples com almofadas macias e apresentou contato visual mais frequente durante brincadeiras de imitação motora.\n"
                "Evolução longitudinal: Redução de crises comportamentais por imprevisibilidade e ganho consistente em comunicação funcional.\n"
                "Condutas: Manter sessões semanais até meados de dezembro alinhando orientações para o recesso escolar."
            ),
        ],
        "missed": ("CANCELADA", "AVALIATIVA"),
        "future_count": 3,
    },
    {
        "paciente": "Arthur Vinicius Pires",
        "preferred_slots": MORNING_SLOTS + AFTERNOON_SLOTS,
        "past_notes": [
            (
                "AVALIATIVA",
                True,
                "Contexto inicial: Consulta avaliativa por queixas escolares de desatenção durante explicações orais longas, fadiga precoce na leitura em voz alta e irritabilidade quando interrompido em atividades de seu interesse.\n"
                "Observação em sessão: Criança de 12 anos gentil e cooperadora, com ótimo raciocínio em desafios visuais e de lógica espacial, porém demonstrando nítida tensão e lentificação silábica quando convidada a ler parágrafo impresso.\n"
                "Análise clínica: Histórico familiar positivo para dislexia; aversão olfativa leve a peixes e desconforto tátil com golas apertadas sem prejuízo global.\n"
                "Condutas: Solicitado rastreio fonoaudiológico de processamento fonológico e avaliação pedagógica de compreensão leitora."
            ),
            (
                "AVALIATIVA",
                True,
                "Relato entre encontros: Responsável trouxe cadernos escolares mostrando boa resolução em cálculos diretos, mas erros frequentes em problemas escritos longos devido a troca ou omissão de palavras na leitura.\n"
                "Observação em sessão: Aplicadas tarefas exploratórias de consciência fonológica, nomeação rápida e atenção visual sustentada. Confirmada sobrecarga rápida da memória de trabalho verbal quando não há apoio visual estruturado.\n"
                "Evolução: Dados reforçam necessidade de adaptações pedagógicas específicas no 5º ano.\n"
                "Condutas: Elaborada orientação preliminar sugerindo enunciados objetivos, fonte ampliada e tempo adicional em provas."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Houve uma falta pontual no mês anterior por imprevisto de transporte escolar; após retorno, família adotou leitura compartilhada de enunciados e avisos de cinco minutos antes de interromper atividades focadas.\n"
                "Observação em sessão: Introduzido uso de régua guia de leitura com janela colorida e marcação de palavras-chave em enunciados matemáticos. O paciente notou imediatamente menor cansaço visual e acertou todas as interpretações propostas.\n"
                "Evolução: Aumento expressivo da confiança ao perceber ferramentas concretas que facilitam seu desempenho.\n"
                "Metas: Utilizar a régua guia diariamente em casa durante leitura recreativa curta de 10 minutos."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato escolar: Coordenação informou boa adesão às adaptações de tempo estendido em sala de aula, resultando em entrega completa das últimas avaliações sem sinais de frustração ou irritabilidade.\n"
                "Observação em sessão: Treino de memória operacional auditiva com apoio de mapas mentais simples desenhados pelo próprio paciente. Conseguiu recontar texto informativo curto preservando sequência lógica e detalhes centrais.\n"
                "Evolução longitudinal: Diminuição clara da evitação diante de tarefas de escrita.\n"
                "Condutas: Manter reforço positivo sobre progresso e competência visual."
            ),
            (
                "INTERVENTIVA",
                True,
                "Contexto atual: Criança animada com os resultados recentes na escola; família relata diminuição acentuada de conflitos em torno da lição de casa vespertina.\n"
                "Observação em sessão: Sessão integrando jogos de atenção seletiva e revisão das estratégias de leitura autônoma para o próximo ano escolar (transição para o 6º ano com múltiplos professores).\n"
                "Evolução longitudinal: Consolidação de recursos compensatórios eficientes e redução significativa da irritabilidade reativa.\n"
                "Condutas: Seguir acompanhamento até 15 de dezembro preparando plano de transição para o Fundamental II."
            ),
        ],
        "missed": ("FALTA", "AVALIATIVA"),
        "future_count": 3,
    },
    {
        "paciente": "Helena Ramos Vasconcelos",
        "preferred_slots": AFTERNOON_SLOTS + MORNING_SLOTS,
        "past_notes": [
            (
                "AVALIATIVA",
                True,
                "Contexto inicial: Avaliação inicial de adolescente de 15 anos encaminhada por episódios recorrentes de taquicardia, sensação subjetiva de falta de ar e insônia prévia às semanas de provas escolares.\n"
                "Observação em sessão: Apresentação cuidada, postura altamente cooperativa e discurso bem estruturado, porém demonstrando postura corporal rígida e autocrítica severa ao comentar qualquer nota abaixo de nove pontos.\n"
                "Análise clínica: Avaliação clínica prévia descartou alterações cardiológicas orgânicas; sintomas físicos compatíveis com somatização ansiosa associada a perfeccionismo acadêmico e medo de mudanças súbitas de cronograma.\n"
                "Condutas: Psicoeducação inicial à paciente e família sobre o ciclo físico da ansiedade."
            ),
            (
                "AVALIATIVA",
                True,
                "Relato entre encontros: Responsável relata que a adolescente costuma estudar até tarde na véspera de avaliações por medo de 'esquecer o conteúdo', dormindo apenas cinco horas nessas noites.\n"
                "Observação em sessão: Mapeados gatilhos cognitivos de exigência extrema ('se eu não revisar cinco vezes, vou fracassar') e avaliado impacto direto da privação de sono sobre o aumento das palpitações diurnas.\n"
                "Evolução: Paciente demonstrou surpresa positiva ao compreender a relação fisiológica entre privação de sono e taquicardia benigna.\n"
                "Condutas: Pactuar redução experimental das revisões noturnas de véspera."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Conseguiu encerrar os estudos às 21h30 antes do último teste de biologia, obtendo bom resultado acadêmico sem apresentar crise física no dia seguinte.\n"
                "Observação em sessão: Prática guiada de relaxamento muscular progressivo de Jacobson combinada com respiração lenta para desarmar a tensão cervical e torácica durante períodos de prova.\n"
                "Evolução: Excelente assimilação das técnicas corporais e senso de controle ampliado.\n"
                "Metas: Praticar 8 minutos de relaxamento muscular antes de dormir três vezes na semana."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato entre encontros: Semana escolar teve mudança inesperada no calendário de apresentação de história; paciente referiu desconforto inicial esperado, mas aplicou a respiração lenta e não apresentou falta de ar.\n"
                "Observação em sessão: Reestruturação semanal de agenda substituindo 'maratonas de véspera' por estudo espaçado em blocos menores ao longo da semana com pausas reais de descanso.\n"
                "Pontos de atenção: Manter atenção ao excesso de comparações em redes sociais ou grupos de turma.\n"
                "Condutas: Reforçar tempo protegido de lazer nos fins de semana."
            ),
            (
                "INTERVENTIVA",
                True,
                "Relato recente: Redução acentuada das somatizações cardiorrespiratórias durante a última bateria de avaliações bimestrais; sono regularizado em torno de oito horas por noite.\n"
                "Observação em sessão: Trabalhada flexibilidade diante de notas 'suficientes' versus busca exaustiva de perfeição, explorando valores pessoais além do desempenho numérico em boletim.\n"
                "Evolução longitudinal: Notável alívio sintomático físico e discurso visivelmente mais sereno.\n"
                "Metas: Consolidar metas equilibradas de descanso e leitura recreativa."
            ),
            (
                "INTERVENTIVA",
                True,
                "Contexto atual: Encerramento do ano letivo se aproximando com ótimo rendimento escolar alcançado de forma muito mais saudável e tranquila do que nos bimestres anteriores.\n"
                "Observação em sessão: Sessão voltada à consolidação do plano de autocuidado contínuo, reconhecimento precoce de sinais físicos de sobrecarga e manutenção dos limites saudáveis de autoexigência.\n"
                "Evolução longitudinal: Ausência de novos episódios de pânico ou somatização grave há mais de um mês.\n"
                "Condutas: Seguir sessões finais programadas até 15 de dezembro."
            ),
        ],
        "missed": None,
        "future_count": 2,
    },
]


def generate_schedule(now):
    """
    Gera a lista de bloqueios e sessões respeitando:
    - Datas recentes até 15/12 (inclusive), espalhadas equilibradamente de segunda a sexta em todas as semanas
    - >= 8 sessões por paciente (8 a 10 por paciente)
    - Sem conflitos de horário entre sessões ativas ou com bloqueios
    """
    tz = timezone.get_current_timezone()
    local_now = timezone.localtime(now)
    today = local_now.date()

    # Limite sempre em 15 de dezembro (do ano corrente, ou próximo se já passou de 15/12)
    cutoff_date = date(today.year, 12, 15)
    if today > cutoff_date:
        cutoff_date = date(today.year + 1, 12, 15)

    bloqueios = build_bloqueios_data(today, cutoff_date, tz)
    bloqueio_intervals = [(b["inicio_dt"], b["fim_dt"]) for b in bloqueios]
    occupied_intervals = []
    sessoes = []
    day_counts = Counter()

    # Define janela passada (~7 semanas atrás desde a segunda-feira daquela semana até hoje)
    start_monday = (today - timedelta(days=today.weekday())) - timedelta(weeks=7)
    all_past_days = [
        d for d in _iter_weekdays(start_monday, today)
        if _find_slot_on_date(d, MORNING_SLOTS + AFTERNOON_SLOTS, [], bloqueio_intervals, now, expect_future=False) is not None
    ]
    all_future_days = [
        d for d in _iter_weekdays(today, cutoff_date)
        if _find_slot_on_date(d, MORNING_SLOTS + AFTERNOON_SLOTS, [], bloqueio_intervals, now, expect_future=True) is not None
    ]

    # Agrupa dias por semana ISO para espalhar cada paciente equilibradamente em cada bloco semanal
    def _split_buckets(days_list, n_buckets):
        if not days_list:
            return []
        buckets = []
        total = len(days_list)
        for i in range(n_buckets):
            start_i = (i * total) // n_buckets
            end_i = ((i + 1) * total) // n_buckets
            slice_days = days_list[start_i:max(start_i + 1, end_i)]
            buckets.append(slice_days)
        return buckets

    # Passo 1: aloca sessões passadas (REALIZADA com anotações ricas) em rodadas equilibradas Seg–Sex
    patient_used_dates = {p["paciente"]: set() for p in PATIENT_HISTORIES}
    patient_past_notes = {p["paciente"]: list(p["past_notes"]) for p in PATIENT_HISTORIES}

    max_past_notes = max(len(v) for v in patient_past_notes.values())
    for note_idx in range(max_past_notes):
        # Alterna ordem de pacientes a cada rodada para equilibrar manhã/tarde ao longo dos dias
        ordered_profiles = PATIENT_HISTORIES[note_idx % len(PATIENT_HISTORIES):] + PATIENT_HISTORIES[:note_idx % len(PATIENT_HISTORIES)]
        for profile in ordered_profiles:
            nome = profile["paciente"]
            notes_list = patient_past_notes[nome]
            if note_idx >= len(notes_list):
                continue
            n_total = len(notes_list)
            buckets = _split_buckets(all_past_days, n_total)
            cand_days = buckets[note_idx]
            # Permite expandir ligeiramente aos dias adjacentes caso o bucket esteja cheio
            if len(cand_days) < 5:
                idx_start = max(0, all_past_days.index(cand_days[0]) - 2)
                idx_end = min(len(all_past_days), all_past_days.index(cand_days[-1]) + 3)
                cand_days = all_past_days[idx_start:idx_end]

            chosen_day, (dt_ini, dt_fim) = _pick_balanced_day(
                candidate_days=cand_days,
                patient_used_dates=patient_used_dates[nome],
                day_counts=day_counts,
                preferred_slots=profile["preferred_slots"],
                occupied_intervals=occupied_intervals,
                bloqueio_intervals=bloqueio_intervals,
                now=now,
                expect_future=False,
            )
            patient_used_dates[nome].add(chosen_day)
            day_counts[chosen_day] += 1
            occupied_intervals.append((dt_ini, dt_fim))

            tipo, pago, anotacao = notes_list[note_idx]
            sessoes.append({
                "paciente": nome,
                "inicio_dt": dt_ini,
                "fim_dt": dt_fim,
                "status": Sessao.StatusChoices.REALIZADA,
                "tipo": getattr(Sessao.TipoChoices, tipo),
                "pago": pago,
                "anotacao": anotacao,
            })

    # Passo 2: sessões pontuais de falta/cancelamento no passado (em dias ainda menos preenchidos)
    recent_past_days = [d for d in all_past_days if (today - d).days <= 24]
    for profile in PATIENT_HISTORIES:
        if profile["missed"] is None:
            continue
        nome = profile["paciente"]
        miss_status, miss_tipo = profile["missed"]
        chosen_day, (dt_ini, dt_fim) = _pick_balanced_day(
            candidate_days=recent_past_days,
            patient_used_dates=patient_used_dates[nome],
            day_counts=day_counts,
            preferred_slots=profile["preferred_slots"],
            occupied_intervals=occupied_intervals,
            bloqueio_intervals=bloqueio_intervals,
            now=now,
            expect_future=False,
        )
        patient_used_dates[nome].add(chosen_day)
        day_counts[chosen_day] += 1
        if miss_status != "CANCELADA":
            occupied_intervals.append((dt_ini, dt_fim))
        sessoes.append({
            "paciente": nome,
            "inicio_dt": dt_ini,
            "fim_dt": dt_fim,
            "status": getattr(Sessao.StatusChoices, miss_status),
            "tipo": getattr(Sessao.TipoChoices, miss_tipo),
            "pago": False,
            "anotacao": None,
        })

    # Passo 3: aloca sessões futuras (AGENDADA) entre hoje (tarde) e 15/12, preenchendo TODA a semana (Seg–Sex)
    max_future = max(p["future_count"] for p in PATIENT_HISTORIES)
    for f_idx in range(max_future):
        ordered_profiles = PATIENT_HISTORIES[(f_idx * 3) % len(PATIENT_HISTORIES):] + PATIENT_HISTORIES[:(f_idx * 3) % len(PATIENT_HISTORIES)]
        for p_pos, profile in enumerate(ordered_profiles):
            nome = profile["paciente"]
            n_future = profile["future_count"]
            if f_idx >= n_future:
                continue
            buckets = _split_buckets(all_future_days, n_future)
            cand_days = list(buckets[f_idx])
            if len(cand_days) < 4:
                idx_start = max(0, all_future_days.index(cand_days[0]) - 2)
                idx_end = min(len(all_future_days), all_future_days.index(cand_days[-1]) + 2)
                cand_days = all_future_days[idx_start:idx_end]

            chosen_day, (dt_ini, dt_fim) = _pick_balanced_day(
                candidate_days=cand_days,
                patient_used_dates=patient_used_dates[nome],
                day_counts=day_counts,
                preferred_slots=profile["preferred_slots"],
                occupied_intervals=occupied_intervals,
                bloqueio_intervals=bloqueio_intervals,
                now=now,
                expect_future=True,
            )
            patient_used_dates[nome].add(chosen_day)
            day_counts[chosen_day] += 1
            occupied_intervals.append((dt_ini, dt_fim))
            sessoes.append({
                "paciente": nome,
                "inicio_dt": dt_ini,
                "fim_dt": dt_fim,
                "status": Sessao.StatusChoices.AGENDADA,
                "tipo": Sessao.TipoChoices.INTERVENTIVA,
                "pago": f_idx == 0 and p_pos % 3 == 0,
                "anotacao": None,
            })

    # Ordena cronologicamente e valida invariantes
    sessoes.sort(key=lambda s: s["inicio_dt"])
    counts = Counter(s["paciente"] for s in sessoes)
    for s in sessoes:
        assert timezone.localtime(s["inicio_dt"]).date() <= cutoff_date, f"Sessão após {cutoff_date}: {s}"
    for profile in PATIENT_HISTORIES:
        assert counts[profile["paciente"]] >= 8, f"Paciente com menos de 8 sessões: {profile['paciente']}"

    return bloqueios, sessoes, cutoff_date
