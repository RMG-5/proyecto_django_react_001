from django.contrib import admin
# Importamos el modelo que creamos en el paso anterior
from .models import RegistroAsistencia

# =================================================
from django.utils.html import format_html
# =================================================

# Configuramos una clase personalizada para mejorar la visualización en el panel

@admin.register(RegistroAsistencia)
class RegistroAsistenciaAdmin(admin.ModelAdmin):
    # Columnas que se mostrarán en la lista general de registros
    list_display = ('id', 'usuario', 'tipo', 'fecha_hora', 'latitud', 'longitud', 'coordenadas_click')

    # Filtros laterales para buscar rápidamente por tipo o usuario
    list_filter = ('tipo', 'usuario', 'fecha_hora')

    # Barra de búsqueda superior (busca por el nombre de usuario del empleado)
    search_fields = ('usuario__username',)

    # Hace que la fecha y hora sean de solo lectura para evitar alteraciones manuales
    readonly_fields = ('fecha_hora',)

# =================================================
    def coordenadas_click(self, obj):
        """Genera un enlace directo a Google Maps para verificar la ubicación de la obra."""
        if obj.latitud and obj.longitud:
            url = f"https://google.com/maps/search/?api=1&query={obj.latitud},{obj.longitud}"
            return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">📍 Ver en Mapa</a>', url)
        return "Coordenadas NO configuradas"
    coordenadas_click.short_description = "Ubicación"
# =================================================
