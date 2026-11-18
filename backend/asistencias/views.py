import math
from datetime import timedelta, datetime
from openpyxl import Workbook
from django.http import HttpResponse
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models import ProtectedError
from rest_framework import viewsets, serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import action
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.response import Response
from .models import Sucursal, RegistroAsistencia
from .serializers import SucursalSerializer, RegistroAsistenciaSerializer, AdminUserWriteSerializer


# Función para calcular la distancia entre dos coordenadas GPS usando la fórmula de Haversine
def calcular_distancia_metros(lat1, lon1, lat2, lon2):
    # Convierte grados decimales a radianes para las funciones matemáticas.
    rad_lat1, rad_lon1, rad_lat2, rad_lon2 = map(
        math.radians, [lat1, lon1, lat2, lon2])

    # Diferencia absoluta de latitudes y longitudes.
    dlat = rad_lat2 - rad_lat1
    dlon = rad_lon2 - rad_lon1

    # Fórmula matemática de Haversine para distancias sobre una esfera.
    a = math.sin(dlat/2)**2 + math.cos(rad_lat1) * \
        math.cos(rad_lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    # Radio medio de la Tierra en metros.
    radio_tierra_metros = 6371000

    # Retorna el resultado final de la distancia medida en metros.
    return c * radio_tierra_metros


# Función para calcular la duración de una jornada laboral según el horario de la sucursal
def obtener_meta_sucursal(sucursal):
    if sucursal.hora_entrada and sucursal.hora_salida:
        # Convierte ambas horas (HH:MM) a minutos totales transcurridos desde las 00:00 (medianoche)
        min_ent = sucursal.hora_entrada.hour * 60 + sucursal.hora_entrada.minute
        min_sal = sucursal.hora_salida.hour * 60 + sucursal.hora_salida.minute

        if min_sal > min_ent:
            # Turno diurno normal: la salida ocurre el mismo día que la entrada
            minutos_jornada = min_sal - min_ent
        elif min_sal < min_ent:
            # Turno nocturno (cruza medianoche): suma los minutos restantes hasta las 24:00 (1440 min)
            # más los minutos transcurridos desde las 00:00 hasta la hora de salida
            minutos_jornada = (1440 - min_ent) + min_sal
        else:
            # Si entrada y salida son exactamente iguales, asigna 9 horas (540 min) por defecto
            minutos_jornada = 540 

        # Descompone los minutos totales en horas enteras y minutos sobrantes para mostrar en texto
        horas = minutos_jornada // 60
        minutos = minutos_jornada % 60
        texto = f"{horas}h" if minutos == 0 else f"{horas}h {minutos}m"
        
        # Retorna la meta en segundos (para comparaciones exactas) y su representación legible
        return minutos_jornada * 60, texto

    # Valor de respaldo si la sucursal no tiene horarios configurados: 9 horas (32,400 segundos)
    return 32400, "9h" 


# Función para calcular las horas trabajadas emparejando cronológicamente las entradas y salidas de cada empleado
def calcular_jornadas_registros(queryset):
    # Ordena todos los registros cronológicamente de más antiguo a más reciente
    registros_ordenados = sorted(list(queryset), key=lambda r: r.fecha_hora)
    
    # Agrupa los registros en un diccionario usando el ID del usuario como clave
    por_usuario = {}
    for reg in registros_ordenados:
        por_usuario.setdefault(reg.usuario_id, []).append(reg)

    resultados = {}

    # Recorre la línea de tiempo de cada empleado de forma independiente
    for _, regs in por_usuario.items():
        # Puntero que guarda la última ENTRADA abierta esperando su respectiva SALIDA
        entrada_pendiente = None

        for reg in regs:
            segundos_meta, texto_meta = obtener_meta_sucursal(reg.sucursal)

            if reg.tipo == 'ENTRADA':
                # Si ya había una entrada abierta sin salida previa, la marca como turno inconcluso
                if entrada_pendiente:
                    _, meta_ant = obtener_meta_sucursal(entrada_pendiente.sucursal)
                    resultados[entrada_pendiente.id] = {
                        'horas_trabajadas': "Falta Salida",
                        'cumplio_jornada': False,
                        'jornada_meta_texto': meta_ant,
                    }
                
                # Registra esta nueva entrada como el turno activo actual
                entrada_pendiente = reg
                resultados[reg.id] = {
                    'horas_trabajadas': "En curso / Falta Salida",
                    'cumplio_jornada': False,
                    'jornada_meta_texto': texto_meta,
                }

            elif reg.tipo == 'SALIDA':
                if entrada_pendiente:
                    # Calcula la diferencia de tiempo exacta entre la salida y la entrada pendiente
                    diferencia = reg.fecha_hora - entrada_pendiente.fecha_hora
                    segundos_reales = diferencia.total_seconds()

                    # Valida que el turno sea coherente: mayor a 0s y máximo 18 horas (64,800s)
                    # Esto evita emparejar una salida de hoy con una entrada olvidada de hace varios días
                    if 0 < segundos_reales <= 64800:
                        horas = int(segundos_reales // 3600)
                        minutos = int((segundos_reales % 3600) // 60)
                        texto_tiempo = f"{horas}h {minutos}m"
                        cumplio = segundos_reales >= segundos_meta

                        # Asigna el mismo resumen de jornada tanto al registro de entrada como al de salida
                        info_turno = {
                            'horas_trabajadas': texto_tiempo,
                            'cumplio_jornada': cumplio,
                            'jornada_meta_texto': texto_meta,
                        }
                        resultados[entrada_pendiente.id] = info_turno
                        resultados[reg.id] = info_turno
                        
                        # Cierra el turno limpiando el puntero
                        entrada_pendiente = None
                    else:
                        # Si pasaron más de 18 horas, ambos registros se marcan como huérfanos/incompletos
                        _, meta_ant = obtener_meta_sucursal(entrada_pendiente.sucursal)
                        resultados[entrada_pendiente.id] = {
                            'horas_trabajadas': "Falta Salida",
                            'cumplio_jornada': False,
                            'jornada_meta_texto': meta_ant,
                        }
                        entrada_pendiente = None
                        resultados[reg.id] = {
                            'horas_trabajadas': "Falta Entrada",
                            'cumplio_jornada': False,
                            'jornada_meta_texto': texto_meta,
                        }
                else:
                    # Se registró una salida sin que existiera una entrada previa en el historial
                    resultados[reg.id] = {
                        'horas_trabajadas': "Falta Entrada",
                        'cumplio_jornada': False,
                        'jornada_meta_texto': texto_meta,
                    }

    return resultados


# Serializador de login que normaliza el nombre de usuario (quita espacios y pasa a minúsculas)
class CustomAuthTokenSerializer(AuthTokenSerializer):
    def validate_username(self, value):
        return value.strip().replace(" ", "_").lower()


# Vista de autenticación que devuelve el token de acceso y el rol de administrador
class CustomAuthToken(ObtainAuthToken):
    serializer_class = CustomAuthTokenSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'is_admin': user.is_staff
        })


# CRUD de obras con protección contra borrado si tienen asistencias vinculadas
class SucursalViewSet(viewsets.ModelViewSet):
    serializer_class = SucursalSerializer
    permission_classes = [IsAuthenticated]
    queryset = Sucursal.objects.all()

    # Cualquier usuario autenticado puede consultar sucursales; solo admins pueden crear/editar/borrar
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminUser()]

    # Intercepta la eliminación para evitar errores de integridad si ya existen checadas en esa obra
    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"error": "No se puede eliminar esta sucursal porque tiene registros de asistencia asociados."},
                status=status.HTTP_400_BAD_REQUEST
            )


