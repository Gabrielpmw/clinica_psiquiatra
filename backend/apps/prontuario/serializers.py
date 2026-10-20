from rest_framework import serializers
from .models import Anamnese, AnotacaoSessao


class AnamneseSerializer(serializers.ModelSerializer):
    """
    Serializer para Anamnese (RF07).
    Inclui informações do paciente (nome e data de nascimento) para o cabeçalho fixo do prontuário.
    Permite edição a qualquer momento.
    """
    paciente_nome = serializers.CharField(
        source='paciente.nomeCompleto',
        read_only=True
    )
    paciente_dataNascimento = serializers.DateField(
        source='paciente.dataNascimento',
        read_only=True
    )

    class Meta:
        model = Anamnese
        fields = [
            'id',
            'paciente',
            'paciente_nome',
            'paciente_dataNascimento',
            'escolaridade',
            'tipoParto',
            'intercorrencias',
            'seletividadeAlimentar',
            'dificuldadeRotina',
            'sensibilidadeEtiquetas',
            'historicoFamiliar',
            'adesaoRegras',
            'observacoesGerais',
            'dataRegistro',
            'dataUltimaAtualizacao',
        ]
        read_only_fields = ['id', 'paciente', 'dataRegistro', 'dataUltimaAtualizacao']


class AnotacaoSessaoSerializer(serializers.ModelSerializer):
    """
    Serializer para Anotações de Sessão (RF09).
    Exibe dados da sessão associada (tipo, data e status) para linha do tempo cronológica.
    """
    paciente_id = serializers.UUIDField(
        source='sessao.paciente.id',
        read_only=True
    )
    paciente_nome = serializers.CharField(
        source='sessao.paciente.nomeCompleto',
        read_only=True
    )
    sessao_tipo = serializers.CharField(
        source='sessao.tipo',
        read_only=True
    )
    sessao_tipo_display = serializers.CharField(
        source='sessao.get_tipo_display',
        read_only=True
    )
    sessao_dataHoraInicio = serializers.DateTimeField(
        source='sessao.dataHoraInicio',
        read_only=True
    )
    sessao_dataHoraFim = serializers.DateTimeField(
        source='sessao.dataHoraFim',
        read_only=True
    )
    sessao_status = serializers.CharField(
        source='sessao.status',
        read_only=True
    )

    class Meta:
        model = AnotacaoSessao
        fields = [
            'id',
            'sessao',
            'paciente_id',
            'paciente_nome',
            'sessao_tipo',
            'sessao_tipo_display',
            'sessao_dataHoraInicio',
            'sessao_dataHoraFim',
            'sessao_status',
            'textoLivre',
            'dataRegistro',
        ]
        read_only_fields = ['id', 'dataRegistro']
