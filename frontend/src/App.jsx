import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const iconoVerde = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const iconoRojo = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const iconoGris = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const obtenerIconoPorEstatus = (estatus) => {
  if (estatus === "A_TIEMPO") return iconoVerde;
  if (estatus === "RETARDO") return iconoRojo;
  return iconoGris;
};

function BuscadorCoordenadas({ alHacerClic }) {
  useMapEvents({
    click(e) {
      alHacerClic(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [latitud, setLatitud] = useState(null);
  const [longitud, setLongitud] = useState(null);
  const [cargandoGps, setCargandoGps] = useState(false);
  const [errorGps, setErrorGps] = useState("");

  const [enviandoRegistro, setEnviandoRegistro] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  const [vistaAdmin, setVistaAdmin] = useState(false);
  const [historialAsistencias, setHistorialAsistencias] = useState([]);
  const [usuariosFiltro, setUsuariosFiltro] = useState([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("TODOS");
  const [sucursalSeleccionadaFiltro, setSucursalSeleccionadaFiltro] =
    useState("TODAS");

  const [isAdmin, setIsAdmin] = useState(false);

  const [sucursales, setSucursales] = useState([]);

  const [sucursalSeleccionadaEmpleado, setSucursalSeleccionadaEmpleado] =
    useState(null);

  const [subVistaAdmin, setSubVistaAdmin] = useState("auditoria");

  const [nuevoUser, setNuevoUser] = useState("");
  const [nuevoPass, setNuevoPass] = useState("");
  const [nuevoIsAdmin, setNuevoIsAdmin] = useState(false);
  const [msgUsuario, setMsgUsuario] = useState({ tipo: "", texto: "" });

  const [nombreSucursal, setNombreSucursal] = useState("");
  const [radioSucursal, setRadioSucursal] = useState(50);
  const [latSucursal, setLatSucursal] = useState(19.7028);
  const [lonSucursal, setLonSucursal] = useState(-101.1177);
  const [entradaSucursal, setEntradaSucursal] = useState("");
  const [salidaSucursal, setSalidaSucursal] = useState("");
  const [toleranciaSucursal, setToleranciaSucursal] = useState(0);
  const [msgSucursal, setMsgSucursal] = useState({ tipo: "", texto: "" });

  const [idEditandoUser, setIdEditandoUser] = useState(null);
  const [idEditandoSucursal, setIdEditandoSucursal] = useState(null);
  const [listaUsuariosBackend, setListaUsuariosBackend] = useState([]);

  const [erroresCampos, setErroresCampos] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("user_token");
    const adminSaved = localStorage.getItem("is_admin") === "true";

    if (token) {
      setIsLoggedIn(true);
      setIsAdmin(adminSaved);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const token = localStorage.getItem("user_token");

      axios
        .get("/api/sucursales/", {
          headers: { Authorization: `Token ${token}` },
        })
        .then((response) => {
          setSucursales(response.data);

          if (response.data.length > 0) {
            setSucursalSeleccionadaEmpleado(response.data[0]);
          }
        })
        .catch((err) =>
          console.error("Error al cargar el catálogo de obras:", err),
        );
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (vistaAdmin && isLoggedIn) {
      const token = localStorage.getItem("user_token");

      const config = {
        headers: { Authorization: `Token ${token}` },
        params: {},
      };

      if (fechaInicio && fechaFin) {
        config.params.fecha_inicio = fechaInicio;
        config.params.fecha_fin = fechaFin;
      }

      if (sucursalSeleccionadaFiltro) {
        config.params.sucursal_id = sucursalSeleccionadaFiltro;
      }

      if (usuarioSeleccionado) {
        config.params.usuario_id = usuarioSeleccionado;
      }

      axios
        .get("/api/asistencias/", config)
        .then((response) => {
          setHistorialAsistencias(response.data);

          if (usuariosFiltro.length === 0) {
            setUsuariosFiltro(response.data);
          }
        })
        .catch((err) =>
          console.error("Error al filtrar historial cruzado:", err),
        );
    }
  }, [
    vistaAdmin,
    isLoggedIn,
    fechaInicio,
    fechaFin,
    usuarioSeleccionado,
    sucursalSeleccionadaFiltro,
  ]);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post("/api/login/", {
        username: username,
        password: password,
      });

      localStorage.setItem("user_token", response.data.token);
      localStorage.setItem("is_admin", response.data.is_admin);

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

  const registrarAsistencia = async (tipoEvento) => {
    setEnviandoRegistro(true);
    setErrorGps("");
    setMensajeExito("");

    const token = localStorage.getItem("user_token");

    try {
      const response = await axios.post(
        "/api/asistencias/",
        {
          tipo: tipoEvento,
          latitud: parseFloat(latitud).toFixed(6),
          longitud: parseFloat(longitud).toFixed(6),
          dispositivo: navigator.userAgent.substring(0, 100),
          sucursal: sucursalSeleccionadaEmpleado.id,
        },
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );

      setMensajeExito(
        `¡Checada de ${tipoEvento} registrada correctamente en ${sucursalSeleccionadaEmpleado.nombre}!`,
      );
      setLatitud(null);
      setLongitud(null);
    } catch (err) {
      console.error(err);

      if (
        err.response &&
        err.response.data &&
        err.response.data.error_geocerca
      ) {
        setErrorGps(err.response.data.error_geocerca);
      } else {
        setErrorGps(
          "Hubo un error al intentar guardar tu checada en el servidor.",
        );
      }
    } finally {
      setEnviandoRegistro(false);
    }
  };

  useEffect(() => {
    if (vistaAdmin && subVistaAdmin === "nuevo_empleado" && isLoggedIn) {
      const token = localStorage.getItem("user_token");
      axios
        .get("/api/usuarios/", { headers: { Authorization: `Token ${token}` } })
        .then((res) => setListaUsuariosBackend(res.data))
        .catch((err) => console.error("Error al traer usuarios:", err));
    }
  }, [vistaAdmin, subVistaAdmin, msgUsuario, isLoggedIn]);

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setMsgUsuario({ tipo: "", texto: "" });
    setErroresCampos({});

    const token = localStorage.getItem("user_token");

    try {
      if (idEditandoUser) {
        const response = await axios.put(
          `/api/usuarios/${idEditandoUser}/`,
          {
            username: nuevoUser,
            ...(nuevoPass.trim() !== "" && { password: nuevoPass }),
            is_staff: nuevoIsAdmin,
          },
          { headers: { Authorization: `Token ${token}` } },
        );

        setListaUsuariosBackend((prevList) =>
          prevList.map((u) => (u.id === idEditandoUser ? response.data : u)),
        );

        setMsgUsuario({
          tipo: "exito",
          texto: "¡Usuario actualizado con éxito!",
        });
        setIdEditandoUser(null);
      } else {
        const response = await axios.post(
          "/api/usuarios/",
          {
            username: nuevoUser,
            password: nuevoPass,
            is_staff: nuevoIsAdmin,
          },
          { headers: { Authorization: `Token ${token}` } },
        );

        setListaUsuariosBackend((prevList) => [...prevList, response.data]);
        setMsgUsuario({ tipo: "exito", texto: "¡Usuario creado con éxito!" });
      }

      setNuevoUser("");
      setNuevoPass("");
      setNuevoIsAdmin(false);
      const selectElement = document.getElementById("user-select");
      if (selectElement) selectElement.value = "";
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setErroresCampos(err.response.data);
        setMsgUsuario({
          tipo: "error",
          texto: "Por favor, corrige los errores en el formulario.",
        });
      } else {
        setMsgUsuario({
          tipo: "error",
          texto:
            err.response?.data?.detail ||
            "Ocurrió un error inesperado en la operación.",
        });
      }
    }
  };

  const handleEliminarUsuario = async (id, name) => {
    const nombreLimpio = name.replace(/_/g, " ");

    if (
      !window.confirm(
        `¿Estás completamente seguro de borrar a "${nombreLimpio}"?\n\nADVERTENCIA: Se borrarán permanentemente todos sus registros de asistencia vinculados (CASCADE).`,
      )
    ) {
      return;
    }

    const token = localStorage.getItem("user_token");

    try {
      await axios.delete(`/api/usuarios/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      });

      setListaUsuariosBackend((prevList) =>
        prevList.filter((u) => u.id !== id),
      );

      if (idEditandoUser === id) {
        setIdEditandoUser(null);
        setNuevoUser("");
        setNuevoPass("");
        setNuevoIsAdmin(false);
      }

      setMsgUsuario({
        tipo: "exito",
        texto: "Usuario y bitácoras eliminados correctamente.",
      });
    } catch (err) {
      setMsgUsuario({
        tipo: "error",
        texto: err.response?.data?.detail || "No se pudo eliminar al usuario.",
      });
    }
  };

  const cancelarEdicionSucursal = () => {
    setIdEditandoSucursal(null);
    setNombreSucursal("");
    setRadioSucursal(50);
    setToleranciaSucursal(0);
    setEntradaSucursal("");
    setSalidaSucursal("");

    const selectElement = document.getElementById("sucursal-select");
    if (selectElement) selectElement.value = "";
  };

  const handleCrearSucursal = async (e) => {
    e.preventDefault();
    setMsgSucursal({ tipo: "", texto: "" });
    const token = localStorage.getItem("user_token");

    const payload = {
      nombre: nombreSucursal,
      latitud: parseFloat(latSucursal).toFixed(6),
      longitud: parseFloat(lonSucursal).toFixed(6),
      radio_maximo_metros: parseFloat(radioSucursal),
      hora_entrada: entradaSucursal || null,
      hora_salida: salidaSucursal || null,
      tolerancia_minutos: parseInt(toleranciaSucursal) || 0,
    };

    try {
      if (idEditandoSucursal) {
        const res = await axios.put(
          `/api/sucursales/${idEditandoSucursal}/`,
          payload,
          { headers: { Authorization: `Token ${token}` } },
        );
        setSucursales(
          sucursales.map((s) => (s.id === idEditandoSucursal ? res.data : s)),
        );
        setMsgSucursal({ tipo: "exito", texto: "¡Sucursal modificada!" });
      } else {
        const res = await axios.post("/api/sucursales/", payload, {
          headers: { Authorization: `Token ${token}` },
        });
        setSucursales([...sucursales, res.data]);
        setMsgSucursal({ tipo: "exito", texto: "¡Sucursal guardada!" });
      }

      cancelarEdicionSucursal();
    } catch (err) {
      setMsgSucursal({
        tipo: "error",
        texto: err.response?.data?.error || "Error en operación.",
      });
    }
  };

  const handleEliminarSucursal = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta sucursal?")) return;
    const token = localStorage.getItem("user_token");
    try {
      await axios.delete(`/api/sucursales/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      setSucursales(sucursales.filter((s) => s.id !== id));
      setMsgSucursal({
        tipo: "exito",
        texto: "Sucursal eliminada correctamente.",
      });

      if (idEditandoSucursal === id) {
        cancelarEdicionSucursal();
      }
    } catch (err) {
      setMsgSucursal({
        tipo: "error",
        texto:
          err.response?.data?.error || "Error al intentar borrar la sucursal.",
      });
    }
  };

  const descargarExcel = async () => {
    const token = localStorage.getItem("user_token");
    try {
      const response = await axios.get("/api/asistencias/exportar-excel/", {
        headers: { Authorization: `Token ${token}` },
        responseType: "blob",
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          usuario_id: usuarioSeleccionado?.id || usuarioSeleccionado,
        },
      });

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
    setSucursalSeleccionadaFiltro("TODAS");
  };

  const handleLogout = () => {
    localStorage.removeItem("user_token");
    localStorage.removeItem("is_admin");
    setFechaInicio("");
    setFechaFin("");
    if (typeof setUsuarioSeleccionado === "function") {
      setUsuarioSeleccionado("TODOS");
    }
    if (typeof setSucursalSeleccionadaFiltro === "function") {
      setSucursalSeleccionadaFiltro("TODAS");
    }
    setIsLoggedIn(false);
    setIsAdmin(false);
    setVistaAdmin(false);
    setHistorialAsistencias([]);
    setLatitud(null);
    setLongitud(null);
    setMensajeExito("");
    setErrorGps("");
    setUsuariosFiltro([]);
    setSubVistaAdmin("auditoria");
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
                  className={`flex-1 text-center py-2 text-sm font-bold rounded-lg transition-all ${!vistaAdmin ? "bg-white text-blue-600 shadow-md" : "text-slate-600 hover:text-slate-900"}`}
                  onClick={() => setVistaAdmin(false)}
                >
                  📱 Empleado
                </button>
                <button
                  className={`flex-1 text-center py-2 text-sm font-bold rounded-lg transition-all ${vistaAdmin ? "bg-white text-blue-600 shadow-md" : "text-slate-600 hover:text-slate-900"}`}
                  onClick={() => setVistaAdmin(true)}
                >
                  📊 Administrador
                </button>
              </div>
            )}

            {!vistaAdmin ? (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-left">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Punto de Trabajo Destino:
                  </label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-400"
                    value={sucursalSeleccionadaEmpleado?.id || ""}
                    onChange={(e) => {
                      const elegida = sucursales.find(
                        (s) => s.id === parseInt(e.target.value),
                      );
                      setSucursalSeleccionadaEmpleado(elegida);
                    }}
                  >
                    {sucursales.map((suc) => (
                      <option key={suc.id} value={suc.id}>
                        🏢 {suc.nombre} ({parseInt(suc.radio_maximo_metros)}m
                        autorizados)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={obtenerUbicacion}
                  disabled={
                    cargandoGps ||
                    enviandoRegistro ||
                    !sucursalSeleccionadaEmpleado
                  }
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

                {latitud && longitud && sucursalSeleccionadaEmpleado && (
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
                          center={[
                            parseFloat(sucursalSeleccionadaEmpleado.latitud),
                            parseFloat(sucursalSeleccionadaEmpleado.longitud),
                          ]}
                          radius={parseFloat(
                            sucursalSeleccionadaEmpleado.radio_maximo_metros,
                          )}
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
              <div className="space-y-6">
                {}
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setSubVistaAdmin("auditoria")}
                    className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${subVistaAdmin === "auditoria" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                  >
                    🗺️ Auditoría
                  </button>
                  <button
                    onClick={() => setSubVistaAdmin("nueva_sucursal")}
                    className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${subVistaAdmin === "nueva_sucursal" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                  >
                    🏢 Alta Sucursal
                  </button>
                  <button
                    onClick={() => setSubVistaAdmin("nuevo_empleado")}
                    className={`flex-1 text-center py-1.5 text-xs font-bold rounded-lg transition-all ${subVistaAdmin === "nuevo_empleado" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                  >
                    👤 Alta Usuario
                  </button>
                </div>

                {}
                {subVistaAdmin === "auditoria" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          🗺️ Auditoría de Geocercas
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Ubicaciones exactas recopiladas.
                        </p>
                      </div>
                      <button
                        onClick={descargarExcel}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-md active:scale-95 transition-all flex items-center gap-1"
                      >
                        Exportar Excel
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-3 text-left">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Filtrar por Fecha:
                      </label>
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

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Filtrar por Obra:
                        </label>
                        <select
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-400"
                          value={sucursalSeleccionadaFiltro}
                          onChange={(e) =>
                            setSucursalSeleccionadaFiltro(e.target.value)
                          }
                        >
                          <option value="TODAS">
                            🏢 Mostrar Todas las Obras
                          </option>
                          {sucursales.map((suc) => (
                            <option key={suc.id} value={suc.id}>
                              🏢 {suc.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Filtrar por Empleado:
                        </label>
                        <select
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-400"
                          value={usuarioSeleccionado}
                          onChange={(e) =>
                            setUsuarioSeleccionado(e.target.value)
                          }
                        >
                          <option value="TODOS">
                            👥 Mostrar Todos los Empleados
                          </option>

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
                        center={[19.764375, -101.155017]}
                        zoom={14}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {sucursales.map((suc) => (
                          <Circle
                            key={`suc-circle-${suc.id}`}
                            center={[
                              parseFloat(suc.latitud),
                              parseFloat(suc.longitud),
                            ]}
                            radius={parseFloat(suc.radio_maximo_metros)}
                            pathOptions={{
                              color: "#10b981",
                              fillColor: "#10b981",
                              fillOpacity: 0.05,
                            }}
                          />
                        ))}

                        {historialAsistencias.map((registro) => (
                          <Marker
                            key={registro.id}
                            position={[
                              parseFloat(registro.latitud),
                              parseFloat(registro.longitud),
                            ]}
                            icon={obtenerIconoPorEstatus(registro.estatus)}
                          >
                            <Popup>
                              <div className="text-sm font-sans w-44">
                                <p className="font-bold text-slate-800">
                                  👤 {registro.usuario_nombre}
                                </p>

                                <div className="flex items-center gap-1 mt-0.5 mb-2">
                                  <span className="text-xs font-semibold text-blue-600">
                                    {registro.tipo === "ENTRADA"
                                      ? "⬇️ Entrada"
                                      : "⬆️ Salida"}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                      registro.estatus === "A_TIEMPO"
                                        ? "bg-green-100 text-green-700"
                                        : registro.estatus === "RETARDO"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {registro.estatus.replace("_", " ")}
                                  </span>
                                </div>

                                {}
                                <div className="border-t border-slate-100 pt-2 space-y-1">
                                  <p className="text-[11px] text-slate-600 flex justify-between">
                                    <span>Tiempo diario:</span>
                                    <span className="font-bold text-slate-800">
                                      {registro.horas_trabajadas}
                                    </span>
                                  </p>
                                  <p className="text-[11px] text-slate-600 flex items-center justify-between">
                                    {}
                                    <span>
                                      Jornada{" "}
                                      {registro.jornada_meta_texto || "8h"}:
                                    </span>
                                    <span
                                      className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                                        registro.cumplio_jornada
                                          ? "bg-emerald-500 text-white"
                                          : "bg-slate-200 text-slate-600"
                                      }`}
                                    >
                                      {registro.cumplio_jornada
                                        ? "CUMPLIÓ"
                                        : "INSUFICIENTE"}
                                    </span>
                                  </p>
                                </div>

                                <p className="text-[9px] text-slate-400 border-t border-slate-50 mt-2 pt-1 text-right">
                                  📅{" "}
                                  {new Date(
                                    registro.fecha_hora,
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                  </div>
                )}

                {}
                {subVistaAdmin === "nueva_sucursal" && (
                  <div>
                    <form
                      onSubmit={handleCrearSucursal}
                      className="space-y-4 text-left bg-white p-5 border border-slate-200/60 rounded-xl shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          {idEditandoSucursal
                            ? "✏️ Modificar Sucursal / Frente"
                            : "🏢 Registrar Nueva Sucursal / Frente de Trabajo"}
                        </h3>
                        {idEditandoSucursal && (
                          <button
                            type="button"
                            onClick={cancelarEdicionSucursal}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium transition-colors"
                          >
                            Cancelar Edición
                          </button>
                        )}
                      </div>

                      {msgSucursal.texto && (
                        <div
                          className={`p-2.5 rounded-xl text-xs font-semibold text-center transition-all ${
                            msgSucursal.tipo === "exito"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}
                        >
                          {msgSucursal.texto}
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Nombre Comercial de la Obra/Sucursal:
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/60 transition-all placeholder:text-slate-400 font-semibold"
                          value={nombreSucursal}
                          onChange={(e) => setNombreSucursal(e.target.value)}
                          placeholder="Ej. Corporativo Planta Centro"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Radio Máximo (Metros):
                          </label>
                          <input
                            type="number"
                            required
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/60 transition-all font-semibold"
                            value={radioSucursal}
                            onChange={(e) => setRadioSucursal(e.target.value)}
                            min="10"
                            max="500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Tolerancia Entrada (Min):
                          </label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/60 transition-all font-semibold"
                            value={toleranciaSucursal}
                            onChange={(e) =>
                              setToleranciaSucursal(e.target.value)
                            }
                            min="0"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Hora Entrada (Opcional):
                          </label>
                          <input
                            type="time"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/60 transition-all font-semibold"
                            value={entradaSucursal}
                            onChange={(e) => setEntradaSucursal(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Hora Salida (Opcional):
                          </label>
                          <input
                            type="time"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/60 transition-all font-semibold"
                            value={salidaSucursal}
                            onChange={(e) => setSalidaSucursal(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          🗺️ Haz clic en el mapa para fijar el centro de la
                          geocerca:
                        </label>
                        <div className="h-48 w-full rounded-xl overflow-hidden border border-slate-200 relative z-0 mb-2 shadow-inner">
                          <MapContainer
                            center={[latSucursal, lonSucursal]}
                            zoom={14}
                            style={{ height: "100%", width: "100%" }}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <BuscadorCoordenadas
                              alHacerClic={(lat, lng) => {
                                setLatSucursal(lat);
                                setLonSucursal(lng);
                              }}
                            />
                            <Marker position={[latSucursal, lonSucursal]} />
                            <Circle
                              center={[latSucursal, lonSucursal]}
                              radius={parseFloat(radioSucursal) || 50}
                              pathOptions={{
                                color: "#3b82f6",
                                fillColor: "#3b82f6",
                                fillOpacity: 0.2,
                              }}
                            />
                          </MapContainer>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-slate-50 p-2.5 border border-slate-100 rounded-xl font-medium">
                          <span>
                            Latitud:{" "}
                            <b className="text-slate-700">
                              {parseFloat(latSucursal).toFixed(6)}
                            </b>
                          </span>
                          <span>
                            Longitud:{" "}
                            <b className="text-slate-700">
                              {parseFloat(lonSucursal).toFixed(6)}
                            </b>
                          </span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className={`w-full font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all duration-200 mt-2 ${
                          idEditandoSucursal
                            ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10"
                        }`}
                      >
                        {idEditandoSucursal
                          ? "💾 Guardar Cambios"
                          : "➕ Guardar Punto de Trabajo"}
                      </button>
                    </form>

                    {}
                    <div className="mt-3 bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                      <label
                        htmlFor="sucursal-select"
                        className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                      >
                        📋 Sucursales Activas ({sucursales.length})
                      </label>

                      <div className="flex gap-2">
                        <select
                          id="sucursal-select"
                          value={idEditandoSucursal || ""}
                          onChange={(e) => {
                            const sucId = e.target.value;
                            const s = sucursales.find(
                              (suc) => suc.id === Number(sucId),
                            );
                            if (s) {
                              setIdEditandoSucursal(s.id);
                              setNombreSucursal(s.nombre);
                              setRadioSucursal(
                                parseInt(s.radio_maximo_metros) || 50,
                              );
                              setToleranciaSucursal(s.tolerancia_minutos || 0);
                              setEntradaSucursal(s.hora_entrada || "");
                              setSalidaSucursal(s.hora_salida || "");
                              setLatSucursal(parseFloat(s.latitud));
                              setLonSucursal(parseFloat(s.longitud));
                            } else {
                              cancelarEdicionSucursal();
                            }
                          }}
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 text-slate-700 font-medium focus:outline-none focus:border-slate-300 transition-colors"
                        >
                          <option value="">
                            Selecciona una sucursal para editar...
                          </option>
                          {sucursales.map((suc) => (
                            <option key={suc.id} value={suc.id}>
                              🏢 {suc.nombre} (r:{" "}
                              {parseInt(suc.radio_maximo_metros)}m)
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={!idEditandoSucursal}
                          onClick={() =>
                            handleEliminarSucursal(idEditandoSucursal)
                          }
                          className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold px-3 py-2 rounded-xl text-xs disabled:opacity-40 disabled:hover:bg-rose-50 disabled:cursor-not-allowed transition-all"
                          title="Eliminar sucursal seleccionada"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {}
                {subVistaAdmin === "nuevo_empleado" && (
                  <div>
                    <form
                      onSubmit={handleCrearUsuario}
                      className="space-y-4 text-left bg-white p-5 border border-slate-200/60 rounded-xl shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          {idEditandoUser
                            ? "✏️ Modificar Colaborador"
                            : "👤 Registrar Nuevo Colaborador"}
                        </h3>
                        {idEditandoUser && (
                          <button
                            type="button"
                            onClick={() => {
                              setIdEditandoUser(null);
                              setNuevoUser("");
                              setNuevoIsAdmin(false);
                              setNuevoPass("");
                              document.getElementById("user-select").value = "";
                            }}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium transition-colors"
                          >
                            Cancelar Edición
                          </button>
                        )}
                      </div>

                      {msgUsuario.texto && (
                        <div
                          className={`p-2.5 rounded-xl text-xs font-semibold text-center transition-all ${
                            msgUsuario.tipo === "exito"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}
                        >
                          {msgUsuario.texto}
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Nombre de Usuario (ID Corto / RPE):
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/60 transition-all placeholder:text-slate-400"
                          value={nuevoUser}
                          onChange={(e) => {
                            setNuevoUser(e.target.value);
                            if (erroresCampos.username)
                              setErroresCampos({
                                ...erroresCampos,
                                username: null,
                              });
                          }}
                          placeholder="Ej. juan.perez"
                        />
                        {erroresCampos.username && (
                          <p className="text-rose-600 text-[11px] font-medium mt-1 pl-1">
                            {erroresCampos.username.join(", ")}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          {idEditandoUser
                            ? "Nueva Contraseña (Dejar vacío para no cambiar):"
                            : "Contraseña Temporal:"}
                        </label>
                        <input
                          type="password"
                          required={!idEditandoUser}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/60 transition-all placeholder:text-slate-400"
                          value={nuevoPass}
                          onChange={(e) => {
                            setNuevoPass(e.target.value);
                            if (erroresCampos.password)
                              setErroresCampos({
                                ...erroresCampos,
                                password: null,
                              });
                          }}
                          placeholder="••••••••"
                        />
                        {erroresCampos.password && (
                          <p className="text-rose-600 text-[11px] font-medium mt-1 pl-1">
                            {erroresCampos.password.join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100/50 transition-colors">
                        <input
                          type="checkbox"
                          id="chkAdmin"
                          className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500/20"
                          checked={nuevoIsAdmin}
                          onChange={(e) => setNuevoIsAdmin(e.target.checked)}
                        />
                        <label
                          htmlFor="chkAdmin"
                          className="text-xs font-semibold text-slate-600 cursor-pointer select-none"
                        >
                          ¿Otorgar privilegios de Administrador (Staff)?
                        </label>
                      </div>

                      <button
                        type="submit"
                        className={`w-full font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all duration-200 mt-2 ${
                          idEditandoUser
                            ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10"
                            : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10"
                        }`}
                      >
                        {idEditandoUser
                          ? "💾 Guardar Cambios"
                          : "➕ Dar de Alta Empleado"}
                      </button>
                    </form>

                    {}
                    <div className="mt-3 bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                      <label
                        htmlFor="user-select"
                        className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
                      >
                        📋 Plantilla de Usuarios ({listaUsuariosBackend.length})
                      </label>

                      <div className="flex gap-2">
                        <select
                          id="user-select"
                          value={idEditandoUser || ""}
                          onChange={(e) => {
                            const userId = e.target.value;
                            const u = listaUsuariosBackend.find(
                              (user) => user.id === Number(userId),
                            );
                            if (u) {
                              setIdEditandoUser(u.id);
                              setNuevoUser(u.username);
                              setNuevoIsAdmin(u.is_staff);
                              setNuevoPass("");
                            } else {
                              setIdEditandoUser(null);
                              setNuevoUser("");
                              setNuevoIsAdmin(false);
                              setNuevoPass("");
                            }
                          }}
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 text-slate-700 font-medium focus:outline-none focus:border-slate-300 transition-colors"
                        >
                          <option value="">
                            Selecciona un usuario para editar...
                          </option>
                          {listaUsuariosBackend.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.is_staff ? "⭐ " : "👤 "} {u.username}{" "}
                              {u.is_staff ? "(ADMIN)" : ""}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={!idEditandoUser}
                          onClick={() => {
                            const u = listaUsuariosBackend.find(
                              (user) => user.id === idEditandoUser,
                            );
                            if (u) handleEliminarUsuario(u.id, u.username);
                          }}
                          className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold px-3 py-2 rounded-xl text-xs disabled:opacity-40 disabled:hover:bg-rose-50 disabled:cursor-not-allowed transition-all"
                          title="Eliminar usuario seleccionado"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
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
