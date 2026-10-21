// ==============================================================================
// 1. IMPORTACIONES DE LIBRERÍAS Y COMPONENTES
// ==============================================================================

// Importamos React y sus Hooks esenciales:
// - useState: Para crear variables de estado que controlan la interfaz en tiempo real.
// - useEffect: Para interceptar eventos y ejecutar código automáticamente en el ciclo de vida del componente.
import React, { useState, useEffect } from "react";

// Cliente HTTP basado en promesas para hacer peticiones asíncronas de manera sencilla a nuestra API Django.
import axios from "axios";

// Elementos de la librería 'react-leaflet' para renderizar mapas interactivos de OpenStreetMap:
// - MapContainer: El contenedor padre que inicializa el lienzo del mapa.
// - TileLayer: La capa visual que descarga las imágenes de las calles y mapas.
// - Marker: El pin físico que se coloca sobre una coordenada exacta.
// - Popup: La ventana flotante con texto que se abre al hacer clic sobre un marcador.
// - Circle: Un círculo geométrico ideal para delimitar visualmente el radio de nuestra geocerca.
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";

// Estilos necesarios para que el mapa de Leaflet no se desconfigure ni pierda su diseño visual.
import "leaflet/dist/leaflet.css";

// ==============================================================================
// 2. PARCHE DE SEGURIDAD PARA ICONOS DE LEAFLET
// ==============================================================================
// Truco obligatorio en entornos como Webpack/Vite debido a que las rutas relativas
// de los marcadores por defecto de Leaflet suelen romperse al compilar el proyecto.
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Configuramos de forma explícita el icono predeterminado con sus medidas y anclajes exactos.
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],     // Dimensiones del marcador físico (ancho y alto).
  iconAnchor: [12, 41],   // Punto exacto del icono que se alineará con la coordenada GPS real (la punta inferior).
});

// Reemplazamos la configuración global de marcadores de Leaflet por nuestro icono corregido.
L.Marker.prototype.options.icon = DefaultIcon;


