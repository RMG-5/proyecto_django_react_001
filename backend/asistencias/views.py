from rest_framework import viewsets
# Importamos la clase que obliga a estar autenticado
from rest_framework.permissions import IsAuthenticated 
# Importamos el modelo y el traductor que acabamos de hacer
from .models import RegistroAsistencia
from .serializers import RegistroAsistenciaSerializer


class RegistroAsistenciaViewSet(viewsets.ModelViewSet):
    # 1. Le decimos a Django de dónde sacar los datos de la base de datos
    queryset = RegistroAsistencia.objects.all()

    # 2. Le asignamos su traductor correspondiente
    serializer_class = RegistroAsistenciaSerializer

    # 3. NOTA IMPORTANTE PARA EL APRENDIZAJE:
    # Por ahora dejamos abierta la API para que puedas hacer pruebas sin meterte
    # en problemas de autenticación o tokens de sesión. En el futuro, aquí
    # bloquearemos el endpoint para que solo usuarios logueados puedan checar.
    # EL SIGUIENTE CODIGO INVALIDA ESTOS COMENTARIOS.

    # Bloqueo de seguridad: Si no envían un token válido, la API responderá "401 Unauthorized"
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Al guardar el registro, tomamos el usuario directamente del Token que hizo la petición
        serializer.save(usuario=self.request.user)
