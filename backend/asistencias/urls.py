from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SucursalViewSet, RegistroAsistenciaViewSet

# DRF usa "Routers" que crean automáticamente las rutas estándar de una API
router = DefaultRouter()
# Esto creará rutas como /api/asistencias/ para listar y crear de forma automática
router.register(r'asistencias', RegistroAsistenciaViewSet,
                basename='asistencia')

router.register(r'sucursales', SucursalViewSet, basename='sucursal')

urlpatterns = [
    # Incluimos todas las rutas que el router generó por nosotros
    path('', include(router.urls)),
]
