from django.contrib import admin
from .models import Anamnese, AnotacaoSessao


@admin.register(Anamnese)
class AnamneseAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'dataRegistro', 'dataUltimaAtualizacao')
    search_fields = ('paciente__nomeCompleto',)


@admin.register(AnotacaoSessao)
class AnotacaoSessaoAdmin(admin.ModelAdmin):
    list_display = ('sessao', 'dataRegistro')
    search_fields = ('sessao__paciente__nomeCompleto', 'textoLivre')
