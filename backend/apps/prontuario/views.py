from rest_framework import generics, viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from apps.pacientes.models import Paciente
from apps.usuarios.permissions import IsDoctorOrAdmin
from .models import Anamnese, AnotacaoSessao
from .serializers import AnamneseSerializer, AnotacaoSessaoSerializer


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
