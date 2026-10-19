"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include  # Asegúrate de importar include
# Importamos la vista oficial de DRF para generar tokens
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

# ===========================================================
from django.http import HttpResponse # Importamos HttpResponse
# ===========================================================

# ===========================================================
# Creamos una función de vista rápida aquí mismo
def pagina_bienvenida(request):
    return HttpResponse("<h1>¡Bienvenido a la raíz de la API!</h1><p>Usa /api/ o /admin/ para navegar.</p>")
# ===========================================================


# Creamos una vista personalizada de Login que hereda de la original de Django
class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        # Devolvemos el Token JUNTOS con los datos del rol del usuario
        return Response({
            'token': token.key,
            'is_admin': user.is_staff # True si es administrador, False si no
        })
        
urlpatterns = [
    path('admin/', admin.site.urls),
    # Conectamos nuestra nueva API en la ruta raíz de la API
    path('api/', include('asistencias.urls')),
    # Cambiamos obtain_auth_token por nuestra nueva vista CustomAuthToken
    path('api/login/', CustomAuthToken.as_view(), name='api_token_auth'),

# ===========================================================
    # Mapeamos la raíz a la función que acabamos de crear
    path('', pagina_bienvenida, name='home'), 
# ===========================================================
]
