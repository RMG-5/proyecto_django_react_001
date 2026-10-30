import math
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, IsAdminUser 
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import action
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from .models import Sucursal, RegistroAsistencia
from .serializers import SucursalSerializer, RegistroAsistenciaSerializer, AdminUserWriteSerializer
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta, datetime
from openpyxl import Workbook
from django.contrib.auth.models import User
from rest_framework import serializers, viewsets, status
from rest_framework.authtoken.serializers import AuthTokenSerializer
from django.db.models import ProtectedError


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


class CustomAuthTokenSerializer(AuthTokenSerializer):
    def validate_username(self, value):
        return value.strip().replace(" ", "_")


class CustomAuthToken(ObtainAuthToken):
    # Le indicamos que use el serializador personalizado para el Login
    serializer_class = CustomAuthTokenSerializer 

    def post(self, request, *args, **kwargs):
        # Validamos las credenciales usando el serializador nativo de DRF
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        # Extraemos el usuario validado
        user = serializer.validated_data['user']

        # Obtenemos o creamos el token asignado a este usuario
        token, created = Token.objects.get_or_create(user=user)

        # Retornamos la respuesta exacta que tu App.jsx está esperando consumir
        return Response({
            'token': token.key,
            'is_admin': user.is_staff
        })
    

class SucursalViewSet(viewsets.ModelViewSet):
    serializer_class = SucursalSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def destroy(self, request, *args, **kwargs):
        """
        Sobreescribimos el método de borrado para evitar que la app truene (error 500)
        si intentan borrar una sucursal que tiene registros de asistencia activos.
        """
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"error": "No se puede eliminar esta sucursal porque tiene registros de asistencia asociados. Considere dejarla intacta para fines de auditoría."},
                status=status.HTTP_400_BAD_REQUEST
            )

    queryset = Sucursal.objects.all()


