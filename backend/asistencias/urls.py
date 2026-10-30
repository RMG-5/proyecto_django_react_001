from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistroAsistenciaViewSet, SucursalViewSet, CustomAuthToken, UsuarioAdminViewSet

router = DefaultRouter()

router.register(r'asistencias', RegistroAsistenciaViewSet, basename='asistencia')
router.register(r'sucursales', SucursalViewSet, basename='sucursal')
router.register(r'usuarios', UsuarioAdminViewSet, basename='usuario_admin')

urlpatterns = [
    # Incluimos todas las rutas que el router generó por nosotros
    path('', include(router.urls)),
    
    # Añadimos la ruta de login aquí, su ruta final será /api/login/
    path('login/', CustomAuthToken.as_view(), name='api_token_auth'),
]
