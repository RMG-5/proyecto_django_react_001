from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistroAsistenciaViewSet, SucursalViewSet, UsuarioAdminViewSet, CustomAuthToken

# Inicializa el enrutador automático para generar las URLs de los ViewSets
router = DefaultRouter()

# Registro de rutas CRUD para asistencias, sucursales y usuarios administradores
router.register(r'asistencias', RegistroAsistenciaViewSet, basename='asistencia')
router.register(r'sucursales', SucursalViewSet, basename='sucursal')
router.register(r'usuarios', UsuarioAdminViewSet, basename='usuario_admin')

# Definición de las URLs de la aplicación
urlpatterns = [
    # Incluye todas las rutas generadas automáticamente por el router
    path('', include(router.urls)),
    
    # Ruta personalizada para la autenticación y obtención de token
    path('login/', CustomAuthToken.as_view(), name='api_token_auth'),
]
