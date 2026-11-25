import uuid
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, ValidationError

from apps.pacientes.models import Paciente
from apps.pacientes.permissions import check_patient_doctor_access
from apps.agenda.models import Sessao
from apps.usuarios.permissions import IsDoctorOrAdmin
from .models import Anamnese, AnotacaoSessao, ResumoIa, ParecerConclusivo
from .serializers import (
    AnamneseSerializer,
    AnotacaoSessaoSerializer,
    ResumoIaSerializer,
    ParecerConclusivoSerializer
)
from .services.prompt_catalog import list_available_prompts, get_prompt_by_id
from .services.clinical_context import format_clinical_context
from .services.gemini_service import (
    BlockedClinicalSourceError,
    IncompleteGeminiResponseError,
    InvalidClinicalSelectionError,
    StaleReviewContextError,
    compute_context_hash,
    generate_clinical_summary,
)
from .services.sanitizer import ANAMNESE_FIELD_LABELS, sanitize_clinical_data
from .services.pdf_generator import generate_parecer_pdf
from .services.email_service import send_parecer_email


def _anamnese_has_content(anamnese) -> bool:
    if not anamnese:
        return False
    return any((getattr(anamnese, field, '') or '').strip() for field in ANAMNESE_FIELD_LABELS)


class NoStoreCacheMixin:
    """Aplica Cache-Control: no-store a respostas clínicas do fluxo de IA."""
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response['Cache-Control'] = 'no-store'
        return response



class AnamneseDetailView(generics.RetrieveUpdateAPIView):
    """
    Obtém ou atualiza a Anamnese do paciente (RF07).
    Identificado pelo UUID do paciente na URL (/api/prontuario/anamnese/<paciente_id>/).
    Caso a Anamnese ainda não exista para o paciente, ela é criada automaticamente ao consultar.
    """
    serializer_class = AnamneseSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_object(self):
        paciente_id = self.kwargs.get('paciente_id')
        try:
            paciente = Paciente.objects.get(id=paciente_id)
        except Paciente.DoesNotExist:
            raise NotFound('Paciente não encontrado.')

        anamnese, _ = Anamnese.objects.get_or_create(paciente=paciente)
        return anamnese


class AnotacaoSessaoListCreateView(generics.ListCreateAPIView):
    """
    Lista em ordem cronológica e cria anotações de sessão para um paciente específico (RF09).
    Rota: /api/prontuario/anotacoes/<paciente_id>/
    """
    serializer_class = AnotacaoSessaoSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        return AnotacaoSessao.objects.filter(
            sessao__paciente_id=paciente_id
        ).select_related('sessao', 'sessao__paciente').order_by('dataRegistro')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class AnotacaoSessaoViewSet(viewsets.ModelViewSet):
    """
    ViewSet geral para Anotações de Sessão.
    Permite busca, criação e detalhes via /api/prontuario/anotacoes/
    """
    queryset = AnotacaoSessao.objects.all().select_related('sessao', 'sessao__paciente').order_by('dataRegistro')
    serializer_class = AnotacaoSessaoSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        paciente_id = self.request.query_params.get('paciente')
        if paciente_id:
            queryset = queryset.filter(sessao__paciente_id=paciente_id)
        sessao_id = self.request.query_params.get('sessao')
        if sessao_id:
            queryset = queryset.filter(sessao_id=sessao_id)
        return queryset


class AnotacaoSessaoDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Obtém, atualiza ou remove uma Anotação de Sessão pelo seu UUID (RF09).
    Rota: /api/prontuario/anotacoes/detalhe/<pk>/
    Permite edição (PUT/PATCH) e exclusão de anotações existentes.
    """
    queryset = AnotacaoSessao.objects.all().select_related('sessao', 'sessao__paciente')
    serializer_class = AnotacaoSessaoSerializer
    permission_classes = [IsDoctorOrAdmin]


# ── Módulo de IA (Desafios 8 e 9) ──────────────────────────────────────────

class PromptCatalogListView(APIView):
    """
    Retorna a lista dos 4 prompts fixos disponíveis no sistema (RF11).
    Rota: /api/prontuario/ia/prompts/
    """
    permission_classes = [IsDoctorOrAdmin]

    def get(self, request):
        return Response(list_available_prompts(), status=status.HTTP_200_OK)


class FontesIaView(NoStoreCacheMixin, APIView):
    """
    Lista as fontes disponíveis do paciente para seleção de resumo com IA (sem expor textos).
    Rota: /api/prontuario/pacientes/<paciente_id>/ia/fontes/
    """
    permission_classes = [IsDoctorOrAdmin]

    def get(self, request, paciente_id):
        paciente = check_patient_doctor_access(request.user, paciente_id)
        anamnese = Anamnese.objects.filter(paciente=paciente).first()
        sessoes = (
            Sessao.objects.filter(paciente=paciente)
            .select_related('anotacao')
            .order_by('dataHoraInicio')
        )

        sessoes_payload = []
        for sessao in sessoes:
            anotacao = getattr(sessao, 'anotacao', None)
            tem_anotacao = bool(anotacao and (anotacao.textoLivre or '').strip())
            sessoes_payload.append({
                'id': str(sessao.id),
                'data': timezone.localdate(sessao.dataHoraInicio).strftime('%d/%m/%Y') if sessao.dataHoraInicio else None,
                'data_iso': sessao.dataHoraInicio.isoformat() if sessao.dataHoraInicio else None,
                'tipo': sessao.tipo,
                'tipo_label': sessao.get_tipo_display(),
                'status': sessao.status,
                'tem_anotacao': tem_anotacao,
            })

        return Response(
            {
                'anamnese': {
                    'disponivel': _anamnese_has_content(anamnese),
                },
                'sessoes': sessoes_payload,
            },
            status=status.HTTP_200_OK,
        )


def _validate_and_load_ai_selection(
    request,
    paciente_id,
    allow_contexto_hash=False,
    require_privacy_confirmation=False,
):
    """
    Valida autorização por paciente, catálogo rígido de prompts e fontes selecionadas.
    A anamnese nunca pode ser enviada ao Gemini (`incluir_anamnese: false` obrigatório e
    ao menos uma sessão com anotação); ela é carregada apenas para uso interno do sanitizador.
    Retorna `(dados_validados, None)` ou `(None, Response_erro)`.
    """
    paciente = check_patient_doctor_access(request.user, paciente_id)

    data = request.data
    if not isinstance(data, dict):
        return None, Response(
            {'error': 'Corpo da requisição deve ser um objeto JSON válido.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    required_keys = {'prompt_id', 'sessao_ids', 'incluir_anamnese'}
    allowed_keys = (
        required_keys
        | ({'contexto_hash'} if allow_contexto_hash else set())
        | ({'confirmacao_privacidade'} if require_privacy_confirmation else set())
    )
    keys = set(data.keys())
    if not required_keys.issubset(keys) or not keys.issubset(allowed_keys):
        if require_privacy_confirmation or allow_contexto_hash:
            msg = 'O corpo da requisição contém campos ausentes ou não permitidos para a geração.'
        else:
            msg = 'O corpo da requisição deve conter exclusivamente prompt_id, sessao_ids e incluir_anamnese.'
        return None, Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)

    prompt_id = data.get('prompt_id')
    sessao_ids_raw = data.get('sessao_ids')
    incluir_anamnese = data.get('incluir_anamnese')
    contexto_hash = data.get('contexto_hash') if allow_contexto_hash else None

    if allow_contexto_hash and contexto_hash is not None and not isinstance(contexto_hash, str):
        return None, Response(
            {'error': 'O campo contexto_hash deve ser uma string válida.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not isinstance(prompt_id, int) or isinstance(prompt_id, bool):
        return None, Response(
            {'error': 'O campo prompt_id deve ser um número inteiro entre 1 e 4.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    prompt_config = get_prompt_by_id(prompt_id)
    if not prompt_config:
        return None, Response(
            {'error': 'Identificador de prompt inválido. Escolha um valor entre 1 e 4.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not isinstance(incluir_anamnese, bool):
        return None, Response(
            {'error': 'O campo incluir_anamnese deve ser um booleano.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if incluir_anamnese:
        return None, Response(
            {'error': 'A anamnese não pode ser incluída no envio externo ao Gemini. Selecione apenas sessões com anotação.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if require_privacy_confirmation:
        confirmacao_privacidade = data.get('confirmacao_privacidade')
        if confirmacao_privacidade is not True:
            return None, Response(
                {'error': 'Confirme a orientação de privacidade antes de enviar os dados ao Gemini.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    if not isinstance(sessao_ids_raw, list):
        return None, Response(
            {'error': 'O campo sessao_ids deve ser uma lista de identificadores UUID.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    parsed_uuids = []
    seen_uuids = set()
    for raw_id in sessao_ids_raw:
        if not isinstance(raw_id, str):
            return None, Response(
                {'error': 'Todos os itens de sessao_ids devem ser strings UUID válidas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            parsed = uuid.UUID(raw_id)
        except (ValueError, AttributeError):
            return None, Response(
                {'error': 'Um ou mais identificadores em sessao_ids não são UUIDs válidos.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if parsed in seen_uuids:
            return None, Response(
                {'error': 'A seleção não pode conter sessões repetidas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        seen_uuids.add(parsed)
        parsed_uuids.append(parsed)

    if not parsed_uuids:
        return None, Response(
            {'error': 'Selecione pelo menos uma sessão com anotação.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    sessoes_encontradas = {
        s.id: s
        for s in Sessao.objects.filter(paciente=paciente, id__in=parsed_uuids).select_related('anotacao')
    }
    if len(sessoes_encontradas) != len(parsed_uuids):
        return None, Response(
            {'error': 'Uma ou mais sessões selecionadas não foram encontradas.'},
            status=status.HTTP_404_NOT_FOUND
        )

    anamnese = Anamnese.objects.filter(paciente=paciente).first()

    for sid in parsed_uuids:
        sessao = sessoes_encontradas[sid]
        anotacao = getattr(sessao, 'anotacao', None)
        if not anotacao or not (anotacao.textoLivre or '').strip():
            return None, Response(
                {'error': 'Todas as sessões selecionadas devem possuir anotação com conteúdo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    anotacoes = list(
        AnotacaoSessao.objects.filter(
            sessao__paciente=paciente,
            sessao_id__in=parsed_uuids,
        ).select_related('sessao').order_by('dataRegistro', 'sessao__dataHoraInicio')
    )

    referencias_sessao = [
        {
            'id': str(anot.sessao.id),
            'data': timezone.localdate(anot.sessao.dataHoraInicio).strftime('%d/%m/%Y') if anot.sessao.dataHoraInicio else None,
            'tipo': anot.sessao.tipo,
            'status': anot.sessao.status,
        }
        for anot in anotacoes
    ]

    return {
        'paciente': paciente,
        'prompt_config': prompt_config,
        'parsed_uuids': parsed_uuids,
        'incluir_anamnese': False,
        'anamnese': anamnese,
        'anotacoes': anotacoes,
        'referencias_sessao': referencias_sessao,
        'contexto_hash': contexto_hash,
    }, None


class ContextoIaView(NoStoreCacheMixin, APIView):
    """
    Prepara o contexto clínico minimizado/sanitizado apenas com as sessões selecionadas (RF10, RF11).
    A anamnese é usada apenas internamente no sanitizador e jamais incluída no contexto.
    Rota: /api/prontuario/pacientes/<paciente_id>/ia/contexto/
    """
    permission_classes = [IsDoctorOrAdmin]

    def post(self, request, paciente_id):
        selection, err_response = _validate_and_load_ai_selection(request, paciente_id)
        if err_response is not None:
            return err_response

        sanitized_data = sanitize_clinical_data(
            selection['paciente'],
            selection['anamnese'],
            selection['anotacoes'],
            incluir_anamnese=False,
        )
        contexto_clinico = format_clinical_context(
            sanitized_data,
            incluir_anamnese=False,
            incluir_notas=True,
        )
        prompt_config = selection['prompt_config']
        referencias_sessao = selection['referencias_sessao']
        contexto_hash = compute_context_hash(
            prompt_config,
            contexto_clinico,
            referencias_sessao,
            sanitized_data['avisos'],
        )

        payload = {
            'prompt_id': prompt_config['id'],
            'prompt_titulo': prompt_config['titulo'],
            'prompt_descricao': prompt_config.get('descricao', ''),
            'instrucao': prompt_config['system_instruction'],
            'contexto': contexto_clinico,
            'contexto_hash': contexto_hash,
            'referencias_sessao': referencias_sessao,
            'fontes_incluidas': {
                'incluir_anamnese': False,
                'sessao_ids': [str(anot.sessao.id) for anot in selection['anotacoes']],
            },
            'bloqueado': sanitized_data['bloqueado'],
            'avisos': sanitized_data['avisos'],
        }

        return Response(payload, status=status.HTTP_200_OK)


class GerarResumoIaView(NoStoreCacheMixin, APIView):
    """
    Gera a prévia de resumo clínico via API do Google Gemini a partir das sessões
    previamente selecionadas, sanitizadas e não bloqueadas, mediante confirmação de privacidade (RF10, RF11).
    Rota: /api/prontuario/pacientes/<paciente_id>/ia/gerar/
    """
    permission_classes = [IsDoctorOrAdmin]

    def post(self, request, paciente_id):
        selection, err_response = _validate_and_load_ai_selection(
            request,
            paciente_id,
            allow_contexto_hash=True,
            require_privacy_confirmation=True,
        )
        if err_response is not None:
            return err_response

        prompt_config = selection['prompt_config']
        referencias_sessao = selection['referencias_sessao']
        try:
            resultado = generate_clinical_summary(
                paciente=selection['paciente'],
                prompt_id=prompt_config['id'],
                anamnese=selection['anamnese'],
                anotacoes=selection['anotacoes'],
                incluir_anamnese=False,
                referencias_sessao=referencias_sessao,
                contexto_hash=selection['contexto_hash'],
            )
        except InvalidClinicalSelectionError as invalid_err:
            return Response({'error': str(invalid_err)}, status=status.HTTP_400_BAD_REQUEST)
        except BlockedClinicalSourceError as blocked_err:
            return Response(
                {
                    'error': str(blocked_err),
                    'bloqueado': True,
                    'avisos': blocked_err.avisos,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except StaleReviewContextError as stale_err:
            return Response(
                {
                    'error': str(stale_err),
                    'revisao_desatualizada': True,
                },
                status=status.HTTP_409_CONFLICT,
            )
        except IncompleteGeminiResponseError as incomplete_err:
            return Response(
                {'error': str(incomplete_err)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except ValueError as config_err:
            return Response(
                {'error': str(config_err)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            return Response(
                {'error': 'Não foi possível gerar o resumo com a API do Gemini no momento. Tente novamente em instantes.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                'prompt_id': resultado['prompt_id'],
                'prompt_titulo': resultado['prompt_titulo'],
                'conteudo': resultado['conteudo'],
                'referencias_sessao': referencias_sessao,
                'fontes_incluidas': {
                    'incluir_anamnese': selection['incluir_anamnese'],
                    'sessao_ids': [str(anot.sessao.id) for anot in selection['anotacoes']],
                },
            },
            status=status.HTTP_200_OK,
        )


class ResumoIaListCreateView(NoStoreCacheMixin, generics.ListCreateAPIView):
    """
    Lista todos os resumos de IA do paciente e permite persistir novos resumos nomeados (RF12).
    Rota: /api/prontuario/pacientes/<paciente_id>/ia/resumos/
    """
    serializer_class = ResumoIaSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        paciente = check_patient_doctor_access(self.request.user, paciente_id)
        return ResumoIa.objects.filter(paciente=paciente).order_by('-dataGeracao')

    def perform_create(self, serializer):
        paciente_id = self.kwargs.get('paciente_id')
        paciente = check_patient_doctor_access(self.request.user, paciente_id)
        serializer.save(paciente=paciente)


class ResumoIaDetailView(NoStoreCacheMixin, generics.RetrieveDestroyAPIView):
    """
    Obtém ou exclui um Resumo de IA específico pelo UUID.
    Rota: /api/prontuario/ia/resumos/<pk>/
    """
    queryset = ResumoIa.objects.all()
    serializer_class = ResumoIaSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_object(self):
        obj = super().get_object()
        check_patient_doctor_access(self.request.user, obj.paciente_id)
        return obj


# ── Módulo de Parecer Conclusivo (RF13, RF14) ──────────────────────────────

class ParecerConclusivoListCreateView(NoStoreCacheMixin, generics.ListCreateAPIView):
    """
    Lista e cria Pareceres Conclusivos para um paciente (RF13).
    Rota: /api/prontuario/pacientes/<paciente_id>/pareceres/
    """
    serializer_class = ParecerConclusivoSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_queryset(self):
        paciente_id = self.kwargs.get('paciente_id')
        paciente = check_patient_doctor_access(self.request.user, paciente_id)
        return ParecerConclusivo.objects.filter(paciente=paciente).order_by('-dataEmissao')

    def perform_create(self, serializer):
        paciente_id = self.kwargs.get('paciente_id')
        paciente = check_patient_doctor_access(self.request.user, paciente_id)
        serializer.save(paciente=paciente)


class ParecerConclusivoDetailView(NoStoreCacheMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    Detalhe, edição e exclusão de um Parecer Conclusivo (RF13).
    Rota: /api/prontuario/pareceres/<pk>/
    """
    queryset = ParecerConclusivo.objects.all()
    serializer_class = ParecerConclusivoSerializer
    permission_classes = [IsDoctorOrAdmin]

    def get_object(self):
        obj = super().get_object()
        check_patient_doctor_access(self.request.user, obj.paciente_id)
        return obj


