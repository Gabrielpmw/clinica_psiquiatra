from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    list_display = ('email', 'nome', 'role', 'status', 'is_staff', 'dataCriacao')
    list_filter = ('role', 'status', 'is_staff')
    search_fields = ('email', 'nome')
    ordering = ('-dataCriacao',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informações Pessoais', {'fields': ('nome', 'role', 'status')}),
        ('Permissões', {'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Datas Importantes', {'fields': ('last_login', 'dataCriacao')}),
    )

    readonly_fields = ('dataCriacao', 'last_login')

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nome', 'role', 'password', 'status', 'is_staff'),
        }),
    )
