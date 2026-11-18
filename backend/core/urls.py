from django.contrib import admin
from django.urls import path, include
# ===========================================================
from django.http import HttpResponse
# ===========================================================

admin.site.site_title = "Sistema Checador GPS"
admin.site.site_header = "<RMG>-</Desarrollo WEB>"
admin.site.index_title = "Administración - Sistema Checador GPS"

# ===========================================================
# Esta ruta es solo para que al desarrollar no me salga un error en http://localhost:8000
def pagina_bienvenida(request):
    return HttpResponse(
        '<h1>¡Bienvenido a la raíz de la API!</h1>'
        '<p>Usa <a href="/api/">http://localhost:8000/api/</a> '
        'o <a href="/admin/">http://localhost:8000/admin/</a> para navegar.</p>'
    )
# ===========================================================

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('asistencias.urls')),
# ===========================================================
    path('', pagina_bienvenida, name='home'), 
# ===========================================================
]
