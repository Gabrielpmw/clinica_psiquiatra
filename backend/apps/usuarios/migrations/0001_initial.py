import uuid
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='Usuario',
            fields=[
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, help_text='Identificador único universal (UUID v4)', primary_key=True, serialize=False)),
                ('nome', models.CharField(max_length=150, verbose_name='Nome Completo')),
                ('email', models.EmailField(max_length=255, unique=True, verbose_name='E-mail')),
                ('role', models.CharField(choices=[('ADMINISTRACAO', 'Administração'), ('SECRETARIA', 'Secretária'), ('DOUTORA', 'Doutora')], default='SECRETARIA', max_length=20, verbose_name='Perfil de Acesso')),
                ('status', models.BooleanField(default=True, verbose_name='Ativo')),
                ('is_staff', models.BooleanField(default=False, verbose_name='Acesso ao Painel Admin')),
                ('dataCriacao', models.DateTimeField(default=django.utils.timezone.now, verbose_name='Data de Criação')),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'verbose_name': 'Usuário',
                'verbose_name_plural': 'Usuários',
                'ordering': ['-dataCriacao'],
            },
        ),
    ]
