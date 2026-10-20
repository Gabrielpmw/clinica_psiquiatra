from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Sessao, Disponibilidade, Bloqueio
from .serializers import SessaoSerializer, DisponibilidadeSerializer, BloqueioSerializer


class SessaoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Gestão de Sessões da Agenda (RF03, RF04, RF05, RF06).
    Suporta filtros por data, paciente e status.
    """
    queryset = Sessao.objects.all().select_related('paciente', 'usuario').order_by('dataHoraInicio')
    serializer_class = SessaoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['paciente__nomeCompleto']
    ordering_fields = ['dataHoraInicio', 'dataHoraFim', 'status', 'tipo']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtro por data exata (YYYY-MM-DD)
        data = self.request.query_params.get('data')
        if data:
            queryset = queryset.filter(dataHoraInicio__date=data)

        # Filtro por intervalo (data_inicio e data_fim YYYY-MM-DD)
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        if data_inicio:
            queryset = queryset.filter(dataHoraInicio__date__gte=data_inicio)
        if data_fim:
            queryset = queryset.filter(dataHoraInicio__date__lte=data_fim)

        # Filtro por paciente
        paciente_id = self.request.query_params.get('paciente')
        if paciente_id:
            queryset = queryset.filter(paciente_id=paciente_id)

        # Filtro por status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.upper())

        return queryset

    def perform_create(self, serializer):
        # Se usuário não for informado explicitamente, atribui o usuário logado
        if not serializer.validated_data.get('usuario'):
            serializer.save(usuario=self.request.user)
        else:
            serializer.save()

    @action(detail=True, methods=['patch'], url_path='atualizar_status')
    def atualizar_status(self, request, pk=None):
        """
        Altera apenas o status da sessão (ex: AGENDADA, CANCELADA, FALTA, REALIZADA) (RF06).
        """
        sessao = self.get_object()
        novo_status = request.data.get('status')

        if not novo_status:
            return Response(
                {'error': 'O campo status é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        novo_status_upper = novo_status.upper()
        if novo_status_upper not in Sessao.StatusChoices.values:
            return Response(
                {
                    'error': f'Status inválido. Escolha entre: {", ".join(Sessao.StatusChoices.values)}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        sessao.status = novo_status_upper
        sessao.save(update_fields=['status'])

        serializer = self.get_serializer(sessao)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DisponibilidadeViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Definição de Dias e Horários de Disponibilidade (RF05).
    """
    queryset = Disponibilidade.objects.all().select_related('usuario').order_by('diaSemana', 'horaInicio')
    serializer_class = DisponibilidadeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        usuario_id = self.request.query_params.get('usuario')
        if usuario_id:
            queryset = queryset.filter(usuario_id=usuario_id)
        return queryset

    def perform_create(self, serializer):
        if not serializer.validated_data.get('usuario'):
            serializer.save(usuario=self.request.user)
        else:
            serializer.save()


class BloqueioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Bloqueios de Horário/Dias com Motivo (RF05).
    """
    queryset = Bloqueio.objects.all().select_related('usuario').order_by('dataHoraInicio')
    serializer_class = BloqueioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        data = self.request.query_params.get('data')
        if data:
            queryset = queryset.filter(dataHoraInicio__date__lte=data, dataHoraFim__date__gte=data)

        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        if data_inicio:
            queryset = queryset.filter(dataHoraFim__date__gte=data_inicio)
        if data_fim:
            queryset = queryset.filter(dataHoraInicio__date__lte=data_fim)

        return queryset

    def perform_create(self, serializer):
        if not serializer.validated_data.get('usuario'):
            serializer.save(usuario=self.request.user)
        else:
            serializer.save()
