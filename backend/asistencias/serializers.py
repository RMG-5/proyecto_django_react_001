from rest_framework import serializers
from .models import Sucursal, RegistroAsistencia


class SucursalSerializer(serializers.ModelSerializer):

    class Meta:            
            model = Sucursal            
            fields = [
                'id',
                'nombre', 
                'latitud', 
                'longitud', 
                'radio_maximo_metros'
            ]

class RegistroAsistenciaSerializer(serializers.ModelSerializer):
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
            'sucursal'
        ]
        
        read_only_fields = ['fecha_hora']
        