// ==============================================================================
// 3. COMPONENTE PRINCIPAL: APP
// ==============================================================================
function App() {

  // ----------------------------------------------------------------------------
  // ESTADOS DE AUTENTICACIÓN (LOGIN)
  // ----------------------------------------------------------------------------
  const [isLoggedIn, setIsLoggedIn] = useState(false);  // Bandera booleana: true si el usuario inició sesión.
  const [username, setUsername] = useState("");          // Almacena el texto escrito en el input de usuario.
  const [password, setPassword] = useState("");          // Almacena el texto escrito en el input de contraseña.
  const [error, setError] = useState("");                // Controla los mensajes de error en pantalla al fallar el login.
  const [loading, setLoading] = useState(false);        // Bandera de carga para deshabilitar botones mientras se procesa el login.

  // ----------------------------------------------------------------------------
  // ESTADOS DE UBICACIÓN GPS
  // ----------------------------------------------------------------------------
  const [latitud, setLatitud] = useState(null);          // Guarda la latitud obtenida por el GPS del navegador.
  const [longitud, setLongitud] = useState(null);        // Guarda la longitud obtenida por el GPS del navegador.
  const [cargandoGps, setCargandoGps] = useState(false); // true si el navegador está intentando triangular la señal GPS.
  const [errorGps, setErrorGps] = useState("");          // Almacena errores si el usuario deniega los permisos de ubicación o falla la señal.

  // ----------------------------------------------------------------------------
  // ESTADOS DE ACCIÓN (MARCAJE DE ASISTENCIA)
  // ----------------------------------------------------------------------------
  const [enviandoRegistro, setEnviandoRegistro] = useState(false); // true si se está ejecutando la llamada POST de asistencia.
  const [mensajeExito, setMensajeExito] = useState("");            // Guarda el mensaje alegre de confirmación cuando la checada fue válida.

  // ----------------------------------------------------------------------------
  // ESTADOS DE PANEL DE ADMINISTRACIÓN Y FILTROS
  // ----------------------------------------------------------------------------
  const [vistaAdmin, setVistaAdmin] = useState(false);               // Controla si en pantalla se visualiza la sección de reportes.
  const [historialAsistencias, setHistorialAsistencias] = useState([]); // Arreglo que almacena los registros JSON devueltos por el servidor.
  const [usuariosFiltro, setUsuariosFiltro] = useState([]);          // Guarda una lista limpia de usuarios para el selector del buscador.
  const [fechaInicio, setFechaInicio] = useState("");                // Filtro: Fecha de arranque elegida en el calendario.
  const [fechaFin, setFechaFin] = useState("");                      // Filtro: Fecha de cierre elegida en el calendario.
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("TODOS"); // Filtro: Empleado específico seleccionado para el reporte.

  const [isAdmin, setIsAdmin] = useState(false);                     // Bandera booleana que define si el usuario logueado es Administrador.

  // ==============================================================================
  // 4. EFECTOS DE CONTROL (USEEFFECT)
  // ==============================================================================

  // EFECTO 1: Validación de Sesión Persistente (Se ejecuta una sola vez al cargar la página)
  useEffect(() => {
    // Intenta recuperar el token de autenticación guardado en el almacenamiento local del navegador.
    const token = localStorage.getItem("user_token");
    // Recupera el rol de administrador y lo convierte a un valor booleano puro (true/false).
    const adminSaved = localStorage.getItem("is_admin") === "true";

    // Si el token existe, iniciamos sesión automáticamente para evitar que el usuario deba loguearse tras refrescar.
    if (token) {
      setIsLoggedIn(true);
      setIsAdmin(adminSaved);
    }
  }, []); // El arreglo vacío [] asegura que este bloque solo se ejecute al montar el componente.


  // EFECTO 2: Carga y Filtrado Dinámico de Historial de Asistencias (Modo Administrador)
  useEffect(() => {
    // Esta petición solo se disparará si el usuario activó la vista de administrador y está logueado.
    if (vistaAdmin && isLoggedIn) {
      const token = localStorage.getItem("user_token");

      // Configuramos el objeto estándar de Axios para las cabeceras y parámetros de la URL.
      const config = {
        headers: { Authorization: `Token ${token}` }, // Inyecta el Token de seguridad requerido por Django.
        params: {}, // Inicializa un objeto vacío para añadir los filtros HTTP query params.
      };

      // Si el administrador seleccionó un rango completo de fechas, las añade a la petición HTTP.
      if (fechaInicio && fechaFin) {
        config.params.fecha_inicio = fechaInicio;
        config.params.fecha_fin = fechaFin;
      }

      // Si seleccionó un usuario en específico o la palabra "TODOS", pasa este filtro a la URL.
      if (usuarioSeleccionado) {
        config.params.usuario_id = usuarioSeleccionado;
      }

      // Realiza la petición GET hacia el endpoint de asistencias de tu backend en Docker.
      axios
        .get(`${import.meta.env.VITE_API_URL}/api/asistencias/`, config)
        .then((response) => {
          // Si el servidor responde con éxito, guarda la lista de asistencias en el estado.
          setHistorialAsistencias(response.data);

          // Si es la primera vez que se carga la lista, guarda los datos para llenar el selector de usuarios.
          if (usuariosFiltro.length === 0) {
            setUsuariosFiltro(response.data);
          }
        })
        .catch((err) => console.error("Error al filtrar historial:", err));
    }
    // Este efecto se volverá a ejecutar automáticamente cada vez que cambie cualquiera de estas variables:
  }, [vistaAdmin, isLoggedIn, fechaInicio, fechaFin, usuarioSeleccionado]);


  // ==============================================================================
  // 5. FUNCIONES DE ACCIÓN Y LÓGICA DE NEGOCIO
  // ==============================================================================

  // FUNCIÓN: Consumir la API de Geolocalización nativa del Navegador
  const obtenerUbicacion = () => {
    // Si el navegador web es muy antiguo o no cuenta con soporte de GPS, frena el proceso.
    if (!navigator.geolocation) {
      setErrorGps("Tu navegador no soporta geolocalización.");
      return;
    }
    // Activa el estado de carga para mostrar un indicador visual en la interfaz gráfica.
    setCargandoGps(true);
    setErrorGps("");
    setMensajeExito("");

    // Llama al método nativo del dispositivo para obtener las coordenadas actuales.
    navigator.geolocation.getCurrentPosition(
      // Caso de Éxito: El usuario aceptó los permisos y el satélite/red obtuvo la ubicación.
      (position) => {
        setLatitud(position.coords.latitude);   // Guarda la latitud decimal.
        setLongitud(position.coords.longitude); // Guarda la longitud decimal.
        setCargandoGps(false);                  // Apaga el indicador de carga del GPS.
      },
      // Caso de Error: El usuario rechazó el permiso de GPS o el dispositivo tardó mucho en responder.
      (error) => {
        console.error(error);
        setCargandoGps(false);
        setErrorGps("Error al obtener ubicación. Activa tu GPS.");
      },
      // Configuraciones de alta precisión obligatorias para que la Geocerca funcione correctamente:
      // - enableHighAccuracy: Fuerza al dispositivo a usar el GPS de hardware y no solo las redes móviles.
      // - timeout: Tiempo límite de 10 segundos antes de cancelar la búsqueda de coordenadas.
      // - maximumAge: Cero significa que exige una ubicación fresca en tiempo real, prohibiendo datos en caché.
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };


  // FUNCIÓN: Envío del formulario de Login hacia el Backend
  const handleLogin = async (e) => {
    e.preventDefault(); // Cancela el refresco automático de página por defecto de los formularios HTML.
    setError("");
    setLoading(true);   // Bloquea el botón para evitar clics repetidos.
    try {
      // Envía una petición POST con las credenciales ingresadas al endpoint de login.
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/login/`,
        {
          username: username,
          password: password,
        },
      );

      // Si las credenciales son correctas, almacena de forma segura los datos en la memoria del navegador.
      localStorage.setItem("user_token", response.data.token);
      localStorage.setItem("is_admin", response.data.is_admin);

      // Actualiza los estados de la aplicación con los valores obtenidos de la API.
      setIsLoggedIn(true);
      setIsAdmin(response.data.is_admin);
      setUsername(""); // Limpia el input de texto del formulario.
      setPassword(""); // Limpia el input de contraseña del formulario.
    } catch (err) {
      // Si el servidor responde con error (HTTP 400 o 401), muestra el aviso al usuario.
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false); // Libera el estado de carga independientemente de si falló o tuvo éxito.
    }
  };


  // FUNCIÓN: Registrar Entrada o Salida enviando las coordenadas a la Geocerca de Django
  const registrarAsistencia = async (tipoEvento) => {
    setEnviandoRegistro(true); // Muestra un spinner de carga en el botón de checar.
    setErrorGps("");
    setMensajeExito("");

    const token = localStorage.getItem("user_token");

    try {
      // Envía la petición POST con los datos que nuestro backend y serializador esperan recibir.
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/asistencias/`,
        {
          tipo: tipoEvento,
          // Convierte las coordenadas a flotantes y las recorta estrictamente a 6 decimales de precisión.
          latitud: parseFloat(latitud).toFixed(6),
          longitud: parseFloat(longitud).toFixed(6),
          // Envía una cadena identificadora del navegador y sistema del usuario recortada a 100 caracteres.
          dispositivo: navigator.userAgent.substring(0, 100),
        },
        {
          // Adjunta las cabeceras de autorización con el token del empleado.
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );

      // Si pasa la validación de la geocerca de Django, despliega el mensaje de éxito en pantalla.
      setMensajeExito(`¡Checada de ${tipoEvento} registrada correctamente!`);
      // Limpia las variables de coordenadas para obligar al usuario a recalcular su ubicación en su siguiente checada.
      setLatitud(null);
      setLongitud(null);
    } catch (err) {
      console.error(err);

      // Intercepta específicamente el error HTTP 400 arrojado por la geocerca de Django (ValidationError).
      if (
        err.response &&
        err.response.data &&
        err.response.data.error_geocerca
      ) {
        // Muestra en la app el mensaje exacto enviado por Django: "Checada denegada, estás muy lejos...".
        setErrorGps(err.response.data.error_geocerca);
      } else {
        // Manejo general para caídas de servidor, fallas de internet o errores imprevistos.
        setErrorGps(
          "Hubo un error al intentar guardar tu checada en el servidor.",
        );
      }
    } finally {
      setEnviandoRegistro(false); // Apaga el estado de carga del botón.
    }
  };


  // FUNCIÓN: Descarga del Reporte de Excel binario aplicando los filtros de pantalla
  const descargarExcel = async () => {
    const token = localStorage.getItem("user_token");
    try {
      // Petición GET al endpoint personalizado del Admin de Django.
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/asistencias/exportar-excel/`,
        {
          headers: { Authorization: `Token ${token}` },
          // ATENCIÓN: Indica que la respuesta no es texto ni JSON, sino un archivo binario en bruto (Blob).
          responseType: "blob",
          // Pasa los filtros de la interfaz para que el backend arme el Excel únicamente con esas filas.
          params: {
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            usuario_id: usuarioSeleccionado?.id || usuarioSeleccionado,
          },
        },
      );

      // FLUJO DE DESCARGA FORZADA EN EL NAVEGADOR:
      // 1. Crea una URL temporal en memoria que apunta al bloque de datos binarios del Excel.
      const url = window.URL.createObjectURL(new Blob([response.data]));
      // 2. Crea de forma invisible una etiqueta de enlace HTML <a> en el documento.
      const link = document.createElement("a");
      link.href = url;
      // 3. Le asigna el nombre por defecto que tendrá el archivo descargado.
      link.setAttribute("download", "reporte_filtrado.xlsx");
      // 4. Agrega el enlace temporal al cuerpo del documento web.
      document.body.appendChild(link);

      // 5. Fuerza un clic artificial mediante código para disparar la descarga en el equipo.
      link.click();
      // 6. Elimina el enlace invisible del documento una vez completado el clic para no ensuciar el HTML.
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
    }
  };


  // FUNCIÓN: Limpiador de los filtros activos en los selectores del administrador
  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setUsuarioSeleccionado("TODOS");
  };


  // FUNCIÓN: Cierre de Sesión Completo (Cerrar sesión y purgar estados de memoria)
  const handleLogout = () => {
    // Elimina de forma definitiva las credenciales de autenticación guardadas en el navegador.
    localStorage.removeItem("user_token");
    localStorage.removeItem("is_admin");
    // Reinicia todas las variables de filtros de reportes a su estado original vacío.
    setFechaInicio("");
    setFechaFin("");
    if (typeof setUsuarioSeleccionado === "function") {
      setUsuarioSeleccionado("TODOS");
    }
    // Regresa los estados lógicos de sesión a falso.
    setIsLoggedIn(false);
    setIsAdmin(false);
    // Oculta el panel administrativo y borra el historial guardado en la memoria RAM del componente.
    setVistaAdmin(false);
    setHistorialAsistencias([]);
    // Purga los estados de geolocalización e informaciones flotantes remanentes.
    setLatitud(null);
    setLongitud(null);
    setMensajeExito("");
    setErrorGps("");
    setUsuariosFiltro([]);
  };

  // ==============================================================================
  // 6. RENDERIZADO VISUAL (INTERFAZ GRÁFICA JSX)
  // ==============================================================================
  return (
    // Contenedor principal de toda la aplicación.
    // - min-h-screen: Fuerza a que el fondo cubra al menos el 100% de la altura de la pantalla.
    // - bg-gradient-to-br: Crea un fondo degradado moderno desde el tono gris slate-100 hacia el slate-200.
    // - antialiased: Suaviza las fuentes tipográficas para mejorar la legibilidad en pantallas móviles o monitores de alta densidad.
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center p-4 antialiased">

      {/* Tarjeta central con ancho máximo controlado (max-w-md: ideal para verse como App Móvil) */}
      <div className="w-full max-w-md">

        {/* ENCABEZADO DE LA APLICACIÓN */}
        <header className="text-center mb-8">
          {/* Título principal con tipografía extra negrita. 'animate-bounce' hace saltar el emoji de ubicación */}
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
            <span className="animate-bounce">📍</span> Sistema Checador GPS
          </h1>
          {/* Subtítulo técnico que detalla la arquitectura de las tres tecnologías que levantaste en Docker */}
          <p className="text-sm font-medium text-slate-500 mt-1">
            Solución: Docker + Django + React
          </p>
        </header>

        {/* EVALUACIÓN LÓGICA (Operador Ternario): ¿El usuario ya inició sesión? */}
        {isLoggedIn ? (

          /* ====================================================================
             MÓDULO A: INTERFAZ DE USUARIO LOGUEADO
             ==================================================================== */
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">

            {/* Barra superior de estado y desconexión */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
              {/* Badge visual verde que indica conexión activa */}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Conectado
              </span>
              {/* Botón de salida que ejecuta la purga de credenciales en 'handleLogout' */}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-5 rounded-lg shadow-md active:scale-95 transition-all flex items-center gap-1"
              >
                Cerrar Sesión
              </button>
            </div>

            {/* CONDICIONAL CORTO CIRCUITO (&&): Si el usuario es administrador, renderiza el selector de pestañas */}
            {isAdmin && (
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                {/* Pestaña Vista Empleado: Se activa (clase 'text-blue-600 shadow-md') si 'vistaAdmin' es false */}
                <button
                  className={`flex-1 text-center py-2 text-sm font-bold rounded-lg transition-all ${!vistaAdmin ? "bg-white text-blue-600 shadow-md" : "text-slate-600 hover:text-slate-900"}`}
                  onClick={() => setVistaAdmin(false)}
                >
                  📱 Empleado
                </button>
                {/* Pestaña Vista Administrador: Se activa si 'vistaAdmin' es true */}
                <button
                  className={`flex-1 text-center py-2 text-sm font-bold rounded-lg transition-all ${vistaAdmin ? "bg-white text-blue-600 shadow-md" : "text-slate-600 hover:text-slate-900"}`}
                  onClick={() => setVistaAdmin(true)}
                >
                  📊 Administrador
                </button>
              </div>
            )}

            {/* EVALUACIÓN DE VISTA ACTIVA: ¿Estamos en el rol común o en el de reportes? */}
            {!vistaAdmin ? (

              /* ----------------------------------------------------------------
                 MODO EMPLEADO (MARCAJE DE ASISTENCIA)
                 ---------------------------------------------------------------- */
              <div className="space-y-4">
                {/* Botón principal para activar el GPS del dispositivo */}
                {/* - disabled: Se bloquea automáticamente si está buscando satélites o guardando una checada */}
                <button
                  onClick={obtenerUbicacion}
                  disabled={cargandoGps || enviandoRegistro}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  {/* Cambia dinámicamente el texto para avisar al usuario qué proceso se está ejecutando */}
                  {cargandoGps
                    ? "🛰️ Buscando satélites..."
                    : "🎯 Capturar Ubicación Actual"}
                </button>

                {/* BLOQUE DE ALERTA: Si la geocerca de Django denegó el acceso, pinta el recuadro de error rojo */}
                {errorGps && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700 text-center">
                    {errorGps}
                  </div>
                )}

                {/* BLOQUE DE ÉXITO: Si Django aceptó la checada, despliega el recuadro verde con confeti visual */}
                {mensajeExito && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 text-center">
                    {mensajeExito}
                  </div>
                )}

                {/* CONDICIONAL: El mapa y los botones de Entrada/Salida solo nacerán si el GPS ya capturó coordenadas válidas */}
                {latitud && longitud && (
                  <div className="space-y-4 border border-slate-100 rounded-xl p-3 bg-slate-50">

                    {/* Lienzo del Mapa Interactivo (relative z-0 evita que se superponga sobre menús desplegables) */}
                    <div className="h-56 w-full rounded-lg overflow-hidden border border-slate-200 relative z-0">
                      <MapContainer
                        center={[latitud, longitud]} // Centra la cámara del mapa en la posición del empleado.
                        zoom={16}                    // Nivel de acercamiento óptimo para ver calles de la manzana.
                        style={{ height: "100%", width: "100%" }}
                      >
                        {/* Descarga los mapas visuales gratuitos e ilimitados de OpenStreetMap */}
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {/* Coloca el PIN azul exactamente donde se encuentra parado el empleado */}
                        <Marker position={[latitud, longitud]}>
                          <Popup>Tú estás aquí</Popup>
                        </Marker>

                        {/* Dibuja en vivo la Geocerca circular de 50 metros alrededor de tu oficina */}
                        <Circle
                          center={[19.7028, -101.1177]} // Coordenadas fijas de la sucursal.
                          radius={50}                   // Radio exacto de tolerancia matemática.
                          pathOptions={{
                            color: "#10b981",           // Borde verde esmeralda.
                            fillColor: "#10b981",       // Relleno translúcido verde.
                            fillOpacity: 0.15,          // Opacidad suave para no tapar las calles del mapa.
                          }}
                        />
                      </MapContainer>
                    </div>

                    {/* BOTONES DE DISPARO DE ASISTENCIA */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Botón Verde: Envía el texto 'ENTRADA' a la lógica asíncrona */}
                      <button
                        onClick={() => registrarAsistencia("ENTRADA")}
                        disabled={enviandoRegistro}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all"
                      >
                        ⬇️ Entrada
                      </button>
                      {/* Botón Naranja: Envía el texto 'SALIDA' a la lógica asíncrona */}
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
              /* ----------------------------------------------------------------
                MODO ADMINISTRADOR (MONITORIZACIÓN Y AUDITORÍA GENERAL)
                ---------------------------------------------------------------- */
              <div className="space-y-4">

                {/* BARRA DE TÍTULO DE LA AUDITORÍA */}
                <div className="flex justify-between items-center">
                  <div>
                    {/* Título de la sección */}
                    <h3 className="text-base font-bold text-slate-800">
                      🗺️ Auditoría de Geocercas
                    </h3>
                    {/* Subtexto descriptivo */}
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ubicaciones exactas recopiladas.
                    </p>
                  </div>
                  {/* BOTÓN DESCARGA: Ejecuta el generador de archivos Excel binarios al hacer clic */}
                  <button
                    onClick={descargarExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-md active:scale-95 transition-all flex items-center gap-1"
                  >
                    Importar Excel
                  </button>
                </div>

                {/* ==============================================================
                   PANEL DE FILTROS INTERACTIVOS
                   ============================================================== */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-3 text-left">

                  {/* BLOQUE A: RANGOS DE FECHA (CALENDARIOS) */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Input de Fecha de Inicio */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Desde:
                      </label>
                      <input
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700"
                        value={fechaInicio} // Enlaza el valor visual con la variable de estado 'fechaInicio'.
                        onChange={(e) => setFechaInicio(e.target.value)} // Al cambiar el calendario, actualiza el estado.
                      />
                    </div>
                    {/* Input de Fecha de Cierre */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Hasta:
                      </label>
                      <input
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700"
                        value={fechaFin} // Enlaza el valor visual con la variable de estado 'fechaFin'.
                        onChange={(e) => setFechaFin(e.target.value)} // Al cambiar el calendario, actualiza el estado.
                      />
                    </div>
                  </div>

                  {/* BLOQUE B: SELECTOR DESPLEGABLE (DROPDOWN DE EMPLEADOS) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Filtrar por Empleado:
                    </label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-400"
                      value={usuarioSeleccionado} // Sincroniza la opción elegida con el estado.
                      onChange={(e) => setUsuarioSeleccionado(e.target.value)} // Captura el texto seleccionado.
                    >
                      {/* Opción comodín inicial para desactivar el filtro de usuarios */}
                      <option value="TODOS">
                        👥 Mostrar Todos los Empleados
                      </option>

                      {/* TRUCO TÉCNICO AVANZADO: ELIMINACIÓN DE DUPLICADOS EN VIVO
                          1. 'usuariosFiltro.map(...)' extrae un arreglo con llaves [nombre, objeto_completo].
                          2. 'new Map(...)' utiliza la propiedad de los mapas donde las llaves son ÚNICAS, destruyendo nombres repetidos.
                          3. 'Array.from(...).values()' convierte el mapa limpio de vuelta a un arreglo plano de JavaScript.
                          4. El '.map((asis) => ...)' final dibuja las opciones limpias sin duplicados en el HTML. */}
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

                  {/* BLOQUE C: BOTÓN DE LIMPIEZA */}
                  <div>
                    <button
                      type="button"
                      onClick={limpiarFiltros} // Ejecuta la función que vacía todas las variables de filtros.
                      className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg p-2 transition-colors"
                    >
                      🧹 Limpiar Filtros
                    </button>
                  </div>
                </div>

                {/* ==============================================================
                   MAPA DE MONITOREO GLOBAL (AUDITORÍA)
                   ============================================================== */}
                <div className="h-72 w-full rounded-xl overflow-hidden border border-slate-200 relative z-0">
                  <MapContainer
                    center={[19.7028, -101.1177]} // El mapa del administrador inicia centrado fijamente en la oficina.
                    zoom={14}                     // Un zoom un poco más lejano (14) para alcanzar a ver pines que quedaron fuera del rango.
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {/* Dibuja la geocerca permitida (círculo verde translúcido) */}
                    <Circle
                      center={[19.7028, -101.1177]}
                      radius={50}
                      pathOptions={{
                        color: "#10b981",
                        fillColor: "#10b981",
                        fillOpacity: 0.08, // Opacidad ultra baja para que no estorbe al haber múltiples marcadores encima.
                      }}
                    />

                    {/* BUCLE ITERADOR (MAP): Dibuja un PIN en el mapa por cada registro de asistencia que pase los filtros */}
                    {historialAsistencias.map((registro) => (
                      <Marker
                        key={registro.id} // Identificador único obligatorio para que React optimice el renderizado.
                        position={[
                          parseFloat(registro.latitud), // Convierte el texto decimal de Django a número flotante.
                          parseFloat(registro.longitud), // Convierte el texto decimal de Django a número flotante.
                        ]}
                      >
                        {/* Ventana de información flotante que se despliega al presionar el pin */}
                        <Popup>
                          <div className="text-sm font-sans">
                            {/* Muestra el nombre del empleado que checó */}
                            <p className="font-bold text-slate-800">
                              👤 {registro.usuario_nombre}
                            </p>
                            {/* Badge textual que indica dinámicamente si fue una Entrada o una Salida */}
                            <p className="text-xs font-semibold mt-0.5 text-blue-600">
                              {registro.tipo === "ENTRADA"
                                ? "⬇️ Entrada"
                                : "⬆️ Salida"}
                            </p>
                            {/* Fecha y hora formateada automáticamente según el idioma de la computadora del supervisor */}
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

          /* ====================================================================
              MÓDULO B: INTERFAZ DE USUARIO NO AUTENTICADO (PANTALLA DE LOGIN)
              ==================================================================== */
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            {/* Título central del formulario de acceso */}
            <h2 className="text-xl font-bold text-slate-800 text-center mb-1">
              Acceso al Sistema
            </h2>
            {/* Subtexto corporativo explicativo */}
            <p className="text-xs text-slate-400 text-center mb-6">
              Ingrese sus credenciales corporativas
            </p>

            {/* CONDICIONAL CORTO CIRCUITO (&&): Si la API de Django rechaza el login, despliega este banner rojo */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl text-center">
                {error}
              </div>
            )}

            {/* FORMULARIO DE LOGUEO: 'onSubmit' intercepta el botón de envío y ejecuta la función asíncrona 'handleLogin' */}
            <form onSubmit={handleLogin} className="space-y-4">

              {/* BLOQUE: CAMPO DE TEXTO (USUARIO) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Usuario
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 transition-all placeholder:text-slate-300"
                  value={username} // Vincula el texto de la caja con la variable de estado 'username'.
                  onChange={(e) => setUsername(e.target.value)} // Modifica el estado en tiempo real conforme el usuario escribe.
                  required // Validación nativa del navegador para prohibir campos vacíos.
                  placeholder="nombre usuario"
                />
              </div>

              {/* BLOQUE: CAMPO DE TEXTO PROTEGIDO (CONTRASEÑA) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password" // Oculta los caracteres escritos transformándolos en puntos por seguridad en pantalla.
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 transition-all placeholder:text-slate-300"
                  value={password} // Vincula el texto con el estado 'password'.
                  onChange={(e) => setPassword(e.target.value)} // Modifica el estado en tiempo real.
                  required
                  placeholder="••••••••"
                />
              </div>

              {/* BOTÓN DE DISPARO (SUBMIT) */}
              {/* - disabled: Se congela automáticamente si 'loading' es true para frenar peticiones duplicadas al servidor */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all mt-6 disabled:opacity-50"
              >
                {/* Evalúa el estado de carga para avisar visualmente que está validando los datos contra la API de Django */}
                {loading ? "Validando llave..." : "Autenticarse"}
              </button>
            </form>
          </div>
        )} {/* Cierre del operador ternario principal que evalúa '{isLoggedIn ? ... : ...}' */}
      </div> {/* Cierre del div contenedor de ancho máximo (w-full max-w-md) */}
    </div>); {/* Cierre del div del fondo con gradiente (min-h-screen) */ }
}

// Exportación por defecto para que este componente pueda ser importado y renderizado desde el archivo central 'main.jsx' o 'index.js'.
export default App;
