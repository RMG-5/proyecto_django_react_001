from django.contrib import admin
from .models import Sucursal, RegistroAsistencia, PerfilEmpleado
from django.utils.html import format_html


# Configuración del modelo Sucursal en el panel de administración
@admin.register(Sucursal)
class SucursalAdmin(admin.ModelAdmin):
    # Columnas que se mostrarán en la tabla principal
    list_display = ('nombre', 'latitud', 'longitud', 'radio_con_sufijo',
                    'hora_entrada', 'hora_salida', 'tolerancia_minutos', 'activa',)             
    # Filtros laterales disponibles
    list_filter = ('nombre', 'activa',)
    # Permite buscar por el nombre de la sucursal
    search_fields = ('nombre',)

    # Organización visual de los campos en secciones dentro del formulario de edición
    fieldsets = (
            ('Información General', {
                'fields': ('nombre', 'activa',)
            }),
            ('Ubicación & Geocerca', {
                'description': 'Coordenadas para la validación de asistencia \
                    en campo, mediante la fórmula Haversine.',
                'fields': ('latitud', 'longitud', 'radio_maximo_metros',)                
            }),
            ('Horario y tolerancia', {
                'description': 'Los horarios son opcionales, si no se llenan los campos, \
                    el sistema validara que el usuario cumpla con una jornada de 9 hrs.', 
                'fields': ('hora_entrada', 'hora_salida', 'tolerancia_minutos',)
            }),            
        )

    # Recursos estáticos adicionales (CSS y JS) para el mapa interactivo
    class Media:
        # Se cargan los estilos CSS de Leaflet desde su CDN oficial
        css = {
            'all': ('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',)
        }
        # Se carga primero la librería Leaflet y luego el script personalizado
        js = (
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
            'asistencias/js/mapa_admin.js',
        )

    # Método personalizado para mostrar el radio_maximo_metros con la unidad de medida
    @admin.display(description='Distancia máxima para checar')
    def radio_con_sufijo(self, obj):

        # Devuelve la distancia maxima permitida para checar con el sufijo ('mts')
        return f"{obj.radio_maximo_metros} mts"


# Configuración del modelo RegistroAsistencia en el panel de administración
@admin.register(RegistroAsistencia)
class RegistroAsistenciaAdmin(admin.ModelAdmin):
    # Columnas que se mostrarán en la lista principal de asistencias
    list_display = ('usuario', 'tipo', 'estatus', 'fecha_hora', 
                    'sucursal__nombre', 'coordenadas_click',)
    # Optimiza el rendimiento haciendo JOIN en SQL y evitando consultas N+1 al cargar llaves foráneas
    list_select_related = ('usuario', 'sucursal',)
    # Filtros laterales disponibles
    list_filter = ('usuario', 'tipo', 'estatus', 'fecha_hora', 'sucursal',)
    # Permite buscar por el nombre de usuario relacionado o por el nombre de la sucursal
    search_fields = ('usuario__username', 'sucursal__nombre',)
    # Campos de solo lectura dentro del formulario de edición
    readonly_fields = ('fecha_hora',)

    # Organización visual de los campos en secciones dentro del formulario de edición
    fieldsets = (
                ('Usuario y datos de la checada', {
                    'fields': ('usuario', 'tipo', 'estatus', 'dispositivo',)
                }),
                ('Datos de la obra donde se registro la checada', {
                    'fields': ('sucursal', 'latitud', 'longitud',)                
                }),
                ('Fecha y hora (solo lectura, no se puede modificar)', {
                    'fields': ('fecha_hora',)
                }),            
            )

    # Genera un enlace web directo a Google Maps utilizando las coordenadas de cada checada
    @admin.display(description='Ubicación')
    def coordenadas_click(self, obj):
        # Validación de seguridad: Verifica que el registro actual ('obj') tenga datos de GPS válidos
        if obj.latitud and obj.longitud:
            # Construye la URL oficial de la API de búsqueda de Google Maps pasando la latitud y longitud de la checada
            url = f"https://www.google.com/maps/search/?api=1&query={obj.latitud},{obj.longitud}"
            # Retorna una etiqueta de enlace HTML generada de manera segura:
            # - target="_blank": Hace que el mapa se abra en una pestaña nueva del navegador sin cerrar Django
            # - rel="noopener noreferrer": Estándar de seguridad web que previene que la nueva pestaña controle la ventana original
            return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">📍 Ver en Mapa</a>', url)

        # En caso de que no existan coordenadas en el registro, muestra un texto de advertencia
        return "Coordenadas NO configuradas"


# Configuración del modelo PerfilEmpleado en el panel de administración
@admin.register(PerfilEmpleado)
class PerfilEmpleadoAdmin(admin.ModelAdmin):
    # Columnas visibles en el listado de perfiles y dispositivos vinculados
    list_display = ('usuario', 'device_id', 'fecha_vinculacion',)
    # Barra de búsqueda por nombre de usuario o identificador único del dispositivo
    search_fields = ('usuario__username', 'device_id',)
    # Bloquea la edición manual de la fecha en que se vinculó el teléfono
    readonly_fields = ('device_id', 'fecha_vinculacion',)
    # Registra acciones masivas personalizadas en el menú desplegable del admin
    actions = ['desvincular_dispositivos']

    # Acción masiva para limpiar el dispositivo vinculado de uno o varios empleados seleccionados
    @admin.action(description="📱🔓 Desvincular teléfono de los empleados seleccionados")
    def desvincular_dispositivos(self, request, queryset):
        # Ejecuta un UPDATE masivo en la base de datos dejando en nulo el ID y la fecha de vinculación
        actualizados = queryset.update(device_id=None, fecha_vinculacion=None)
        # Muestra una notificación verde de éxito en la parte superior del panel de administración
        self.message_user(request, f"Se desvinculo(aron) {actualizados} dispositivo(s) correctamente.")
