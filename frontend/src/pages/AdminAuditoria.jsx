import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import api from "../api/axiosClient";
import { obtenerIconoPorEstatus, CentrarMapa } from "../components/MapIcons";

// Componente principal para la auditoría de geocercas y visualización de asistencias
export default function AdminAuditoria({ sucursales, mostrarToast }) {
  const [historialAsistencias, setHistorialAsistencias] = useState([]);
  const [usuariosFiltro, setUsuariosFiltro] = useState([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("TODOS");
  const [sucursalSeleccionadaFiltro, setSucursalSeleccionadaFiltro] =
    useState("TODAS");

  // Efecto para cargar el historial de asistencias según los filtros seleccionados
  useEffect(() => {
    const params = {};
    if (fechaInicio && fechaFin) {
      params.fecha_inicio = fechaInicio;
      params.fecha_fin = fechaFin;
    }
    if (sucursalSeleccionadaFiltro) {
      params.sucursal_id = sucursalSeleccionadaFiltro;
    }
    if (usuarioSeleccionado) {
      params.usuario_id = usuarioSeleccionado;
    }

    api
      .get("/asistencias/", { params })
      .then((response) => {
        setHistorialAsistencias(response.data);
        if (usuariosFiltro.length === 0) {
          setUsuariosFiltro(response.data);
        }
      })
      .catch(() => {
        mostrarToast("error", "Error al cargar el historial de asistencias.");
      });
  }, [fechaInicio, fechaFin, usuarioSeleccionado, sucursalSeleccionadaFiltro]);

  // Memoización de las coordenadas de enfoque del mapa
  const coordenadasEnfoque = useMemo(() => {
    if (sucursalSeleccionadaFiltro !== "TODAS") {
      const obra = sucursales.find(
        (s) => s.id === Number(sucursalSeleccionadaFiltro),
      );
      if (obra) return [parseFloat(obra.latitud), parseFloat(obra.longitud)];
    }
    if (historialAsistencias.length > 0) {
      return [
        parseFloat(historialAsistencias[0].latitud),
        parseFloat(historialAsistencias[0].longitud),
      ];
    }
    return null;
  }, [sucursalSeleccionadaFiltro, sucursales, historialAsistencias]);

  // Función para descargar el historial en Excel
  const descargarExcel = async () => {
    try {
      const response = await api.get("/asistencias/exportar-excel/", {
        responseType: "blob",
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          usuario_id: usuarioSeleccionado,
          sucursal_id: sucursalSeleccionadaFiltro,
        },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "reporte_asistencias_filtrado.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      mostrarToast("exito", "Reporte Excel descargado.");
    } catch {
      mostrarToast("error", "No se pudo generar el reporte Excel.");
    }
  };

  // Función para limpiar los filtros
  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setUsuarioSeleccionado("TODOS");
    setSucursalSeleccionadaFiltro("TODAS");
  };

  return (
    <div className="space-y-3 text-left">
      {/* Tarjeta blanca principal de Filtros */}
      <div className="space-y-4 bg-white p-3 border border-slate-200/60 rounded-xl shadow-sm">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              🗺️ Auditoría de Geocercas
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Verde: Obra activa · Rojo: Obra inactiva
            </p>
          </div>
          <button
            type="button"
            onClick={descargarExcel}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition-all duration-200 shrink-0"
          >
            📥 Exportar Excel
          </button>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Filtros Dinámicos
          </span>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-xs bg-amber-50 hover:bg-amber-200 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-xl font-medium transition-colors"
          >
            🧹 Limpiar Filtros
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Por Fecha Desde:
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:bg-white transition-colors"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Por Fecha Hasta:
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:bg-white transition-colors"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Por Obra:
          </label>
          <select
            className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:bg-white transition-colors"
            value={sucursalSeleccionadaFiltro}
            onChange={(e) => setSucursalSeleccionadaFiltro(e.target.value)}
          >
            <option value="TODAS">🏢 Mostrar Todas las Obras</option>
            {sucursales.map((suc) => (
              <option key={suc.id} value={suc.id}>
                {suc.activa ? "🟢" : "🔴"} {suc.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Por Empleado:
          </label>
          <select
            className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:bg-white transition-colors"
            value={usuarioSeleccionado}
            onChange={(e) => setUsuarioSeleccionado(e.target.value)}
          >
            <option value="TODOS">👥 Mostrar Todos los Empleados</option>
            {Array.from(
              new Map(
                usuariosFiltro.map((item) => [item.usuario_nombre, item]),
              ).values(),
            ).map((asis) => (
              <option key={asis.id} value={asis.usuario_nombre}>
                👤 {asis.usuario_nombre.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Contenedor del Mapa con borde y sombra suave */}
      <div className="bg-white p-2 border border-slate-200/60 rounded-xl shadow-sm">
        <div className="h-65 w-full rounded-xl overflow-hidden border border-slate-200/80 relative z-0">
          <MapContainer
            center={[19.7028, -101.1177]}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <CentrarMapa
              coords={coordenadasEnfoque}
              zoom={sucursalSeleccionadaFiltro !== "TODAS" ? 16 : 14}
            />

            {sucursales.map((suc) => (
              <Circle
                key={`suc-circle-${suc.id}`}
                center={[parseFloat(suc.latitud), parseFloat(suc.longitud)]}
                radius={parseFloat(suc.radio_maximo_metros)}
                pathOptions={{
                  color: suc.activa ? "#10b981" : "#ef4444",
                  fillColor: suc.activa ? "#10b981" : "#ef4444",
                  fillOpacity: 0.14,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <b>{suc.nombre}</b>
                    <br />
                    Estado:{" "}
                    <span
                      className={
                        suc.activa
                          ? "text-emerald-600 font-bold"
                          : "text-rose-600 font-bold"
                      }
                    >
                      {suc.activa ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                </Popup>
              </Circle>
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
                  <div className="text-sm font-sans w-48">
                    <p className="font-bold text-slate-800 capitalize">
                      👤 {registro.usuario_nombre.replace(/_/g, " ")}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500">
                      🏢 {registro.sucursal_nombre}
                    </p>

                    <div className="flex items-center gap-1 mt-1 mb-2">
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

                    <div className="border-t border-slate-100 pt-2 space-y-1">
                      <p className="text-[11px] text-slate-600 flex justify-between">
                        <span>Tiempo turno:</span>
                        <span className="font-bold text-slate-800">
                          {registro.horas_trabajadas}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span>
                          Jornada {registro.jornada_meta_texto || "9h"}:
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
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
                      📅 {new Date(registro.fecha_hora).toLocaleString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Bitácora Filtrada unificada */}
      <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-3 py-2.5 border-b border-slate-200/60 flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            📋 Bitácora Filtrada
          </span>
          <span className="text-[10px] font-bold bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full">
            {historialAsistencias.length} registros
          </span>
        </div>

        <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
          {historialAsistencias.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              No hay registros con los filtros seleccionados.
            </p>
          ) : (
            historialAsistencias.map((reg) => (
              <div
                key={reg.id}
                className="p-2.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-slate-800 capitalize truncate">
                    {reg.usuario_nombre.replace(/_/g, " ")}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    🏢 {reg.sucursal_nombre}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(reg.fecha_hora).toLocaleString()}
                  </p>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <div className="flex items-center justify-end gap-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        reg.tipo === "ENTRADA"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {reg.tipo}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        reg.estatus === "A_TIEMPO"
                          ? "bg-emerald-100 text-emerald-700"
                          : reg.estatus === "RETARDO"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {reg.estatus.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500">
                    Turno:{" "}
                    <b className="text-slate-700">{reg.horas_trabajadas}</b>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