# CRUD exclusivo para administradores sobre las cuentas de usuario
class UsuarioAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    authentication_classes = [TokenAuthentication]
    queryset = User.objects.all().order_by('username')

    # Usa un serializador ligero para listar/consultar y otro completo con validaciones para crear/editar
    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            class UserListSerializer(serializers.ModelSerializer):
                class Meta:
                    model = User
                    fields = ['id', 'username', 'is_staff']
            return UserListSerializer

        return AdminUserWriteSerializer


# Gestión de asistencias: consultas filtradas, exportación a Excel y validación GPS al checar
class RegistroAsistenciaViewSet(viewsets.ModelViewSet):
    serializer_class = RegistroAsistenciaSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    # Filtra los registros según rol (admin ve todos, empleado solo los suyos) y parámetros de URL
    def get_queryset(self):
        user = self.request.user

        # Optimiza la consulta trayendo las relaciones usuario y sucursal en un solo JOIN
        if user.is_staff:
            queryset = RegistroAsistencia.objects.select_related('usuario', 'sucursal').all()
        else:
            queryset = RegistroAsistencia.objects.select_related('usuario', 'sucursal').filter(usuario=user)

        fecha_inicio_param = self.request.query_params.get('fecha_inicio')
        fecha_fin_param = self.request.query_params.get('fecha_fin')
        sucursal_param = self.request.query_params.get('sucursal_id')
        usuario_id_param = self.request.query_params.get('usuario_id')

        tz = timezone.get_current_timezone()

        if fecha_inicio_param and fecha_fin_param:
            inicio_naive = datetime.strptime(fecha_inicio_param, "%Y-%m-%d")
            fin_naive = datetime.strptime(fecha_fin_param, "%Y-%m-%d")

            inicio_con_hora = datetime.combine(inicio_naive.date(), datetime.min.time())
            fin_con_hora = datetime.combine(fin_naive.date(), datetime.max.time())
            
            queryset = queryset.filter(
                fecha_hora__range=[
                    timezone.make_aware(inicio_con_hora, tz),
                    timezone.make_aware(fin_con_hora, tz),
                ]
            )
        else:
            # Si no se envían fechas, muestra por defecto los registros de los últimos 14 días
            queryset = queryset.filter(
                fecha_hora__range=[timezone.now() - timedelta(days=14), timezone.now()])

        if sucursal_param and sucursal_param != "TODAS":
            queryset = queryset.filter(sucursal_id=sucursal_param)

        if usuario_id_param and usuario_id_param != "TODOS" and user.is_staff:
            queryset = queryset.filter(usuario__username=usuario_id_param)

        return queryset.order_by('-fecha_hora')

    # Sobrescribe el listado JSON para inyectar las horas trabajadas calculadas dinámicamente
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        serializer = self.get_serializer(queryset, many=True)
        datos_enriquecidos = serializer.data

        calculos_jornada = calcular_jornadas_registros(queryset)

        for item in datos_enriquecidos:
            info = calculos_jornada.get(
                item['id'],
                {
                    'horas_trabajadas': 'Incompleto',
                    'cumplio_jornada': False,
                    'jornada_meta_texto': '9h',
                },
            )
            item['horas_trabajadas'] = info['horas_trabajadas']
            item['cumplio_jornada'] = info['cumplio_jornada']
            item['jornada_meta_texto'] = info['jornada_meta_texto']

        return Response(datos_enriquecidos)

    # Endpoint personalizado (/exportar-excel/) para descargar el reporte filtrado en formato .xlsx
    @action(detail=False, methods=['get'], url_path='exportar-excel')
    def exportar_excel(self, request):
        if not request.user.is_staff:
            return Response({"error": "No autorizado"}, status=403)

        wb = Workbook()
        ws = wb.active
        ws.title = "Reporte Asistencias"

        cabeceras = [
            "ID",
            "Empleado",
            "Obra",
            "Fecha y Hora Local",
            "Tipo de Evento",
            "Estatus Puntualidad",
            "Tiempo Total Turno",
            "Meta Turno",
            "Cumplió Jornada",
            "Latitud",
            "Longitud",
            "Dispositivo",
        ]
        ws.append(cabeceras)

        asistencias = self.filter_queryset(self.get_queryset())
        calculos_jornada = calcular_jornadas_registros(asistencias)

        for asis in asistencias:
            fecha_local = timezone.localtime(asis.fecha_hora)
            info_jornada = calculos_jornada.get(asis.id, {})
            cumplio_texto = (
                "SÍ"
                if info_jornada.get('cumplio_jornada')
                else "NO / INCOMPLETO"
            )

            ws.append([
                asis.id,
                asis.usuario.username.replace("_", " ").title(),
                asis.sucursal.nombre,
                fecha_local.strftime("%d/%m/%Y %H:%M:%S"),
                asis.get_tipo_display(),
                asis.get_estatus_display(),
                info_jornada.get('horas_trabajadas', 'Incompleto'),
                info_jornada.get('jornada_meta_texto', '9h'),
                cumplio_texto,
                float(asis.latitud) if asis.latitud else 0.0,
                float(asis.longitud) if asis.longitud else 0.0,
                asis.dispositivo or "Desconocido",
            ])

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="reporte_asistencias_filtrado.xlsx"'
        wb.save(response)
        return response

    # Lógica principal al registrar una checada: valida secuencia de turnos, geocerca GPS y puntualidad
    def perform_create(self, serializer):
        try:
            empleado_lat = float(self.request.data.get('latitud'))
            empleado_lon = float(self.request.data.get('longitud'))
        except (TypeError, ValueError):
            raise ValidationError({"error_geocerca": "Coordenadas GPS inválidas."})

        tipo_evento = self.request.data.get('tipo')
        usuario = self.request.user
        ahora_utc = timezone.now()
        ahora_local = timezone.localtime(ahora_utc)

        # 1. Validación de secuencia lógica de turnos (evita entradas dobles o salidas sin entrada)
        ultimo_registro = (
            RegistroAsistencia.objects.filter(
                usuario=usuario,
                fecha_hora__gte=ahora_utc - timedelta(hours=18),
            )
            .order_by('-fecha_hora')
            .first()
        )

        if tipo_evento == 'ENTRADA':
            if ultimo_registro and ultimo_registro.tipo == 'ENTRADA':
                hora_ent = timezone.localtime(ultimo_registro.fecha_hora).strftime("%H:%M")
                raise ValidationError({
                    "error_geocerca": (
                        f"Ya tienes un turno abierto desde las {hora_ent} hrs en "
                        f"{ultimo_registro.sucursal.nombre}. Debes registrar tu SALIDA primero."
                    )
                })

            inicio_hoy = ahora_local.replace(hour=0, minute=0, second=0, microsecond=0)
            ya_completo_hoy = RegistroAsistencia.objects.filter(
                usuario=usuario,
                tipo='ENTRADA',
                fecha_hora__gte=inicio_hoy,
            ).exists()

            if ya_completo_hoy:
                raise ValidationError({
                    "error_geocerca": "Ya registraste tu jornada laboral del día de hoy."
                })

        elif tipo_evento == 'SALIDA':
            if not ultimo_registro or ultimo_registro.tipo != 'ENTRADA':
                raise ValidationError({
                    "error_geocerca": "No tienes una ENTRADA activa registrada. Debes checar ENTRADA antes de salir."
                })

            segundos_meta, texto_meta = obtener_meta_sucursal(ultimo_registro.sucursal)
            segundos_transcurridos = (ahora_utc - ultimo_registro.fecha_hora).total_seconds()
            confirmar = self.request.data.get('confirmar_anticipada', False)

            if segundos_transcurridos < segundos_meta and not confirmar:
                horas_act = int(segundos_transcurridos // 3600)
                mins_act = int((segundos_transcurridos % 3600) // 60)
                raise ValidationError({
                    "requiere_confirmacion": True,
                    "mensaje": f"Llevas {horas_act}h {mins_act}m de una jornada meta de {texto_meta}. ¿Deseas registrar tu SALIDA ANTICIPADA de todas formas?"
                })

        # 2. Algoritmo de Geocerca Dinámica: busca la sucursal activa más cercana dentro de su radio
        sucursales = Sucursal.objects.filter(activa=True)
        sucursal_detectada = None
        menor_distancia = float('inf')  # Inicia en infinito para ir guardando la distancia mínima real

        for suc in sucursales:
            distancia = calcular_distancia_metros(
                float(suc.latitud),
                float(suc.longitud),
                empleado_lat,
                empleado_lon,
            )
            # Si el empleado está dentro del radio permitido y esta obra está más cerca que la anterior
            if distancia <= float(suc.radio_maximo_metros) and distancia < menor_distancia:
                menor_distancia = distancia
                sucursal_detectada = suc

        if not sucursal_detectada:
            raise ValidationError({
                "error_geocerca": "Checada denegada. No te encuentras dentro del perímetro autorizado de ninguna obra activa."
            })

        # 3. Cálculo de puntualidad (A_TIEMPO vs RETARDO) en minutos desde medianoche
        estatus_final = 'LIBRE'

        if sucursal_detectada.hora_entrada and tipo_evento == 'ENTRADA':
            hora_checada = ahora_local.time()
            min_checada = hora_checada.hour * 60 + hora_checada.minute
            min_entrada = (
                sucursal_detectada.hora_entrada.hour * 60
                + sucursal_detectada.hora_entrada.minute
            )

            # Ajuste para turnos nocturnos: si la entrada oficial es >= 18:00 (1080 min)
            # y el empleado llega de madrugada antes de las 06:00 (360 min), se suman 24h (1440 min)
            # para evitar que las 00:15 (15 min) parezcan menores que las 23:00 (1380 min).
            if min_entrada >= 1080 and min_checada < 360:
                min_checada += 1440

            if min_checada > (min_entrada + sucursal_detectada.tolerancia_minutos):
                estatus_final = 'RETARDO'
            else:
                estatus_final = 'A_TIEMPO'

        elif sucursal_detectada.hora_entrada and tipo_evento == 'SALIDA':
            estatus_final = 'ANTICIPADA'

        serializer.save(
            usuario=usuario,
            sucursal=sucursal_detectada,
            estatus=estatus_final,
        )

        print(
            f"--- GEOCERCA DINÁMICA: El empleado '{usuario.username}' intenta checar en '{sucursal_detectada.nombre}'. Distancia calculada: {menor_distancia:.2f} metros. ---")
