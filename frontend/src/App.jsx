import React, { useState, useEffect } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
// Truco necesario en Leaflet para que los iconos de los marcadores no se rompan en React
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function App() {
  // --- ESTADOS DE AUTENTICACIÓN ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- ESTADOS DEL GPS ---
  const [latitud, setLatitud] = useState(null);
  const [longitud, setLongitud] = useState(null);
  const [cargandoGps, setCargandoGps] = useState(false);
  const [errorGps, setErrorGps] = useState("");

  // --- ESTADOS PARA EL REGISTRO DE ASISTENCIA ---
  const [enviandoRegistro, setEnviandoRegistro] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  // --- NUEVOS ESTADOS PARA EL DASHBOARD ADMINISTRADOR ---
  const [vistaAdmin, setVistaAdmin] = useState(false); // Alternar entre empleado y admin
  const [historialAsistencias, setHistorialAsistencias] = useState([]); // Guarda los registros de la API
  const [usuariosFiltro, setUsuariosFiltro] = useState([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("TODOS");

  const [isAdmin, setIsAdmin] = useState(false);

  // revisa si ya estaba logueado al recargar la página
  useEffect(() => {
    const token = localStorage.getItem("user_token");
    const adminSaved = localStorage.getItem("is_admin") === "true"; // Convierte texto a booleano
    if (token) {
      setIsLoggedIn(true);
      setIsAdmin(adminSaved);
    }
  }, []);

  // Carga todo el historial de la base de datos cuando se activa la vista admin
  useEffect(() => {
    if (vistaAdmin && isLoggedIn) {
      const token = localStorage.getItem("user_token");
      // Creamos un objeto de configuración para Axios
      const config = {
        headers: { Authorization: `Token ${token}` },
        params: {}, // Aquí viajan los Query Parameters automáticamente
      };

      // Si ambas fechas están seleccionadas en el HTML, las inyectamos a la petición
      if (fechaInicio && fechaFin) {
        config.params.fecha_inicio = fechaInicio;
        config.params.fecha_fin = fechaFin;
      }
      // INYECTAMOS EL FILTRO DE USUARIO HACIA LA API DE DJANGO
      if (usuarioSeleccionado) {
        config.params.usuario_id = usuarioSeleccionado;
      }
      axios
        .get(`${import.meta.env.VITE_API_URL}/api/asistencias/`, config)
        .then((response) => {
          // Guardamos el historial filtrado para el mapa
          setHistorialAsistencias(response.data);

          // NUEVO: Si nuestra lista fija de usuarios está vacía (es la primera carga), la llenamos
          // Esto evita que los usuarios desaparezcan cuando la API se filtre
          if (usuariosFiltro.length === 0) {
            setUsuariosFiltro(response.data);
          }
        })
        .catch((err) => console.error("Error al filtrar historial:", err));
    }
  }, [vistaAdmin, isLoggedIn, fechaInicio, fechaFin, usuarioSeleccionado]);

  // Capturar coordenadas reales del GPS
  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      setErrorGps("Tu navegador no soporta geolocalización.");
      return;
    }
    setCargandoGps(true);
    setErrorGps("");
    setMensajeExito("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitud(position.coords.latitude);
        setLongitud(position.coords.longitude);
        setCargandoGps(false);
      },
      (error) => {
        console.error(error);
        setCargandoGps(false);
        setErrorGps("Error al obtener ubicación. Activa tu GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // Función para procesar el inicio de sesión
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/login/`,
        {
          username: username,
          password: password,
        },
      );

      // Guardamos tanto el token como el rol en el LocalStorage
      localStorage.setItem("user_token", response.data.token);
      localStorage.setItem("is_admin", response.data.is_admin); // Guarda "true" o "false"

      setIsLoggedIn(true);
      setIsAdmin(response.data.is_admin);
      setUsername("");
      setPassword("");
    } catch (err) {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  // --- ENVIAR LA CHECADA COMPLETA AL BACKEND ---
  const registrarAsistencia = async (tipoEvento) => {
    setEnviandoRegistro(true);
    setErrorGps("");
    setMensajeExito("");

    // 1. Recuperamos el Token del almacenamiento del navegador
    const token = localStorage.getItem("user_token");

    try {
      // 2. Hacemos la petición POST al endpoint protegido de Django
      // Pasamos el JSON con los datos que nos pide el Serializer de Django
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/asistencias/`,
        {
          tipo: tipoEvento,
          latitud: parseFloat(latitud).toFixed(6), // Asegura 6 decimales exactos
          longitud: parseFloat(longitud).toFixed(6),
          dispositivo: navigator.userAgent.substring(0, 100), // Detecta el modelo de cel o navegador
        },
        {
          // EN LA CABECERA INYECTAMOS EL TOKEN DE SEGURIDAD
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );

      // 3. Si la API nos devuelve éxito (201 Created), lo celebramos en pantalla
      setMensajeExito(`¡Checada de ${tipoEvento} registrada correctamente!`);
      // Limpiamos las coordenadas anteriores para obligar a capturar una nueva en la siguiente checada
      setLatitud(null);
      setLongitud(null);
    } catch (err) {
      console.error(err);

      // REVISAMOS SI DJANGO NOS ENVIÓ EL ERROR DE GEOCERCA
      if (
        err.response &&
        err.response.data &&
        err.response.data.error_geocerca
      ) {
        // Si existe, le mostramos al empleado el mensaje exacto que escribió Django
        setErrorGps(err.response.data.error_geocerca);
      } else {
        // Si es otro tipo de error (red, caída de servidor, etc.) dejamos el genérico
        setErrorGps(
          "Hubo un error al intentar guardar tu checada en el servidor.",
        );
      }
    } finally {
      setEnviandoRegistro(false);
    }
  };

  // --- NUEVA FUNCIÓN: DESCARGAR REPORTE EXCEL ---
  const descargarExcel = async () => {
    const token = localStorage.getItem("user_token");
    try {
      // Solicitamos el archivo a Django indicando que la respuesta será un "blob" (archivo binario)
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/asistencias/exportar-excel/`,
        {
          headers: { Authorization: `Token ${token}` },
          responseType: "blob",
          // Agregamos los mismos parámetros activos para que Django filtre el archivo Excel
          params: {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            usuario_id: usuarioSeleccionado?.id || usuarioSeleccionado,
          },
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "reporte_filtrado.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setUsuarioSeleccionado("TODOS");
  };

  // ************************************* //
  const handleLogout = () => {
    // 1. Borramos el almacenamiento físico del navegador
    localStorage.removeItem("user_token");
    localStorage.removeItem("is_admin");

    setFechaInicio("");
    setFechaFin("");
    if (typeof setUsuarioSeleccionado === "function") {
      setUsuarioSeleccionado("TODOS");
    }

    // 2. Reseteamos los estados de autenticación y rol
    setIsLoggedIn(false);
    setIsAdmin(false);

    // --- NUEVO: LIMPIEZA DE ESTADOS RESIDUALES PARA CORREGIR EL BUG ---
    setVistaAdmin(false); // <--- ¡Esto faltaba! Regresa obligatoriamente al modo empleado
    setHistorialAsistencias([]); // Borra de la memoria de React los pines cargados anteriormente

    // 3. Limpiamos datos del GPS y alertas
    setLatitud(null);
    setLongitud(null);
    setMensajeExito("");
    setErrorGps("");
    setUsuariosFiltro([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center p-4 antialiased">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
            <span className="animate-bounce">📍</span> Sistema Checador GPS
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Solución: Docker + Django + React
          </p>
        </header>

        {isLoggedIn ? (
          /* ================= INTERFAZ USUARIO REGISTRADO ================= */
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Conectado
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-5 rounded-lg shadow-md active:scale-95 transition-all flex items-center gap-1"
              >
                Cerrar Sesión
              </button>
            </div>

            {isAdmin && (
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button
                  className={`flex-1 text-center py-2 text-sm font-bold rounded-lg transition-all ${!vistaAdmin ? "text-blue-600 shadow-md" : "text-slate-600 hover:text-slate-900"}`}
                  onClick={() => setVistaAdmin(false)}
                >
                  📱 Empleado
                </button>
                <button
                  className={`flex-1 text-center py-2 text-sm font-bold rounded-lg transition-all ${vistaAdmin ? "text-blue-600 shadow-md" : "text-slate-600 hover:text-slate-900"}`}
                  onClick={() => setVistaAdmin(true)}
                >
                  📊 Administrador
                </button>
              </div>
            )}

            {!vistaAdmin ? (
              /* MODO EMPLEADO */
              <div className="space-y-4">
                <button
                  onClick={obtenerUbicacion}
                  disabled={cargandoGps || enviandoRegistro}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  {cargandoGps
                    ? "🛰️ Buscando satélites..."
                    : "🎯 Capturar Ubicación Actual"}
                </button>

                {errorGps && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700 text-center">
                    {errorGps}
                  </div>
                )}
                {mensajeExito && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 text-center">
                    {mensajeExito}
                  </div>
                )}

                {latitud && longitud && (
                  <div className="space-y-4 border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <div className="h-56 w-full rounded-lg overflow-hidden border border-slate-200 relative z-0">
                      <MapContainer
                        center={[latitud, longitud]}
                        zoom={16}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[latitud, longitud]}>
                          <Popup>Tú estás aquí</Popup>
                        </Marker>
                        <Circle
                          center={[19.7028, -101.1177]}
                          radius={50}
                          pathOptions={{
                            color: "#10b981",
                            fillColor: "#10b981",
                            fillOpacity: 0.15,
                          }}
                        />
                      </MapContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => registrarAsistencia("ENTRADA")}
                        disabled={enviandoRegistro}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all"
                      >
                        ⬇️ Entrada
                      </button>
                      <button
                        onClick={() => registrarAsistencia("SALIDA")}
                        disabled={enviandoRegistro}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all"
                      >
                        ⬆️ Salida
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* MODO ADMINISTRADOR */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      🗺️ Auditoría de Geocercas
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ubicaciones exactas recopiladas.
                    </p>
                  </div>
                  <button
                    onClick={descargarExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-md active:scale-95 transition-all flex items-center gap-1"
                  >
                    Importar Excel
                  </button>
                </div>

                {/* --- NUEVO: SELECTORES DE FECHA MINIMALISTAS --- */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-3 text-left">
                  {/* Fila de Calendarios */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Desde:
                      </label>
                      <input
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Hasta:
                      </label>
                      <input
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* --- NUEVO: MENÚ DESPLEGABLE DE EMPLEADOS --- */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Filtrar por Empleado:
                    </label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-400"
                      value={usuarioSeleccionado}
                      onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                    >
                      <option value="TODOS">
                        👥 Mostrar Todos los Empleados
                      </option>

                      {/* CAMBIO CLAVE: Recorremos 'usuariosFiltro' para mantener el menú siempre intacto */}
                      {Array.from(
                        new Map(
                          usuariosFiltro.map((item) => [
                            item.usuario_nombre,
                            item,
                          ]),
                        ).values(),
                      ).map((asis) => (
                        <option key={asis.id} value={asis.usuario_nombre}>
                          👤 {asis.usuario_nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={limpiarFiltros}
                      className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg p-2 transition-colors"
                    >
                      🧹 Limpiar Filtros
                    </button>
                  </div>
                </div>

                <div className="h-72 w-full rounded-xl overflow-hidden border border-slate-200 relative z-0">
                  <MapContainer
                    center={[19.7028, -101.1177]}
                    zoom={14}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Circle
                      center={[19.7028, -101.1177]}
                      radius={50}
                      pathOptions={{
                        color: "#10b981",
                        fillColor: "#10b981",
                        fillOpacity: 0.08,
                      }}
                    />
                    {historialAsistencias.map((registro) => (
                      <Marker
                        key={registro.id}
                        position={[
                          parseFloat(registro.latitud),
                          parseFloat(registro.longitud),
                        ]}
                      >
                        <Popup>
                          <div className="text-sm font-sans">
                            <p className="font-bold text-slate-800">
                              👤 {registro.usuario_nombre}
                            </p>
                            <p className="text-xs font-semibold mt-0.5 text-blue-600">
                              {registro.tipo === "ENTRADA"
                                ? "⬇️ Entrada"
                                : "⬆️ Salida"}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              📅{" "}
                              {new Date(registro.fecha_hora).toLocaleString()}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================= INTERFAZ INICIO DE SESIÓN ================= */
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <h2 className="text-xl font-bold text-slate-800 text-center mb-1">
              Acceso al Sistema
            </h2>
            <p className="text-xs text-slate-400 text-center mb-6">
              Ingrese sus credenciales corporativas
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Usuario
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 transition-all placeholder:text-slate-300"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="nombre usuario"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 transition-all placeholder:text-slate-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all mt-6 disabled:opacity-50"
              >
                {loading ? "Validando llave..." : "Autenticarse"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
