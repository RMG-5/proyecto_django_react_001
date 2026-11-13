import { useEffect } from "react";
import L from "leaflet";
import { useMapEvents, useMap } from "react-leaflet";

// Función para crear un icono de marcador con un color específico
const crearIcono = (color) =>
  L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

// Exportación de iconos de diferentes colores para su uso en el mapa
export const DefaultIcon = crearIcono("blue");
export const iconoVerde = crearIcono("green");
export const iconoRojo = crearIcono("red");
export const iconoGris = crearIcono("grey");

// Establece el icono predeterminado para todos los marcadores de Leaflet
L.Marker.prototype.options.icon = DefaultIcon;

// Función para obtener el icono correspondiente según el estatus
export const obtenerIconoPorEstatus = (estatus) => {
  if (estatus === "A_TIEMPO") return iconoVerde;
  if (estatus === "RETARDO") return iconoRojo;
  return iconoGris;
};

// Componente que permite al usuario hacer clic en el mapa para obtener coordenadas
export function BuscadorCoordenadas({ alHacerClic }) {
  useMapEvents({
    click(e) {
      alHacerClic(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Componente que centra el mapa en unas coordenadas específicas con un nivel de zoom dado
export function CentrarMapa({ coords, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords[0] && coords[1]) {
      map.flyTo(coords, zoom, { duration: 0.8 });
    }
  }, [coords, zoom, map]);
  return null;
}
