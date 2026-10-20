from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AnamneseDetailView,
    AnotacaoSessaoListCreateView,
    AnotacaoSessaoViewSet,
)

router = DefaultRouter()
router.register(r'anotacoes-geral', AnotacaoSessaoViewSet, basename='anotacao-geral')

urlpatterns = [
    path('anamnese/<uuid:paciente_id>/', AnamneseDetailView.as_view(), name='prontuario-anamnese'),
    path('anotacoes/<uuid:paciente_id>/', AnotacaoSessaoListCreateView.as_view(), name='prontuario-anotacoes-paciente'),
    path('', include(router.urls)),
]
