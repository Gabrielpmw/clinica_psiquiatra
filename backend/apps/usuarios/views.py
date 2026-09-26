from django.db import connection
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario
from .permissions import IsAdminUserRole
from .serializers import (
    UsuarioSerializer,
    UsuarioCreateSerializer,
    UsuarioUpdateSerializer,
    ResetPasswordSerializer,
    CustomTokenObtainPairSerializer,
)


class HealthCheckView(APIView):
    """
    Controller para verificação de integridade e conectividade da API.
    Retorna 200 se a aplicação Django e o PostgreSQL estiverem operacionais.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        db_status = "connected"
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
        except Exception as e:
            db_status = f"unreachable: {str(e)}"
            return Response(
                {
                    "status": "error",
                    "service": "clinica-api",
                    "database": db_status
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(
            {
                "status": "ok",
                "service": "clinica-api",
                "database": db_status
            },
            status=status.HTTP_200_OK
        )


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Endpoint de login via JWT que retorna access token, refresh token e dados do usuário logado com papel RBAC.
    """
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    """
    Retorna os dados do usuário atualmente autenticado a partir do token JWT.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    Controller para gerenciamento completo de Usuários / Funcionários da clínica (RF01, RNF03).
    Acesso restrito estritamente ao perfil de Administração (IsAdminUserRole).
    """
    queryset = Usuario.objects.all().order_by('-dataCriacao')
    permission_classes = [IsAdminUserRole]

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UsuarioUpdateSerializer
        elif self.action == 'reset_password':
            return ResetPasswordSerializer
        return UsuarioSerializer

    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        """Alterna o status do usuário entre ativo e inativo (soft delete/reativação)."""
        usuario = self.get_object()
        usuario.status = not usuario.status
        usuario.save(update_fields=['status'])
        return Response(
            {
                "id": str(usuario.id),
                "nome": usuario.nome,
                "status": usuario.status,
                "message": f"Usuário {'ativado' if usuario.status else 'inativado'} com sucesso."
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """Redefine a senha de um funcionário."""
        usuario = self.get_object()
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(usuario, serializer.validated_data)
        return Response(
            {"message": "Senha redefinida com sucesso."},
            status=status.HTTP_200_OK
        )
