import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Crucial para que Docker pueda mapear el puerto hacia afuera
    port: 5173,
    watch: {
      usePolling: true, // Obliga a Vite a revisar cambios de archivos en Windows
      ignored: ["**/node_modules/**"], // Evita que escanee la gigantesca carpeta de dependencias
    },
  },
});
