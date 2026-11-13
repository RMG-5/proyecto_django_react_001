from .models import Sucursal, RegistroAsistencia
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.validators import UnicodeUsernameValidator
from rest_framework import serializers


# Obtenemos el modelo de usuario activo en el proyecto, que puede ser el modelo por defecto de Django o un modelo personalizado.
User = get_user_model()


# Serializador para el modelo Sucursal
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


# Serializador para el modelo RegistroAsistencia
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


# Serializador para la creación y edición de usuarios en el panel de administración
class AdminUserWriteSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(source='is_staff', required=False)
    username = serializers.CharField(max_length=100)

    # Campos de contraseña (ambos write_only para que no se filtren en el JSON de respuesta)
    password = serializers.CharField(
        write_only=True,
        required=False,  # Se evalúa dinámicamente en el método validate
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

    # Validación personalizada del nombre de usuario
    def validate_username(self, value):
        # 1. Normalización del formato original
        normalized = value.strip().replace(" ", "_")

        # 2. Guardar estrictamente en minúsculas para la Base de Datos
        db_username = normalized.lower()

        # 3. Validar con las reglas de Django
        validator = UnicodeUsernameValidator()
        try:
            validator(db_username)
        except DjangoValidationError:
            raise serializers.ValidationError(
                "El nombre de usuario solo puede contener letras, números y los caracteres: @, ., +, -, _"
            )

        return db_username

    # Validación personalizada de las contraseñas
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')

        # --- CASO 1: Creación de usuario nuevo ---
        if not self.instance:
            if not password:
                raise serializers.ValidationError(
                    {"password": "La contraseña es requerida para crear un usuario."})
            if not password_confirm:
                raise serializers.ValidationError(
                    {"password_confirm": "Debe confirmar la contraseña."})

        # --- CASO 2: Se está intentando cambiar la contraseña (Creación o Edición) ---
        if password or password_confirm:
            if password != password_confirm:
                raise serializers.ValidationError(
                    {"password_confirm": "Las contraseñas no coinciden."})

            # Ejecutar validaciones robustas de settings.py de Django de forma segura
            # Usamos una instancia temporal con el username ya limpio en minúsculas
            temp_user = self.instance or User(username=username)
            try:
                django_validate_password(password, user=temp_user)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"password": e.messages})

        # Eliminamos password_confirm para que no estorbe en los métodos create/update
        attrs.pop('password_confirm', None)
        return attrs

    # Métodos para crear y actualizar usuarios, asegurando que la contraseña se guarde de forma segura (hasheada)
    def create(self, validated_data):
        password = validated_data.pop('password')
        # create_user se encarga de hashear la contraseña automáticamente
        return User.objects.create_user(password=password, **validated_data)

    # Método para actualizar un usuario existente, incluyendo la opción de cambiar la contraseña
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        # Actualización limpia de los campos restantes
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()
        return instance
