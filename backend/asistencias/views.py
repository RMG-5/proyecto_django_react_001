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


# Función para obtener la meta de jornada laboral en segundos y su representación en texto
def obtener_meta_sucursal(sucursal):
    if sucursal.hora_entrada and sucursal.hora_salida:
        min_ent = sucursal.hora_entrada.hour * 60 + sucursal.hora_entrada.minute
        min_sal = sucursal.hora_salida.hour * 60 + sucursal.hora_salida.minute

        if min_sal > min_ent:
            minutos_jornada = min_sal - min_ent
        elif min_sal < min_ent:
            # Turno nocturno (ej. 22:00 a 06:00 -> (1440 - 1320) + 360 = 480 min)
            minutos_jornada = (1440 - min_ent) + min_sal
        else:
            minutos_jornada = 540  # 9h por defecto si son iguales

        horas = minutos_jornada // 60
        minutos = minutos_jornada % 60
        texto = f"{horas}h" if minutos == 0 else f"{horas}h {minutos}m"
        return minutos_jornada * 60, texto

    return 32400, "9h"  # Horario libre: meta estándar de 9 horas


# Función para calcular las jornadas laborales a partir de los registros de asistencia
def calcular_jornadas_registros(queryset):
    registros_ordenados = sorted(list(queryset), key=lambda r: r.fecha_hora)
    por_usuario = {}
    for reg in registros_ordenados:
        por_usuario.setdefault(reg.usuario_id, []).append(reg)

    resultados = {}

    # Iteramos por cada usuario y sus registros para calcular las horas trabajadas y si cumplieron la jornada
    for _, regs in por_usuario.items():
        entrada_pendiente = None

        for reg in regs:
            segundos_meta, texto_meta = obtener_meta_sucursal(reg.sucursal)

            if reg.tipo == 'ENTRADA':
                # Si quedó una entrada anterior sin cerrar, la marcamos como incompleta
                if entrada_pendiente:
                    _, meta_ant = obtener_meta_sucursal(entrada_pendiente.sucursal)
                    resultados[entrada_pendiente.id] = {
                        'horas_trabajadas': "Falta Salida",
                        'cumplio_jornada': False,
                        'jornada_meta_texto': meta_ant,
                    }
                entrada_pendiente = reg
                resultados[reg.id] = {
                    'horas_trabajadas': "En curso / Falta Salida",
                    'cumplio_jornada': False,
                    'jornada_meta_texto': texto_meta,
                }

            elif reg.tipo == 'SALIDA':
                if entrada_pendiente:
                    diferencia = reg.fecha_hora - entrada_pendiente.fecha_hora
                    segundos_reales = diferencia.total_seconds()

                    # Validamos que la salida corresponda al mismo turno (máximo 18 horas)
                    if 0 < segundos_reales <= 64800:
                        horas = int(segundos_reales // 3600)
                        minutos = int((segundos_reales % 3600) // 60)
                        texto_tiempo = f"{horas}h {minutos}m"
                        cumplio = segundos_reales >= segundos_meta

                        info_turno = {
                            'horas_trabajadas': texto_tiempo,
                            'cumplio_jornada': cumplio,
                            'jornada_meta_texto': texto_meta,
                        }
                        resultados[entrada_pendiente.id] = info_turno
                        resultados[reg.id] = info_turno
                        entrada_pendiente = None
                    else:
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
                    resultados[reg.id] = {
                        'horas_trabajadas': "Falta Entrada",
                        'cumplio_jornada': False,
                        'jornada_meta_texto': texto_meta,
                    }

    return resultados


# Clase personalizada para el manejo de tokens de autenticación con validación de nombre de usuario
class CustomAuthTokenSerializer(AuthTokenSerializer):
    def validate_username(self, value):
        return value.strip().replace(" ", "_").lower()


# Clase personalizada para el manejo de tokens de autenticación con validación de nombre de usuario
class CustomAuthToken(ObtainAuthToken):
    # Le indicamos que use el serializador personalizado para el Login
    serializer_class = CustomAuthTokenSerializer

    # Sobreescribimos el método post para devolver un JSON con el token y si el usuario es admin
    def post(self, request, *args, **kwargs):
        # Validamos las credenciales usando el serializador nativo de DRF
        serializer = self.serializer_class(
            data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        # Extraemos el usuario validado
        user = serializer.validated_data['user']

        # Obtenemos o creamos el token asignado a este usuario
        token, _ = Token.objects.get_or_create(user=user)

        # Retornamos la respuesta exacta que tu App.jsx está esperando consumir
        return Response({
            'token': token.key,
            'is_admin': user.is_staff
        })


# Vista para el manejo de Sucursales con permisos diferenciados
class SucursalViewSet(viewsets.ModelViewSet):
    serializer_class = SucursalSerializer
    permission_classes = [IsAuthenticated]
    queryset = Sucursal.objects.all()

    # Sobreescribimos el método get_permissions para aplicar permisos diferenciados según la acción
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminUser()]

    # Sobreescribimos el método de borrado para manejar errores de integridad referencial
    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"error": "No se puede eliminar esta sucursal porque tiene registros de asistencia asociados. Considere dejarla intacta para fines de auditoría."},
                status=status.HTTP_400_BAD_REQUEST
            )


