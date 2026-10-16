import React, { useState, useEffect } from "react";
// Importamos Axios para poder hacer las peticiones HTTP a Django
import axios from "axios";

function App() {
  // --- ESTADOS DE LA APLICACIÓN ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- REVISAR SI YA EXISTE UN TOKEN AL CARGAR LA PÁGINA ---
  useEffect(() => {
    /* Al encender la app, revisamos si guardamos un token en el navegador anteriormente */
    const token = localStorage.getItem("user_token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // --- FUNCIÓN PARA INICIAR SESIÓN ---
  const handleLogin = async (e) => {
    e.preventDefault(); // Evita que la página se recargue al enviar el formulario
    setError("");
    setLoading(true);

    try {
      /* Hacemos una petición POST a la ventanilla de login de Django */
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/login/`,
        {
          username: username,
          password: password,
        },
      );

      /* Si todo sale bien, Django nos responde con un objeto que tiene { token: "..." } */
      const tokenRecibido = response.data.token;

      /* Guardamos el token de forma persistente en el navegador del usuario */
      localStorage.setItem("user_token", tokenRecibido);

      /* Cambiamos el estado para darle paso al panel del checador */
      setIsLoggedIn(true);

      /* Limpiamos los campos del formulario */
      setUsername("");
      setPassword("");
    } catch (err) {
      /* Si los datos están mal, Django nos arroja un error 400 */
      console.error(err);
      setError("Usuario o contraseña incorrectos. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCIÓN PARA CERRAR SESIÓN ---
  const handleLogout = () => {
    /* Borramos el token del navegador para bloquear el acceso futuro */
    localStorage.removeItem("user_token");
    setIsLoggedIn(false);
  };

  // --- RENDERIZADO VISUAL ---
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>📍 Sistema Checador GPS</h1>
        <p>Conexión segura entre React y Django API</p>
      </header>

      <main style={styles.main}>
        {isLoggedIn ? (
          /* PANTALLA 1: EL CHECADOR (Se muestra solo si tiene un token válido) */
          <div style={styles.card}>
            <h2 style={{ color: "#2f855a" }}>🔓 Sesión Iniciada</h2>
            <p style={{ color: "#4a5568", marginBottom: "20px" }}>
              Tu token de seguridad está activo en este navegador.
            </p>

            {/* Próximamente aquí pondremos el botón del GPS real */}
            <div style={styles.gpsPlaceholder}>
              [ Aquí irá el botón para capturar GPS ]
            </div>

            <button style={styles.buttonLogout} onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </div>
        ) : (
          /* PANTALLA 2: FORMULARIO DE LOGIN (Se muestra si no hay token) */
          <div style={styles.card}>
            <h2>Iniciar Sesión</h2>

            {/* Alerta si el usuario se equivoca */}
            {error && <p style={styles.errorAlert}>{error}</p>}

            <form onSubmit={handleLogin} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Usuario:</label>
                <input
                  type="text"
                  style={styles.input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Ej. admin"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Contraseña:</label>
                <input
                  type="password"
                  style={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Tu contraseña secreta"
                />
              </div>

              <button
                type="submit"
                style={styles.buttonLogin}
                disabled={loading}
              >
                {loading ? "Validando..." : "Ingresar"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

// --- ESTILOS EN LÍNEA (Actualizados para el Formulario) ---
const styles = {
  container: {
    fontFamily: "system-ui, sans-serif",
    backgroundColor: "#f4f6f9",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
  },
  header: {
    textAlign: "center",
    marginBottom: "30px",
    color: "#1a202c",
  },
  main: {
    width: "100%",
    maxWidth: "400px",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    marginTop: "15px",
  },
  inputGroup: {
    marginBottom: "15px",
    textAlign: "left",
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "6px",
    color: "#4a5568",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #cbd5e0",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  buttonLogin: {
    backgroundColor: "#3182ce",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
    width: "100%",
    fontWeight: "bold",
    marginTop: "10px",
  },
  buttonLogout: {
    backgroundColor: "#e53e3e",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
    width: "100%",
    fontWeight: "bold",
  },
  errorAlert: {
    backgroundColor: "#fed7d7",
    color: "#9b2c2c",
    padding: "10px",
    borderRadius: "6px",
    fontSize: "14px",
    textAlign: "center",
    margin: "10px 0",
  },
  gpsPlaceholder: {
    backgroundColor: "#edf2f7",
    border: "2px dashed #cbd5e0",
    padding: "30px 10px",
    borderRadius: "8px",
    textAlign: "center",
    color: "#718096",
    marginBottom: "20px",
  },
};

export default App;
