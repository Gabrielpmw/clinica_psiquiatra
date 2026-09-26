from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from apps.usuarios.permissions import IsSecretariaOrAdmin
from .models import Paciente
from .serializers import PacienteSerializer


class PacientePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class PacienteViewSet(viewsets.ModelViewSet):
    """
    Controller para Gerenciamento de Pacientes (RF02).
    Permissões:
    - Leitura (list, retrieve): Qualquer funcionário autenticado da clínica.
    - Escrita (create, update, partial_update, destroy, toggle_status): Secretária ou Administração.
    """
    queryset = Paciente.objects.all().prefetch_related('enderecos', 'responsaveis').order_by('-dataCadastro')
    serializer_class = PacienteSerializer
    pagination_class = PacientePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nomeCompleto', 'responsaveis__nomeCompleto', 'responsaveis__cpf']
    ordering_fields = ['nomeCompleto', 'dataNascimento', 'dataCadastro', 'status']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'toggle_status']:
            return [IsSecretariaOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro de status: 'true', 'false' ou omitido para listar
        status_param = self.request.query_params.get('status')
        if status_param is not None:
            if status_param.lower() in ['true', '1', 'ativo']:
                queryset = queryset.filter(status=True)
            elif status_param.lower() in ['false', '0', 'inativo']:
                queryset = queryset.filter(status=False)

        # Filtro adicional de busca por nome se fornecido via query param 'q' ou 'search'
        search_query = self.request.query_params.get('q')
        if search_query:
            queryset = queryset.filter(nomeCompleto__icontains=search_query)

        return queryset

    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        """
        Alterna o status do paciente entre ativo e inativo (soft delete/reativação) preservando o histórico clínico.
        """
        paciente = self.get_object()
        paciente.status = not paciente.status
        paciente.save(update_fields=['status'])

        return Response(
            {
                "id": str(paciente.id),
                "nomeCompleto": paciente.nomeCompleto,
                "status": paciente.status,
                "message": f"Paciente {'ativado' if paciente.status else 'inativado'} com sucesso."
            },
            status=status.HTTP_200_OK
        )
