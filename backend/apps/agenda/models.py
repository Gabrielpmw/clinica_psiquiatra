import uuid
from django.db import models
from django.utils import timezone


class Sessao(models.Model):
    """
    Sessão de atendimento clínico (RF03, RF04, RF05, RF06).
    Relaciona um paciente a um usuário (quem agendou/conduziu a sessão).
    Utiliza UUID v4 como chave primária (RNF05).
    """

    class StatusChoices(models.TextChoices):
        AGENDADA = 'AGENDADA', 'Agendada'
        CANCELADA = 'CANCELADA', 'Cancelada'
        FALTA = 'FALTA', 'Falta'
        REALIZADA = 'REALIZADA', 'Realizada'

    class TipoChoices(models.TextChoices):
        AVALIATIVA = 'AVALIATIVA', 'Avaliativa'
        INTERVENTIVA = 'INTERVENTIVA', 'Interventiva'

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Identificador único universal (UUID v4)'
    )
    paciente = models.ForeignKey(
        'pacientes.Paciente',
        on_delete=models.CASCADE,
        related_name='sessoes',
        verbose_name='Paciente'
    )
    usuario = models.ForeignKey(
        'usuarios.Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessoes_conduzidas',
        verbose_name='Usuário responsável'
    )
    dataHoraInicio = models.DateTimeField(
        verbose_name='Data e Hora de Início'
    )
    dataHoraFim = models.DateTimeField(
        verbose_name='Data e Hora de Fim'
    )
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.AGENDADA,
        verbose_name='Status da Sessão'
    )
    tipo = models.CharField(
        max_length=20,
        choices=TipoChoices.choices,
        default=TipoChoices.AVALIATIVA,
        verbose_name='Tipo de Sessão'
    )

    class Meta:
        verbose_name = 'Sessão'
        verbose_name_plural = 'Sessões'
        ordering = ['dataHoraInicio']

    def __str__(self):
        return (
            f"{self.paciente.nomeCompleto} — "
            f"{self.dataHoraInicio.strftime('%d/%m/%Y %H:%M')} "
            f"({self.get_tipo_display()} / {self.get_status_display()})"
        )


class Disponibilidade(models.Model):
    """
    Define os dias e horários em que a doutora está disponível para atendimento (RF05).
    diaSemana: 0 = Segunda, 6 = Domingo.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Identificador único universal (UUID v4)'
    )
    usuario = models.ForeignKey(
        'usuarios.Usuario',
        on_delete=models.CASCADE,
        related_name='disponibilidades',
        verbose_name='Doutora'
    )
    diaSemana = models.IntegerField(
        verbose_name='Dia da Semana',
        help_text='0 = Segunda-feira, 6 = Domingo'
    )
    horaInicio = models.TimeField(
        verbose_name='Hora de Início'
    )
    horaFim = models.TimeField(
        verbose_name='Hora de Fim'
    )

    class Meta:
        verbose_name = 'Disponibilidade'
        verbose_name_plural = 'Disponibilidades'
        ordering = ['diaSemana', 'horaInicio']

    def __str__(self):
        dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
        dia = dias[self.diaSemana] if 0 <= self.diaSemana <= 6 else str(self.diaSemana)
        return f"{self.usuario.nome} — {dia} {self.horaInicio}–{self.horaFim}"


class Bloqueio(models.Model):
    """
    Bloqueia um período da agenda da doutora, impedindo novos agendamentos (RF05).
    O campo motivo é obrigatório para rastreabilidade.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Identificador único universal (UUID v4)'
    )
    usuario = models.ForeignKey(
        'usuarios.Usuario',
        on_delete=models.CASCADE,
        related_name='bloqueios',
        verbose_name='Doutora'
    )
    dataHoraInicio = models.DateTimeField(
        verbose_name='Início do Bloqueio'
    )
    dataHoraFim = models.DateTimeField(
        verbose_name='Fim do Bloqueio'
    )
    motivo = models.CharField(
        max_length=255,
        verbose_name='Motivo do Bloqueio'
    )
    dataCriacao = models.DateTimeField(
        default=timezone.now,
        verbose_name='Data de Criação'
    )

    class Meta:
        verbose_name = 'Bloqueio de Horário'
        verbose_name_plural = 'Bloqueios de Horário'
        ordering = ['dataHoraInicio']

    def __str__(self):
        return (
            f"Bloqueio: {self.dataHoraInicio.strftime('%d/%m/%Y %H:%M')} "
            f"até {self.dataHoraFim.strftime('%d/%m/%Y %H:%M')} — {self.motivo}"
        )
