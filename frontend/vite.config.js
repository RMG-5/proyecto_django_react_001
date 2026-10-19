import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // <-- 1. Importa Tailwind

// https://vitejs.dev
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- 2. Añade el plugin aquí
  ],
  server: {
    host: true, // Crucial para que Docker pueda mapear el puerto hacia afuera
    port: 5173,
    watch: {
      usePolling: true, // Obliga a Vite a revisar cambios de archivos en Windows
      ignored: ["**/node_modules/**"], // Evita que escanee la gigantesca carpeta de dependencias
    },
  },
});
