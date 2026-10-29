from django.test import TestCase
from apps.pacientes.models import Paciente, Responsavel
from apps.prontuario.models import Anamnese, AnotacaoSessao
from apps.agenda.models import Sessao
from apps.usuarios.models import Usuario
from apps.prontuario.services.sanitizer import sanitize_text, sanitize_clinical_data
from datetime import date, datetime
from django.utils import timezone


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

        # Verifica que nenhum dado real vaza
        self.assertNotIn("Enzo", sanitized)
        self.assertNotIn("Gabriel", sanitized)
        self.assertNotIn("Maria", sanitized)
        self.assertNotIn("Carlos", sanitized)
        self.assertNotIn("123.456.789-00", sanitized)
        self.assertNotIn("mae.enzo@teste.com", sanitized)
        self.assertNotIn("98765-4321", sanitized)

        # Verifica substituições corretas
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

        # Teste nos campos da anamnese
        self.assertNotIn("Lucas", result['anamnese']['sensibilidadeEtiquetas'])
        self.assertIn("[Paciente]", result['anamnese']['sensibilidadeEtiquetas'])
        self.assertNotIn("Juliana", result['anamnese']['observacoesGerais'])
        self.assertIn("[Responsável]", result['anamnese']['observacoesGerais'])

        # Teste nas anotações
        nota = result['anotacoes'][0]['texto']
        self.assertNotIn("Lucas", nota)
        self.assertNotIn("Juliana", nota)
        self.assertIn("[Paciente]", nota)
        self.assertIn("[Responsável]", nota)
