from rest_framework.exceptions import NotAuthenticated, PermissionDenied, NotFound
from apps.usuarios.models import Usuario
from .models import Paciente, ConcessaoAcessoPaciente


def check_patient_doctor_access(user, paciente_id):
    """
    Verifica se a profissional autenticada possui permissão clínica (DOUTORA)
    e concessão de acesso explícita e ativa ao paciente.
    - Sem autenticação -> HTTP 401
    - Perfil não-médico (SECRETARIA, ADMINISTRACAO) -> HTTP 403
    - Paciente inexistente ou sem concessão ativa -> HTTP 404
    """
    if not user or not user.is_authenticated:
        raise NotAuthenticated("Autenticação necessária.")

    if not user.status or user.role != Usuario.Role.DOUTORA:
        raise PermissionDenied("Acesso restrito ao perfil clínico (Médico(a) Psiquiatra).")

    try:
        paciente = Paciente.objects.get(id=paciente_id)
    except (Paciente.DoesNotExist, ValueError, TypeError):
        raise NotFound("Paciente não encontrado.")

    tem_concessao = ConcessaoAcessoPaciente.objects.filter(
        paciente=paciente,
        profissional=user,
        ativo=True
    ).exists()

    if not tem_concessao:
        raise NotFound("Paciente não encontrado.")

    return paciente
