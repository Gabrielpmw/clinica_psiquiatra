from django.db import transaction
from rest_framework import serializers
from .models import Paciente, Endereco, Responsavel


class EnderecoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Endereco
        fields = [
            'id',
            'tituloLocal',
            'cep',
            'logradouro',
            'numero',
            'bairro',
            'cidade',
            'estado'
        ]
        read_only_fields = ['id']


class ResponsavelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Responsavel
        fields = [
            'id',
            'nomeCompleto',
            'cpf',
            'contato',
            'parentesco'
        ]
        read_only_fields = ['id']


class PacienteSerializer(serializers.ModelSerializer):
    """
    Serializer completo de Paciente com escrita aninhada atômica (RF02).
    Garante a criação consistente de paciente, endereço e responsável legal.
    """
    enderecos = EnderecoSerializer(many=True, required=False)
    responsaveis = ResponsavelSerializer(many=True, required=False)

    class Meta:
        model = Paciente
        fields = [
            'id',
            'nomeCompleto',
            'dataNascimento',
            'sexo',
            'status',
            'dataCadastro',
            'enderecos',
            'responsaveis'
        ]
        read_only_fields = ['id', 'dataCadastro']

    def validate(self, attrs):
        # Validação na criação de paciente
        if self.instance is None:
            # Verifica se foi enviado no formato de lista ou objeto singular
            initial_data = self.initial_data
            responsaveis_input = initial_data.get('responsaveis') or initial_data.get('responsavel')
            if not responsaveis_input:
                raise serializers.ValidationError({
                    'responsaveis': 'É obrigatório o cadastramento de ao menos um responsável legal para o paciente.'
                })
        return attrs

    def create(self, validated_data):
        initial_data = self.initial_data

        # Suporte a listas 'enderecos'/'responsaveis' ou formato plano 'endereco'/'responsavel'
        enderecos_data = validated_data.pop('enderecos', [])
        if not enderecos_data and 'endereco' in initial_data:
            enderecos_data = [initial_data['endereco']]

        responsaveis_data = validated_data.pop('responsaveis', [])
        if not responsaveis_data and 'responsavel' in initial_data:
            responsaveis_data = [initial_data['responsavel']]

        if not responsaveis_data:
            raise serializers.ValidationError({
                'responsaveis': 'É obrigatório informar os dados do responsável legal.'
            })

        with transaction.atomic():
            paciente = Paciente.objects.create(**validated_data)

            for endereco_item in enderecos_data:
                # Remove id se vier vazio
                endereco_item.pop('id', None)
                Endereco.objects.create(paciente=paciente, **endereco_item)

            for resp_item in responsaveis_data:
                resp_item.pop('id', None)
                Responsavel.objects.create(paciente=paciente, **resp_item)

            return paciente

    def update(self, instance, validated_data):
        initial_data = self.initial_data
        enderecos_data = validated_data.pop('enderecos', None)
        responsaveis_data = validated_data.pop('responsaveis', None)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if enderecos_data is not None:
                instance.enderecos.all().delete()
                for endereco_item in enderecos_data:
                    endereco_item.pop('id', None)
                    Endereco.objects.create(paciente=instance, **endereco_item)
            elif 'endereco' in initial_data:
                instance.enderecos.all().delete()
                item = initial_data['endereco']
                item.pop('id', None)
                Endereco.objects.create(paciente=instance, **item)

            if responsaveis_data is not None:
                instance.responsaveis.all().delete()
                for resp_item in responsaveis_data:
                    resp_item.pop('id', None)
                    Responsavel.objects.create(paciente=instance, **resp_item)
            elif 'responsavel' in initial_data:
                instance.responsaveis.all().delete()
                item = initial_data['responsavel']
                item.pop('id', None)
                Responsavel.objects.create(paciente=instance, **item)

            return instance
