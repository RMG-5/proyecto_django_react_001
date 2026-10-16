from django.db import models
# Importamos el modelo de usuario nativo de Django para asociar la asistencia
from django.contrib.auth.models import User


class RegistroAsistencia(models.Model):
    # Tipos de eventos válidos para la checada
    TIPO_EVENTO = [
        ('ENTRADA', 'Entrada'),
        ('SALIDA', 'Salida'),
    ]

    # Relación de uno a muchos: Un usuario puede tener muchas asistencias.
    # Si el usuario se elimina, se borran sus registros en cascada (CASCADE).
    usuario = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='asistencias')

    # Almacena la fecha y hora exacta del registro de forma automática al crearse
    fecha_hora = models.DateTimeField(auto_now_add=True)

    # Campo para distinguir si el empleado está entrando o saliendo
    tipo = models.CharField(max_length=10, choices=TIPO_EVENTO)

    # Coordenadas geográficas guardadas con precisión decimal
    # max_digits=9 y decimal_places=6 permite una precisión de hasta centímetros
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)

    # Opcional: Nombre del dispositivo o navegador desde donde se checó
    dispositivo = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        # Ordena los registros para que los más recientes aparezcan primero
        ordering = ['-fecha_hora']
        # Nombre de la tabla en formato amigable para el panel de administración
        verbose_name = "Registro de Asistencia"
        verbose_name_plural = "Registros de Asistencias"

    def __str__(self):
        # Cómo se representará este objeto como texto (útil en el panel de administración)
        return f"{self.usuario.username} - {self.tipo} - {self.fecha_hora.strftime('%d/%m/%Y %H:%M')}"
