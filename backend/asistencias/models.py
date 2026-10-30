from django.db import models
from django.contrib.auth.models import User


class Sucursal(models.Model):
    nombre = models.CharField(max_length=250, unique=True, verbose_name="Nombre de la Sucursal")
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    radio_maximo_metros = models.DecimalField(max_digits=5, decimal_places=1, default=50.0)
    hora_entrada = models.TimeField(null=True, blank=True, verbose_name="Hora de Entrada")
    hora_salida = models.TimeField(null=True, blank=True, verbose_name="Hora de Salida")
    tolerancia_minutos = models.IntegerField(default=10, verbose_name="Minutos de Tolerancia")

    class Meta:
        ordering = ['nombre']
        verbose_name = "Sucursal"
        verbose_name_plural = "Sucursales"        

    def __str__(self):
        horario = f" | {self.hora_entrada}-{self.hora_salida}" if self.hora_entrada else " | Horario Libre"
        return f"{self.nombre} (Radio: {self.radio_maximo_metros}m{horario})"
    

class RegistroAsistencia(models.Model):    
    TIPO_EVENTO = [
        ('ENTRADA', 'Entrada'),
        ('SALIDA', 'Salida'),
    ]

    ESTATUS_TIEMPO = [
        ('A_TIEMPO', 'A Tiempo'),
        ('RETARDO', 'Retardo'),
        ('LIBRE', 'Horario Libre'),
    ]

    # Relación de Clave Foránea (Uno a Muchos). Vincula este registro con un usuario específico.
    # - on_delete=models.CASCADE: Si el usuario es eliminado, se borran automáticamente todas sus asistencias.
    # - related_name='asistencias': Permite acceder a las asistencias de un usuario desde el objeto user (ej. user.asistencias.all()).
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='asistencias')

    # - auto_now_add=True: Django asigna automáticamente la fecha y hora actual al momento de guardarse por primera vez.
    fecha_hora = models.DateTimeField(auto_now_add=True)

    tipo = models.CharField(max_length=10, choices=TIPO_EVENTO, verbose_name="Tipo de Registro")
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    dispositivo = models.CharField(max_length=155, blank=True, null=True)
    sucursal = models.ForeignKey(Sucursal, on_delete=models.PROTECT, related_name='registros_asistencia')
    estatus = models.CharField(max_length=15, choices=ESTATUS_TIEMPO, default='LIBRE')

    class Meta:
        ordering = ['-fecha_hora']
        verbose_name = "Registro de Asistencia"
        verbose_name_plural = "Registros de Asistencias"

    def __str__(self):
        return f"{self.usuario.username} - {self.tipo} ({self.estatus}) - {self.sucursal.nombre}"
    