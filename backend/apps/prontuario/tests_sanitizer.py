from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone

from apps.agenda.models import Sessao
from apps.pacientes.models import Endereco, Paciente, Responsavel
from apps.prontuario.models import Anamnese, AnotacaoSessao
from apps.prontuario.services.sanitizer import sanitize_clinical_data, sanitize_text
from apps.usuarios.models import Usuario


class SanitizerTestCase(TestCase):
    def test_sanitize_text_patient_and_guardian(self):
        patient_name = "Enzo Gabriel da Silva"
        guardian_names = ["Maria Clara dos Santos", "Carlos Eduardo da Silva"]

        raw_text = (
            "Na sessão de hoje, Enzo Gabriel compareceu acompanhado por sua mãe Maria Clara. "
            "Enzo relatou que teve uma crise ontem. Carlos Eduardo ligou para avisar. "
            "Contato: (11) 98765-4321, email: mae.enzo@teste.com e CPF 123.456.789-00."
        )

        sanitized = sanitize_text(
            raw_text,
            patient_name=patient_name,
            guardian_names=guardian_names
        )

        self.assertNotIn("Enzo", sanitized)
        self.assertNotIn("Gabriel", sanitized)
        self.assertNotIn("Maria", sanitized)
        self.assertNotIn("Carlos", sanitized)
        self.assertNotIn("123.456.789-00", sanitized)
        self.assertNotIn("mae.enzo@teste.com", sanitized)
        self.assertNotIn("98765-4321", sanitized)

        self.assertIn("[Paciente]", sanitized)
        self.assertIn("[Responsável]", sanitized)
        self.assertIn("[CPF]", sanitized)
        self.assertIn("[E-mail]", sanitized)
        self.assertIn("[Telefone]", sanitized)

    def test_sanitize_clinical_data_integration(self):
        paciente = Paciente.objects.create(
            nomeCompleto="Lucas Pereira de Souza",
            dataNascimento=date(2018, 5, 10),
            sexo="M"
        )
        Responsavel.objects.create(
            paciente=paciente,
            nomeCompleto="Juliana Pereira",
            cpf="999.888.777-66",
            contato="63 99999-8888",
            parentesco="Mãe"
        )
        anamnese = Anamnese.objects.create(
            paciente=paciente,
            sensibilidadeEtiquetas="Lucas chora muito quando usa etiquetas nas roupas.",
            observacoesGerais="Juliana relata que Lucas tem seletividade severa."
        )
        doutora = Usuario.objects.create_user(
            email="dra.teste@clinica.com",
            password="password123",
            nome="Dra. Paula",
            role="DOUTORA"
        )
        sessao = Sessao.objects.create(
            paciente=paciente,
            usuario=doutora,
            dataHoraInicio=timezone.now(),
            dataHoraFim=timezone.now(),
            status="REALIZADA",
            tipo="AVALIATIVA"
        )
        anotacao = AnotacaoSessao.objects.create(
            sessao=sessao,
            textoLivre="Lucas interagiu bem hoje, mas Juliana mencionou dificuldades em casa."
        )

        result = sanitize_clinical_data(
            paciente=paciente,
            anamnese=anamnese,
            anotacoes=[anotacao]
        )

        self.assertNotIn("Lucas", result['anamnese']['sensibilidadeEtiquetas'])
        self.assertIn("[Paciente]", result['anamnese']['sensibilidadeEtiquetas'])
        self.assertNotIn("Juliana", result['anamnese']['observacoesGerais'])
        self.assertIn("[Responsável]", result['anamnese']['observacoesGerais'])

        nota = result['anotacoes'][0]['texto']
        self.assertNotIn("Lucas", nota)
        self.assertNotIn("Juliana", nota)
        self.assertIn("[Paciente]", nota)
        self.assertIn("[Responsável]", nota)

    def test_cruzamento_cadastro_enderecos_e_anamnese_desmarcada_com_variacoes(self):
        """2.1: Cruzamento com acentos, formatos numéricos, anamnese desmarcada, negações e datas."""
        paciente = Paciente.objects.create(
            nomeCompleto="João Antônio Dias",
            dataNascimento=date(2017, 3, 15),
            sexo="M",
        )
        Responsavel.objects.create(
            paciente=paciente,
            nomeCompleto="Lúcia Helena Dias",
            cpf="111.222.333-44",
            contato="(11) 98888-7777",
            parentesco="Mãe",
        )
        Endereco.objects.create(
            paciente=paciente,
            tituloLocal="Residencial",
            cep="01310-100",
            logradouro="Rua das Acácias",
            numero="245",
            bairro="Jardim Paulista",
            cidade="São Paulo",
            estado="SP",
        )
        anamnese = Anamnese.objects.create(
            paciente=paciente,
            observacoesGerais=(
                "Tio Roberto Mendonça auxilia no transporte. "
                "Contato alternativo: 11 97777-6666, email tio.roberto@exemplo.com."
            ),
        )
        doutora = Usuario.objects.create_user(
            email="dra.cruzamento@clinica.com",
            password="password123",
            nome="Dra. Camila",
            role="DOUTORA",
        )
        sessao = Sessao.objects.create(
            paciente=paciente,
            usuario=doutora,
            dataHoraInicio=timezone.now(),
            dataHoraFim=timezone.now() + timedelta(hours=1),
            status="REALIZADA",
            tipo="AVALIATIVA",
        )
        anotacao = AnotacaoSessao.objects.create(
            sessao=sessao,
            textoLivre=(
                "Na sessao de 15/03/2017 e atendimento em 10/05/2026, Joao Antonio nao apresentou crises por 3 dias. "
                "Nascido em 15/03/2017, mora na R. das Acacias, 245, CEP 01310100. "
                "Lucia enviou CPF 11122233344 e tel +55 11 988887777. "
                "Roberto Mendonca ligou de 11977776666 (tio.roberto@exemplo.com). "
                "Ja havia registro previo para [Paciente]."
            ),
        )

        # Anamnese desmarcada: ainda assim seus identificadores devem mascarar a nota!
        result = sanitize_clinical_data(
            paciente=paciente,
            anamnese=anamnese,
            anotacoes=[anotacao],
            incluir_anamnese=False,
        )

        self.assertEqual(result['anamnese'], {})
        nota = result['anotacoes'][0]['texto']

        # Dados pessoais ausentes
        for pii in [
            "Joao", "Antonio", "Lucia", "Acacias", "245",
            "01310100", "11122233344", "988887777",
            "Roberto", "Mendonca", "11977776666", "tio.roberto@exemplo.com",
        ]:
            self.assertNotIn(pii, nota)

        # Marcadores e fatos clínicos preservados
        self.assertIn("[Paciente]", nota)
        self.assertIn("[Responsável]", nota)
        self.assertIn("[Endereço]", nota)
        self.assertIn("[CEP]", nota)
        self.assertIn("[CPF]", nota)
        self.assertIn("[Telefone]", nota)
        self.assertIn("[E-mail]", nota)
        self.assertIn("[Data de nascimento]", nota)
        self.assertIn("sessao de 15/03/2017", nota)
        self.assertIn("atendimento em 10/05/2026", nota)
        self.assertIn("nao apresentou crises por 3 dias", nota)

    def test_avisos_por_fonte_retencao_bloqueio_e_preservacao_banco(self):
        """2.2: Avisos com categoria/origem/contagem/estado, retenção bloqueia e banco permanece original."""
        paciente = Paciente.objects.create(
            nomeCompleto="Marina Costa",
            dataNascimento=date(2019, 8, 20),
            sexo="F",
        )
        anamnese = Anamnese.objects.create(
            paciente=paciente,
            observacoesGerais="Marina mora com os avós.",
        )
        doutora = Usuario.objects.create_user(
            email="dra.retencao@clinica.com",
            password="password123",
            nome="Dra. Beatriz",
            role="DOUTORA",
        )
        sessao_segura = Sessao.objects.create(
            paciente=paciente,
            usuario=doutora,
            dataHoraInicio=timezone.now(),
            dataHoraFim=timezone.now() + timedelta(hours=1),
            status="REALIZADA",
            tipo="AVALIATIVA",
        )
        sessao_bloqueada = Sessao.objects.create(
            paciente=paciente,
            usuario=doutora,
            dataHoraInicio=timezone.now() + timedelta(days=1),
            dataHoraFim=timezone.now() + timedelta(days=1, hours=1),
            status="REALIZADA",
            tipo="INTERVENTIVA",
        )
        texto_original_bloqueada = (
            "Marina trouxe matrícula: EXT-998877 e código 9876543210, "
            "além do perfil @familia_costa e CPF: 123.456.78."
        )
        AnotacaoSessao.objects.create(sessao=sessao_segura, textoLivre="Marina respondeu bem hoje.")
        anot_bloqueada = AnotacaoSessao.objects.create(
            sessao=sessao_bloqueada,
            textoLivre=texto_original_bloqueada,
        )

        # Incluindo fonte bloqueada -> bloqueado=True e valores originais ausentes em prévia e avisos
        result_bloq = sanitize_clinical_data(
            paciente=paciente,
            anamnese=anamnese,
            anotacoes=[sessao_segura.anotacao, anot_bloqueada],
            incluir_anamnese=True,
        )
        self.assertTrue(result_bloq['bloqueado'])
        self.assertTrue(result_bloq['avisos']['bloqueado'])
        self.assertEqual(len(result_bloq['avisos']['fontes_bloqueadas']), 1)
        self.assertEqual(result_bloq['avisos']['fontes_bloqueadas'][0]['id'], str(sessao_bloqueada.id))

        texto_bloq_sanit = result_bloq['anotacoes'][1]['texto']
        self.assertIn("[Trecho retido]", texto_bloq_sanit)
        for segredo in ["EXT-998877", "9876543210", "@familia_costa", "123.456.78", "Marina"]:
            self.assertNotIn(segredo, texto_bloq_sanit)
            self.assertNotIn(segredo, str(result_bloq['avisos']))

        fonte_bloq_aviso = next(
            f for f in result_bloq['avisos']['fontes'] if f['id'] == str(sessao_bloqueada.id)
        )
        self.assertTrue(fonte_bloq_aviso['bloqueada'])
        estados = {i['estado'] for i in fonte_bloq_aviso['identificadores']}
        self.assertIn('retido', estados)
        self.assertIn('mascarado', estados)

        # Excluindo a fonte bloqueada -> desbloqueado!
        result_ok = sanitize_clinical_data(
            paciente=paciente,
            anamnese=anamnese,
            anotacoes=[sessao_segura.anotacao],
            incluir_anamnese=True,
        )
        self.assertFalse(result_ok['bloqueado'])
        self.assertEqual(result_ok['avisos']['fontes_bloqueadas'], [])

        # Texto no banco permanece integralmente na forma original
        anot_bloqueada.refresh_from_db()
        self.assertEqual(anot_bloqueada.textoLivre, texto_original_bloqueada)

    def test_coincidencias_relevantes_com_anamnese_e_filtro_generico(self):
        """2.3: Detecção de passagens repetidas após mascaramento, ignorando texto genérico."""
        paciente = Paciente.objects.create(
            nomeCompleto="Rafael Moura",
            dataNascimento=date(2018, 2, 10),
            sexo="M",
        )
        anamnese = Anamnese.objects.create(
            paciente=paciente,
            sensibilidadeEtiquetas="Rafael chora intensamente com etiquetas de roupas e costura de meias.",
            intercorrencias="Sem intercorrências.",
            observacoesGerais="Paciente compareceu acompanhado.",
        )
        doutora = Usuario.objects.create_user(
            email="dra.coincidencia@clinica.com",
            password="password123",
            nome="Dra. Helena",
            role="DOUTORA",
        )
        s1 = Sessao.objects.create(
            paciente=paciente,
            usuario=doutora,
            dataHoraInicio=timezone.now(),
            dataHoraFim=timezone.now() + timedelta(hours=1),
            status="REALIZADA",
            tipo="AVALIATIVA",
        )
        s2_desmarcada = Sessao.objects.create(
            paciente=paciente,
            usuario=doutora,
            dataHoraInicio=timezone.now() + timedelta(days=1),
            dataHoraFim=timezone.now() + timedelta(days=1, hours=1),
            status="REALIZADA",
            tipo="INTERVENTIVA",
        )
        a1 = AnotacaoSessao.objects.create(
            sessao=s1,
            textoLivre=(
                "Na sessao,   RAFAEL   CHORA   INTENSAMENTE   COM ETIQUETAS DE ROUPAS E COSTURA DE MEIAS. "
                "Sem intercorrências. Paciente compareceu acompanhado."
            ),
        )
        a_acento = AnotacaoSessao.objects.create(
            sessao=s2_desmarcada,
            textoLivre="Apresentou sensibilidade auditiva severa na escola com choro frequente.",
        )
        anamnese.dificuldadeRotina = "Sensibilidade auditiva severa na escola e recusa a mudanças."
        anamnese.save()

        # Apenas s1 selecionada e anamnese desmarcada
        result = sanitize_clinical_data(
            paciente=paciente,
            anamnese=anamnese,
            anotacoes=[a1],
            incluir_anamnese=False,
        )

        # Fato clínico preservado na nota
        self.assertIn("CHORA   INTENSAMENTE   COM ETIQUETAS DE ROUPAS", result['anotacoes'][0]['texto'])

        # Apenas s1 aparece nos avisos (s2 desmarcada não aparece)
        self.assertEqual(len(result['avisos']['fontes']), 1)
        aviso_s1 = result['avisos']['fontes'][0]
        self.assertEqual(aviso_s1['id'], str(s1.id))

        # Coincidência detectada apenas no campo relevante (sensibilidadeEtiquetas), ignorando genéricos
        coincidencias = aviso_s1['coincidencias_anamnese']
        self.assertEqual(len(coincidencias), 1)
        self.assertEqual(coincidencias[0]['campo'], 'sensibilidadeEtiquetas')
        self.assertEqual(coincidencias[0]['campo_label'], 'Sensibilidade a Etiquetas/Tecidos')
        self.assertEqual(coincidencias[0]['sessao_id'], str(s1.id))
        # Não vaza conteúdo de anamnese desmarcada nos avisos
        self.assertNotIn('trecho_tratado', coincidencias[0])

        # Verifica também variação de acentuação em coincidências quando selecionada
        anamnese.dificuldadeRotina = "Recusou alimentacao solida apos ruido intenso."
        anamnese.save()
        a_acento.textoLivre = "Na tarde de ontem recusou alimentação sólida após ruído intenso no pátio."
        a_acento.save()
        res_acento = sanitize_clinical_data(
            paciente=paciente,
            anamnese=anamnese,
            anotacoes=[a_acento],
            incluir_anamnese=False,
        )
        coinc_acento = res_acento['avisos']['fontes'][0]['coincidencias_anamnese']
        self.assertTrue(any(c['campo'] == 'dificuldadeRotina' for c in coinc_acento))
