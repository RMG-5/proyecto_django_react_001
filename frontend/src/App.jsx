import React, { useState, useEffect } from "react";
import axios from "axios";

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

  // --- NUEVOS ESTADOS PARA EL REGISTRO DE ASISTENCIA ---
  const [enviandoRegistro, setEnviandoRegistro] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("user_token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

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
      /* Hacemos una petición POST a la ventanilla de login de Django */
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/login/`,
        {
          username: username,
          password: password,
        },
      );
      localStorage.setItem("user_token", response.data.token);
      setIsLoggedIn(true);
      setUsername("");
      setPassword("");
    } catch (err) {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  // --- NUEVA FUNCIÓN: ENVIAR LA CHECADA COMPLETA AL BACKEND ---
  const registrarAsistencia = async (tipoEvento) => {
    setEnviandoRegistro(true);
    setErrorGps("");
    setMensajeExito("");

    // 1. Recuperamos el brazalete (Token) del almacenamiento del navegador
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
          // EN LA CABECERA INYECTAMOS EL TOKEN DE SEGURIDAD (Igual que en ModHeader)
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
      setErrorGps(
        "Hubo un error al intentar guardar tu checada en el servidor.",
      );
    } finally {
      setEnviandoRegistro(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user_token");
    setIsLoggedIn(false);
    setLatitud(null);
    setLongitud(null);
    setMensajeExito("");
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>📍 Sistema Checador GPS</h1>
        <p>Solución Full-Stack con Docker</p>
      </header>

      <main style={styles.main}>
        {isLoggedIn ? (
          <div style={styles.card}>
            <h2 style={{ color: "#2f855a", textAlign: "center" }}>
              🔓 Sesión Activa
            </h2>

            <div style={styles.gpsSection}>
              {/* Botón inicial para despertar los satélites */}
              <button
                style={styles.buttonGps}
                onClick={obtenerUbicacion}
                disabled={cargandoGps || enviandoRegistro}
              >
                {cargandoGps
                  ? "Buscando satélites..."
                  : "🎯 Capturar Coordenadas Actuales"}
              </button>

              {errorGps && <p style={styles.errorAlert}>{errorGps}</p>}
              {mensajeExito && (
                <p style={styles.successAlert}>{mensajeExito}</p>
              )}

              {/* Si ya tenemos la ubicación fija, mostramos los botones de acción definitiva */}
              {latitud && longitud && (
                <div style={styles.coordenadasBox}>
                  <p style={{ margin: "0 0 10px 0" }}>
                    <strong>Ubicación lista para checar</strong>
                  </p>

                  {/* BOTÓN DE ENTRADA */}
                  <button
                    style={{
                      ...styles.buttonAccion,
                      backgroundColor: "#38a169",
                    }}
                    onClick={() => registrarAsistencia("ENTRADA")}
                    disabled={enviandoRegistro}
                  >
                    ⬇️ Registrar Entrada
                  </button>

                  {/* BOTÓN DE SALIDA */}
                  <button
                    style={{
                      ...styles.buttonAccion,
                      backgroundColor: "#dd6b20",
                      marginTop: "8px",
                    }}
                    onClick={() => registrarAsistencia("SALIDA")}
                    disabled={enviandoRegistro}
                  >
                    ⬆️ Registrar Salida
                  </button>
                </div>
              )}
            </div>

            <button style={styles.buttonLogout} onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <div style={styles.card}>
            <h2 style={{ textAlign: "center" }}>Iniciar Sesión</h2>
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
  header: { textAlign: "center", marginBottom: "30px", color: "#1a202c" },
  main: { width: "100%", maxWidth: "400px" },
  card: {
    backgroundColor: "#ffffff",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
  },
  form: { display: "flex", flexDirection: "column", marginTop: "15px" },
  inputGroup: { marginBottom: "15px" },
  label: {
    display: "block",
    marginBottom: "5px",
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
    fontWeight: "bold",
  },
  buttonLogout: {
    backgroundColor: "#e53e3e",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "bold",
    width: "100%",
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
  successAlert: {
    backgroundColor: "#c6f6d5",
    color: "#22543d",
    padding: "10px",
    borderRadius: "6px",
    fontSize: "14px",
    textAlign: "center",
    margin: "10px 0",
    fontWeight: "500",
  },
  gpsSection: { margin: "25px 0", textAlign: "center" },
  buttonGps: {
    backgroundColor: "#2b6cb0",
    color: "white",
    border: "none",
    padding: "14px 15px",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer",
    width: "100%",
    fontWeight: "bold",
  },
  coordenadasBox: {
    backgroundColor: "#edf2f7",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "15px",
    marginTop: "15px",
    textAlign: "center",
  },
  buttonAccion: {
    color: "white",
    border: "none",
    padding: "12px 15px",
    borderRadius: "6px",
    fontSize: "15px",
    cursor: "pointer",
    width: "100%",
    fontWeight: "bold",
  },
};

export default App;
