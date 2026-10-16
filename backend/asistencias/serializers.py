from rest_framework import serializers
# Importamos nuestro modelo de asistencia y el modelo de usuarios nativo
from .models import RegistroAsistencia
# from django.contrib.auth.models import User


class RegistroAsistenciaSerializer(serializers.ModelSerializer):
    # Mostramos el nombre de usuario de forma legible en lugar de solo un número ID
    usuario_nombre = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        # Le decimos al traductor con qué modelo trabajar
        model = RegistroAsistencia
        # Los campos exactos que convertiremos a JSON para enviar y recibir
        fields = ['id', 'usuario_nombre', 'fecha_hora',
                  'tipo', 'latitud', 'longitud', 'dispositivo']
        # La fecha y hora se generan solas en el servidor, React no debe enviarlas
        read_only_fields = ['fecha_hora']
