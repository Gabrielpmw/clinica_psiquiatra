from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SessaoViewSet, DisponibilidadeViewSet, BloqueioViewSet

router = DefaultRouter()
router.register(r'sessoes', SessaoViewSet, basename='sessao')
router.register(r'disponibilidade', DisponibilidadeViewSet, basename='disponibilidade')
router.register(r'bloqueios', BloqueioViewSet, basename='bloqueio')

urlpatterns = [
    path('', include(router.urls)),
]
