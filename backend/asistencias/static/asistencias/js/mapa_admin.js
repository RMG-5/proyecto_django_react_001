// JavaScript para el mapa de administración de sucursales en Django Admin
document.addEventListener("DOMContentLoaded", function () {
  // Referencias a los campos generados por Django
  const inputLat = document.getElementById("id_latitud");
  const inputLon = document.getElementById("id_longitud");
  const inputRadio = document.getElementById("id_radio_maximo_metros");

  // Detener ejecución si no estamos en el formulario de edición/creación
  if (!inputLat || !inputLon) return;

  // Fijamos la versión 1.9.4 en las rutas de los íconos para evitar redirecciones
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });

  // Creación y estilos del contenedor del mapa
  const contenedorMapa = document.createElement("div");
  contenedorMapa.id = "admin-mapa-sucursal";
  Object.assign(contenedorMapa.style, {
    height: "380px",
    width: "100%",
    maxWidth: "600px",
    margin: "20px 0",
    borderRadius: "8px",
    border: "1px solid #ccc",
  });

  // Insertar el mapa justo antes de la fila de latitud
  const filaFormulario =
    inputLat.closest(".form-row") || inputLat.parentElement;
  filaFormulario.before(contenedorMapa);

  // Coordenadas iniciales (Morelia por defecto si el registro es nuevo)
  const latParsed = parseFloat(inputLat.value);
  const lonParsed = parseFloat(inputLon.value);
  const latInicial = !isNaN(latParsed) ? latParsed : 19.70285;
  const lonInicial = !isNaN(lonParsed) ? lonParsed : -101.11778;
  const radioInicial =
    inputRadio && !isNaN(parseFloat(inputRadio.value))
      ? parseFloat(inputRadio.value)
      : 50;

  // Inicialización del mapa y capa base de OpenStreetMap
  const mapaAdmin = L.map("admin-mapa-sucursal").setView(
    [latInicial, lonInicial],
    16,
  );
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
  }).addTo(mapaAdmin);

  // Marcador arrastrable y círculo visual del radio permitido
  const marcador = L.marker([latInicial, lonInicial], {
    draggable: true,
  }).addTo(mapaAdmin);
  const circuloRadio = L.circle([latInicial, lonInicial], {
    radius: radioInicial,
    color: "#0078A8",
    fillOpacity: 0.2,
  }).addTo(mapaAdmin);

  // Actualiza los inputs de texto y mueve el círculo al cambiar posición
  function actualizarDesdeMapa(lat, lon) {
    inputLat.value = Number(lat).toFixed(6);
    inputLon.value = Number(lon).toFixed(6);
    circuloRadio.setLatLng([lat, lon]);
  }

  // Actualiza el mapa si el usuario escribe coordenadas o cambia el radio manualmente
  function actualizarDesdeInputs() {
    const nuevaLat = parseFloat(inputLat.value);
    const nuevaLon = parseFloat(inputLon.value);
    if (!isNaN(nuevaLat) && !isNaN(nuevaLon)) {
      marcador.setLatLng([nuevaLat, nuevaLon]);
      circuloRadio.setLatLng([nuevaLat, nuevaLon]);
      mapaAdmin.panTo([nuevaLat, nuevaLon]);
    }
    if (inputRadio && !isNaN(parseFloat(inputRadio.value))) {
      circuloRadio.setRadius(parseFloat(inputRadio.value));
    }
  }

  // EVENTO A: Captura coordenadas cuando el administrador da un clic en cualquier parte del mapa
  mapaAdmin.on("click", function (e) {
    marcador.setLatLng(e.latlng);
    actualizarDesdeMapa(e.latlng.lat, e.latlng.lng);
  });

  // EVENTO B: Captura coordenadas si el administrador decide arrastrar el pin con el mouse
  marcador.on("dragend", function () {
    const pos = marcador.getLatLng();
    actualizarDesdeMapa(pos.lat, pos.lng);
  });

  // EVENTO C: Centra el mapa si el administrador decide teclear latitud y longitud
  inputLat.addEventListener("change", actualizarDesdeInputs);
  inputLon.addEventListener("change", actualizarDesdeInputs);
  if (inputRadio) {
    inputRadio.addEventListener("input", actualizarDesdeInputs);
  }
});
