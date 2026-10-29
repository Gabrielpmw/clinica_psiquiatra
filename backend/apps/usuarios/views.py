from django.db import connection
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario, SolicitacaoResetSenha
from .permissions import IsAdminUserRole
from .serializers import (
    UsuarioSerializer,
    UsuarioCreateSerializer,
    UsuarioUpdateSerializer,
    ResetPasswordSerializer,
    CustomTokenObtainPairSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer,
    SolicitacaoResetSenhaSerializer,
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
    Retorna ou atualiza os dados do usuário atualmente autenticado a partir do token JWT.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        return self.patch(request)


class ChangePasswordView(APIView):
    """
    Endpoint para que qualquer usuário autenticado altere sua própria senha com validação da senha atual.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Senha alterada com sucesso."},
            status=status.HTTP_200_OK
        )


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

        # Marca qualquer solicitação pendente deste usuário como concluída
        SolicitacaoResetSenha.objects.filter(
            usuario=usuario,
            status=SolicitacaoResetSenha.Status.PENDENTE
        ).update(
            status=SolicitacaoResetSenha.Status.CONCLUIDO,
            dataResolucao=timezone.now(),
            resolvidoPor=request.user
        )

        return Response(
            {"message": f"Senha de {usuario.nome} redefinida com sucesso."},
            status=status.HTTP_200_OK
        )


class ForgotPasswordView(APIView):
    """
    Endpoint público para solicitação de redefinição de senha na tela de login.
    Cria uma notificação/solicitação para que o Administrador da clínica visualize e redefina.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email or '@' not in email:
            return Response(
                {"error": "Informe um endereço de e-mail válido."},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario = Usuario.objects.filter(email__iexact=email, status=True).first()
        if usuario:
            # Cria solicitação pendente
            SolicitacaoResetSenha.objects.create(
                usuario=usuario,
                email=usuario.email,
                status=SolicitacaoResetSenha.Status.PENDENTE
            )

        return Response(
            {
                "message": "Solicitação registrada com sucesso. A administração da clínica foi notificada no painel para redefinir sua senha."
            },
            status=status.HTTP_200_OK
        )


class SolicitacaoResetViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoint para a Administração visualizar e gerenciar solicitações pendentes de redefinição de senha.
    """
    serializer_class = SolicitacaoResetSenhaSerializer
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        status_param = self.request.query_params.get('status', 'PENDENTE')
        if status_param == 'TODOS':
            return SolicitacaoResetSenha.objects.all().select_related('usuario', 'resolvidoPor').order_by('-dataSolicitacao')
        return SolicitacaoResetSenha.objects.filter(status=status_param).select_related('usuario', 'resolvidoPor').order_by('-dataSolicitacao')

    @action(detail=True, methods=['post'], url_path='resolver')
    def resolver(self, request, pk=None):
        """Redefine a senha do usuário associado e conclui a solicitação."""
        solicitacao = self.get_object()
        new_password = request.data.get('new_password')
        if not new_password or len(new_password) < 8:
            return Response(
                {"error": "A nova senha deve ter no mínimo 8 caracteres."},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario = solicitacao.usuario
        usuario.set_password(new_password)
        usuario.save()

        solicitacao.status = SolicitacaoResetSenha.Status.CONCLUIDO
        solicitacao.dataResolucao = timezone.now()
        solicitacao.resolvidoPor = request.user
        solicitacao.save()

        # Conclui outras pendências do mesmo usuário se houver
        SolicitacaoResetSenha.objects.filter(
            usuario=usuario,
            status=SolicitacaoResetSenha.Status.PENDENTE
        ).exclude(pk=solicitacao.pk).update(
            status=SolicitacaoResetSenha.Status.CONCLUIDO,
            dataResolucao=timezone.now(),
            resolvidoPor=request.user
        )

        return Response(
            {"message": f"Senha do usuário {usuario.nome} alterada com sucesso."},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='cancelar')
    def cancelar(self, request, pk=None):
        solicitacao = self.get_object()
        solicitacao.status = SolicitacaoResetSenha.Status.CANCELADO
        solicitacao.dataResolucao = timezone.now()
        solicitacao.resolvidoPor = request.user
        solicitacao.save()
        return Response(
            {"message": "Solicitação descartada."},
            status=status.HTTP_200_OK
        )
