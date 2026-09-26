import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone


class UsuarioManager(BaseUserManager):
    """Gerenciador customizado para o modelo Usuario."""

    def create_user(self, email, nome, password=None, role='SECRETARIA', **extra_fields):
        if not email:
            raise ValueError('O endereço de e-mail é obrigatório.')
        if not nome:
            raise ValueError('O nome é obrigatório.')

        email = self.normalize_email(email)
        user = self.model(
            email=email,
            nome=nome,
            role=role,
            **extra_fields
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nome, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMINISTRACAO')
        extra_fields.setdefault('status', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superusuário deve ter is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superusuário deve ter is_superuser=True.')

        return self.create_user(email, nome, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    """
    Modelo de Usuário no padrão MVC (Model).
    Utiliza UUID v4 como chave primária (RNF05) e armazena os perfis
    necessários para o controle RBAC da clínica.
    """

    class Role(models.TextChoices):
        ADMINISTRACAO = 'ADMINISTRACAO', 'Administração'
        SECRETARIA = 'SECRETARIA', 'Secretária'
        DOUTORA = 'DOUTORA', 'Doutora'

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Identificador único universal (UUID v4)'
    )
    nome = models.CharField(
        max_length=150,
        verbose_name='Nome Completo'
    )
    email = models.EmailField(
        unique=True,
        max_length=255,
        verbose_name='E-mail'
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.SECRETARIA,
        verbose_name='Perfil de Acesso'
    )
    status = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    is_staff = models.BooleanField(
        default=False,
        verbose_name='Acesso ao Painel Admin'
    )
    dataCriacao = models.DateTimeField(
        default=timezone.now,
        verbose_name='Data de Criação'
    )

    objects = UsuarioManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome']

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        ordering = ['-dataCriacao']

    def __str__(self):
        return f"{self.nome} ({self.get_role_display()})"
