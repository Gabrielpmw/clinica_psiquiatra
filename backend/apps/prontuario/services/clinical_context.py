"""
Composição do contexto clínico para inferência e preparação de dados.
"""

def format_clinical_context(sanitized_data: dict) -> str:
    """Formata os dados já sanitizados em texto estruturado e legível para o modelo."""
    sections = []

    # 1. Anamnese
    anamnese = sanitized_data.get('anamnese') or {}
    if anamnese:
        anamnese_lines = ["[Anamnese]"]
        labels = {
            'escolaridade': 'Escolaridade',
            'tipoParto': 'Tipo de Parto',
            'intercorrencias': 'Intercorrências',
            'seletividadeAlimentar': 'Seletividade Alimentar',
            'dificuldadeRotina': 'Dificuldade com Rotina',
            'sensibilidadeEtiquetas': 'Sensibilidade a Etiquetas/Tecidos',
            'historicoFamiliar': 'Histórico Familiar',
            'adesaoRegras': 'Adesão a Regras',
            'observacoesGerais': 'Observações Gerais da Anamnese'
        }
        for key, label in labels.items():
            val = anamnese.get(key)
            if val:
                anamnese_lines.append(f"- {label}: {val}")
        sections.append("\n".join(anamnese_lines))

    # 2. Anotações cronológicas
    anotacoes = sanitized_data.get('anotacoes') or []
    if anotacoes:
        anotacoes_lines = ["[Notas de sessão]"]
        for idx, nota in enumerate(anotacoes, 1):
            referencia = [f"Nota {idx}"]
            if nota.get('data_sessao'):
                referencia.append(f"sessão de {nota['data_sessao']}")
            if nota.get('data'):
                referencia.append(f"registro em {nota['data']}")
            if nota.get('tipo'):
                referencia.append(nota['tipo'])
            texto = nota.get('texto') or ''
            anotacoes_lines.append(f"\n[{' | '.join(referencia)}]\n{texto}")
        sections.append("\n".join(anotacoes_lines))
    else:
        sections.append("[Nenhuma anotação de sessão registrada até o momento.]")

    return "\n\n".join(sections)
