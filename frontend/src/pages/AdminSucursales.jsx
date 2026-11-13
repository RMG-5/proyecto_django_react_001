import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import api from "../api/axiosClient";
import { BuscadorCoordenadas, CentrarMapa } from "../components/MapIcons";

// Componente principal para administrar sucursales
export default function AdminSucursales({
  sucursales,
  setSucursales,
  mostrarToast,
}) {
  const [idEditando, setIdEditando] = useState(null);
  const [nombre, setNombre] = useState("");
  const [radio, setRadio] = useState(50);
  const [lat, setLat] = useState(19.7028);
  const [lon, setLon] = useState(-101.1177);
  const [entrada, setEntrada] = useState("");
  const [salida, setSalida] = useState("");
  const [tolerancia, setTolerancia] = useState(0);
  const [activa, setActiva] = useState(true);

  // Función para limpiar el formulario y restablecer los estados
  const limpiarFormulario = () => {
    setIdEditando(null);
    setNombre("");
    setRadio(50);
    setTolerancia(0);
    setEntrada("");
    setSalida("");
    setLat(19.7028);
    setLon(-101.1177);
    setActiva(true);
  };

  // Función para manejar el guardado de una sucursal (crear o actualizar)
  const handleGuardar = async (e) => {
    e.preventDefault();
    const payload = {
      nombre,
      latitud: parseFloat(lat).toFixed(6),
      longitud: parseFloat(lon).toFixed(6),
      radio_maximo_metros: parseFloat(radio),
      hora_entrada: entrada || null,
      hora_salida: salida || null,
      tolerancia_minutos: parseInt(tolerancia) || 0,
      activa,
    };

    try {
      if (idEditando) {
        const res = await api.put(`/sucursales/${idEditando}/`, payload);
        setSucursales(
          sucursales.map((s) => (s.id === idEditando ? res.data : s)),
        );
        mostrarToast("exito", "¡Sucursal modificada correctamente!");
      } else {
        const res = await api.post("/sucursales/", payload);
        setSucursales([...sucursales, res.data]);
        mostrarToast("exito", "¡Sucursal guardada correctamente!");
      }
      limpiarFormulario();
    } catch (err) {
      if (err.response?.status === 400) {
        const mensajesToast = Object.values(err.response.data)
          .flat()
          .join(" • ");
        mostrarToast(
          "error",
          mensajesToast || "Por favor, revisa los datos ingresados.",
        );
      } else {
        mostrarToast(
          "error",
          err.response?.data?.detail ||
            err.response?.data?.error ||
            "Error al guardar la sucursal.",
        );
      }
    }
  };

  // Función para manejar la eliminación de una sucursal
  const handleEliminar = async (id) => {
    const sucursal = sucursales.find((s) => s.id === id);
    if (
      !window.confirm(
        `¿Seguro que deseas eliminar la obra "${sucursal.nombre}"?\n\nADVERTENCIA: Si la obra tiene registros de asistencia asociados, no es posible eliminarla.`,
      )
    )
      return;
    try {
      await api.delete(`/sucursales/${id}/`);
      setSucursales(sucursales.filter((s) => s.id !== id));
      mostrarToast("exito", "Sucursal eliminada correctamente.");
      if (idEditando === id) limpiarFormulario();
    } catch (err) {
      mostrarToast(
        "error",
        err.response?.data?.error || "Error al intentar borrar la sucursal.",
      );
    }
  };

  // Renderizado del formulario y la lista de sucursales
  return (
    <div>
      {/* Formulario para crear o editar sucursales */}
      <form
        onSubmit={handleGuardar}
        className="space-y-4 text-left bg-white p-2 border border-slate-200/60 rounded-xl shadow-sm"
      >
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-sm font-bold text-slate-800">
            {idEditando
              ? "✏️ Modificar Punto de Trabajo"
              : "🏢 Registrar Nuevo Punto de Trabajo"}
          </h3>
          {idEditando && (
            <button
              type="button"
              onClick={limpiarFormulario}
              className="text-xs bg-amber-50 hover:bg-amber-200 text-amber-700 border border-amber-200 px-2 py-1.5 rounded font-medium transition-colors"
            >
              Cancelar Edición
            </button>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Nombre de la Obra:
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/60 transition-all font-semibold"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Playa Azul 2025"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Radio Máximo (Mts):
            </label>
            <input
              type="number"
              required
              min="10"
              max="500"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:bg-white transition-colors"
              value={radio}
              onChange={(e) => setRadio(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Tolerancia Entrada (Min):
            </label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:bg-white transition-colors"
              value={tolerancia}
              onChange={(e) => setTolerancia(e.target.value)}
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
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:bg-white transition-colors"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Hora Salida (Opcional):
            </label>
            <input
              type="time"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:bg-white transition-colors"
              value={salida}
              onChange={(e) => setSalida(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 border border-slate-100 rounded-xl">
          <input
            type="checkbox"
            id="chkObraActiva"
            className="w-4 h-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
            checked={activa}
            onChange={(e) => setActiva(e.target.checked)}
          />
          <label
            htmlFor="chkObraActiva"
            className="text-xs font-semibold text-slate-600 cursor-pointer select-none"
          >
            Obra activa (visible y habilitada para checadas)
          </label>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            🗺️ Haz clic en el mapa para fijar el centro del punto de trabajo:
          </label>
          <div className="h-65 w-full rounded-xl overflow-hidden border border-slate-200 relative z-0 mb-2 shadow-inner">
            <MapContainer
              center={[lat, lon]}
              zoom={15}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <CentrarMapa coords={[lat, lon]} zoom={15} />
              <BuscadorCoordenadas
                alHacerClic={(nuevaLat, nuevaLon) => {
                  setLat(nuevaLat);
                  setLon(nuevaLon);
                }}
              />
              <Marker position={[lat, lon]} />
              <Circle
                center={[lat, lon]}
                radius={parseFloat(radio) || 50}
                pathOptions={{
                  color: activa ? "#10b981" : "#ef4444",
                  fillColor: activa ? "#10b981" : "#ef4444",
                  fillOpacity: 0.2,
                }}
              />
            </MapContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 border border-slate-100 rounded-xl font-medium">
            <span>
              Latitud:{" "}
              <b className="text-slate-700">{parseFloat(lat).toFixed(6)}</b>
            </span>
            <span>
              Longitud:{" "}
              <b className="text-slate-700">{parseFloat(lon).toFixed(6)}</b>
            </span>
          </div>
        </div>

        <button
          type="submit"
          className={`w-full font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all duration-200 mt-2 ${
            idEditando
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {idEditando ? "💾 Guardar Cambios" : "➕ Guardar Punto de Trabajo"}
        </button>
      </form>

      {/* Lista de sucursales registradas */}
      <div className="mt-3 bg-slate-50 border border-slate-200/60 rounded-xl p-2">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          📋 Puntos de Trabajo ({sucursales.length})
        </label>
        <div className="flex gap-2">
          <select
            value={idEditando || ""}
            onChange={(e) => {
              const s = sucursales.find(
                (suc) => suc.id === Number(e.target.value),
              );
              if (s) {
                setIdEditando(s.id);
                setNombre(s.nombre);
                setRadio(parseInt(s.radio_maximo_metros) || 50);
                setTolerancia(s.tolerancia_minutos || 0);
                setEntrada(s.hora_entrada || "");
                setSalida(s.hora_salida || "");
                setLat(parseFloat(s.latitud));
                setLon(parseFloat(s.longitud));
                setActiva(s.activa);
              } else {
                limpiarFormulario();
              }
            }}
            className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 text-slate-700 font-medium focus:outline-none"
          >
            <option value="">
              Selecciona un punto de trabajo para editar/eliminar...
            </option>
            {sucursales.map((suc) => (
              <option key={suc.id} value={suc.id}>
                🏢 {suc.activa ? "🟢" : "🔴"} {suc.nombre} (r:
                {parseInt(suc.radio_maximo_metros)}m)
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!idEditando}
            onClick={() => handleEliminar(idEditando)}
            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold px-3 py-2 rounded-xl text-xs disabled:opacity-40 transition-all"
            title="Eliminar sucursal seleccionada"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
