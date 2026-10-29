from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Usuario, SolicitacaoResetSenha


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Customiza o payload do token JWT e o corpo da resposta de login com dados do usuário e perfil RBAC.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['nome'] = user.nome
        token['role'] = user.role
        token['status'] = user.status
        token['is_staff'] = user.is_staff
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.status:
            raise serializers.ValidationError({"detail": "Esta conta de usuário está inativada."})

        data['user'] = {
            'id': str(self.user.id),
            'nome': self.user.nome,
            'email': self.user.email,
            'role': self.user.role,
            'status': self.user.status,
            'is_staff': self.user.is_staff,
        }
        return data


class UsuarioSerializer(serializers.ModelSerializer):
    """Serializer para exibição e listagem de usuários."""
    tem_reset_pendente = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            'id',
            'nome',
            'email',
            'role',
            'status',
            'dataCriacao',
            'tem_reset_pendente',
        ]
        read_only_fields = ['id', 'dataCriacao', 'tem_reset_pendente']

    def get_tem_reset_pendente(self, obj):
        return obj.solicitacoes_reset.filter(status=SolicitacaoResetSenha.Status.PENDENTE).exists()


class SolicitacaoResetSenhaSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source='usuario.nome', read_only=True)
    usuario_role = serializers.CharField(source='usuario.role', read_only=True)
    resolvido_por_nome = serializers.CharField(source='resolvidoPor.nome', read_only=True)

    class Meta:
        model = SolicitacaoResetSenha
        fields = [
            'id',
            'usuario',
            'usuario_nome',
            'usuario_role',
            'email',
            'status',
            'dataSolicitacao',
            'dataResolucao',
            'resolvidoPor',
            'resolvido_por_nome',
        ]
        read_only_fields = [
            'id',
            'usuario',
            'usuario_nome',
            'usuario_role',
            'dataSolicitacao',
            'dataResolucao',
            'resolvidoPor',
            'resolvido_por_nome',
        ]


class UsuarioCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de usuários com senha segura."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'nome',
            'email',
            'password',
            'role',
            'status'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password')
        return Usuario.objects.create_user(password=password, **validated_data)


class UsuarioUpdateSerializer(serializers.ModelSerializer):
    """Serializer para edição de dados cadastrais e perfil de usuários."""

    class Meta:
        model = Usuario
        fields = [
            'id',
            'nome',
            'email',
            'role',
            'status'
        ]
        read_only_fields = ['id']


class ResetPasswordSerializer(serializers.Serializer):
    """Serializer para redefinição/reset de senha de usuário pela administração."""
    password = serializers.CharField(write_only=True, min_length=8)

    def update(self, instance, validated_data):
        instance.set_password(validated_data['password'])
        instance.save()
        return instance


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer para auto-edição de perfil (nome e email) pelo próprio usuário logado."""
    class Meta:
        model = Usuario
        fields = ['id', 'nome', 'email', 'role']
        read_only_fields = ['id', 'role']

    def validate_email(self, value):
        user = self.instance
        if Usuario.objects.exclude(pk=user.pk).filter(email__iexact=value).exists():
            raise serializers.ValidationError("Este e-mail já está em uso por outro usuário.")
        return value.lower()


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer para alteração de senha pelo próprio usuário autenticado."""
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("A senha atual informada está incorreta.")
        return value

    def validate(self, attrs):
        if attrs['current_password'] == attrs['new_password']:
            raise serializers.ValidationError({"new_password": "A nova senha deve ser diferente da senha atual."})
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
