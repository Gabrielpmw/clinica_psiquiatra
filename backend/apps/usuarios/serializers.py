from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Usuario


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

    class Meta:
        model = Usuario
        fields = [
            'id',
            'nome',
            'email',
            'role',
            'status',
            'dataCriacao'
        ]
        read_only_fields = ['id', 'dataCriacao']


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
