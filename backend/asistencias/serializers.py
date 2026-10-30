from rest_framework import serializers
from .models import Sucursal, RegistroAsistencia
from django.contrib.auth.models import User
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError


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
                'tolerancia_minutos'
            ]

class RegistroAsistenciaSerializer(serializers.ModelSerializer):    
    # Campo personalizado de solo lectura (ReadOnlyField).
    # - source='usuario.username': Utiliza la relación inversa para entrar al objeto 'usuario' conectado 
    #   y extraer textualmente su 'username'. Así el JSON final mostrará el nombre del empleado en vez de su ID numérico.
    usuario_nombre = serializers.ReadOnlyField(source='usuario.username')

    class Meta:        
        model = RegistroAsistencia
        fields = [
            'id', 
            'usuario_nombre', 
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
        #  el cliente no puede enviar una fecha falsa ni modificarla mediante la API; Django la genera en el servidor.
        #  El estatus lo calcula el servidor
        read_only_fields = ['fecha_hora', 'estatus'] 


class AdminUserWriteSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(source='is_staff', required=False)
    # Definimos explícitamente el campo password como obligatorio al crear y opcional al editar
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})

    username = serializers.CharField(max_length=150)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'is_admin']

    def validate_username(self, value):
        # 1. Normalización de espacios
        normalized_username = value.strip().replace(" ", "_")

        # 2. Validación de caracteres especiales de Django
        validator = UnicodeUsernameValidator()
        try:
            validator(normalized_username)
        except DjangoValidationError:
            raise serializers.ValidationError(
                "El nombre de usuario solo puede contener letras, números y los caracteres: @, ., +, -, _"
            )

        return normalized_username

    def validate_password(self, value):
        """
        Ejecuta los validadores de contraseña configurados en el settings.py de Django
        """
        if not value:
            return value

        # Si estamos editando un usuario, se lo pasamos al validador. Si es nuevo, usamos un dummy o None.
        user_instance = self.instance if self.instance else User(username=self.initial_data.get('username'))
        
        try:
            password_validation.validate_password(value, user=user_instance)
        except DjangoValidationError as e:
            # Capturamos el error de Django y lo lanzamos en el formato que DRF entiende (HTTP 400)
            raise serializers.ValidationError(e.messages)
            
        return value

    def validate(self, attrs):
        """
        Validación general del formulario: Asegura que la contraseña venga si es un usuario nuevo
        """
        # Si no hay instancia (es una creación) y no se envió contraseña, lanzamos error
        if not self.instance and not attrs.get('password'):
            raise serializers.ValidationError({"password": "La contraseña es requerida para crear un usuario."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        # create_user se encarga automáticamente de encriptar la contraseña de forma segura
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        # Actualizamos el resto de campos (username, is_staff)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Si el administrador ingresó una nueva contraseña en el formulario
        if password:
            instance.set_password(password)
            
        instance.save()
        return instance
