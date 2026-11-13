import React, { useState, useEffect } from "react";
import api from "../api/axiosClient";

// Componente principal para administrar usuarios
export default function AdminUsuarios({ mostrarToast }) {
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [idEditando, setIdEditando] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [erroresCampos, setErroresCampos] = useState({});

  // Cargar la lista de usuarios al montar el componente
  useEffect(() => {
    api
      .get("/usuarios/")
      .then((res) => setListaUsuarios(res.data))
      .catch(() =>
        mostrarToast("error", "Error al cargar la lista de usuarios."),
      );
  }, []);

  // Función para limpiar el formulario y restablecer los estados
  const limpiarFormulario = () => {
    setIdEditando(null);
    setUsername("");
    setPassword("");
    setPasswordConfirm("");
    setIsAdmin(false);
    setErroresCampos({});
  };

  // Función para manejar el guardado de un usuario (crear o actualizar)
  const handleGuardar = async (e) => {
    e.preventDefault();
    setErroresCampos({});

    try {
      if (idEditando) {
        const res = await api.put(`/usuarios/${idEditando}/`, {
          username,
          is_admin: isAdmin,
          ...(password.trim() !== "" && {
            password,
            password_confirm: passwordConfirm,
          }),
        });
        setListaUsuarios((prev) =>
          prev.map((u) => (u.id === idEditando ? res.data : u)),
        );
        mostrarToast("exito", "¡Usuario actualizado con éxito!");
      } else {
        const res = await api.post("/usuarios/", {
          username,
          password,
          password_confirm: passwordConfirm,
          is_admin: isAdmin,
        });
        setListaUsuarios((prev) => [...prev, res.data]);
        mostrarToast("exito", "¡Usuario creado con éxito!");
      }
      limpiarFormulario();
    } catch (err) {
      if (err.response?.status === 400) {
        const errores = err.response.data;
        setErroresCampos(errores);

        // Unimos cada error con un salto de línea para el Toast
        const mensajesToast = Object.values(errores)
          .flat()
          .map((msg) => `• ${msg}`)
          .join("\n");

        mostrarToast(
          "error",
          mensajesToast || "Por favor, corrige los errores en el formulario.",
        );
      } else {
        mostrarToast(
          "error",
          err.response?.data?.detail || "Ocurrió un error inesperado.",
        );
      }
    }
  };

  // Función para manejar la eliminación de un usuario
  const handleEliminar = async (id, name) => {
    const nombreLimpio = name.replace(/_/g, " ");
    if (
      !window.confirm(
        `¿Estás completamente seguro de borrar a "${nombreLimpio}"?\n\nADVERTENCIA: Se borrarán permanentemente todos sus registros de asistencia vinculados.`,
      )
    ) {
      return;
    }

    try {
      await api.delete(`/usuarios/${id}/`);
      setListaUsuarios((prev) => prev.filter((u) => u.id !== id));
      if (idEditando === id) limpiarFormulario();
      mostrarToast("exito", "Usuario y bitácoras eliminados correctamente.");
    } catch (err) {
      mostrarToast(
        "error",
        err.response?.data?.detail || "No se pudo eliminar al usuario.",
      );
    }
  };

  // Renderizado del formulario y la lista de usuarios
  return (
    <div>
      {/* Formulario para crear o editar un usuario */}
      <form
        onSubmit={handleGuardar}
        className="space-y-4 text-left bg-white p-2 border border-slate-200/60 rounded-xl shadow-sm"
      >
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-sm font-bold text-slate-800">
            {idEditando ? "✏️ Modificar Usuario" : "👤 Registrar Nuevo Usuario"}
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
            Nombre de Usuario:
          </label>
          <input
            type="text"
            required
            className={`w-full px-3 py-2 text-xs rounded-xl border bg-slate-50 capitalize text-slate-700 focus:outline-none focus:bg-white transition-colors ${
              erroresCampos.username
                ? "border-rose-500 bg-rose-50/30"
                : "border-slate-200"
            }`}
            value={username.replace(/_/g, " ")}
            onChange={(e) => {
              setUsername(e.target.value);
              if (erroresCampos.username) {
                setErroresCampos({ ...erroresCampos, username: null });
              }
            }}
            placeholder="Ej. David Attenborough"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            {idEditando
              ? "Nueva Contraseña (Dejar vacío para no cambiar):"
              : "Contraseña:"}
          </label>
          <input
            type="password"
            required={!idEditando}
            className={`w-full px-3 py-2 text-xs rounded-xl border bg-slate-50 capitalize text-slate-700 focus:outline-none focus:bg-white transition-colors ${
              erroresCampos.pasword
                ? "border-rose-500 bg-rose-50/30"
                : "border-slate-200"
            }`}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (erroresCampos.password) {
                setErroresCampos({ ...erroresCampos, password: null });
              }
            }}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            {idEditando
              ? "Confirmar Nueva Contraseña:"
              : "Confirmar Contraseña:"}
          </label>
          <input
            type="password"
            required={!idEditando || password.trim() !== ""}
            className={`w-full px-3 py-2 text-xs rounded-xl border bg-slate-50 capitalize text-slate-700 focus:outline-none focus:bg-white transition-colors ${
              erroresCampos.password_confirm
                ? "border-rose-500 bg-rose-50/30"
                : "border-slate-200"
            }`}
            value={passwordConfirm}
            onChange={(e) => {
              setPasswordConfirm(e.target.value);
              if (erroresCampos.password_confirm) {
                setErroresCampos({ ...erroresCampos, password_confirm: null });
              }
            }}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>

        <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 border border-slate-100 rounded-xl">
          <input
            type="checkbox"
            id="chkAdmin"
            className="w-4 h-4 rounded-md border-slate-300 text-blue-600"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />
          <label
            htmlFor="chkAdmin"
            className="text-xs font-semibold text-slate-600 cursor-pointer select-none"
          >
            ¿Otorgar privilegios de Administrador?
          </label>
        </div>

        <button
          type="submit"
          className={`w-full font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all duration-200 mt-2 ${
            idEditando
              ? "bg-amber-500 hover:bg-amber-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {idEditando ? "💾 Guardar Cambios" : "➕ Dar de Alta Empleado"}
        </button>
      </form>

      {/* Sección para mostrar la lista de usuarios y permitir la edición o eliminación */}
      <div className="mt-3 bg-slate-50 border border-slate-200/60 rounded-xl p-2">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          📋 Plantilla de Usuarios ({listaUsuarios.length})
        </label>

        <div className="flex gap-2">
          <select
            value={idEditando || ""}
            onChange={(e) => {
              const u = listaUsuarios.find(
                (user) => user.id === Number(e.target.value),
              );
              if (u) {
                setIdEditando(u.id);
                setUsername(u.username);
                setIsAdmin(u.is_staff);
                setPassword("");
                setPasswordConfirm("");
              } else {
                limpiarFormulario();
              }
            }}
            className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 text-slate-700 font-medium focus:outline-none"
          >
            <option value="">Selecciona un usuario para editar...</option>
            {listaUsuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.is_staff ? "⭐ " : "👤 "}
                {u.username
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (char) => char.toUpperCase())}
                {u.is_staff ? " (ADMIN)" : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!idEditando}
            onClick={() => {
              const u = listaUsuarios.find((user) => user.id === idEditando);
              if (u) handleEliminar(u.id, u.username);
            }}
            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold px-3 py-2 rounded-xl text-xs disabled:opacity-40 transition-all"
            title="Eliminar usuario seleccionado"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
