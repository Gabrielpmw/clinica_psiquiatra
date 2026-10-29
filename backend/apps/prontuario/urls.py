from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AnamneseDetailView,
    AnotacaoSessaoListCreateView,
    AnotacaoSessaoViewSet,
    AnotacaoSessaoDetailView,
    PromptCatalogListView,
    GerarResumoIaView,
    ResumoIaListCreateView,
    ResumoIaDetailView,
    ParecerConclusivoListCreateView,
    ParecerConclusivoDetailView,
    ParecerConclusivoPdfView,
    ParecerConclusivoEmailView,
)

router = DefaultRouter()
router.register(r'anotacoes-geral', AnotacaoSessaoViewSet, basename='anotacao-geral')

urlpatterns = [
    # Anamnese e Anotações (Desafios 6 e 7)
    path('anamnese/<uuid:paciente_id>/', AnamneseDetailView.as_view(), name='prontuario-anamnese'),
    path('anotacoes/<uuid:paciente_id>/', AnotacaoSessaoListCreateView.as_view(), name='prontuario-anotacoes-paciente'),
    path('anotacoes/detalhe/<uuid:pk>/', AnotacaoSessaoDetailView.as_view(), name='prontuario-anotacao-detalhe'),

    # Módulo de IA (Desafios 8 e 9)
    path('ia/prompts/', PromptCatalogListView.as_view(), name='prontuario-ia-prompts'),
    path('pacientes/<uuid:paciente_id>/ia/gerar/', GerarResumoIaView.as_view(), name='prontuario-ia-gerar'),
    path('pacientes/<uuid:paciente_id>/ia/resumos/', ResumoIaListCreateView.as_view(), name='prontuario-ia-resumos'),
    path('ia/resumos/<uuid:pk>/', ResumoIaDetailView.as_view(), name='prontuario-ia-resumo-detalhe'),

    # Parecer Conclusivo, PDF e E-mail
    path('pacientes/<uuid:paciente_id>/pareceres/', ParecerConclusivoListCreateView.as_view(), name='prontuario-pareceres-paciente'),
    path('pareceres/<uuid:pk>/', ParecerConclusivoDetailView.as_view(), name='prontuario-parecer-detalhe'),
    path('pareceres/<uuid:pk>/pdf/', ParecerConclusivoPdfView.as_view(), name='prontuario-parecer-pdf'),
    path('pareceres/<uuid:pk>/email/', ParecerConclusivoEmailView.as_view(), name='prontuario-parecer-email'),

    path('', include(router.urls)),
]
