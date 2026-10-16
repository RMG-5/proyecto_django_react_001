import math
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError # Para arrojar errores limpios a React
# Importamos la clase que obliga a estar autenticado
from rest_framework.permissions import IsAuthenticated 
# Importamos el modelo y el traductor que acabamos de hacer
from .models import RegistroAsistencia
from .serializers import RegistroAsistenciaSerializer

# --- CONFIGURACIÓN DE LA GEOCERCA (Oficina Central) ---
# Puedes cambiar estas coordenadas por las de tu casa u oficina real para probar
OFICINA_LAT = 19.7028
OFICINA_LON = -101.1177
RADIO_MAXIMO_METROS = 50.0 # Distancia máxima permitida para checar

# --- FÓRMULA DE HAVERSINE ---
def calcular_distancia_metros(lat1, lon1, lat2, lon2):
    """
    Calcula la distancia en metros entre dos coordenadas geográficas
    """
    # Convertimos grados decimales a radianes
    rad_lat1, rad_lon1, rad_lat2, rad_lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Diferencia de coordenadas
    dlat = rad_lat2 - rad_lat1
    dlon = rad_lon2 - rad_lon1
    
    # Fórmula matemática de Haversine
    a = math.sin(dlat/2)**2 + math.cos(rad_lat1) * math.cos(rad_lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radio de la Tierra en metros (6,371,000 metros)
    radio_tierra_metros = 6371000
    
    return c * radio_tierra_metros


class RegistroAsistenciaViewSet(viewsets.ModelViewSet):
    # 1. Le decimos a Django de dónde sacar los datos de la base de datos
    queryset = RegistroAsistencia.objects.all()

    # 2. Le asignamos su traductor correspondiente
    serializer_class = RegistroAsistenciaSerializer

    # 3. NOTA IMPORTANTE PARA EL APRENDIZAJE:
    # Por ahora dejamos abierta la API para que puedas hacer pruebas sin meterte
    # en problemas de autenticación o tokens de sesión. En el futuro, aquí
    # bloquearemos el endpoint para que solo usuarios logueados puedan checar.
    # EL SIGUIENTE CODIGO INVALIDA ESTOS COMENTARIOS.

    # Bloqueo de seguridad: Si no envían un token válido, la API responderá "401 Unauthorized"
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # 1. Extraemos las coordenadas que React está intentando enviar
        # Las convertimos a flotantes (float) para poder hacer matemáticas con ellas
        empleado_lat = float(self.request.data.get('latitud'))
        empleado_lon = float(self.request.data.get('longitud'))

        # 2. Calculamos la distancia real entre el empleado y la oficina
        distancia_a_oficina = calcular_distancia_metros(
            OFICINA_LAT, OFICINA_LON, 
            empleado_lat, empleado_lon
        )

        print(f"--- DETECCIÓN DE GEOCERCA: El empleado está a {distancia_a_oficina:.2f} metros de la oficina. ---")

        # 3. EL CANDADO DE SEGURIDAD: Si está más lejos de lo permitido, bloqueamos la operación
        if distancia_a_oficina > RADIO_MAXIMO_METROS:
            raise ValidationError({
                "error_geocerca": f"Checada denegada. Estás demasiado lejos del punto autorizado (Distancia: {distancia_a_oficina:.2f} metros). Máximo permitido: {RADIO_MAXIMO_METROS} metros."
            })

        # 4. Si pasó la regla, guardamos normalmente asignando su usuario autenticado
        serializer.save(usuario=self.request.user)
