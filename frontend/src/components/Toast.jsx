import React, { useEffect, useState } from "react";

// Componente Toast para mostrar mensajes de éxito o error
export default function Toast({ mensaje, onClose }) {
  const [visible, setVisible] = useState(false);

  // Efecto para controlar la visibilidad del Toast y su temporizador de cierre
  useEffect(() => {
    if (!mensaje?.texto) {
      setVisible(false);
      return;
    }

    setVisible(true);

    const timerOcultar = setTimeout(() => {
      setVisible(false);
    }, 5500);

    const timerLimpiar = setTimeout(() => {
      onClose();
    }, 6000);

    return () => {
      clearTimeout(timerOcultar);
      clearTimeout(timerLimpiar);
    };
  }, [mensaje, onClose]);

  // Función para cerrar manualmente conservando la animación de salida
  const handleCerrar = () => {
    setVisible(false);
    setTimeout(() => {
      onClose();
    }, 500); // Espera 500ms para coincidir con duration-500
  };

  // Si no hay mensaje, no renderiza nada
  if (!mensaje?.texto) return null;

  // Determina si el mensaje es de éxito o error para aplicar estilos condicionales
  const esExito = mensaje.tipo === "exito";

  // Renderizado del Toast con estilos condicionales según el tipo de mensaje
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 p-4 rounded-xl text-xs font-semibold shadow-xl border max-w-xs transition-all duration-500 ease-in-out ${
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-4 scale-95 pointer-events-none"
      } ${
        esExito
          ? "bg-emerald-50 text-emerald-900 border-emerald-200 shadow-emerald-900/10"
          : "bg-rose-50 text-rose-900 border-rose-200 shadow-rose-900/10"
      }`}
    >
      <span className="text-base shrink-0">{esExito ? "✨" : "⚠️"}</span>
      <p className="leading-snug flex-1 whitespace-pre-line">{mensaje.texto}</p>

      {/* Botón de cierre inmediato*/}
      <button
        type="button"
        onClick={handleCerrar}
        aria-label="Cerrar notificación"
        className={`shrink-0 p-1 rounded-lg transition-colors cursor-pointer ${
          esExito
            ? "text-emerald-700 hover:bg-emerald-200/60"
            : "text-rose-700 hover:bg-rose-200/60"
        }`}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