class RegistroAsistenciaViewSet(viewsets.ModelViewSet):
    """
    Controlador para gestionar de forma automática los endpoints de Asistencias.
    """
    serializer_class = RegistroAsistenciaSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

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

        # 1. Captura los parámetros de filtro pasados por la URL
        fecha_inicio_param = self.request.query_params.get('fecha_inicio')
        fecha_fin_param = self.request.query_params.get('fecha_fin')
        sucursal_param = self.request.query_params.get('sucursal_id')
        usuario_id_param = self.request.query_params.get('usuario_id')

        # Obtén la zona horaria activa del proyecto
        tz = timezone.get_current_timezone()

        # Filtro por rango de fechas
        if fecha_inicio_param and fecha_fin_param:
            inicio_naive = datetime.strptime(fecha_inicio_param, "%Y-%m-%d")
            fin_naive = datetime.strptime(fecha_fin_param, "%Y-%m-%d")
            # Combinamos con las horas límites (00:00:00 y 23:59:59.999999)
            inicio_con_hora = datetime.combine(inicio_naive.date(), datetime.min.time())
            fin_con_hora = datetime.combine(fin_naive.date(), datetime.max.time())
            queryset = queryset.filter(fecha_hora__range=[timezone.make_aware(inicio_con_hora, tz), timezone.make_aware(fin_con_hora, tz)])
        else:
            # Por defecto últimos 7 días si no hay filtro activo
            queryset = queryset.filter(fecha_hora__range=[timezone.now() - timedelta(days=7), timezone.now()])

        # Filtro por Sucursal Cruzada
        if sucursal_param and sucursal_param != "TODAS":
            queryset = queryset.filter(sucursal_id=sucursal_param)

        # Filtro por Empleado Cruzado
        if usuario_id_param and usuario_id_param != "TODOS" and user.is_staff:
            queryset = queryset.filter(usuario__username=usuario_id_param)

        return queryset.order_by('-fecha_hora')


    def list(self, request, *args, **kwargs):
        """
        Sobreescribimos el listado para calcular las horas trabajadas en el día
        e inyectar si cumplió la jornada calculada dinámicamente según la sucursal.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Serializamos los registros base tal como están en la BD
        serializer = self.get_serializer(queryset, many=True)
        datos_enriquecidos = serializer.data

        # Agrupamos las asistencias por usuario y por fecha (día) para calcular parejas de Entrada/Salida
        asistencias_por_dia = {}
        for reg in queryset:
            fecha_local = timezone.localtime(reg.fecha_hora).date()
            clave = (reg.usuario.id, fecha_local) # Llave única por empleado y día
            
            if clave not in asistencias_por_dia:
                asistencias_por_dia[clave] = {'ENTRADA': None, 'SALIDA': None, 'SUCURSAL_REG': reg.sucursal}
            
            # Guardamos la checada según su tipo
            asistencias_por_dia[clave][reg.tipo] = timezone.localtime(reg.fecha_hora)

        # Recorremos el JSON que irá a React e inyectamos los cálculos métricos
        for item in datos_enriquecidos:
            # Recuperamos el objeto original de la BD usando el ID
            reg_original = queryset.get(id=item['id'])
            fecha_local = timezone.localtime(reg_original.fecha_hora).date()
            clave = (reg_original.usuario.id, fecha_local)
            
            bloque_dia = asistencias_por_dia.get(clave, {'ENTRADA': None, 'SALIDA': None, 'SUCURSAL_REG': None})
            entrada = bloque_dia['ENTRADA']
            salida = bloque_dia['SALIDA']
            sucursal_del_dia = bloque_dia['SUCURSAL_REG'] or reg_original.sucursal

            # 1. DETERMINAR LA JORNADA META (En segundos)
            # Por defecto, si es horario libre, asignamos 9 horas (9 * 3600 = 32400 segundos)
            segundos_jornada_meta = 32400 
            texto_meta = "9h"

            if sucursal_del_dia.hora_entrada and sucursal_del_dia.hora_salida:
                # Convertimos ambas horas fijas a minutos del día para calcular la diferencia teórica
                minutos_entrada_fija = sucursal_del_dia.hora_entrada.hour * 60 + sucursal_del_dia.hora_entrada.minute
                minutos_salida_fija = sucursal_del_dia.hora_salida.hour * 60 + sucursal_del_dia.hora_salida.minute
                
                minutos_totales_jornada = minutos_salida_fija - minutos_entrada_fija
                
                if minutos_totales_jornada > 0:
                    segundos_jornada_meta = minutos_totales_jornada * 60
                    horas_meta = minutos_totales_jornada // 60
                    minutos_meta = minutos_totales_jornada % 60
                    texto_meta = f"{horas_meta}h" if minutos_meta == 0 else f"{horas_meta}h {minutos_meta}m"

            # Inyectamos el texto de la meta al JSON para que React lo muestre dinámicamente
            item['jornada_meta_texto'] = texto_meta

            # Valores por defecto si falta alguna checada
            item['horas_trabajadas'] = "Incompleto"
            item['cumplio_jornada'] = False

            # 2. EVALUAR EL TIEMPO LABORADO REAL DEL EMPLEADO
            if entrada and salida:
                diferencia = salida - entrada
                segundos_totales_reales = diferencia.total_seconds()
                
                if segundos_totales_reales > 0:
                    horas_reales = int(segundos_totales_reales // 3600)
                    minutos_reales = int((segundos_totales_reales % 3600) // 60)
                    
                    item['horas_trabajadas'] = f"{horas_reales}h {minutos_reales}m"
                    
                    # COMPARACIÓN INTELIGENTE: ¿El tiempo real es mayor o igual a la meta de la sucursal?
                    item['cumplio_jornada'] = segundos_totales_reales >= segundos_jornada_meta
                else:
                    item['horas_trabajadas'] = "Error secuencia"
            elif entrada and not salida:
                item['horas_trabajadas'] = "Falta Salida"
            elif not entrada and salida:
                item['horas_trabajadas'] = "Falta Entrada"

        return Response(datos_enriquecidos)
    

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
        tipo_evento = self.request.data.get('tipo')

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

        # 4. Validación de Seguridad Física Dinámica
        if distancia_a_sucursal > float(sucursal_activa.radio_maximo_metros):
            raise ValidationError({
                "error_geocerca": f"Checada denegada en {sucursal_activa.nombre}. Estás demasiado lejos del punto autorizado (Distancia actual: {distancia_a_sucursal:.2f} metros). Límite permitido: {sucursal_activa.radio_maximo_metros} metros."
            })

        # 5. Validación de Horario y Tolerancia
        estatus_final = 'LIBRE'

        # 6. Evaluamos solo si la sucursal tiene un horario establecido y es una ENTRADA
        if sucursal_activa.hora_entrada and tipo_evento == 'ENTRADA':
            # Obtenemos la hora actual en la zona horaria configurada en Django
            ahora_local = timezone.localtime(timezone.now())
            hora_checada = ahora_local.time()
            
            # Convertimos las horas a minutos del día para comparar fácilmente matemáticamente
            minutos_checada = hora_checada.hour * 60 + hora_checada.minute
            minutos_limite_entrada = sucursal_activa.hora_entrada.hour * 60 + sucursal_activa.hora_entrada.minute
            
            # El límite máximo permitido es la hora de entrada + los minutos de tolerancia
            minutos_maximos_tolerados = minutos_limite_entrada + sucursal_activa.tolerancia_minutos
            
            if minutos_checada > minutos_maximos_tolerados:
                estatus_final = 'RETARDO'
            else:
                estatus_final = 'A_TIEMPO'

        elif sucursal_activa.hora_entrada and tipo_evento == 'SALIDA':
            # Si tiene horario y es salida, por defecto lo catalogamos a tiempo (o libre según prefieras)
            estatus_final = 'A_TIEMPO'

        # 7. Guardamos el registro inyectando el usuario y el estatus calculado
        serializer.save(usuario=self.request.user, estatus=estatus_final)

        # Se imprime en la terminal de Docker cada que un empleado intenta checar.
        print(f"--- GEOCERCA DINÁMICA: El empleado intenta checar en '{sucursal_activa.nombre}'. Distancia calculada: {distancia_a_sucursal:.2f} metros. ---")


class UsuarioAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    authentication_classes = [TokenAuthentication]
    queryset = User.objects.all().order_by('username')
    
    def get_serializer_class(self):
        # Si están listando (GET), usamos el plano. Si están creando/editando, el completo.
        if self.action in ['list', 'retrieve']:
            class UserListSerializer(serializers.ModelSerializer):
                class Meta:
                    model = User
                    fields = ['id', 'username', 'is_staff']
            return UserListSerializer
        
        return AdminUserWriteSerializer