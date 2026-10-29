from django.http import HttpResponse
from rest_framework import generics, viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, ValidationError

from apps.pacientes.models import Paciente
from apps.usuarios.permissions import IsDoctorOrAdmin
from .models import Anamnese, AnotacaoSessao, ResumoIa, ParecerConclusivo
from .serializers import (
    AnamneseSerializer,
    AnotacaoSessaoSerializer,
    ResumoIaSerializer,
    ParecerConclusivoSerializer
)
from .services.prompt_catalog import list_available_prompts, get_prompt_by_id
from .services.gemini_service import generate_clinical_summary
from .services.pdf_generator import generate_parecer_pdf
from .services.email_service import send_parecer_email


class AnamneseDetailView(generics.RetrieveUpdateAPIView):
    """
    Obtém ou atualiza a Anamnese do paciente (RF07).
    Identificado pelo UUID do paciente na URL (/api/prontuario/anamnese/<paciente_id>/).
    Caso a Anamnese ainda não exista para o paciente, ela é criada automaticamente ao consultar.
    """
    serializer_class = AnamneseSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_object(self):
        paciente_id = self.kwargs.get('paciente_id')
        try:
            paciente = Paciente.objects.get(id=paciente_id)
        except Paciente.DoesNotExist:
            raise NotFound('Paciente não encontrado.')

        anamnese, _ = Anamnese.objects.get_or_create(paciente=paciente)
        return anamnese


class AnotacaoSessaoListCreateView(generics.ListCreateAPIView):
    """
    Lista em ordem cronológica e cria anotações de sessão para um paciente específico (RF09).
    Rota: /api/prontuario/anotacoes/<paciente_id>/
    """
    serializer_class = AnotacaoSessaoSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return AnotacaoSessao.objects.filter(
            sessao__paciente_id=paciente_id
        ).select_related('sessao', 'sessao__paciente').order_by('dataRegistro')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class AnotacaoSessaoViewSet(viewsets.ModelViewSet):
    """
    ViewSet geral para Anotações de Sessão.
    Permite busca, criação e detalhes via /api/prontuario/anotacoes/
    """
    queryset = AnotacaoSessao.objects.all().select_related('sessao', 'sessao__paciente').order_by('dataRegistro')
    serializer_class = AnotacaoSessaoSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        paciente_id = self.request.query_params.get('paciente')
        if paciente_id:
            queryset = queryset.filter(sessao__paciente_id=paciente_id)
        sessao_id = self.request.query_params.get('sessao')
        if sessao_id:
            queryset = queryset.filter(sessao_id=sessao_id)
        return queryset


class AnotacaoSessaoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Obtém, atualiza ou remove uma Anotação de Sessão pelo seu UUID (RF09).
    Rota: /api/prontuario/anotacoes/detalhe/<pk>/
    Permite edição (PUT/PATCH) e exclusão de anotações existentes.
    """
    queryset = AnotacaoSessao.objects.all().select_related('sessao', 'sessao__paciente')
    serializer_class = AnotacaoSessaoSerializer
    permission_classes = [IsDoctorOrAdmin]


# ── Módulo de IA (Desafios 8 e 9) ──────────────────────────────────────────

class PromptCatalogListView(APIView):
    """
    Retorna a lista dos 4 prompts fixos disponíveis no sistema (RF11).
    Rota: /api/prontuario/ia/prompts/
    """
    permission_classes = [IsDoctorOrAdmin]

    def get(self, request):
        return Response(list_available_prompts(), status=status.HTTP_200_OK)


class GerarResumoIaView(APIView):
    """
    Aciona a sanitização dos dados clínicos e gera a prévia de resumo via Gemini 1.5 Flash (RF10, RF11, RF12).
    A doutora pode visualizar a prévia e decidir salvar ou descartar.
    Rota: /api/prontuario/pacientes/<paciente_id>/ia/gerar/
    """
    permission_classes = [IsDoctorOrAdmin]

    def post(self, request, paciente_id):
        try:
            paciente = Paciente.objects.get(id=paciente_id)
        except Paciente.DoesNotExist:
            raise NotFound('Paciente não encontrado.')

        prompt_id = request.data.get('prompt_id')
        if not prompt_id:
            return Response(
                {'error': 'O campo prompt_id (1 a 4) é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            prompt_id_int = int(prompt_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'O prompt_id deve ser um número inteiro entre 1 e 4.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not get_prompt_by_id(prompt_id_int):
            return Response(
                {'error': 'Identificador de prompt inválido. Escolha um valor entre 1 e 4.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        anamnese = getattr(paciente, 'anamnese', None)
        anotacoes = AnotacaoSessao.objects.filter(
            sessao__paciente=paciente
        ).select_related('sessao').order_by('dataRegistro')

        try:
            resultado = generate_clinical_summary(
                paciente=paciente,
                prompt_id=prompt_id_int,
                anamnese=anamnese,
                anotacoes=anotacoes
            )
            return Response(resultado, status=status.HTTP_200_OK)
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response(
                {'error': f'Falha ao gerar resumo clínico com IA: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResumoIaListCreateView(generics.ListCreateAPIView):
    """
    Lista todos os resumos de IA do paciente e permite persistir novos resumos nomeados (RF12).
    Rota: /api/prontuario/pacientes/<paciente_id>/ia/resumos/
    """
    serializer_class = ResumoIaSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return ResumoIa.objects.filter(paciente_id=paciente_id).order_by('-dataGeracao')

    def perform_create(self, serializer):
        paciente_id = self.kwargs.get('paciente_id')
        try:
            paciente = Paciente.objects.get(id=paciente_id)
        except Paciente.DoesNotExist:
            raise NotFound('Paciente não encontrado.')
        serializer.save(paciente=paciente)


class ResumoIaDetailView(generics.RetrieveDestroyAPIView):
    """
    Obtém ou exclui um Resumo de IA específico pelo UUID.
    Rota: /api/prontuario/ia/resumos/<pk>/
    """
    queryset = ResumoIa.objects.all()
    serializer_class = ResumoIaSerializer
    permission_classes = [IsDoctorOrAdmin]


# ── Módulo de Parecer Conclusivo (RF13, RF14) ──────────────────────────────

class ParecerConclusivoListCreateView(generics.ListCreateAPIView):
    """
    Lista e cria Pareceres Conclusivos para um paciente (RF13).
    Rota: /api/prontuario/pacientes/<paciente_id>/pareceres/
    """
    serializer_class = ParecerConclusivoSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return ParecerConclusivo.objects.filter(paciente_id=paciente_id).order_by('-dataEmissao')

    def perform_create(self, serializer):
        paciente_id = self.kwargs.get('paciente_id')
        try:
            paciente = Paciente.objects.get(id=paciente_id)
        except Paciente.DoesNotExist:
            raise NotFound('Paciente não encontrado.')
        serializer.save(paciente=paciente)


class ParecerConclusivoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Detalhe, edição e exclusão de um Parecer Conclusivo (RF13).
    Rota: /api/prontuario/pareceres/<pk>/
    """
    queryset = ParecerConclusivo.objects.all()
    serializer_class = ParecerConclusivoSerializer
    permission_classes = [IsDoctorOrAdmin]


class ParecerConclusivoPdfView(APIView):
    """
    Gera e retorna o PDF formatado do Parecer Conclusivo para download/impressão (RF14).
    Rota: /api/prontuario/pareceres/<pk>/pdf/
    """
    permission_classes = [IsDoctorOrAdmin]

    def get(self, request, pk):
        try:
            parecer = ParecerConclusivo.objects.select_related('paciente').get(id=pk)
        except ParecerConclusivo.DoesNotExist:
            raise NotFound('Parecer Conclusivo não encontrado.')

        pdf_buffer = generate_parecer_pdf(parecer)
        filename = f"Parecer_{parecer.paciente.nomeCompleto.replace(' ', '_')}.pdf"

        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response


class ParecerConclusivoEmailView(APIView):
    """
    Dispara o envio do Parecer Conclusivo em PDF por e-mail (RF14).
    Rota: /api/prontuario/pareceres/<pk>/email/
    """
    permission_classes = [IsDoctorOrAdmin]

    def post(self, request, pk):
        try:
            parecer = ParecerConclusivo.objects.select_related('paciente').get(id=pk)
        except ParecerConclusivo.DoesNotExist:
            raise NotFound('Parecer Conclusivo não encontrado.')

        recipient_email = request.data.get('recipient_email')
        if not recipient_email:
            return Response(
                {'error': 'O campo recipient_email é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        subject = request.data.get('subject')
        message = request.data.get('message')

        try:
            send_parecer_email(
                parecer=parecer,
                recipient_email=recipient_email,
                subject=subject,
                message_body=message
            )
            return Response(
                {'message': f'Parecer Conclusivo enviado com sucesso para {recipient_email}.'},
                status=status.HTTP_200_OK
            )
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response(
                {'error': f'Falha ao despachar e-mail: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
