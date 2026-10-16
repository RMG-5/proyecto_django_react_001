# Usamos una imagen de Node con soporte a largo plazo (LTS) ligera
FROM node:22-alpine

# Crea una carpeta llamada /app dentro del contenedor y se posiciona allí
WORKDIR /app

# Copia los archivos package.json y package-lock.json de tu Windows y lo mete a la carpeta /app del contenedor
COPY package*.json ./

# Instalamos dependencias limpias (y usando caché para acelerar futuras compilaciones)
RUN npm ci --quiet

# Copia absolutamente todo lo que tienes en tu carpeta frontend/ de Windows hacia la carpeta /app del contenedor
COPY . .

# Exponemos el puerto de Vite
EXPOSE 5173

# Comando para levantar el servidor de desarrollo de Vite
CMD ["npm", "run", "dev", "--", "--host"]
