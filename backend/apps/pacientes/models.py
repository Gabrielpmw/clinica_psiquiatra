import uuid
from django.db import models
from django.utils import timezone


class Paciente(models.Model):
    """
    Modelo de Paciente para o Sistema da Clínica (RF02).
    Utiliza UUID v4 como chave primária (RNF05) e suporte a exclusão lógica (soft delete).
    """

    class SexoChoices(models.TextChoices):
        MASCULINO = 'M', 'Masculino'
        FEMININO = 'F', 'Feminino'
        OUTRO = 'OUTRO', 'Outro'

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Identificador único universal (UUID v4)'
    )
    nomeCompleto = models.CharField(
        max_length=200,
        verbose_name='Nome Completo'
    )
    dataNascimento = models.DateField(
        verbose_name='Data de Nascimento'
    )
    sexo = models.CharField(
        max_length=10,
        choices=SexoChoices.choices,
        default=SexoChoices.MASCULINO,
        verbose_name='Sexo'
    )
    status = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    dataCadastro = models.DateTimeField(
        default=timezone.now,
        verbose_name='Data de Cadastro'
    )

    class Meta:
        verbose_name = 'Paciente'
        verbose_name_plural = 'Pacientes'
        ordering = ['-dataCadastro']

    def __str__(self):
        return f"{self.nomeCompleto} ({'Ativo' if self.status else 'Inativo'})"


class Endereco(models.Model):
    """
    Endereço associado ao paciente (1 Paciente -> 1..* Endereços).
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Identificador único universal (UUID v4)'
    )
    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name='enderecos',
        verbose_name='Paciente'
    )
    tituloLocal = models.CharField(
        max_length=100,
        default='Principal',
        verbose_name='Título do Local',
        help_text='Ex: Casa da Mãe, Casa do Pai, Residencial'
    )
    cep = models.CharField(
        max_length=10,
        verbose_name='CEP'
    )
    logradouro = models.CharField(
        max_length=255,
        verbose_name='Logradouro'
    )
    numero = models.CharField(
        max_length=20,
        verbose_name='Número'
    )
    bairro = models.CharField(
        max_length=100,
        verbose_name='Bairro'
    )
    cidade = models.CharField(
        max_length=100,
        verbose_name='Cidade'
    )
    estado = models.CharField(
        max_length=2,
        verbose_name='Estado'
    )

    class Meta:
        verbose_name = 'Endereço'
        verbose_name_plural = 'Endereços'

    def __str__(self):
        return f"{self.tituloLocal}: {self.logradouro}, {self.numero} - {self.cidade}/{self.estado}"


class Responsavel(models.Model):
    """
    Responsável legal do paciente (1 Paciente -> 1..* Responsáveis).
    Obrigatório no cadastro conforme RF02 e diretrizes da clínica infantojuvenil.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Identificador único universal (UUID v4)'
    )
    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name='responsaveis',
        verbose_name='Paciente'
    )
    nomeCompleto = models.CharField(
        max_length=200,
        verbose_name='Nome Completo do Responsável'
    )
    cpf = models.CharField(
        max_length=14,
        verbose_name='CPF do Responsável'
    )
    contato = models.CharField(
        max_length=50,
        verbose_name='Telefone / Contato'
    )
    parentesco = models.CharField(
        max_length=50,
        verbose_name='Grau de Parentesco',
        help_text='Ex: Mãe, Pai, Avó, Tutor Legal'
    )

    class Meta:
        verbose_name = 'Responsável Legal'
        verbose_name_plural = 'Responsáveis Legais'

    def __str__(self):
        return f"{self.nomeCompleto} ({self.parentesco}) - Contato: {self.contato}"
