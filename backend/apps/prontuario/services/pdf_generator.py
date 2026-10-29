"""
Serviço de Geração de PDF do Parecer Conclusivo (RF14).
Utiliza ReportLab para gerar documentos formatados prontos para impressão.
"""
from io import BytesIO
import html
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable


def _parse_markdown_line(line: str) -> str:
    """
    Converte markdown inline para tags compatíveis com o ReportLab Paragraph (<b>, <i>).
    Trata caracteres especiais XML para evitar erros no parser do ReportLab.
    """
    # 1. Escapa caracteres XML
    safe_line = html.escape(line)

    # 2. Negrito: **texto** ou __texto__
    safe_line = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', safe_line)
    safe_line = re.sub(r'__(.+?)__', r'<b>\1</b>', safe_line)

    # 3. Itálico: *texto* ou _texto_
    safe_line = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<i>\1</i>', safe_line)
    safe_line = re.sub(r'(?<!_)_(?!_)(.+?)(?<!_)_(?!_)', r'<i>\1</i>', safe_line)

    return safe_line


def generate_parecer_pdf(parecer) -> BytesIO:
    """
    Gera um buffer de bytes contendo o PDF formatado do Parecer Conclusivo.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Estilos customizados
    header_style = ParagraphStyle(
        'ClinicHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#1b4332'),
        alignment=1  # Centralizado
    )

    subtitle_style = ParagraphStyle(
        'ClinicSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#40916c'),
        alignment=1
    )

    doc_title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#081c15'),
        alignment=1,
        spaceAfter=15
    )

    meta_label = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#2d6a4f')
    )

    meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#1f2937')
    )

    body_style = ParagraphStyle(
        'BodyReport',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor('#111827'),
        spaceAfter=10
    )

    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1b4332'),
        spaceBefore=10,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletItem',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    signature_style = ParagraphStyle(
        'Signature',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#374151'),
        alignment=1
    )

    elements = []

    # 1. Cabeçalho Institucional
    elements.append(Paragraph("SISTEMA DE APOIO À CLÍNICA INFANTOJUVENIL", header_style))
    elements.append(Paragraph("Avaliação Clínica e Acompanhamento do Neurodesenvolvimento", subtitle_style))
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2d6a4f'), spaceAfter=15))

    # 2. Título do Documento
    titulo_doc = parecer.titulo or "PARECER CONCLUSIVO"
    elements.append(Paragraph(titulo_doc.upper(), doc_title_style))

    # 3. Bloco de Identificação do Paciente
    paciente = parecer.paciente
    dt_nasc = paciente.dataNascimento.strftime('%d/%m/%Y') if paciente.dataNascimento else 'Não informada'
    dt_emissao = parecer.dataEmissao.strftime('%d/%m/%Y às %H:%M') if parecer.dataEmissao else ''

    patient_info = [
        [
            Paragraph("Paciente:", meta_label), Paragraph(paciente.nomeCompleto, meta_val),
            Paragraph("Nascimento:", meta_label), Paragraph(dt_nasc, meta_val)
        ],
        [
            Paragraph("Emissão:", meta_label), Paragraph(dt_emissao, meta_val),
            Paragraph("Documento:", meta_label), Paragraph(str(parecer.id)[:8] + "...", meta_val)
        ]
    ]

    table = Table(patient_info, colWidths=[70, 200, 80, 180])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#bbf7d0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#dcfce7')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))

    # 4. Corpo do Parecer Conclusivo (Texto Livre com formatação Markdown)
    corpo_texto = parecer.corpoTexto or "Nenhum conteúdo registrado para este parecer."
    for paragraph in corpo_texto.split('\n'):
        clean_p = paragraph.strip()
        if not clean_p:
            elements.append(Spacer(1, 6))
            continue

        if clean_p.startswith('### '):
            content = _parse_markdown_line(clean_p[4:])
            elements.append(Paragraph(content, section_style))
        elif clean_p.startswith('## '):
            content = _parse_markdown_line(clean_p[3:])
            elements.append(Paragraph(content, section_style))
        elif clean_p.startswith('# '):
            content = _parse_markdown_line(clean_p[2:])
            elements.append(Paragraph(content, section_style))
        elif clean_p.startswith('- ') or clean_p.startswith('* ') or clean_p.startswith('• '):
            content = _parse_markdown_line(clean_p[2:])
            elements.append(Paragraph(f"&bull; {content}", bullet_style))
        else:
            content = _parse_markdown_line(clean_p)
            elements.append(Paragraph(content, body_style))

    # 5. Rodapé de Assinatura
    elements.append(Spacer(1, 40))
    elements.append(HRFlowable(width="60%", thickness=0.8, color=colors.HexColor('#9ca3af'), spaceAfter=8))
    elements.append(Paragraph("Profissional Responsável", signature_style))
    elements.append(Paragraph("Clínica de Acompanhamento Psiquiátrico e do Desenvolvimento", signature_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
