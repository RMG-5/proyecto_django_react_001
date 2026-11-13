from django.contrib import admin
from django.urls import path, include
from asistencias.views import CustomAuthToken

# ===========================================================
from django.http import HttpResponse

def pagina_bienvenida(request):
    return HttpResponse("<h1>¡Bienvenido a la raíz de la API!</h1><p>Usa /api/ o /admin/ para navegar.</p>")
# ===========================================================

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('asistencias.urls')),

# ===========================================================
    path('', pagina_bienvenida, name='home'), 
# ===========================================================
]
