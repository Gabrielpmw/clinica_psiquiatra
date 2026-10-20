from django.contrib import admin
from .models import Sessao, Disponibilidade, Bloqueio


@admin.register(Sessao)
class SessaoAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'usuario', 'dataHoraInicio', 'dataHoraFim', 'status', 'tipo')
    list_filter = ('status', 'tipo', 'dataHoraInicio')
    search_fields = ('paciente__nomeCompleto', 'usuario__nome')


@admin.register(Disponibilidade)
class DisponibilidadeAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'diaSemana', 'horaInicio', 'horaFim')
    list_filter = ('diaSemana',)
    search_fields = ('usuario__nome',)


@admin.register(Bloqueio)
class BloqueioAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'dataHoraInicio', 'dataHoraFim', 'motivo')
    list_filter = ('dataHoraInicio',)
    search_fields = ('usuario__nome', 'motivo')
