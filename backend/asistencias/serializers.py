# ==============================================================================
# IMPORTACIONES
# ==============================================================================

# Se importa el módulo de serializadores de Django REST Framework. 
# Su función principal es traducir datos complejos (como objetos de Base de Datos) a JSON y viceversa.
from rest_framework import serializers

# Se importa el modelo 'RegistroAsistencia' que definimos previamente en el archivo 'models.py'.
from .models import RegistroAsistencia


# ==============================================================================
# SERIALIZADOR: REGISTRO DE ASISTENCIA
# ==============================================================================

# Definición de la clase 'RegistroAsistenciaSerializer' que hereda de 'serializers.ModelSerializer'.
# Al usar 'ModelSerializer', Django automatiza la creación de campos basándose directamente en el modelo.
class RegistroAsistenciaSerializer(serializers.ModelSerializer):
    
    # Campo personalizado de solo lectura (ReadOnlyField).
    # - source='usuario.username': Utiliza la relación inversa para entrar al objeto 'usuario' conectado 
    #   y extraer textualmente su 'username'. Así el JSON final mostrará el nombre del empleado en vez de su ID numérico.
    usuario_nombre = serializers.ReadOnlyField(source='usuario.username')


    # ==========================================================================
    # CONFIGURACIÓN INTERNA (METADATOS)
    # ==========================================================================
    
    # La subclase 'Meta' le indica al serializador cómo debe comportarse y qué estructura seguir.
    class Meta:
        
        # Vincula este serializador directamente con el modelo 'RegistroAsistencia'.
        model = RegistroAsistencia
        
        # Lista explícita de campos que se incluirán en las respuestas JSON (cuando se hace un GET)
        # y que también se permitirán recibir en el cuerpo de las peticiones (cuando se hace un POST).
        fields = [
            'id', 
            'usuario_nombre', 
            'fecha_hora',
            'tipo', 
            'latitud', 
            'longitud', 
            'dispositivo'
        ]
        
        # Lista de campos que son estrictamente de "Solo Lectura".
        # - 'fecha_hora': Se añade aquí porque en el modelo tiene 'auto_now_add=True'. Al ser de solo lectura,
        #   el cliente no puede enviar una fecha falsa ni modificarla mediante la API; Django la genera en el servidor.
        read_only_fields = ['fecha_hora']
        