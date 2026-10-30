from django.contrib import admin
from .models import Sucursal, RegistroAsistencia
from django.utils.html import format_html


@admin.register(Sucursal)
class SucursalAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'latitud', 'longitud', 'radio_maximo_metros', 'hora_entrada', 'hora_salida', 'tolerancia_minutos')
    list_filter = ('nombre',)
    search_fields = ('nombre',)

    class Media:
        # Cargamos los estilos CSS de Leaflet desde su CDN oficial
        css = {
            'all': ('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',)
        }
        # Cargamos primero la librería Leaflet y luego tu script personalizado
        js = (
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.js',
            'asistencias/js/mapa_admin.js',
        )
    

@admin.register(RegistroAsistencia)
class RegistroAsistenciaAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'fecha_hora', 'tipo', 'sucursal', 'estatus', 'coordenadas_click')
    list_filter = ('tipo', 'usuario', 'fecha_hora',)
    search_fields = ('usuario__username',)
    
    readonly_fields = ('fecha_hora',)

#======================================================================================
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
#======================================================================================
