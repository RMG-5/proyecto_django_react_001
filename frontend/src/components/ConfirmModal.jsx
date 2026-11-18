import React from "react";

export default function ConfirmModal({ config, onClose }) {
  if (!config?.abierto) return null;

  const esPeligro = config.tipo === "peligro"; // Rojo para eliminar, Ámbar/Azul para advertencias

  const handleConfirmar = () => {
    if (config.onConfirm) config.onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-5 space-y-4 transform transition-all">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg ${
              esPeligro
                ? "bg-rose-100 text-rose-600"
                : "bg-amber-100 text-amber-600"
            }`}
          >
            {esPeligro ? "🗑️" : "⚠️"}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-800">
              {config.titulo || "¿Estás seguro?"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed whitespace-pre-line">
              {config.mensaje}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-sm active:scale-95 transition-all cursor-pointer ${
              esPeligro
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {config.textoConfirmar || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
