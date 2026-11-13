import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import api from "../api/axiosClient";
import { CentrarMapa } from "../components/MapIcons";

// Componente EmpleadoView que permite a los empleados capturar su ubicación y registrar asistencia
export default function EmpleadoView({ sucursales, mostrarToast }) {
  const [latitud, setLatitud] = useState(null);
  const [longitud, setLongitud] = useState(null);
  const [cargandoGps, setCargandoGps] = useState(false);
  const [enviandoRegistro, setEnviandoRegistro] = useState(false);

  // Filtrar solo las sucursales activas para mostrarlas en el mapa
  const sucursalesActivas = sucursales.filter((suc) => suc.activa);

  // Obtener la ubicación actual utilizando la API de Geolocalización
  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      mostrarToast("error", "Tu navegador no soporta geolocalización.");
      return;
    }
    setCargandoGps(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitud(position.coords.latitude);
        setLongitud(position.coords.longitude);
        setCargandoGps(false);
      },
      () => {
        setCargandoGps(false);
        mostrarToast("error", "Error al obtener ubicación. Activa tu GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // Registrar la asistencia enviando los datos al servidor
  const registrarAsistencia = async (tipoEvento) => {
    setEnviandoRegistro(true);
    try {
      const response = await api.post("/asistencias/", {
        tipo: tipoEvento,
        latitud: parseFloat(latitud).toFixed(6),
        longitud: parseFloat(longitud).toFixed(6),
        dispositivo: navigator.userAgent.substring(0, 100),
      });

      const obraDetectada = response.data.sucursal_nombre || "la obra";
      mostrarToast(
        "exito",
        `¡Checada de ${tipoEvento} registrada correctamente en ${obraDetectada}!`,
      );
      setLatitud(null);
      setLongitud(null);
    } catch (err) {
      const msgError =
        err.response?.data?.error_geocerca ||
        err.response?.data?.detail ||
        "Hubo un error al intentar guardar tu checada en el servidor.";
      mostrarToast("error", msgError);
    } finally {
      setEnviandoRegistro(false);
    }
  };

  return (
    <div className="space-y-3 text-left">
      {/* Tarjeta blanca de instrucciones y botón GPS */}
      <div className="space-y-3 bg-white p-3 border border-slate-200/60 rounded-xl shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            📍 Registro de Asistencia
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            Captura tu ubicación para verificar si te encuentras dentro del
            perímetro de una obra autorizada.
          </p>
        </div>

        <button
          type="button"
          onClick={obtenerUbicacion}
          disabled={cargandoGps || enviandoRegistro}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm active:scale-95 transition-all duration-200 disabled:opacity-50"
        >
          {cargandoGps
            ? "🛰️ Buscando satélites..."
            : "🎯 Capturar Ubicación Actual"}
        </button>
      </div>

      {/* Tarjeta blanca con el mapa y botones de Entrada / Salida */}
      {latitud && longitud && (
        <div className="space-y-3 bg-white p-3 border border-slate-200/60 rounded-xl shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              🗺️ Ubicación Detectada
            </span>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              GPS Listo
            </span>
          </div>

          <div className="h-65 w-full rounded-xl overflow-hidden border border-slate-200 relative z-0">
            <MapContainer
              center={[latitud, longitud]}
              zoom={17}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <CentrarMapa coords={[latitud, longitud]} zoom={17} />

              <Marker position={[latitud, longitud]}>
                <Popup>Tú estás aquí</Popup>
              </Marker>

              {sucursalesActivas.map((suc) => (
                <Circle
                  key={suc.id}
                  center={[parseFloat(suc.latitud), parseFloat(suc.longitud)]}
                  radius={parseFloat(suc.radio_maximo_metros)}
                  pathOptions={{
                    color: "#10b981",
                    fillColor: "#10b981",
                    fillOpacity: 0.18,
                  }}
                >
                  <Popup>
                    🏢 <b>{suc.nombre}</b> (Radio:
                    {parseInt(suc.radio_maximo_metros)}m)
                  </Popup>
                </Circle>
              ))}
            </MapContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 border border-slate-100 rounded-xl font-medium">
            <span>
              Latitud:{" "}
              <b className="text-slate-700">{parseFloat(latitud).toFixed(6)}</b>
            </span>
            <span>
              Longitud:{" "}
              <b className="text-slate-700">
                {parseFloat(longitud).toFixed(6)}
              </b>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => registrarAsistencia("ENTRADA")}
              disabled={enviandoRegistro}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm active:scale-95 transition-all duration-200 disabled:opacity-50"
            >
              {enviandoRegistro ? "Guardando..." : "⬇️ Entrada"}
            </button>
            <button
              type="button"
              onClick={() => registrarAsistencia("SALIDA")}
              disabled={enviandoRegistro}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm active:scale-95 transition-all duration-200 disabled:opacity-50"
            >
              {enviandoRegistro ? "Guardando..." : "⬆️ Salida"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
