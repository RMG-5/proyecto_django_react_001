# ==============================================================================
# 1. IMPORTACIONES
# ==============================================================================

# Operaciones matemáticas para los cálculos geométricos (radianes, seno, coseno).
import math

# Clases de Django REST Framework (DRF) para la API y manejo de errores/permisos.
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated 
from rest_framework.decorators import action
from rest_framework.response import Response

# Modelos, Serializadores y utilidades de Django para HTTP y Fechas.
from .models import Sucursal, RegistroAsistencia
from .serializers import SucursalSerializer, RegistroAsistenciaSerializer
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta, datetime

# Librería para generar archivos de Excel.
from openpyxl import Workbook


# ==============================================================================
# 2. CONSTANTES DE GEOLOCALIZACIÓN
# ==============================================================================

# Coordenadas geográficas fijas del centro de la oficina.
OFICINA_LAT = 19.7028
OFICINA_LON = -101.1177

# Radio máximo permitido en metros para registrar la asistencia.
RADIO_MAXIMO_METROS = 50.0


# ==============================================================================
# 3. FUNCIÓN DE CÁLCULO DE DISTANCIA (FÓRMULA DE HAVERSINE)
# ==============================================================================

def calcular_distancia_metros(lat1, lon1, lat2, lon2):
    """
    Calcula la distancia exacta en metros entre dos coordenadas GPS.
    """
    # Convierte grados decimales a radianes para las funciones matemáticas.
    rad_lat1, rad_lon1, rad_lat2, rad_lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Diferencia absoluta de latitudes y longitudes.
    dlat = rad_lat2 - rad_lat1
    dlon = rad_lon2 - rad_lon1
    
    # Fórmula matemática de Haversine para distancias sobre una esfera.
    a = math.sin(dlat/2)**2 + math.cos(rad_lat1) * math.cos(rad_lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radio medio de la Tierra en metros.
    radio_tierra_metros = 6371000
    
    # Retorna el resultado final de la distancia medida en metros.
    return c * radio_tierra_metros

class SucursalViewSet(viewsets.ModelViewSet):
    """
    Controlador automático para que React pueda leer el catálogo de sucursales.
    """
    queryset = Sucursal.objects.all()
    serializer_class = SucursalSerializer
    permission_classes = [IsAuthenticated]

# ==============================================================================
# 4. CONTROLADOR PRINCIPAL (VIEWSET)
# ==============================================================================

class RegistroAsistenciaViewSet(viewsets.ModelViewSet):
    """
    Controlador para gestionar de forma automática los endpoints de Asistencias.
    """
    serializer_class = RegistroAsistenciaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filtra y restringe los registros de asistencia que se muestran en la API.
        """
        user = self.request.user

        # Filtro por Rol: Staff ve todo, usuario común solo ve lo propio.
        if user.is_staff:
            queryset = RegistroAsistencia.objects.all()
        else:
            queryset = RegistroAsistencia.objects.filter(usuario=user)

        # 1. Captura los parámetros de filtro pasados por la URL (?fecha_inicio=&fecha_fin=).
        fecha_inicio_param = self.request.query_params.get('fecha_inicio')
        fecha_fin_param = self.request.query_params.get('fecha_fin')

        # Obtén la zona horaria activa del proyecto
        tz = timezone.get_current_timezone()

        # Si se envían fechas, filtra por ese rango. Si no, usa los últimos 7 días.
        if fecha_inicio_param and fecha_fin_param:
            # Convertimos los textos de la URL 'YYYY-MM-DD' a objetos datetime nativos
            inicio_naive = datetime.strptime(fecha_inicio_param, "%Y-%m-%d")
            fin_naive = datetime.strptime(fecha_fin_param, "%Y-%m-%d")
            
            # Combinamos con las horas límites (00:00:00 y 23:59:59.999999)
            inicio_con_hora = datetime.combine(inicio_naive.date(), datetime.min.time())
            fin_con_hora = datetime.combine(fin_naive.date(), datetime.max.time())
            
            # Les asignamos la zona horaria correcta para cumplir con Django
            fecha_inicio = timezone.make_aware(inicio_con_hora, tz)
            fecha_fin = timezone.make_aware(fin_con_hora, tz)
            
            queryset = queryset.filter(fecha_hora__range=[fecha_inicio, fecha_fin])

        else:
            # Esta parte queda limpia y segura usando el tiempo actual con zona horaria
            fecha_hoy = timezone.now()
            hace_una_semana = fecha_hoy - timedelta(days=7)
            queryset = queryset.filter(fecha_hora__range=[hace_una_semana, fecha_hoy])

        # Permite al administrador filtrar por el nombre de un empleado específico.
        usuario_id_param = self.request.query_params.get('usuario_id')
        if usuario_id_param and usuario_id_param != "TODOS" and user.is_staff:
            queryset = queryset.filter(usuario__username=usuario_id_param)

        return queryset.order_by('-fecha_hora')


    @action(detail=False, methods=['get'], url_path='exportar-excel')
    def exportar_excel(self, request):
        """
        Endpoint personalizado para descargar un archivo Excel con los datos filtrados.
        """
        if not request.user.is_staff:
            return Response({"error": "No autorizado"}, status=403)

        # Inicializa el documento Excel y agrega los encabezados.
        wb = Workbook()
        ws = wb.active
        ws.title = "Reporte Filtrado"
        cabeceras = ["ID", "Empleado", "Fecha y Hora", "Tipo de Evento", "Latitud", "Longitud", "Dispositivo"]
        ws.append(cabeceras)

        # Recorremos las asistencias ya filtradas y las metemos al Excel fila por fila.
        asistencias = self.filter_queryset(self.get_queryset()) 
        for asis in asistencias:
            ws.append([
                asis.id,
                asis.usuario.username, 
                asis.fecha_hora.strftime("%d/%m/%Y %H:%M:%S"),
                asis.tipo,
                float(asis.latitud) if asis.latitud else 0.0, 
                float(asis.longitud) if asis.longitud else 0.0, 
                asis.dispositivo or "Desconocido"
            ])

        # Construye la respuesta HTTP para que el navegador descargue el archivo automáticamente.
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="reporte_asistencias_filtrado.xlsx"'
        wb.save(response)
        return response


    def perform_create(self, serializer):
        """
        Valida dinámicamente si el empleado se encuentra dentro de la geocerca
        específica de la sucursal seleccionada.
        """
        # 1. Extraemos los parámetros enviados por el Frontend de React
        sucursal_id = self.request.data.get('sucursal')
        empleado_lat = float(self.request.data.get('latitud'))
        empleado_lon = float(self.request.data.get('longitud'))

        if not sucursal_id:
            raise ValidationError({"error_geocerca": "Es obligatorio seleccionar una sucursal para checar."})

        # 2. Buscamos en la base de datos la sucursal elegida para extraer sus coordenadas y rango tolerado
        try:
            sucursal_activa = Sucursal.objects.get(id=sucursal_id)
        except Sucursal.DoesNotExist:
            raise ValidationError({"error_geocerca": "La sucursal seleccionada no es válida o fue dada de baja."})

        # 3. Calculamos la distancia usando la fórmula de Haversine contra los datos dinámicos del registro de la Sucursal
        distancia_a_sucursal = calcular_distancia_metros(
            float(sucursal_activa.latitud), float(sucursal_activa.longitud),
            empleado_lat, empleado_lon
        )

        print(f"--- GEOCERCA DINÁMICA: El empleado intenta checar en '{sucursal_activa.nombre}'. Distancia calculada: {distancia_a_sucursal:.2f} metros. ---")

        # 4. Validación de Seguridad Física Dinámica
        if distancia_a_sucursal > float(sucursal_activa.radio_maximo_metros):
            raise ValidationError({
                "error_geocerca": f"Checada denegada en {sucursal_activa.nombre}. Estás demasiado lejos del punto autorizado (Distancia actual: {distancia_a_sucursal:.2f} metros). Límite permitido: {sucursal_activa.radio_maximo_metros} metros."
            })

        # 5. Si supera la geocerca, guarda la asistencia inyectando el usuario de la sesión
        serializer.save(usuario=self.request.user)
