from datetime import date, datetime, timedelta
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.usuarios.permissions import IsNonAdminRole
from .models import Sessao, Disponibilidade, Bloqueio
from .serializers import SessaoSerializer, DisponibilidadeSerializer, BloqueioSerializer


class SessaoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Gestão de Sessões da Agenda (RF03, RF04, RF05, RF06).
    Suporta filtros por data, paciente e status.
    """
    queryset = Sessao.objects.all().select_related('paciente', 'usuario').order_by('dataHoraInicio')
    serializer_class = SessaoSerializer
    permission_classes = [IsAuthenticated, IsNonAdminRole]
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

    @action(detail=True, methods=['patch'], url_path='atualizar_pagamento')
    def atualizar_pagamento(self, request, pk=None):
        """
        Altera apenas o indicador de pagamento da sessão (pago: True/False).
        """
        sessao = self.get_object()
        pago = request.data.get('pago')

        if pago is None:
            return Response(
                {'error': 'O campo pago é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(pago, bool):
            if str(pago).lower() in ['true', '1']:
                pago = True
            elif str(pago).lower() in ['false', '0']:
                pago = False
            else:
                return Response(
                    {'error': 'O campo pago deve ser um booleano (true ou false).'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        sessao.pago = pago
        sessao.save(update_fields=['pago'])

        serializer = self.get_serializer(sessao)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='remarcar')
    def remarcar(self, request, pk=None):
        """
        Remarca uma sessão para outro dia/horário (ex.: via arrastar e soltar na agenda),
        preservando o horário/duração originais quando `nova_data` é informada e alterando
        automaticamente o status para AGENDADA.
        """
        sessao = self.get_object()
        if sessao.status == Sessao.StatusChoices.REALIZADA:
            return Response(
                {'error': 'Sessões já realizadas não podem ser remarcadas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nova_data = request.data.get('nova_data')
        data_inicio = request.data.get('dataHoraInicio')
        data_fim = request.data.get('dataHoraFim')

        if nova_data:
            if not isinstance(nova_data, str):
                return Response(
                    {'error': 'O campo nova_data deve estar no formato YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                target_date = date.fromisoformat(nova_data)
            except ValueError:
                return Response(
                    {'error': 'Data inválida em nova_data. Utilize o formato YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            tz = timezone.get_current_timezone()
            local_inicio = timezone.localtime(sessao.dataHoraInicio, tz)
            local_fim = timezone.localtime(sessao.dataHoraFim, tz)
            duracao = local_fim - local_inicio
            if duracao.total_seconds() <= 0:
                duracao = timedelta(minutes=50)

            novo_inicio = timezone.make_aware(
                datetime.combine(target_date, local_inicio.time()),
                tz,
            )
            novo_fim = novo_inicio + duracao
            update_payload = {
                'dataHoraInicio': novo_inicio.isoformat(),
                'dataHoraFim': novo_fim.isoformat(),
                'status': Sessao.StatusChoices.AGENDADA,
            }
        elif data_inicio:
            update_payload = {
                'dataHoraInicio': data_inicio,
                'status': Sessao.StatusChoices.AGENDADA,
            }
            if data_fim:
                update_payload['dataHoraFim'] = data_fim
        else:
            return Response(
                {'error': 'Informe nova_data (YYYY-MM-DD) ou dataHoraInicio para remarcar.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(sessao, data=update_payload, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class DisponibilidadeViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Definição de Dias e Horários de Disponibilidade (RF05).
    """
    queryset = Disponibilidade.objects.all().select_related('usuario').order_by('diaSemana', 'horaInicio')
    serializer_class = DisponibilidadeSerializer
    permission_classes = [IsAuthenticated, IsNonAdminRole]

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
    permission_classes = [IsAuthenticated, IsNonAdminRole]

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
