from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    HealthCheckView,
    CustomTokenObtainPairView,
    MeView,
    ChangePasswordView,
    ForgotPasswordView,
    SolicitacaoResetViewSet,
    UsuarioViewSet
)

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'solicitacoes-reset', SolicitacaoResetViewSet, basename='solicitacao-reset')

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('auth/token/', CustomTokenObtainPairView.as_view(), name='token-obtain-pair-alias'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', MeView.as_view(), name='user-me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('', include(router.urls)),
]
