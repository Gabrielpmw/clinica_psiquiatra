from rest_framework.permissions import BasePermission
from .models import Usuario


class IsAdminUserRole(BasePermission):
    """
    Permissão que concede acesso exclusivamente a usuários com perfil ADMINISTRACAO (RF01, RNF03).
    """
    message = "Acesso restrito ao perfil de Administração."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.status and
            request.user.role == Usuario.Role.ADMINISTRACAO
        )


class IsSecretariaOrAdmin(BasePermission):
    """
    Permissão para rotas da recepção/secretária (RF02).
    Bloqueia administração (que gerencia apenas usuários).
    """
    message = "Acesso restrito à Recepção/Secretaria."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.status and
            request.user.role == Usuario.Role.SECRETARIA
        )


class IsDoctorOrAdmin(BasePermission):
    """
    Permissão para rotas clínicas exclusivas da Medicina/Psiquiatria (RNF03).
    Bloqueia estritamente os perfis SECRETARIA e ADMINISTRACAO.
    """
    message = "Acesso restrito ao perfil clínico (Médico(a) Psiquiatra)."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.status and
            request.user.role == Usuario.Role.DOUTORA
        )


class IsNonAdminRole(BasePermission):
    """
    Bloqueia estritamente o perfil ADMINISTRACAO de rotas operacionais (agenda, pacientes, prontuário).
    """
    message = "Acesso restrito à equipe operacional e clínica. Administrador gerencia apenas usuários."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.status and
            request.user.role != Usuario.Role.ADMINISTRACAO
        )
