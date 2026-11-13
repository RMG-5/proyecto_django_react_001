import axios from "axios";

// Configuración del cliente Axios con la URL base de la API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Interceptor para agregar el token de autorización a las solicitudes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("user_token");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export default api;
