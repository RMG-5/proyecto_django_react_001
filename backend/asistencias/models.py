# ==============================================================================
# IMPORTACIONES
# ==============================================================================

# Se importa el módulo 'models' de Django para poder crear tablas en la base de datos (modelos).
from django.db import models

# Se importa el modelo 'User' predefinido de Django, el cual maneja la autenticación de usuarios.
from django.contrib.auth.models import User


class Sucursal(models.Model):
    """
    Modelo para registrar dinámicamente las oficinas del sistema con su propia geocerca.
    """
    nombre = models.CharField(max_length=250, unique=True, verbose_name="Nombre de la Sucursal")
    
    # Coordenadas geográficas del centro de esta sucursal específica
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    
    # Permite que cada oficina tenga una tolerancia en metros distinta (ej. matriz 50m, bodega 100m)
    radio_maximo_metros = models.DecimalField(max_digits=5, decimal_places=1, default=50.0)

    class Meta:
        verbose_name = "Sucursal"
        verbose_name_plural = "Sucursales"
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} (Radio: {self.radio_maximo_metros}m)"
    

# ==============================================================================
# MODELO: REGISTRO DE ASISTENCIA
# ==============================================================================

# Definición de la clase 'RegistroAsistencia' que hereda de 'models.Model'.
# Esto le dice a Django que cree una tabla llamada 'RegistroAsistencia' en la base de datos.
class RegistroAsistencia(models.Model):
    
    # Tupla de opciones (choices) para restringir los valores permitidos en el campo 'tipo'.
    # El primer valor se guarda en la base de datos y el segundo es el texto legible en el administrador.
    TIPO_EVENTO = [
        ('ENTRADA', 'Entrada'),
        ('SALIDA', 'Salida'),
    ]

    # Relación de Clave Foránea (Uno a Muchos). Vincula este registro con un usuario específico.
    # - on_delete=models.CASCADE: Si el usuario es eliminado, se borran automáticamente todas sus asistencias.
    # - related_name='asistencias': Permite acceder a las asistencias de un usuario desde el objeto user (ej. user.asistencias.all()).
    usuario = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='asistencias')

    # Campo de fecha y hora. Almacena el momento exacto en el que se crea el registro.
    # - auto_now_add=True: Django asigna automáticamente la fecha y hora actual al momento de guardarse por primera vez.
    fecha_hora = models.DateTimeField(auto_now_add=True)

    # Campo de texto corto para el tipo de asistencia.
    # - max_length=10: Limita el texto a un máximo de 10 caracteres.
    # - choices=TIPO_EVENTO: Obliga a que el valor sea únicamente 'ENTRADA' o 'SALIDA' (valida en formularios y panel de administración).
    tipo = models.CharField(max_length=10, choices=TIPO_EVENTO)

    # Campos numéricos decimales de alta precisión para almacenar coordenadas geográficas (GPS).
    # - max_digits=9: Permite un total de 9 dígitos numéricos.
    # - decimal_places=6: De esos 9 dígitos, 6 se reservan estrictamente para los decimales (ideal para coordenadas exactas).
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)

    # Campo de texto para identificar desde qué aparato se registró la asistencia (ej. "iPhone 15", "Chrome / Windows").
    # - max_length=255: Longitud máxima de 255 caracteres.
    # - blank=True: Permite que el campo se envíe vacío en formularios de Django.
    # - null=True: Permite que el campo guarde un valor nulo (NULL) directamente en la base de datos si no se detecta el dispositivo.
    dispositivo = models.CharField(max_length=255, blank=True, null=True)

    # NUEVO CAMPO: Vincula de forma obligatoria la asistencia con la sucursal elegida
    sucursal = models.ForeignKey(Sucursal, on_delete=models.PROTECT, related_name='registros_asistencia')

    # ==========================================================================
    # CONFIGURACIÓN INTERNA (METADATOS)
    # ==========================================================================
    
    # La subclase 'Meta' se usa para cambiar el comportamiento y la configuración interna del modelo.
    class Meta:
        # Ordena las consultas a la base de datos.
        # El signo menos '-' indica orden descendente, mostrando primero los registros más recientes según su 'fecha_hora'.
        ordering = ['-fecha_hora']
        
        # Nombre amigable del modelo en formato singular que se mostrará en el panel de administración de Django.
        verbose_name = "Registro de Asistencia"
        
        # Nombre amigable del modelo en formato plural para el panel de administración de Django.
        verbose_name_plural = "Registros de Asistencias"


    # ==========================================================================
    # MÉTODOS ESPECIALES
    # ==========================================================================

    # Método que define cómo se representará este objeto como una cadena de texto (String).
    # Es el texto que verás listado en el panel de administración o al imprimir el objeto en consola.
    def __str__(self):
        # Retorna un texto formateado que incluye el nombre del usuario, el tipo (Entrada/Salida) y la fecha formateada (Día/Mes/Año Hora:Minuto).
        return f"{self.usuario.username} - {self.tipo} - {self.sucursal.nombre}"
    