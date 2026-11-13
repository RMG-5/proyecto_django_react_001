// JavaScript para el mapa de administración de sucursales en Django Admin
document.addEventListener("DOMContentLoaded", function () {
  // Buscamos los campos de texto reales que genera Django en el HTML
  const inputLat = document.getElementById("id_latitud");
  const inputLon = document.getElementById("id_longitud");

  // Si no existen los campos de latitud y longitud, no hacemos nada
  if (!inputLat || !inputLon) return;

  // Configuración de los íconos de Leaflet para que se vean correctamente
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet/dist/images/marker-shadow.png",
  });

  // Creamos un contenedor para el mapa y lo insertamos antes de los campos de latitud y longitud
  const contenedorMapa = document.createElement("div");
  contenedorMapa.id = "admin-mapa-sucursal";
  contenedorMapa.style.height = "350px";
  contenedorMapa.style.width = "100%";
  contenedorMapa.style.maxWidth = "600px";
  contenedorMapa.style.margin = "20px 0";
  contenedorMapa.style.borderRadius = "8px";
  contenedorMapa.style.border = "1px solid #ccc";
  contenedorMapa.style.zIndex = "0";

  // Insertamos el contenedor del mapa antes de los campos de latitud y longitud
  inputLat.closest(".form-row").before(contenedorMapa);

  // Obtenemos las coordenadas iniciales desde los campos de texto o usamos valores por defecto
  let latInicial = parseFloat(inputLat.value) || 19.7028;
  let lonInicial = parseFloat(inputLon.value) || -101.1177;

  // Creamos el mapa de Leaflet centrado en las coordenadas iniciales
  const mapaAdmin = L.map("admin-mapa-sucursal").setView(
    [latInicial, lonInicial],
    14,
  );
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
  }).addTo(mapaAdmin);

  // Creamos un marcador draggable en las coordenadas iniciales y lo agregamos al mapa
  let marcador = L.marker([latInicial, lonInicial], { draggable: true }).addTo(
    mapaAdmin,
  );

  // Función para sincronizar la posición del marcador con las cajas de texto de Django
  function actualizarInputs(lat, lon) {
    inputLat.value = parseFloat(lat).toFixed(6);
    inputLon.value = parseFloat(lon).toFixed(6);
  }

  // EVENTO A: Captura coordenadas cuando el administrador da un clic en cualquier parte del mapa
  mapaAdmin.on("click", function (e) {
    marcador.setLatLng(e.latlng);
    actualizarInputs(e.latlng.lat, e.latlng.lng);
  });

  // EVENTO B: Captura coordenadas si el administrador decide arrastrar el pin con el mouse
  marcador.on("dragend", function (e) {
    const posicion = marcador.getLatLng();
    actualizarInputs(posicion.lat, posicion.lng);
  });
});
