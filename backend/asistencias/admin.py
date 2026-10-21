# ==============================================================================
# IMPORTACIONES
# ==============================================================================

# Se importa el módulo 'admin' de Django, necesario para registrar y personalizar el panel de administración.
from django.contrib import admin

# Se importa nuestro modelo 'RegistroAsistencia' para poder darle una interfaz visual.
from .models import RegistroAsistencia

# Se importa 'format_html' de Django. Es una función de seguridad fundamental que permite
# renderizar etiquetas HTML de forma segura en el admin, evitando ataques de inyección de código (XSS).
from django.utils.html import format_html


# ==============================================================================
# CONFIGURACIÓN DEL PANEL DE ADMINISTRACIÓN (ADMIN MODEL)
# ==============================================================================

# El decorador '@admin.register' vincula directamente la clase de personalización con su modelo.
# Hace que Django sepa que este diseño visual pertenece exclusivamente a 'RegistroAsistencia'.
@admin.register(RegistroAsistencia)
class RegistroAsistenciaAdmin(admin.ModelAdmin):

    # Tupla que define qué columnas se van a mostrar en la tabla del listado general de asistencias.
    # Incluye campos reales de la base de datos y métodos dinámicos como 'coordenadas_click'.
    list_display = (
        'usuario', 
        'tipo', 
        'fecha_hora', 
        'latitud', 
        'longitud', 
        'coordenadas_click'
    )

    # Crea un panel lateral derecho con filtros interactivos automáticos.
    # Permite a los administradores segmentar las asistencias por tipo, por empleado o por la fecha.
    list_filter = ('tipo', 'usuario', 'fecha_hora')

    # Añade una barra de búsqueda en la parte superior del listado.
    # El uso de 'usuario__username' (con doble guion bajo) indica que Django debe buscar 
    # dentro de la tabla relacional de usuarios y filtrar por el nombre de usuario escrito.
    search_fields = ('usuario__username',)

    # Evita que el personal de administración pueda alterar el registro temporal de la asistencia.
    # Hace que el campo 'fecha_hora' sea visible pero de solo lectura dentro del formulario de edición.
    readonly_fields = ('fecha_hora',)


    # ==========================================================================
    # MÉTODOS DE COLUMNAS PERSONALIZADAS
    # ==========================================================================

    def coordenadas_click(self, obj):
        """
        Genera un enlace web directo a Google Maps utilizando las coordenadas reales 
        almacenadas en cada fila de asistencia.
        """
        # Validación de seguridad: Verifica que el registro actual ('obj') tenga datos de GPS válidos.
        if obj.latitud and obj.longitud:
            # Construye la URL oficial de la API de búsqueda de Google Maps pasando la latitud y longitud de la checada.
            url = f"https://google.com/maps/search/?api=1&query={obj.latitud},{obj.longitud}"
            
            # Retorna una etiqueta de enlace HTML generada de manera segura.
            # - target="_blank": Hace que el mapa se abra en una pestaña nueva del navegador sin cerrar Django.
            # - rel="noopener noreferrer": Estándar de seguridad web que previene que la nueva pestaña controle la ventana original.
            return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">📍 Ver en Mapa</a>', url)
        
        # En caso de que no existan las coordenadas en la fila, imprime este texto de advertencia.
        return "Coordenadas NO configuradas"
    
    # Propiedad del método que altera el comportamiento en la interfaz del admin.
    # Reemplaza el nombre técnico del método ('coordenadas_click') por la palabra "Ubicación" en el encabezado de la columna.
    coordenadas_click.short_description = "Ubicación"
