// Espera a que todo el HTML del formulario esté completamente cargado en el navegador.
document.addEventListener("DOMContentLoaded", function () {
  
  // Busca los cuadros de texto (inputs) donde se escriben o guardan la latitud y longitud.
  const inputLat = document.getElementById("id_latitud");
  const inputLon = document.getElementById("id_longitud");

  // Si por alguna razón los inputs no existen en la página actual, detiene el script por seguridad.
  if (!inputLat || !inputLon) return;

  // Corrige un error clásico de Leaflet con Webpack/Django eliminando la ruta interna por defecto de los iconos.
  delete L.Icon.Default.prototype._getIconUrl;

  // Configura manualmente las URLs oficiales desde un servidor en la nube para descargar las imágenes del marcador azul.
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet/dist/images/marker-icon-2x.png", // Icono en alta resolución.
    iconUrl: "https://unpkg.com/leaflet/dist/images/marker-icon.png",          // Icono estándar.
    shadowUrl: "https://unpkg.com/leaflet/dist/images/marker-shadow.png",      // Sombra del marcador.
  });

  // Crea dinámicamente un elemento HTML <div> en la memoria del navegador para contener el mapa.
  const contenedorMapa = document.createElement("div");
  
  // Le asigna un ID único al contenedor para que Leaflet pueda identificarlo más abajo.
  contenedorMapa.id = "admin-mapa-sucursal";
  
  // --- INICIO DE ESTILOS CSS DEL MAPA ---
  contenedorMapa.style.height = "350px";           // Define la altura del recuadro del mapa.
  contenedorMapa.style.width = "100%";             // Hace que use todo el ancho disponible del formulario.
  contenedorMapa.style.maxWidth = "600px";         // Limita su crecimiento para que no se deforme en pantallas grandes.
  contenedorMapa.style.margin = "20px 0";          // Agrega espacio arriba y abajo para que no se pegue a los inputs.
  contenedorMapa.style.borderRadius = "8px";       // Le da bordes redondeados estéticos.
  contenedorMapa.style.border = "1px solid #ccc";// Le pone un contorno gris suave.
  contenedorMapa.style.zIndex = "0";               // Evita que el mapa se encime visualmente sobre menús desplegables.
  // --- FIN DE ESTILOS CSS DEL MAPA ---

  // Inyecta el mapa en el formulario físico, justo arriba de la fila contenedora del input de latitud.
  inputLat.closest(".form-row").before(contenedorMapa);

  // Intenta leer la latitud guardada en el input; si está vacío, asigna por defecto las coordenadas (19.764543).
  let latInicial = parseFloat(inputLat.value) || 19.764543;
  
  // Intenta leer la longitud guardada en el input; si está vacío, asigna por defecto las coordenadas (-101.154984).
  let lonInicial = parseFloat(inputLon.value) || -101.154984;

  // Inicializa el mapa de Leaflet en el contenedor creado y lo enfoca en las coordenadas iniciales con un zoom de 14.
  const mapaAdmin = L.map("admin-mapa-sucursal").setView(
    [latInicial, lonInicial],
    14,
  );

  // Carga los mapas visuales (mosaicos de calles) de OpenStreetMap y define su nivel máximo de acercamiento.
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors', // Muestra los créditos obligatorios.
  }).addTo(mapaAdmin); // Renderiza y añade la capa visual al mapa base.

  // Crea el pin/marcador azul en la ubicación inicial y activa la opción 'draggable' para que el usuario pueda arrastrarlo libremente.
  let marcador = L.marker([latInicial, lonInicial], { draggable: true }).addTo(
    mapaAdmin,
  );

  // Función interna reutilizable que actualiza los valores del formulario HTML redondeando a 6 decimales de precisión.
  function actualizarInputs(lat, lon) {
    inputLat.value = parseFloat(lat).toFixed(6);
    inputLon.value = parseFloat(lon).toFixed(6);
  }

  // EVENTO 1: Escucha cuando el usuario hace un clic directo en cualquier parte del mapa.
  mapaAdmin.on("click", function (e) {
    marcador.setLatLng(e.latlng);                 // Mueve instantáneamente el marcador al punto donde se hizo clic.
    actualizarInputs(e.latlng.lat, e.latlng.lng); // Escribe la nueva latitud y longitud en los campos de texto del formulario.
  });

  // EVENTO 2: Escucha cuando el usuario termina de arrastrar el marcador con el mouse.
  marcador.on("dragend", function (e) {
    const posicion = marcador.getLatLng();        // Obtiene la posición geográfica exacta donde el usuario soltó el marcador.
    actualizarInputs(posicion.lat, posicion.lng); // Escribe la latitud y longitud de ese destino final en el formulario.
  });
});
