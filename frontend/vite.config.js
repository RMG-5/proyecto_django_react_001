import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
      ignored: ["**/node_modules/**"],
    },

    proxy: {
      "/api": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
    },
  },
});
