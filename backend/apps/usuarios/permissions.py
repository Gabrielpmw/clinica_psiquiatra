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
    Permissão para rotas administrativas/recepção, permitindo Secretária e Administração (RF02).
    """
    message = "Acesso restrito à Recepção/Secretaria ou Administração."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.status and
            request.user.role in [Usuario.Role.ADMINISTRACAO, Usuario.Role.SECRETARIA]
        )


class IsDoctorOrAdmin(BasePermission):
    """
    Permissão para rotas clínicas (Doutora ou Administração) (RNF03).
    Bloqueia estritamente o perfil SECRETARIA.
    """
    message = "Acesso restrito ao perfil clínico (Doutora) ou Administração."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.status and
            request.user.role in [Usuario.Role.ADMINISTRACAO, Usuario.Role.DOUTORA]
        )
