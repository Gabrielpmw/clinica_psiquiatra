"""
Serviço de Envio de E-mail para Parecer Conclusivo (RF14).
Dispara o e-mail anexando o PDF gerado pelo sistema.
"""
from django.core.mail import EmailMessage
from django.conf import settings
from .pdf_generator import generate_parecer_pdf


def send_parecer_email(parecer, recipient_email: str, subject: str = None, message_body: str = None) -> bool:
    """
    Gera o PDF do Parecer Conclusivo e envia como anexo para o destinatário informado.
    """
    if not recipient_email or '@' not in recipient_email:
        raise ValueError("Endereço de e-mail do destinatário inválido ou não informado.")

    paciente = parecer.paciente
    default_subject = f"Parecer Conclusivo - {paciente.nomeCompleto}"
    default_body = (
        f"Olá,\n\n"
        f"Encaminhamos em anexo o documento oficial de Parecer Conclusivo referente "
        f"ao acompanhamento de {paciente.nomeCompleto}.\n\n"
        f"Em caso de dúvidas, ficamos à disposição.\n\n"
        f"Atenciosamente,\n"
        f"Equipe da Clínica"
    )

    subject = subject or default_subject
    body = message_body or default_body
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'clinica@exemplo.com')

    # Gera o PDF em memória
    pdf_buffer = generate_parecer_pdf(parecer)
    filename = f"Parecer_{paciente.nomeCompleto.replace(' ', '_')}.pdf"

    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=from_email,
        to=[recipient_email]
    )
    email.attach(filename, pdf_buffer.getvalue(), 'application/pdf')
    email.send(fail_silently=False)
    return True
