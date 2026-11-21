import axios from "axios";

// Configuración del cliente Axios con la URL base de la API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Interceptor de petición: agrega el token a cada solicitud
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("user_token");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Interceptor de respuesta: detecta sesiones inválidas o expiradas (Error 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/login/")
    ) {
      localStorage.removeItem("user_token");
      localStorage.removeItem("is_admin");
      window.location.reload();
    }
    return Promise.reject(error);
  },
);

export default api;