class ParecerConclusivoPdfView(NoStoreCacheMixin, APIView):
    """
    Gera e retorna o PDF formatado do Parecer Conclusivo para download/impressão (RF14).
    Rota: /api/prontuario/pareceres/<pk>/pdf/
    """
    permission_classes = [IsDoctorOrAdmin]

    def get(self, request, pk):
        try:
            parecer = ParecerConclusivo.objects.select_related('paciente').get(id=pk)
        except (ParecerConclusivo.DoesNotExist, ValueError):
            raise NotFound('Parecer Conclusivo não encontrado.')

        check_patient_doctor_access(request.user, parecer.paciente_id)

        pdf_buffer = generate_parecer_pdf(parecer)
        filename = f"Parecer_{parecer.paciente.nomeCompleto.replace(' ', '_')}.pdf"

        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response


class ParecerConclusivoEmailView(NoStoreCacheMixin, APIView):
    """
    Dispara o envio do Parecer Conclusivo em PDF por e-mail (RF14).
    Rota: /api/prontuario/pareceres/<pk>/email/
    """
    permission_classes = [IsDoctorOrAdmin]

    def post(self, request, pk):
        try:
            parecer = ParecerConclusivo.objects.select_related('paciente').get(id=pk)
        except (ParecerConclusivo.DoesNotExist, ValueError):
            raise NotFound('Parecer Conclusivo não encontrado.')

        check_patient_doctor_access(request.user, parecer.paciente_id)


        recipient_email = request.data.get('recipient_email')
        if not recipient_email:
            return Response(
                {'error': 'O campo recipient_email é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        subject = request.data.get('subject')
        message = request.data.get('message')

        try:
            send_parecer_email(
                parecer=parecer,
                recipient_email=recipient_email,
                subject=subject,
                message_body=message
            )
            return Response(
                {'message': f'Parecer Conclusivo enviado com sucesso para {recipient_email}.'},
                status=status.HTTP_200_OK
            )
        except ValueError as ve:
            return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response(
                {'error': f'Falha ao despachar e-mail: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
