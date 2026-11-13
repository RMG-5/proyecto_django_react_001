import React, { useState, useEffect, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import api from "./api/axiosClient";
import Toast from "./components/Toast";
import Login from "./pages/Login";
import EmpleadoView from "./pages/EmpleadoView";
import AdminAuditoria from "./pages/AdminAuditoria";
import AdminSucursales from "./pages/AdminSucursales";
import AdminUsuarios from "./pages/AdminUsuarios";

// Componente principal de la aplicación
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vistaAdmin, setVistaAdmin] = useState(false);
  const [subVistaAdmin, setSubVistaAdmin] = useState("auditoria");
  const [sucursales, setSucursales] = useState([]);
  const [toastMsg, setToastMsg] = useState({ tipo: "", texto: "" });

  // Función para mostrar un mensaje de toast
  const mostrarToast = useCallback((tipo, texto) => {
    setToastMsg({ tipo, texto });
  }, []);

  // Función para cerrar el mensaje de toast
  const cerrarToast = useCallback(() => {
    setToastMsg({ tipo: "", texto: "" });
  }, []);

  // Efecto para verificar si el usuario ya está logueado al cargar la aplicación
  useEffect(() => {
    const token = localStorage.getItem("user_token");
    const adminSaved = localStorage.getItem("is_admin") === "true";
    if (token) {
      setIsLoggedIn(true);
      setIsAdmin(adminSaved);
    }
  }, []);

  // Efecto para cargar las sucursales si el usuario está logueado
  useEffect(() => {
    if (isLoggedIn) {
      api
        .get("/sucursales/")
        .then((response) => setSucursales(response.data))
        .catch(() =>
          mostrarToast("error", "Error al cargar el catálogo de obras."),
        );
    }
  }, [isLoggedIn, mostrarToast]);

  // Función para manejar el inicio de sesión exitoso
  const handleLoginSuccess = (adminFlag) => {
    setIsLoggedIn(true);
    setIsAdmin(adminFlag);
  };

  // Función para manejar el cierre de sesión
  const handleLogout = () => {
    localStorage.removeItem("user_token");
    localStorage.removeItem("is_admin");
    setIsLoggedIn(false);
    setIsAdmin(false);
    setVistaAdmin(false);
    setSubVistaAdmin("auditoria");
    setSucursales([]);
    cerrarToast();
  };

  // Renderizado del componente principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-start sm:justify-center px-2 py-4 antialiased">
      {/* Renderizado del componente Toast */}
      <Toast mensaje={toastMsg} onClose={cerrarToast} />

      {/* Contenedor principal de la aplicación */}
      <div className="w-full max-w-md">
        <header className="text-center my-5">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
            <span className="animate-bounce">📍</span> Sistema Checador GPS
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Control de Asistencia y Geocercas
          </p>
        </header>

        {isLoggedIn ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white p-3">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-3 mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Conectado
              </span>
              <button
                onClick={handleLogout}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold py-1.5 px-3.5 rounded-xl active:scale-95 transition-all"
              >
                Cerrar Sesión
              </button>
            </div>

            {isAdmin && (
              <div className="flex bg-slate-200/70 p-1 rounded-xl mb-4">
                <button
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                    !vistaAdmin
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  onClick={() => setVistaAdmin(false)}
                >
                  📱 Empleado
                </button>
                <button
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                    vistaAdmin
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  onClick={() => setVistaAdmin(true)}
                >
                  📊 Administrador
                </button>
              </div>
            )}

            {!vistaAdmin ? (
              <EmpleadoView
                sucursales={sucursales}
                mostrarToast={mostrarToast}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex gap-1 bg-slate-200/70 p-1 rounded-xl">
                  <button
                    onClick={() => setSubVistaAdmin("auditoria")}
                    className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
                      subVistaAdmin === "auditoria"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🗺️ Auditorías
                  </button>
                  <button
                    onClick={() => setSubVistaAdmin("nueva_sucursal")}
                    className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
                      subVistaAdmin === "nueva_sucursal"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🏢 Sucursales
                  </button>
                  <button
                    onClick={() => setSubVistaAdmin("nuevo_empleado")}
                    className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${
                      subVistaAdmin === "nuevo_empleado"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    👤 Usuarios
                  </button>
                </div>

                {subVistaAdmin === "auditoria" && (
                  <AdminAuditoria
                    sucursales={sucursales}
                    mostrarToast={mostrarToast}
                  />
                )}

                {subVistaAdmin === "nueva_sucursal" && (
                  <AdminSucursales
                    sucursales={sucursales}
                    setSucursales={setSucursales}
                    mostrarToast={mostrarToast}
                  />
                )}

                {subVistaAdmin === "nuevo_empleado" && (
                  <AdminUsuarios mostrarToast={mostrarToast} />
                )}
              </div>
            )}
          </div>
        ) : (
          <Login
            onLoginSuccess={handleLoginSuccess}
            mostrarToast={mostrarToast}
          />
        )}
      </div>
    </div>
  );
}

export default App;
