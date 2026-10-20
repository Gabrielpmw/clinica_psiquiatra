import uuid
from django.db import models


class Anamnese(models.Model):
    """
    Anamnese inicial do paciente (RF07).
    Relação 1:1 com Paciente.
    Contém campos estruturados para os critérios de avaliação clínica
    e um campo de texto livre adicional (observacoesGerais) solicitado pelo usuário.
    Editável a qualquer momento (RF07).
    Utiliza UUID v4 como chave primária (RNF05).
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Identificador único universal (UUID v4)'
    )
    paciente = models.OneToOneField(
        'pacientes.Paciente',
        on_delete=models.CASCADE,
        related_name='anamnese',
        verbose_name='Paciente'
    )

    # ── Critérios de avaliação estruturados (RF07) ──────────────────────────
    escolaridade = models.TextField(
        blank=True,
        verbose_name='Escolaridade',
        help_text='Nível de escolaridade atual da criança'
    )
    tipoParto = models.TextField(
        blank=True,
        verbose_name='Tipo de Parto',
        help_text='Normal, cesáriana ou fórceps; possíveis intercorrências no parto'
    )
    intercorrencias = models.TextField(
        blank=True,
        verbose_name='Intercorrências',
        help_text='Intercorrências pré, peri e pós-natais relevantes'
    )
    seletividadeAlimentar = models.TextField(
        blank=True,
        verbose_name='Seletividade Alimentar',
        help_text='Alimentos recusados, texturas ou sabores problemáticos'
    )
    dificuldadeRotina = models.TextField(
        blank=True,
        verbose_name='Dificuldade com Rotina',
        help_text='Comportamentos observados em mudanças de rotina'
    )
    sensibilidadeEtiquetas = models.TextField(
        blank=True,
        verbose_name='Sensibilidade a Etiquetas/Roupas',
        help_text='Reações a roupas com etiquetas, tecidos ou texturas específicas'
    )
    historicoFamiliar = models.TextField(
        blank=True,
        verbose_name='Histórico Familiar',
        help_text='Histórico familiar de autismo, TEA ou outros transtornos do neurodesenvolvimento'
    )
    adesaoRegras = models.TextField(
        blank=True,
        verbose_name='Adesão a Regras',
        help_text='Comportamento da criança frente a regras e limites'
    )

    # ── Campo de texto livre adicional (solicitado pelo usuário) ─────────────
    observacoesGerais = models.TextField(
        null=True,
        blank=True,
        verbose_name='Observações Gerais',
        help_text='Campo livre para anotações adicionais da doutora não cobertas pelos campos acima'
    )

    # ── Controle de tempo ────────────────────────────────────────────────────
    dataRegistro = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data de Registro'
    )
    dataUltimaAtualizacao = models.DateTimeField(
        auto_now=True,
        verbose_name='Última Atualização'
    )

    class Meta:
        verbose_name = 'Anamnese'
        verbose_name_plural = 'Anamneses'

    def __str__(self):
        return f"Anamnese de {self.paciente.nomeCompleto}"


class AnotacaoSessao(models.Model):
    """
    Anotação de sessão de acompanhamento em texto livre (RF09).
    Relação 1:1 com Sessao (cada sessão tem no máximo uma anotação).
    Exibida em linha do tempo cronológica no prontuário.
    Utiliza UUID v4 como chave primária (RNF05).
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Identificador único universal (UUID v4)'
    )
    sessao = models.OneToOneField(
        'agenda.Sessao',
        on_delete=models.CASCADE,
        related_name='anotacao',
        verbose_name='Sessão'
    )
    textoLivre = models.TextField(
        verbose_name='Anotação da Sessão',
        help_text='Texto livre da doutora sobre a sessão (Avaliativa ou Interventiva)'
    )
    dataRegistro = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data de Registro'
    )

    class Meta:
        verbose_name = 'Anotação de Sessão'
        verbose_name_plural = 'Anotações de Sessão'
        ordering = ['dataRegistro']

    def __str__(self):
        return (
            f"Anotação — {self.sessao.paciente.nomeCompleto} "
            f"em {self.dataRegistro.strftime('%d/%m/%Y %H:%M')}"
        )
