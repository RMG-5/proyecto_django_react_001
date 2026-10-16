# Usamos una imagen oficial ligera de Python
FROM python:3.13-slim

# Evita que Python escriba archivos .pyc en el disco
ENV PYTHONDONTWRITEBYTECODE=1

# Evita que Python guarde en el búfer los flujos de salida (logs inmediatos)
ENV PYTHONUNBUFFERED=1

# Crea una carpeta llamada /app dentro del contenedor y se posiciona allí.
WORKDIR /app

# Copia el archivo requirements.txt de tu Windows y lo mete a la carpeta /app del contenedor.
COPY requirements.txt /app/

# Ejecuta la instalación de Django, Django Rest Framework y Postgres dentro del contenedor.
RUN pip install --no-cache-dir -r requirements.txt

# Copia absolutamente todo lo que tienes en tu carpeta backend/ de Windows hacia la carpeta /app del contenedor.
COPY . /app/
