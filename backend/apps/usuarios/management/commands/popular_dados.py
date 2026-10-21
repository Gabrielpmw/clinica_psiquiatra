"""
Comando de gerenciamento para limpar o banco de dados e popular dados simulados de demonstração.
Cria:
- Usuário Admin preservado ou criado (admin@clinica.com)
- Usuário Secretária: Milena Almeida Alves Vieira (milena@gmail.com / Milena@123)
- Usuário Doutor: Gabriel Vieira Ribeiro (gabriel@gmail.com / Gabriel@123)
- 12 Pacientes infantojuvenis completos com Endereços e Responsáveis Legais
- Anamneses clínicas psiquiátricas detalhadas
- Disponibilidade semanal do Dr. Gabriel
- Bloqueios de agenda
- Sessões passadas, de hoje e futuras (Avaliativas e Interventivas)
- Anotações clínicas de sessão (AnotacaoSessao) para sessões realizadas
"""

from datetime import date, datetime, time, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from apps.usuarios.models import Usuario
from apps.pacientes.models import Paciente, Endereco, Responsavel
from apps.agenda.models import Sessao, Disponibilidade, Bloqueio
from apps.prontuario.models import Anamnese, AnotacaoSessao


class Command(BaseCommand):
    help = 'Limpa registros e popula o banco de dados com dados simulados realistas.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-clean',
            action='store_true',
            help='Não limpa os dados existentes antes de popular (o padrão é limpar).',
        )

    def handle(self, *args, **options):
        clean = not options.get('no_clean', False)

        self.stdout.write(self.style.WARNING("=== Iniciando população de dados simulados ==="))

        with transaction.atomic():
            # 1. Limpeza se solicitada
            if clean:
                self.stdout.write("-> Limpando registros antigos...")
                AnotacaoSessao.objects.all().delete()
                Anamnese.objects.all().delete()
                Bloqueio.objects.all().delete()
                Disponibilidade.objects.all().delete()
                Sessao.objects.all().delete()
                Responsavel.objects.all().delete()
                Endereco.objects.all().delete()
                Paciente.objects.all().delete()

                # Remove usuários que não sejam administradores
                Usuario.objects.exclude(
                    role=Usuario.Role.ADMINISTRACAO
                ).exclude(
                    is_superuser=True
                ).exclude(
                    email='admin@clinica.com'
                ).delete()

            # 2. Garantir usuário Admin
            admin_user = Usuario.objects.filter(
                role=Usuario.Role.ADMINISTRACAO
            ).first() or Usuario.objects.filter(is_superuser=True).first()

            if not admin_user:
                admin_user = Usuario.objects.create_user(
                    email='admin@clinica.com',
                    nome='Administrador do Sistema',
                    role=Usuario.Role.ADMINISTRACAO,
                    is_staff=True,
                    is_superuser=True,
                    status=True,
                )
                admin_user.set_password('Admin@123')
                admin_user.save()
                self.stdout.write(self.style.SUCCESS("  [+] Criado Admin: admin@clinica.com / Admin@123"))
            else:
                self.stdout.write(self.style.SUCCESS(f"  [=] Admin preservado: {admin_user.email}"))

            # 3. Criar ou atualizar Secretária: Milena
            sec_email = 'milena@gmail.com'
            sec_user, _ = Usuario.objects.get_or_create(
                email=sec_email,
                defaults={
                    'nome': 'Milena Almeida Alves Vieira',
                    'role': Usuario.Role.SECRETARIA,
                    'status': True,
                    'is_staff': False,
                    'is_superuser': False,
                }
            )
            sec_user.nome = 'Milena Almeida Alves Vieira'
            sec_user.role = Usuario.Role.SECRETARIA
            sec_user.status = True
            sec_user.set_password('Milena@123')
            sec_user.save()
            self.stdout.write(self.style.SUCCESS(f"  [+] Secretária configurada: {sec_user.email} / Milena@123"))

            # 4. Criar ou atualizar Doutor: Gabriel
            doc_email = 'gabriel@gmail.com'
            doc_user, _ = Usuario.objects.get_or_create(
                email=doc_email,
                defaults={
                    'nome': 'Gabriel Vieira Ribeiro',
                    'role': Usuario.Role.DOUTORA,
                    'status': True,
                    'is_staff': False,
                    'is_superuser': False,
                }
            )
            doc_user.nome = 'Gabriel Vieira Ribeiro'
            doc_user.role = Usuario.Role.DOUTORA
            doc_user.status = True
            doc_user.set_password('Gabriel@123')
            doc_user.save()
            self.stdout.write(self.style.SUCCESS(f"  [+] Doutor configurado: {doc_user.email} / Gabriel@123"))

            # 5. Disponibilidade semanal do Dr. Gabriel (Seg a Sex: 08:00-12:00 e 14:00-18:00)
            Disponibilidade.objects.filter(usuario=doc_user).delete()
            for dia in range(5):  # 0 a 4 (Segunda a Sexta)
                Disponibilidade.objects.create(
                    usuario=doc_user,
                    diaSemana=dia,
                    horaInicio=time(8, 0),
                    horaFim=time(12, 0),
                )
                Disponibilidade.objects.create(
                    usuario=doc_user,
                    diaSemana=dia,
                    horaInicio=time(14, 0),
                    horaFim=time(18, 0),
                )
            self.stdout.write("  [+] Disponibilidade semanal configurada para o Dr. Gabriel.")

            # 6. Cadastro de 12 Pacientes com Endereço, Responsável e Anamnese
            pacientes_data = [
                {
                    "nomeCompleto": "Lucas Silva Mendes",
                    "dataNascimento": date(2016, 4, 12),
                    "sexo": "M",
                    "endereco": {
                        "tituloLocal": "Residencial",
                        "cep": "01310-200",
                        "logradouro": "Avenida Paulista",
                        "numero": "1500",
                        "bairro": "Bela Vista",
                        "cidade": "São Paulo",
                        "estado": "SP"
                    },
                    "responsavel": {
                        "nomeCompleto": "Mariana Silva Mendes",
                        "cpf": "123.456.789-01",
                        "contato": "(11) 98765-4321",
                        "parentesco": "Mãe"
                    },
                    "anamnese": {
                        "escolaridade": "3º ano do Ensino Fundamental I em escola regular com suporte pedagógico.",
                        "tipoParto": "Cesárea a termo (38 semanas), sem complicações imediatas.",
                        "intercorrencias": "Icterícia neonatal leve tratada com fototerapia por 2 dias; atraso expressivo da fala (primeiras palavras aos 2 anos e meio).",
                        "seletividadeAlimentar": "Recusa alimentos pastosos e homogêneos; preferência acentuada por texturas crocantes e cores neutras.",
                        "dificuldadeRotina": "Crises de desregulação com choro e agitação motora em caso de mudanças inesperadas de trajeto ou horários escolares.",
                        "sensibilidadeEtiquetas": "Hipersensibilidade tátil: recusa terminantemente roupas com etiquetas internas e meias com costuras aparentes.",
                        "historicoFamiliar": "Tio paterno diagnosticado tardiamente com TEA nível 1 de suporte; mãe com histórico de transtorno ansioso.",
                        "adesaoRegras": "Boa aceitação com pistas visuais e combinados prévios; resistência severa a comandos verbais bruscos em transição de atividades.",
                        "observacoesGerais": "Encaminhado pela escola para investigação diagnóstica de TEA nível 1 de suporte. Apresenta hiperfoco em temas sobre o sistema solar e mapas."
                    }
                },
                {
                    "nomeCompleto": "Sophia Carvalho Ferreira",
                    "dataNascimento": date(2018, 9, 20),
                    "sexo": "F",
                    "endereco": {
                        "tituloLocal": "Casa da Família",
                        "cep": "01304-001",
                        "logradouro": "Rua Augusta",
                        "numero": "850",
                        "bairro": "Consolação",
                        "cidade": "São Paulo",
                        "estado": "SP"
                    },
                    "responsavel": {
                        "nomeCompleto": "Rodrigo Alves Ferreira",
                        "cpf": "234.567.890-12",
                        "contato": "(11) 97654-3210",
                        "parentesco": "Pai"
                    },
                    "anamnese": {
                        "escolaridade": "1º ano do Ensino Fundamental I.",
                        "tipoParto": "Parto normal a termo, sem intercorrências.",
                        "intercorrencias": "Sem histórico de intercorrências gestacionais ou perinatais.",
                        "seletividadeAlimentar": "Recusa vegetais folhosos e frutas com casca; tolerância alimentar ampla no restante.",
                        "dificuldadeRotina": "Ansiedade antecipatória evidente aos domingos à noite perante a volta das aulas na segunda-feira.",
                        "sensibilidadeEtiquetas": "Desconforto com sapatos rígidos ou apertados; prefere calçados macios e flexíveis.",
                        "historicoFamiliar": "Prima materna com TDAH do tipo predominantemente desatento.",
                        "adesaoRegras": "Compreende regras em brincadeiras estruturadas, porém tem baixa tolerância à frustração quando não é a primeira colocada.",
                        "observacoesGerais": "Criança comunicativa e muito expressiva, queixa de oscilações bruscas de humor em momentos de cansaço ou sobrecarga."
                    }
                },
                {
                    "nomeCompleto": "Enzo Gabriel Santos",
                    "dataNascimento": date(2013, 2, 15),
                    "sexo": "M",
                    "endereco": {
                        "tituloLocal": "Principal",
                        "cep": "04101-100",
                        "logradouro": "Rua Vergueiro",
                        "numero": "2200",
                        "bairro": "Vila Mariana",
                        "cidade": "São Paulo",
                        "estado": "SP"
                    },
                    "responsavel": {
                        "nomeCompleto": "Carla Regina Santos",
                        "cpf": "345.678.901-23",
                        "contato": "(11) 96543-2109",
                        "parentesco": "Mãe"
                    },
                    "anamnese": {
                        "escolaridade": "6º ano do Ensino Fundamental II.",
                        "tipoParto": "Cesárea com 36 semanas por descolamento marginal de placenta; UTI neonatal por 3 dias em observação respiratória.",
                        "intercorrencias": "Marcos motores e de linguagem atingidos dentro do padrão esperado.",
                        "seletividadeAlimentar": "Sem seletividade alimentar perceptível.",
                        "dificuldadeRotina": "Adaptação adequada a imprevistos, demonstrando apenas impulsividade ocasional.",
                        "sensibilidadeEtiquetas": "Nenhuma queixa de sensibilidade tátil.",
                        "historicoFamiliar": "Pai com diagnóstico de TDAH combinado na infância e irmão com sintomas hiperativos.",
                        "adesaoRegras": "Dificuldade constante em seguir instruções múltiplas em sala de aula; esquecimento de tarefas e perda de materiais.",
                        "observacoesGerais": "Investigação diagnóstica de TDAH combinado. Relato escolar de alta inquietação motora e interrupção frequente das falas alheias."
                    }
                },
                {
                    "nomeCompleto": "Laura Beatriz Lima",
                    "dataNascimento": date(2019, 11, 5),
                    "sexo": "F",
                    "endereco": {
                        "tituloLocal": "Residência",
                        "cep": "01418-100",
                        "logradouro": "Alameda Santos",
                        "numero": "1200",
                        "bairro": "Cerqueira César",
                        "cidade": "São Paulo",
                        "estado": "SP"
                    },
                    "responsavel": {
                        "nomeCompleto": "Juliana Lima Albuquerque",
                        "cpf": "456.789.012-34",
                        "contato": "(11) 95432-1098",
                        "parentesco": "Mãe"
                    },
                    "anamnese": {
                        "escolaridade": "Educação Infantil (Pré II).",
                        "tipoParto": "Cesárea eletiva, 39 semanas, Apgar 9/10.",
                        "intercorrencias": "Sem intercorrências médicas relevantes.",
                        "seletividadeAlimentar": "Dieta restrita a alimentos beges/claros (arroz, batata, maçã descascada e frango grelhado).",
                        "dificuldadeRotina": "Rituais fixos para adormecer; desorganização comportamental se a ordem das etapas noturnas for alterada.",
                        "sensibilidadeEtiquetas": "Reação aversiva imediata a zíperes em contato com a pele e roupas com gola justa.",
                        "historicoFamiliar": "Sem histórico psiquiátrico relevante relatado na família de primeiro grau.",
                        "adesaoRegras": "Seguimento de regras associado à previsibilidade do ambiente; sobrecarga sensorial com barulhos de intensidade súbita.",
                        "observacoesGerais": "Avaliação de perfil do processamento sensorial e investigação diagnóstica de espectro autista com bom nível de linguagem."
                    }
                },
                {
                    "nomeCompleto": "Matheus Henrique Rocha",
                    "dataNascimento": date(2010, 7, 30),
                    "sexo": "M",
                    "endereco": {
                        "tituloLocal": "Residencial",
                        "cep": "04538-133",
                        "logradouro": "Avenida Brigadeiro Faria Lima",
                        "numero": "3477",
                        "bairro": "Itaim Bibi",
                        "cidade": "São Paulo",
                        "estado": "SP"
                    },
                    "responsavel": {
                        "nomeCompleto": "Fernando Rocha de Oliveira",
                        "cpf": "567.890.123-45",
                        "contato": "(11) 94321-0987",
                        "parentesco": "Pai"
                    },
                    "anamnese": {
                        "escolaridade": "9º ano do Ensino Fundamental II.",
                        "tipoParto": "Normal hospitalar sem intercorrências.",
                        "intercorrencias": "Nenhuma.",
                        "seletividadeAlimentar": "Alimentação balanceada e adequada.",
                        "dificuldadeRotina": "Procrastinação crônica para iniciar atividades acadêmicas; dificuldade de autogerenciamento do tempo.",
                        "sensibilidadeEtiquetas": "Nenhuma.",
                        "historicoFamiliar": "Mãe tratada ambulatorialmente para depressão maior.",
                        "adesaoRegras": "Desafio à autoridade escolar em situações percebidas como injustas; recolhimento no quarto com uso prolongado de computador.",
                        "observacoesGerais": "Acompanhamento psiquiátrico de sintomas ansiosos e queixas de desmotivação e fadiga mental no último bimestre."
                    }
                },
                {
                    "nomeCompleto": "Isabella Duarte Nogueira",
                    "dataNascimento": date(2015, 12, 10),
                    "sexo": "F",
                    "endereco": {
                        "tituloLocal": "Principal",
                        "cep": "04036-000",
                        "logradouro": "Rua Domingos de Morais",
                        "numero": "1800",
                        "bairro": "Vila Mariana",
                        "cidade": "São Paulo",
                        "estado": "SP"
                    },
                    "responsavel": {
                        "nomeCompleto": "Patrícia Duarte Nogueira",
                        "cpf": "678.901.234-56",
                        "contato": "(11) 93210-9876",
                        "parentesco": "Mãe"
                    },
                    "anamnese": {
                        "escolaridade": "4º ano do Ensino Fundamental I.",
                        "tipoParto": "Cesárea a termo sem intercorrências.",
                        "intercorrencias": "Sem intercorrências no desenvolvimento.",
                        "seletividadeAlimentar": "Não aceita que alimentos distintos se toquem no prato; pratos com divisórias preferidos.",
                        "dificuldadeRotina": "Rigidez com pontualidade e horários de saída de casa.",
                        "sensibilidadeEtiquetas": "Desconforto com elásticos de calças ou bermudas muito apertados.",
                        "historicoFamiliar": "Irmão mais velho com diagnóstico de TDAH.",
                        "adesaoRegras": "Perfeccionismo acentuado; desfaz trabalhos escolares inteiros quando nota pequenas rasuras.",
                        "observacoesGerais": "Ansiedade de desempenho e traços de perfeccionismo disfuncional gerando sofrimento psíquico e lentidão na execução de provas."
                    }
                },
                {
                    "nomeCompleto": "Theo Albuquerque Martins",
                    "dataNascimento": date(2017, 5, 18),
                    "sexo": "M",
                    "endereco": {
                        "tituloLocal": "Principal",
                        "cep": "01405-001",
                        "logradouro": "Rua Pamplona",
                        "numero": "900",
                        "bairro": "Jardim Paulista",
                        "cidade": "São Paulo",
                        "estado": "SP"
                    },
                    "responsavel": {
                        "nomeCompleto": "Marcelo Martins",
                        "cpf": "789.012.345-67",
                        "contato": "(11) 92109-8765",
                        "parentesco": "Pai"
                    },
                    "anamnese": {
                        "escolaridade": "2º ano do Ensino Fundamental I.",
                        "tipoParto": "Parto normal hospitalar.",
                        "intercorrencias": "Episódio de bronquiolite aos 8 meses; desenvolvimento neuropsicomotor típico.",
                        "seletividadeAlimentar": "Alimentação variada.",
                        "dificuldadeRotina": "Resistência ao encerramento de brincadeiras preferidas.",
                        "sensibilidadeEtiquetas": "Sem queixas sensoriais relevantes.",
                        "historicoFamiliar": "Pai com transtorno de ansiedade.",
                        "adesaoRegras": "Inquietação verbal e necessidade frequente de reforço positivo.",
                        "observacoesGerais": "Acompanhamento comportamental e avaliação de TDAH versus ansiedade infantil."
                    }
                },
                {
                    "nomeCompleto": "Alice Fernandes Souza",
                    "dataNascimento": date(2012, 8, 25),
                    "sexo": "F",
                    "endereco": {
                        "tituloLocal": "Residência",
                        "cep": "05402-400",
                        "logradouro": "Avenida Rebouças",
                        "numero": "2500",
                        "bairro": "Pinheiros",
                        "cidade": "São Paulo",
                        "estado": "SP"
                    },
                    "responsavel": {
                        "nomeCompleto": "Beatriz Fernandes",
                        "cpf": "890.123.456-78",
                        "contato": "(11) 91098-7654",
                        "parentesco": "Mãe"
                    },
                    "anamnese": {
                        "escolaridade": "7º ano do Ensino Fundamental II.",
                        "tipoParto": "Cesárea a termo.",
                        "intercorrencias": "Nenhuma.",
                        "seletividadeAlimentar": "Normal.",
                        "dificuldadeRotina": "Preocupação acentuada com alterações em cronogramas de avaliações.",
                        "sensibilidadeEtiquetas": "Desconforto com luzes excessivas e ambientes com sobreposição de estímulos sonoros.",
                        "historicoFamiliar": "Avô materno com histórico de transtorno afetivo bipolar.",
                        "adesaoRegras": "Cumprimento rigoroso de regras, com inibição social e timidez extrema diante de figuras estranhas.",
                        "observacoesGerais": "Manejo clínico de ansiedade social e fobia de desempenho em contexto acadêmico."
                    }
                },
                {
                    "nomeCompleto": "Pedro Lucas Guimarães",
                    "dataNascimento": date(2008, 3, 14),
                    "sexo": "M",
                    "endereco": {
                        "tituloLocal": "Casa",
                        "cep": "01415-001",
                        "logradouro": "Rua Bela Cintra",
                        "numero": "1400",
                        "bairro": "Consolação",
                        "cidade": "São Paulo",
                        "estado": "SP"
                    },
                    "responsavel": {
                        "nomeCompleto": "Helena Guimarães",
                        "cpf": "901.234.567-89",
                        "contato": "(11) 90987-6543",
                        "parentesco": "Mãe"
                    },
                    "anamnese": {
                        "escolaridade": "2º ano do Ensino Médio.",
                        "tipoParto": "Parto normal humanizado a termo.",
                        "intercorrencias": "Nenhuma.",
                        "seletividadeAlimentar": "Adequada.",
                        "dificuldadeRotina": "Transições escolares geraram períodos de retração e anedonia.",
                        "sensibilidadeEtiquetas": "Nenhuma.",
                        "historicoFamiliar": "Mãe com histórico de transtorno depressivo recorrente.",
                        "adesaoRegras": "Adolescente cooperativo e solícito.",
                        "observacoesGerais": "Acompanhamento psiquiátrico para manejo de quadro de Humor Depressivo e Ansiedade no adolescente em plano conjunto com psicoterapia externa."
                    }
                },
                {
                    "nomeCompleto": "Manuela Costa Ribeiro",
                    "dataNascimento": date(2020, 1, 18),
                    "sexo": "F",
                    "endereco": {
                        "tituloLocal": "Residencial",
                        "cep": "01426-000",
                        "logradouro": "Rua Oscar Freire",
                        "numero": "600",
                        "bairro": "Cerqueira César",
                        "cidade": "São Paulo",
                        "estado": "SP"
                    },
                    "responsavel": {
                        "nomeCompleto": "Vanessa Costa Ribeiro",
                        "cpf": "012.345.678-90",
                        "contato": "(11) 99876-5432",
                        "parentesco": "Mãe"
                    },
                    "anamnese": {
                        "escolaridade": "Educação Infantil (Maternal II).",
                        "tipoParto": "Cesárea sem intercorrências.",
                        "intercorrencias": "Atraso no início da marcha (19 meses); marcha frequente em pontas dos pés.",
                        "seletividadeAlimentar": "Seletividade severa: aceita purê de maçã e duas marcas exclusivas de biscoito integral.",
                        "dificuldadeRotina": "Intolerância severa a deslocamento de móveis em casa ou mudança de itinerário.",
                        "sensibilidadeEtiquetas": "Choro intenso perante tecidos sintéticos ou etiquetas em contato com a pele.",
                        "historicoFamiliar": "Irmão primogênito com TEA de grau moderado.",
                        "adesaoRegras": "Compreensão de regras ainda em desenvolvimento; necessita de modelagem concreta e apoio visual.",
                        "observacoesGerais": "Investigação diagnóstica de TEA nível 2 de suporte com acompanhamento conjunto em Fonoaudiologia e Terapia Ocupacional."
                    }
                },
                {
                    "nomeCompleto": "Arthur Vinicius Pires",
                    "dataNascimento": date(2014, 10, 8),
                    "sexo": "M",
                    "endereco": {
                        "tituloLocal": "Principal",
                        "cep": "05406-050",
                        "logradouro": "Rua Teodoro Sampaio",
                        "numero": "1100",
                        "bairro": "Pinheiros",
                        "cidade": "São Paulo",
                        "estado": "SP"
                    },
                    "responsavel": {
                        "nomeCompleto": "André Pires",
                        "cpf": "112.233.445-56",
                        "contato": "(11) 98123-4567",
                        "parentesco": "Pai"
                    },
                    "anamnese": {
                        "escolaridade": "5º ano do Ensino Fundamental I.",
                        "tipoParto": "Cesárea a termo.",
                        "intercorrencias": "Crise febril única aos 2 anos, sem repercussões clínicas posteriores.",
                        "seletividadeAlimentar": "Aversão a alimentos de odor intenso (ex: peixes).",
                        "dificuldadeRotina": "Irritabilidade quando interrompido em tarefas focadas de interesse.",
                        "sensibilidadeEtiquetas": "Desconforto com camisas polo ou golas justas.",
                        "historicoFamiliar": "Tio materno com dislexia.",
                        "adesaoRegras": "Dificuldade na sustentação da atenção durante explicações orais extensas.",
                        "observacoesGerais": "Investigação de transtornos específicos de aprendizagem associados a perfil desatento."
                    }
                },
                {
                    "nomeCompleto": "Helena Ramos Vasconcelos",
                    "dataNascimento": date(2011, 6, 22),
                    "sexo": "F",
                    "endereco": {
                        "tituloLocal": "Residência",
                        "cep": "01301-100",
                        "logradouro": "Rua da Consolação",
                        "numero": "2100",
                        "bairro": "Consolação",
                        "cidade": "São Paulo",
                        "estado": "SP"
                    },
                    "responsavel": {
                        "nomeCompleto": "Silvana Ramos Vasconcelos",
                        "cpf": "223.344.556-67",
                        "contato": "(11) 97234-5678",
                        "parentesco": "Mãe"
                    },
                    "anamnese": {
                        "escolaridade": "8º ano do Ensino Fundamental II.",
                        "tipoParto": "Normal hospitalar sem intercorrências.",
                        "intercorrencias": "Sem intercorrências no desenvolvimento inicial.",
                        "seletividadeAlimentar": "Normal.",
                        "dificuldadeRotina": "Ansiedade elevada perante mudanças bruscas de horários ou adiamento de eventos.",
                        "sensibilidadeEtiquetas": "Nenhuma.",
                        "historicoFamiliar": "Mãe com histórico de crises de pânico.",
                        "adesaoRegras": "Muito cooperativa e dedicada, com exigência extrema em relação ao próprio desempenho acadêmico.",
                        "observacoesGerais": "Acompanhamento de ansiedade de desempenho e somatizações cardiorrespiratórias em períodos de provas escolares."
                    }
                }
            ]

            pacientes_map = {}
            for p_info in pacientes_data:
                paciente = Paciente.objects.create(
                    nomeCompleto=p_info["nomeCompleto"],
                    dataNascimento=p_info["dataNascimento"],
                    sexo=p_info["sexo"],
                    status=True,
                )
                pacientes_map[paciente.nomeCompleto] = paciente

                # Endereço
                end_data = p_info["endereco"]
                Endereco.objects.create(
                    paciente=paciente,
                    tituloLocal=end_data["tituloLocal"],
                    cep=end_data["cep"],
                    logradouro=end_data["logradouro"],
                    numero=end_data["numero"],
                    bairro=end_data["bairro"],
                    cidade=end_data["cidade"],
                    estado=end_data["estado"],
                )

                # Responsável
                resp_data = p_info["responsavel"]
                Responsavel.objects.create(
                    paciente=paciente,
                    nomeCompleto=resp_data["nomeCompleto"],
                    cpf=resp_data["cpf"],
                    contato=resp_data["contato"],
                    parentesco=resp_data["parentesco"],
                )

                # Anamnese
                anam_data = p_info["anamnese"]
                Anamnese.objects.create(
                    paciente=paciente,
                    escolaridade=anam_data["escolaridade"],
                    tipoParto=anam_data["tipoParto"],
                    intercorrencias=anam_data["intercorrencias"],
                    seletividadeAlimentar=anam_data["seletividadeAlimentar"],
                    dificuldadeRotina=anam_data["dificuldadeRotina"],
                    sensibilidadeEtiquetas=anam_data["sensibilidadeEtiquetas"],
                    historicoFamiliar=anam_data["historicoFamiliar"],
                    adesaoRegras=anam_data["adesaoRegras"],
                    observacoesGerais=anam_data["observacoesGerais"],
                )

            self.stdout.write(self.style.SUCCESS(f"  [+] Criados {len(pacientes_map)} pacientes com endereço, responsável e anamnese completa."))

            # 7. Criar Bloqueios na Agenda do Dr. Gabriel
            tz = timezone.get_current_timezone()
            now = timezone.now()
            today = timezone.localtime(now).date()

            def make_dt(day_offset, hour, minute):
                target_date = today + timedelta(days=day_offset)
                dt = datetime.combine(target_date, time(hour, minute))
                return timezone.make_aware(dt, tz)

            bloqueios_data = [
                {
                    "day_offset": 1,
                    "inicio": (12, 0),
                    "fim": (14, 0),
                    "motivo": "Intervalo para almoço e discussão com equipe de Terapia Ocupacional"
                },
                {
                    "day_offset": 2,
                    "inicio": (16, 0),
                    "fim": (18, 0),
                    "motivo": "Reunião Clínica e Estudo de Caso de TEA"
                },
                {
                    "day_offset": 5,
                    "inicio": (8, 0),
                    "fim": (10, 0),
                    "motivo": "Participação em Congresso Brasileiro de Neuropsiquiatria da Infância"
                }
            ]

            for b in bloqueios_data:
                Bloqueio.objects.create(
                    usuario=doc_user,
                    dataHoraInicio=make_dt(b["day_offset"], b["inicio"][0], b["inicio"][1]),
                    dataHoraFim=make_dt(b["day_offset"], b["fim"][0], b["fim"][1]),
                    motivo=b["motivo"]
                )
            self.stdout.write(self.style.SUCCESS("  [+] Bloqueios de horário cadastrados na agenda do Dr. Gabriel."))

            # 8. Criar Sessões e Anotações de Prontuário
            # Sessões no passado (com anotação clínica), hoje e futuro
            sessoes_data = [
                # --- SESSÕES PASSADAS (REALIZADAS) ---
                {
                    "paciente": "Lucas Silva Mendes",
                    "day_offset": -10,
                    "inicio": (9, 0),
                    "fim": (9, 50),
                    "status": Sessao.StatusChoices.REALIZADA,
                    "tipo": Sessao.TipoChoices.AVALIATIVA,
                    "anotacao": (
                        "Primeira consulta de acolhimento e anamnese psiquiátrica infantil. "
                        "Paciente compareceu acompanhado da mãe, Sra. Mariana. Durante o atendimento lúdico, "
                        "demonstrou boa interação compartilhada em torno de temas de seu interesse (astronomia), "
                        "porém com fixação e pouca flexibilidade para alternância de brinquedos. Evitou contato visual direto prolongado, "
                        "mas manteve atenção conjunta satisfatória. Mãe relatou queixas escolares de desatenção e sobrecarga sensorial "
                        "em momentos de recreio. Solicitado relatório pedagógico da escola e avaliação neuropsicológica complementar. "
                        "Hipótese diagnóstica: Investigação de TEA nível 1 de suporte. Retorno agendado em 10 dias."
                    )
                },
                {
                    "paciente": "Sophia Carvalho Ferreira",
                    "day_offset": -8,
                    "inicio": (14, 0),
                    "fim": (14, 50),
                    "status": Sessao.StatusChoices.REALIZADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": (
                        "Sessão de seguimento terapêutico com foco em regulação emocional e manejo comportamental. "
                        "Criança compareceu disposta, interagiu ativamente com os jogos de tabuleiro adaptados. "
                        "Trabalhadas estratégias lúdicas para identificação das emoções primárias (termômetro das emoções). "
                        "Pais relatam melhora na contenção das crises de oposição após introdução do quadro de combinados visuais em casa. "
                        "Mantido plano de acompanhamento quinzenal."
                    )
                },
                {
                    "paciente": "Enzo Gabriel Santos",
                    "day_offset": -6,
                    "inicio": (10, 0),
                    "fim": (10, 50),
                    "status": Sessao.StatusChoices.REALIZADA,
                    "tipo": Sessao.TipoChoices.AVALIATIVA,
                    "anotacao": (
                        "Consulta avaliativa psiquiátrica. Paciente com 11 anos, queixa de inquietação motora e desatenção severa "
                        "no contexto de sala de aula. Aplicada escala SNAP-IV com os responsáveis e colhidas informações preliminares "
                        "da coordenação escolar. Observada hiperatividade motora durante a consulta (levantou-se repetidamente da cadeira, "
                        "manuseou objetos sobre a mesa). Discutidas orientações psicoeducacionais sobre TDAH com a mãe. Proposto início "
                        "de investigação detalhada e avaliação cardiológica prévia a eventual conduta farmacológica."
                    )
                },
                {
                    "paciente": "Laura Beatriz Lima",
                    "day_offset": -5,
                    "inicio": (15, 0),
                    "fim": (15, 50),
                    "status": Sessao.StatusChoices.REALIZADA,
                    "tipo": Sessao.TipoChoices.AVALIATIVA,
                    "anotacao": (
                        "Atendimento clínico com foco na avaliação sensorial e de rotina da paciente. Observada rigidez significativa na escolha "
                        "de materiais lúdicos (ordenou blocos por cor e tamanho, demonstrando desconforto quando desordenados). "
                        "Relato materno de intensas crises no momento do banho e recusa alimentar seletiva. Encaminhada para Terapia Ocupacional "
                        "com abordagem de Integração Sensorial de Ayres. Orientada família sobre adaptação da rotina noturna."
                    )
                },
                {
                    "paciente": "Matheus Henrique Rocha",
                    "day_offset": -4,
                    "inicio": (16, 0),
                    "fim": (16, 50),
                    "status": Sessao.StatusChoices.REALIZADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": (
                        "Consulta de retorno do adolescente Matheus (14 anos). Paciente compareceu sozinho inicialmente, demonstrando postura tímida "
                        "e afeto embotado, posteriormente integrando o pai à conversa. Relatou diminuição das crises de ansiedade após o início dos "
                        "exercícios de respiração diafragmática. Discutida a importância do estabelecimento de limites no tempo de telas e retorno "
                        "gradual às atividades físicas extracurriculares. Paciente concordou com a meta de caminhar 3x por semana."
                    )
                },
                {
                    "paciente": "Isabella Duarte Nogueira",
                    "day_offset": -3,
                    "inicio": (11, 0),
                    "fim": (11, 50),
                    "status": Sessao.StatusChoices.REALIZADA,
                    "tipo": Sessao.TipoChoices.AVALIATIVA,
                    "anotacao": (
                        "Primeira consulta clínica. Observado comportamento perfeccionista marcante durante a realização de desenhos livres "
                        "(solicitou nova folha três vezes por considerar o traço inicial incorreto). Mãe pontua sofrimento significativo com tarefas escolares. "
                        "Orientada a família a não validar os rituais de checagem excessiva e reforçar positivamente o esforço e não apenas o resultado final. "
                        "Retorno agendado para avaliação continuada."
                    )
                },
                {
                    "paciente": "Theo Albuquerque Martins",
                    "day_offset": -2,
                    "inicio": (8, 30),
                    "fim": (9, 20),
                    "status": Sessao.StatusChoices.REALIZADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": (
                        "Sessão de intervenção clínica comportamental. Theo participou de dinâmicas de autocontrole e espera de turnos. "
                        "Demonstrou evolução no tempo de tolerância à frustração em comparação ao primeiro encontro. Pais pontuam que o ambiente escolar "
                        "tem respondido bem às pausas programadas sugeridas no relatório anterior."
                    )
                },
                {
                    "paciente": "Alice Fernandes Souza",
                    "day_offset": -1,
                    "inicio": (14, 30),
                    "fim": (15, 20),
                    "status": Sessao.StatusChoices.REALIZADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": (
                        "Consulta de acompanhamento de ansiedade social e fobia de desempenho em adolescente. Alice relatou ter conseguido apresentar "
                        "um trabalho em grupo na escola na última semana com apoio da professora orientadora, o que representou grande vitória subjetiva. "
                        "Revisados registros de pensamentos disfuncionais e mantidas orientações de enfrentamento gradual."
                    )
                },
                # Sessões passadas com Falta e Cancelamento
                {
                    "paciente": "Arthur Vinicius Pires",
                    "day_offset": -3,
                    "inicio": (9, 30),
                    "fim": (10, 20),
                    "status": Sessao.StatusChoices.FALTA,
                    "tipo": Sessao.TipoChoices.AVALIATIVA,
                    "anotacao": None
                },
                {
                    "paciente": "Manuela Costa Ribeiro",
                    "day_offset": -2,
                    "inicio": (10, 30),
                    "fim": (11, 20),
                    "status": Sessao.StatusChoices.CANCELADA,
                    "tipo": Sessao.TipoChoices.AVALIATIVA,
                    "anotacao": None
                },

                # --- SESSÕES DE HOJE ---
                {
                    "paciente": "Lucas Silva Mendes",
                    "day_offset": 0,
                    "inicio": (9, 0),
                    "fim": (9, 50),
                    "status": Sessao.StatusChoices.REALIZADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": (
                        "Sessão de acompanhamento realizada hoje. Paciente trouxe o relatório pedagógico solicitado na primeira sessão. "
                        "Análise dos apontamentos escolares confirma perfil de hiperfoco e dificuldades na transição entre matérias. "
                        "Trabalhadas dinâmicas de flexibilização cognitiva com jogos de regras alternadas. Paciente muito colaborativo e comunicativo. "
                        "Próxima consulta em 15 dias com a devolutiva formal para a escola e fechamento de conduta."
                    )
                },
                {
                    "paciente": "Sophia Carvalho Ferreira",
                    "day_offset": 0,
                    "inicio": (14, 30),
                    "fim": (15, 20),
                    "status": Sessao.StatusChoices.AGENDADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": None
                },
                {
                    "paciente": "Helena Ramos Vasconcelos",
                    "day_offset": 0,
                    "inicio": (16, 0),
                    "fim": (16, 50),
                    "status": Sessao.StatusChoices.AGENDADA,
                    "tipo": Sessao.TipoChoices.AVALIATIVA,
                    "anotacao": None
                },

                # --- SESSÕES FUTURAS ---
                {
                    "paciente": "Enzo Gabriel Santos",
                    "day_offset": 1,
                    "inicio": (9, 0),
                    "fim": (9, 50),
                    "status": Sessao.StatusChoices.AGENDADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": None
                },
                {
                    "paciente": "Laura Beatriz Lima",
                    "day_offset": 1,
                    "inicio": (10, 30),
                    "fim": (11, 20),
                    "status": Sessao.StatusChoices.AGENDADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": None
                },
                {
                    "paciente": "Matheus Henrique Rocha",
                    "day_offset": 1,
                    "inicio": (15, 0),
                    "fim": (15, 50),
                    "status": Sessao.StatusChoices.AGENDADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": None
                },
                {
                    "paciente": "Theo Albuquerque Martins",
                    "day_offset": 2,
                    "inicio": (8, 30),
                    "fim": (9, 20),
                    "status": Sessao.StatusChoices.AGENDADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": None
                },
                {
                    "paciente": "Isabella Duarte Nogueira",
                    "day_offset": 2,
                    "inicio": (10, 0),
                    "fim": (10, 50),
                    "status": Sessao.StatusChoices.AGENDADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": None
                },
                {
                    "paciente": "Pedro Lucas Guimarães",
                    "day_offset": 2,
                    "inicio": (14, 30),
                    "fim": (15, 20),
                    "status": Sessao.StatusChoices.AGENDADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": None
                },
                {
                    "paciente": "Manuela Costa Ribeiro",
                    "day_offset": 4,
                    "inicio": (9, 0),
                    "fim": (9, 50),
                    "status": Sessao.StatusChoices.AGENDADA,
                    "tipo": Sessao.TipoChoices.AVALIATIVA,
                    "anotacao": None
                },
                {
                    "paciente": "Arthur Vinicius Pires",
                    "day_offset": 4,
                    "inicio": (10, 30),
                    "fim": (11, 20),
                    "status": Sessao.StatusChoices.AGENDADA,
                    "tipo": Sessao.TipoChoices.AVALIATIVA,
                    "anotacao": None
                },
                {
                    "paciente": "Alice Fernandes Souza",
                    "day_offset": 5,
                    "inicio": (14, 0),
                    "fim": (14, 50),
                    "status": Sessao.StatusChoices.AGENDADA,
                    "tipo": Sessao.TipoChoices.INTERVENTIVA,
                    "anotacao": None
                },
            ]

            sessoes_count = 0
            anotacoes_count = 0
            for s_info in sessoes_data:
                paciente = pacientes_map.get(s_info["paciente"])
                if not paciente:
                    continue

                inicio_dt = make_dt(s_info["day_offset"], s_info["inicio"][0], s_info["inicio"][1])
                fim_dt = make_dt(s_info["day_offset"], s_info["fim"][0], s_info["fim"][1])

                sessao = Sessao.objects.create(
                    paciente=paciente,
                    usuario=doc_user,
                    dataHoraInicio=inicio_dt,
                    dataHoraFim=fim_dt,
                    status=s_info["status"],
                    tipo=s_info["tipo"],
                )
                sessoes_count += 1

                if s_info.get("anotacao"):
                    AnotacaoSessao.objects.create(
                        sessao=sessao,
                        textoLivre=s_info["anotacao"],
                    )
                    anotacoes_count += 1

            self.stdout.write(self.style.SUCCESS(f"  [+] Criadas {sessoes_count} sessões na agenda do Dr. Gabriel."))
            self.stdout.write(self.style.SUCCESS(f"  [+] Registradas {anotacoes_count} anotações clínicas de sessão em prontuário."))

        self.stdout.write(self.style.SUCCESS("\n=== Banco de dados populado com sucesso! ==="))
        self.stdout.write("Usuários disponíveis para login:")
        self.stdout.write(f"  • Administrador : {admin_user.email} (preservado/configurado)")
        self.stdout.write(f"  • Secretária    : {sec_user.email} / Milena@123")
        self.stdout.write(f"  • Doutor        : {doc_user.email} / Gabriel@123")
