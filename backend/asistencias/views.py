import math
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated 
from .models import RegistroAsistencia
from .serializers import RegistroAsistenciaSerializer
from django.http import HttpResponse
from openpyxl import Workbook
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta


# --- CONFIGURACIÓN DE LA GEOCERCA (Oficina Central) ---
OFICINA_LAT = 19.7028
OFICINA_LON = -101.1177
RADIO_MAXIMO_METROS = 50.0

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
    serializer_class = RegistroAsistenciaSerializer

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            queryset = RegistroAsistencia.objects.all()
        else:
            queryset = RegistroAsistencia.objects.filter(usuario=user)

        # --- FILTRADO POR RANGO DE FECHAS (Ya lo tenías) ---
        fecha_inicio_param = self.request.query_params.get('fecha_inicio')
        fecha_fin_param = self.request.query_params.get('fecha_fin')

        if fecha_inicio_param and fecha_fin_param:
            # CORRECCIÓN: Forzamos a que la fecha_fin abarque las 24 horas completas de ese día
            # Pasará de: "2026-10-10" a: "2026-10-10 23:59:59.999999"
            fecha_fin_completa = f"{fecha_fin_param}T23:59:59.999999"
            queryset = queryset.filter(fecha_hora__range=[fecha_inicio_param, fecha_fin_completa])
        else:
            fecha_hoy = timezone.now()
            hace_una_semana = fecha_hoy - timedelta(days=7)
            queryset = queryset.filter(fecha_hora__range=[hace_una_semana, fecha_hoy])

        # --- NUEVO: FILTRADO POR EMPLEADO ESPECÍFICO ---
        usuario_id_param = self.request.query_params.get('usuario_id')
        if usuario_id_param and usuario_id_param != "TODOS" and user.is_staff:
            # CAMBIO: Agregamos '__username' para buscar por el texto del nombre en lugar del ID numérico
            queryset = queryset.filter(usuario__username=usuario_id_param)

        return queryset.order_by('-fecha_hora')


    @action(detail=False, methods=['get'], url_path='exportar-excel')
    def exportar_excel(self, request):
        if not request.user.is_staff:
            return Response({"error": "No autorizado"}, status=403)

        wb = Workbook()
        ws = wb.active
        ws.title = "Reporte Filtrado"

        cabeceras = ["ID", "Empleado", "Fecha y Hora", "Tipo de Evento", "Latitud", "Longitud", "Dispositivo"]
        ws.append(cabeceras)

        # --- SOLUCIÓN: Aplica los filtros activos del request al QuerySet ---
        queryset = self.get_queryset()
        asistencias = self.filter_queryset(queryset) 

        for asis in asistencias:
            ws.append([
                asis.id,
                asis.usuario.username,  # Asegúrate de que tu modelo tenga la relación 'usuario'
                asis.fecha_hora.strftime("%d/%m/%Y %H:%M:%S"),
                asis.tipo,
                float(asis.latitud) if asis.latitud else 0.0,   # Previene errores si viene vacío
                float(asis.longitud) if asis.longitud else 0.0, # Previene errores si viene vacío
                asis.dispositivo or "Desconocido"
            ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="reporte_asistencias_filtrado.xlsx"'
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
