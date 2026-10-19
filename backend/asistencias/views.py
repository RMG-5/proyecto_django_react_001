import math
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError # Para arrojar errores limpios a React
# Importamos la clase que obliga a estar autenticado
from rest_framework.permissions import IsAuthenticated 
# Importamos el modelo y el traductor que acabamos de hacer
from .models import RegistroAsistencia
from .serializers import RegistroAsistenciaSerializer
# 1. AGREGA ESTAS IMPORTACIONES AL INICIO DE views.py
from django.http import HttpResponse
from openpyxl import Workbook
from rest_framework.decorators import action # Permite crear rutas personalizadas
from rest_framework.response import Response # <<< ¡ESTA ES LA LÍNEA QUE HACÍA FALTA!


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
    # queryset = RegistroAsistencia.objects.all()

    # 2. Le asignamos su traductor correspondiente
    serializer_class = RegistroAsistenciaSerializer

    # 3. NOTA IMPORTANTE PARA EL APRENDIZAJE:
    # Por ahora dejamos abierta la API para que puedas hacer pruebas sin meterte
    # en problemas de autenticación o tokens de sesión. En el futuro, aquí
    # bloquearemos el endpoint para que solo usuarios logueados puedan checar.
    # EL SIGUIENTE CODIGO INVALIDA ESTOS COMENTARIOS.

    # Bloqueo de seguridad: Si no envían un token válido, la API responderá "401 Unauthorized"
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filtrado inteligente según el rol del usuario autenticado
        """
        user = self.request.user
        
        # Si el usuario es administrador (staff), le damos acceso a TODO el historial
        if user.is_staff:
            return RegistroAsistencia.objects.all()
        
        # Si es un empleado normal, la API SOLO le devolverá sus propios registros
        return RegistroAsistencia.objects.filter(usuario=user)

    # 2. AGREGA ESTE MÉTODO DENTRO DE LA CLASE RegistroAsistenciaViewSet
    @action(detail=False, methods=['get'], url_path='exportar-excel')
    def exportar_excel(self, request):
        """
        Genera y descarga un archivo Excel con el reporte de asistencias
        """
        # Seguridad: Solo los administradores (staff) pueden descargar este reporte
        if not request.user.is_staff:
            return Response({"error": "No autorizado"}, status=403)

        # Creamos un libro de Excel en memoria
        wb = Workbook()
        ws = wb.active
        ws.title = "Reporte Quincenal"

        # Definimos los títulos de las columnas (Cabecera)
        cabeceras = ["ID", "Empleado", "Fecha y Hora", "Tipo de Evento", "Latitud", "Longitud", "Dispositivo"]
        ws.append(cabeceras)

        # Traemos todas las asistencias registradas en PostgreSQL
        asistencias = RegistroAsistencia.objects.all().order_by('-fecha_hora')

        # Recorremos los registros y los escribimos fila por fila en el Excel
        for asis in asistencias:
            ws.append([
                asis.id,
                asis.usuario.username,
                asis.fecha_hora.strftime("%d/%m/%Y %H:%M:%S"), # Fecha formateada legible
                asis.tipo,
                float(asis.latitud),
                float(asis.longitud),
                asis.dispositivo or "Desconocido"
            ])

        # Preparamos la respuesta HTTP configurando el tipo de archivo correcto (MIME Type)
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        # Le indicamos al navegador que es un archivo descargable llamado 'reporte_asistencias.xlsx'
        response['Content-Disposition'] = 'attachment; filename="reporte_asistencias.xlsx"'
        
        # Guardamos el libro de Excel directamente en la respuesta del servidor
        wb.save(response)
        return response

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
