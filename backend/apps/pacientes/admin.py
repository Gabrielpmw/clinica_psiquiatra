from django.contrib import admin
from .models import Paciente, Endereco, Responsavel


class EnderecoInline(admin.StackedInline):
    model = Endereco
    extra = 0


class ResponsavelInline(admin.StackedInline):
    model = Responsavel
    extra = 0


@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = ('nomeCompleto', 'dataNascimento', 'sexo', 'status', 'dataCadastro')
    list_filter = ('status', 'sexo', 'dataCadastro')
    search_fields = ('nomeCompleto', 'responsaveis__nomeCompleto', 'responsaveis__cpf')
    inlines = [EnderecoInline, ResponsavelInline]
