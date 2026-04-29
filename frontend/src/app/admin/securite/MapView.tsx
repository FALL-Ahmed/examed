'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export type MapMarker = {
  lat: number;
  lon: number;
  label: string;
  email: string;
  ip: string;
  city: string;
  country: string;
  suspicious: boolean;
  deviceCount: number;
};

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lon], 7);
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lon]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [markers, map]);
  return null;
}

export default function MapView({ markers }: { markers: MapMarker[] }) {
  return (
    <MapContainer
      center={[20.5, -10.5]}
      zoom={5}
      className="w-full h-full rounded-2xl"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds markers={markers} />
      {markers.map((m, i) => (
        <CircleMarker
          key={`${m.ip}-${i}`}
          center={[m.lat, m.lon]}
          radius={m.suspicious ? 14 : 9}
          pathOptions={{
            color: m.suspicious ? '#ef4444' : '#22c55e',
            fillColor: m.suspicious ? '#ef4444' : '#22c55e',
            fillOpacity: 0.85,
            weight: m.suspicious ? 3 : 2,
          }}
        >
          <Popup className="min-w-[200px]">
            <div className="space-y-1 p-1 text-sm">
              <p className="font-bold text-gray-900">{m.label}</p>
              <p className="text-gray-500 text-xs">{m.email}</p>
              <div className="border-t pt-1 mt-1 space-y-0.5">
                <p className="text-xs"><span className="text-gray-400">IP :</span> <span className="font-mono">{m.ip}</span></p>
                <p className="text-xs"><span className="text-gray-400">Lieu :</span> {m.city}, {m.country}</p>
                <p className="text-xs"><span className="text-gray-400">Appareils :</span> {m.deviceCount}</p>
              </div>
              {m.suspicious && (
                <div className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded-lg mt-1">
                  ⚠️ Compte suspect
                </div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
