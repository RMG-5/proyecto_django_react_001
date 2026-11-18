import React, { useState } from "react";
import api from "../api/axiosClient";

// Componente de Login que maneja la autenticación del usuario
export default function Login({ onLoginSuccess, mostrarToast }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Función para manejar el evento de envío del formulario de login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post("/login/", { username, password });
      localStorage.setItem("user_token", response.data.token);
      localStorage.setItem("is_admin", response.data.is_admin);
      setUsername("");
      setPassword("");
      onLoginSuccess(response.data.is_admin);
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 401) {
        mostrarToast("error", "Usuario o contraseña incorrectos.");
      } else {
        mostrarToast(
          "error",
          err.response?.data?.detail || "No se pudo conectar con el servidor.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white p-4">
      <div className="bg-white p-4 border border-slate-200/60 rounded-xl shadow-sm text-left">
        <div className="text-center mb-5">
          <h2 className="text-base font-bold text-slate-800">
            🔐 Acceso al Sistema
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Ingresa tus credenciales corporativas
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Nombre de Usuario:
            </label>
            <input
              type="text"
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 capitalize text-slate-700 font-medium focus:outline-none focus:bg-white transition-colors placeholder:normal-case placeholder:text-slate-300"
              value={username.replace(/_/g, " ")}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Ej. David Attenborough"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Contraseña:
            </label>
            <div className="relative">
              <input
                type={verPassword ? "text" : "password"}
                className="w-full pl-3 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:bg-white transition-colors placeholder:text-slate-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setVerPassword(!verPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title={verPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {verPassword ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm active:scale-95 transition-all duration-200 mt-2 disabled:opacity-50"
          >
            {loading ? "⏳ Validando acceso..." : "🚀 Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
