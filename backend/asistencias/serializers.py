from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.validators import UnicodeUsernameValidator
from rest_framework import serializers
from rest_framework.authtoken.models import Token
from .models import Sucursal, RegistroAsistencia


# Obtiene el modelo de usuario activo configurado en el proyecto
User = get_user_model()


# Serializador para gestionar la información y geocercas de las sucursales
class SucursalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sucursal
        fields = [
            'id',
            'nombre',
            'latitud',
            'longitud',
            'radio_maximo_metros',
            'hora_entrada',
            'hora_salida',
            'tolerancia_minutos',
            'activa'
        ]


# Serializador para los registros de entrada y salida de los empleados
class RegistroAsistenciaSerializer(serializers.ModelSerializer):
    # Campo personalizado de solo lectura (ReadOnlyField).
    # - source='usuario.username': Utiliza la relación inversa para entrar al objeto 'usuario' conectado
    #   y extraer textualmente su 'username'. Así el JSON final mostrará el nombre del empleado en vez de su ID numérico.
    usuario_nombre = serializers.ReadOnlyField(source='usuario.username')
    sucursal_nombre = serializers.ReadOnlyField(source='sucursal.nombre')

    class Meta:
        model = RegistroAsistencia
        fields = [
            'id',
            'usuario_nombre',
            'sucursal_nombre',
            'fecha_hora',
            'tipo',
            'latitud',
            'longitud',
            'dispositivo',
            'sucursal',
            'estatus'
        ]

        # Lista de campos que son estrictamente de "Solo Lectura".
        # - 'fecha_hora': Se añade aquí porque en el modelo tiene 'auto_now_add=True'. Al ser de solo lectura,
        # el cliente no puede enviar una fecha falsa ni modificarla mediante la API; Django la genera en el servidor.
        # La sucursal y el estatus los calcula el servidor.
        read_only_fields = ['fecha_hora', 'sucursal', 'estatus']


# Serializador para que los administradores creen y actualicen usuarios
class AdminUserWriteSerializer(serializers.ModelSerializer):
    # Mapea el campo 'is_admin' de la API al atributo 'is_staff' del modelo User
    is_admin = serializers.BooleanField(source='is_staff', required=False)
    username = serializers.CharField(max_length=100)

    # Campos de contraseña de solo escritura (nunca se devuelven en la respuesta JSON)
    password = serializers.CharField(
        write_only=True,
        required=False,  
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'password_confirm', 'is_admin']

    # Limpia, normaliza a minúsculas y valida los caracteres permitidos en el username
    def validate_username(self, value):
        normalized = value.strip().replace(" ", "_")
        db_username = normalized.lower()

        validator = UnicodeUsernameValidator()
        try:
            validator(db_username)
        except DjangoValidationError:
            raise serializers.ValidationError(
                "El nombre de usuario solo puede contener letras, números y los caracteres: @, ., +, -, _"
            )

        return db_username

    # Validación general: verifica obligatoriedad, coincidencia y seguridad de contraseñas
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')

        # Si es creación (no existe self.instance), exige ambas contraseñas
        if not self.instance:
            if not password:
                raise serializers.ValidationError(
                    {"password": "La contraseña es requerida para crear un usuario."})
            if not password_confirm:
                raise serializers.ValidationError(
                    {"password_confirm": "Debe confirmar la contraseña."})

        # Si se envió contraseña (en creación o edición), valida coincidencia y reglas de Django
        if password or password_confirm:
            if password != password_confirm:
                raise serializers.ValidationError(
                    {"password_confirm": "Las contraseñas no coinciden."})

            temp_user = self.instance or User(username=username)
            try:
                django_validate_password(password, user=temp_user)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"password": e.messages})

        # Elimina el campo auxiliar antes de pasar los datos al guardado
        attrs.pop('password_confirm', None)
        return attrs

    # Crea el usuario encriptando la contraseña mediante create_user
    def create(self, validated_data):
        password = validated_data.pop('password')
        return User.objects.create_user(password=password, **validated_data)

    # Actualiza los datos del usuario y encripta la nueva contraseña si fue proporcionada
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)
            Token.objects.filter(user=instance).delete()

        instance.save()
        return instance
    