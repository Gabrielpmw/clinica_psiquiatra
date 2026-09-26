import os
from django.db import migrations
from django.contrib.auth.hashers import make_password


def create_default_admin(apps, schema_editor):
    Usuario = apps.get_model('usuarios', 'Usuario')
    admin_email = os.getenv('INITIAL_ADMIN_EMAIL', 'admin@clinica.com').strip().lower()
    admin_password = os.getenv('INITIAL_ADMIN_PASSWORD', 'admin123456')

    if not Usuario.objects.filter(email=admin_email).exists():
        admin = Usuario(
            email=admin_email,
            nome='Administrador do Sistema',
            role='ADMINISTRACAO',
            status=True,
            is_staff=True,
            is_superuser=True,
            password=make_password(admin_password),
        )
        admin.save()


def reverse_default_admin(apps, schema_editor):
    # Não remove o admin no rollback para evitar perda acidental de acesso
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_admin, reverse_default_admin),
    ]