# Vista para el manejo de Registros de Asistencia con filtros avanzados y exportación a Excel
class RegistroAsistenciaViewSet(viewsets.ModelViewSet):
    serializer_class = RegistroAsistenciaSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    # Sobreescribimos el método get_queryset para aplicar filtros dinámicos según el usuario y los parámetros de la URL
    def get_queryset(self):
        user = self.request.user

        # Filtro por Rol: Staff ve todo, usuario común solo ve lo propio.
        if user.is_staff:
            queryset = RegistroAsistencia.objects.select_related('usuario', 'sucursal').all()
        else:
            queryset = RegistroAsistencia.objects.select_related('usuario', 'sucursal').filter(usuario=user)

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
            # Extendemos 12 horas el día final para capturar salidas nocturnas del último día filtrado
            fin_con_hora = datetime.combine(fin_naive.date(), datetime.max.time()) + timedelta(hours=12)
            queryset = queryset.filter(
                fecha_hora__range=[
                    timezone.make_aware(inicio_con_hora, tz),
                    timezone.make_aware(fin_con_hora, tz),
                ]
            )
        else:
            # Por defecto últimos 7 días si no hay filtro activo
            queryset = queryset.filter(
                fecha_hora__range=[timezone.now() - timedelta(days=7), timezone.now()])

        # Filtro por Sucursal Cruzada
        if sucursal_param and sucursal_param != "TODAS":
            queryset = queryset.filter(sucursal_id=sucursal_param)

        # Filtro por Empleado Cruzado
        if usuario_id_param and usuario_id_param != "TODOS" and user.is_staff:
            queryset = queryset.filter(usuario__username=usuario_id_param)

        return queryset.order_by('-fecha_hora')

    # Sobreescribimos el listado para calcular las horas trabajadas en el día e inyectar si cumplió la jornada calculada dinámicamente según la sucursal.
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Serializamos los registros base tal como están en la BD
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
    
    # Acción personalizada para exportar los registros filtrados a un archivo Excel
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

    # Sobreescribimos el método perform_create para inyectar la lógica de geocerca y validación de jornada laboral
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

        # 1. Validación de secuencia de jornada (soporta cruce de medianoche)
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

            # Evitar doble jornada en el mismo día calendario si ya cerró turno hoy
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
                    "error_geocerca": "No tienes una ENTRADA activa registrada. Debes checar entrada antes de salir."
                })

        # 2. Detección automática de sucursal por geocerca
        sucursales = Sucursal.objects.filter(activa=True)
        sucursal_detectada = None
        menor_distancia = float('inf')

        for suc in sucursales:
            distancia = calcular_distancia_metros(
                float(suc.latitud),
                float(suc.longitud),
                empleado_lat,
                empleado_lon,
            )
            if distancia <= float(suc.radio_maximo_metros) and distancia < menor_distancia:
                menor_distancia = distancia
                sucursal_detectada = suc

        if not sucursal_detectada:
            raise ValidationError({
                "error_geocerca": "Checada denegada. No te encuentras dentro del perímetro autorizado de ninguna obra."
            })

        # 3. Evaluación de puntualidad (con soporte para turnos nocturnos)
        estatus_final = 'LIBRE'

        if sucursal_detectada.hora_entrada and tipo_evento == 'ENTRADA':
            hora_checada = ahora_local.time()
            min_checada = hora_checada.hour * 60 + hora_checada.minute
            min_entrada = (
                sucursal_detectada.hora_entrada.hour * 60
                + sucursal_detectada.hora_entrada.minute
            )

            # Ajuste si el turno empieza de noche (ej. 22:00) y el empleado llega en la madrugada (ej. 00:05)
            if min_entrada >= 1080 and min_checada < 360:
                min_checada += 1440

            if min_checada > (min_entrada + sucursal_detectada.tolerancia_minutos):
                estatus_final = 'RETARDO'
            else:
                estatus_final = 'A_TIEMPO'

        elif sucursal_detectada.hora_entrada and tipo_evento == 'SALIDA':
            estatus_final = 'A_TIEMPO'

        serializer.save(
            usuario=usuario,
            sucursal=sucursal_detectada,
            estatus=estatus_final,
        )

        # Se imprime en la terminal de Docker cada que un empleado intenta checar.
        print(
            f"--- GEOCERCA DINÁMICA: El empleado '{usuario.username}' intenta checar en '{sucursal_detectada.nombre}'. Distancia calculada: {menor_distancia:.2f} metros. ---")


# Clase para la gestión de usuarios con permisos de administrador
class UsuarioAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    authentication_classes = [TokenAuthentication]
    queryset = User.objects.all().order_by('username')

    # Sobreescribimos el método get_serializer_class para usar diferentes serializadores según la acción
    def get_serializer_class(self):
        # Si están listando (GET), usamos el plano. Si están creando/editando, el completo.
        if self.action in ['list', 'retrieve']:
            class UserListSerializer(serializers.ModelSerializer):
                class Meta:
                    model = User
                    fields = ['id', 'username', 'is_staff']
            return UserListSerializer

        return AdminUserWriteSerializer
