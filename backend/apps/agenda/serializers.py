from rest_framework import serializers
from .models import Sessao, Disponibilidade, Bloqueio


class SessaoSerializer(serializers.ModelSerializer):
    """
    Serializer para Sessao com validação de horário e detecção de sobreposição.
    """
    paciente_nome = serializers.CharField(
        source='paciente.nomeCompleto',
        read_only=True
    )
    paciente_id = serializers.UUIDField(
        source='paciente.id',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    tipo_display = serializers.CharField(
        source='get_tipo_display',
        read_only=True
    )

    class Meta:
        model = Sessao
        fields = [
            'id', 'paciente', 'paciente_id', 'paciente_nome',
            'usuario', 'dataHoraInicio', 'dataHoraFim',
            'status', 'status_display', 'tipo', 'tipo_display',
        ]
        read_only_fields = ['id', 'paciente_id', 'paciente_nome', 'status_display', 'tipo_display']

    def validate(self, data):
        inicio = data.get('dataHoraInicio')
        fim = data.get('dataHoraFim')

        # Para atualizações parciais, recuperar valores do objeto existente
        if self.instance:
            inicio = inicio or self.instance.dataHoraInicio
            fim = fim or self.instance.dataHoraFim

        if inicio and fim and fim <= inicio:
            raise serializers.ValidationError(
                {'dataHoraFim': 'A hora de fim deve ser posterior à hora de início.'}
            )

        # Detecção de sobreposição de sessões para o mesmo paciente
        if inicio and fim and data.get('paciente'):
            paciente = data['paciente']
            qs = Sessao.objects.filter(
                paciente=paciente,
                status=Sessao.StatusChoices.AGENDADA,
                dataHoraInicio__lt=fim,
                dataHoraFim__gt=inicio,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    'Já existe uma sessão agendada para este paciente neste intervalo de horário.'
                )

        return data


class DisponibilidadeSerializer(serializers.ModelSerializer):
    """Serializer para os slots de disponibilidade da doutora."""

    class Meta:
        model = Disponibilidade
        fields = ['id', 'usuario', 'diaSemana', 'horaInicio', 'horaFim']
        read_only_fields = ['id', 'usuario']

    def validate(self, data):
        dia = data.get('diaSemana')
        if dia is not None and not (0 <= dia <= 6):
            raise serializers.ValidationError(
                {'diaSemana': 'Dia da semana deve ser entre 0 (Segunda) e 6 (Domingo).'}
            )
        inicio = data.get('horaInicio')
        fim = data.get('horaFim')
        if inicio and fim and fim <= inicio:
            raise serializers.ValidationError(
                {'horaFim': 'A hora de fim deve ser posterior à hora de início.'}
            )
        return data


class BloqueioSerializer(serializers.ModelSerializer):
    """Serializer para bloqueios de horário na agenda da doutora."""

    class Meta:
        model = Bloqueio
        fields = ['id', 'usuario', 'dataHoraInicio', 'dataHoraFim', 'motivo', 'dataCriacao']
        read_only_fields = ['id', 'usuario', 'dataCriacao']

    def validate(self, data):
        inicio = data.get('dataHoraInicio')
        fim = data.get('dataHoraFim')
        if inicio and fim and fim <= inicio:
            raise serializers.ValidationError(
                {'dataHoraFim': 'A hora de fim deve ser posterior à hora de início.'}
            )
        return data
