import React, { useEffect, useRef } from 'react';
import { useGoogleMaps } from '../../lib/googleMaps';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, ShieldCheck, AlertCircle, Layers } from 'lucide-react';

interface SingleEquipmentLocationMapProps {
  coordinates?: [number, number] | null;
  village: string;
  district: string;
  state?: string;
  equipmentTitle: string;
  pricePerHour: number;
}

const leafletPin = L.divIcon({
  className: 'single-eq-marker',
  html: `
    <div style="
      background: #164B35;
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(22, 75, 53, 0.4);
      border: 2px solid #B8D96B;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      transform: translate(-50%, -100%);
    ">
      <span>📍 Vicinity</span>
    </div>
  `,
  iconSize: [80, 32],
  iconAnchor: [40, 32],
});

export const SingleEquipmentLocationMap: React.FC<SingleEquipmentLocationMapProps> = ({
  coordinates,
  village,
  district,
  state = 'India',
  equipmentTitle,
  pricePerHour,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const { isLoaded, isLoading, authError, isConfigured } = useGoogleMaps(['places']);

  // Validate coordinates
  const hasValidCoordinates = Boolean(
    coordinates &&
      Array.isArray(coordinates) &&
      coordinates.length === 2 &&
      typeof coordinates[0] === 'number' &&
      typeof coordinates[1] === 'number' &&
      !isNaN(coordinates[0]) &&
      !isNaN(coordinates[1]) &&
      coordinates[0] >= -90 &&
      coordinates[0] <= 90 &&
      coordinates[1] >= -180 &&
      coordinates[1] <= 180
  );

  const [lat, lng] = hasValidCoordinates && coordinates ? coordinates : [22.5645, 72.9289];

  // Render Google Map
  useEffect(() => {
    if (!hasValidCoordinates || !isLoaded || authError || !mapContainerRef.current) {
      return;
    }
    if (!window.google?.maps) return;

    try {
      const position = { lat, lng };

      if (!mapInstanceRef.current) {
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: position,
          zoom: 14,
          mapTypeId: 'roadmap',
          mapTypeControl: true,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        // Add approximate vicinity circle (700m radius)
        new window.google.maps.Circle({
          strokeColor: '#164B35',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#B8D96B',
          fillOpacity: 0.25,
          map,
          center: position,
          radius: 700,
        });

        // Add pin marker
        const marker = new window.google.maps.Marker({
          position,
          map,
          title: equipmentTitle,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="90" height="34" viewBox="0 0 90 34">
                <rect x="2" y="2" width="86" height="26" rx="13" fill="#164B35" stroke="#B8D96B" stroke-width="2" filter="drop-shadow(0px 3px 4px rgba(0,0,0,0.3))"/>
                <text x="45" y="19" fill="#ffffff" font-size="11" font-weight="700" font-family="sans-serif" text-anchor="middle">₹${pricePerHour}/hr</text>
              </svg>
            `)}`,
            anchor: new window.google.maps.Point(45, 30),
          },
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family: system-ui, sans-serif; padding: 4px; color: #25312A;">
              <h4 style="font-size: 13px; font-weight: 700; margin: 0 0 4px 0; color: #164B35;">${equipmentTitle}</h4>
              <p style="font-size: 11px; color: #526058; margin: 0 0 4px 0;">Approximate Vicinity: ${village}, ${district}</p>
              <p style="font-size: 10px; color: #7C8C83; margin: 0;">Exact farm parcel provided after booking.</p>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        mapInstanceRef.current = map;
      }
    } catch (err) {
      console.warn('[SingleEquipmentLocationMap] Failed to render Google Map:', err);
    }
  }, [hasValidCoordinates, isLoaded, authError, lat, lng, equipmentTitle, pricePerHour, village, district]);

  // If coordinates are completely missing
  if (!hasValidCoordinates) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E7DE] p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
          <MapPin className="w-6 h-6" />
        </div>
        <h4 className="font-heading font-bold text-sm text-[#25312A]">
          Approximate Location: {village}, {district}, {state}
        </h4>
        <p className="text-xs text-[#526058] max-w-md mx-auto">
          Precise GPS coordinates have not been calibrated by the equipment owner. You can confirm delivery or pickup
          instructions with the verified owner upon booking request.
        </p>
      </div>
    );
  }

  const shouldUseLeafletFallback = !isConfigured || Boolean(authError);

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#347653]" />
          <h3 className="font-heading font-bold text-base text-[#25312A]">Machinery Vicinity & Field Area</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#526058]">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{village}, {district}</span>
        </div>
      </div>

      {/* Map Container */}
      <div className="w-full h-72 sm:h-80 rounded-xl overflow-hidden border border-[#E2E7DE] relative bg-[#F0F5F2]">
        {shouldUseLeafletFallback ? (
          <MapContainer
            center={[lat, lng]}
            zoom={14}
            scrollWheelZoom={false}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Circle
              center={[lat, lng]}
              radius={700}
              pathOptions={{ color: '#164B35', fillColor: '#B8D96B', fillOpacity: 0.25 }}
            />
            <Marker position={[lat, lng]} icon={leafletPin}>
              <Popup>
                <div className="p-1 text-xs">
                  <strong className="text-[#164B35]">{equipmentTitle}</strong>
                  <p className="text-[#526058] mt-1">{village}, {district}</p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        ) : isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center space-y-2">
            <div className="w-8 h-8 border-3 border-[#164B35] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-[#164B35]">Loading Google Maps Vicinity...</p>
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full" />
        )}

        {/* Engine Notice */}
        <div className="absolute top-2 left-2 z-[400] bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md border border-[#CBD5C7] text-[10px] text-[#25312A] font-medium shadow-xs">
          {!shouldUseLeafletFallback ? 'Google Maps Satellite / Roadmap' : 'OpenStreetMap Engine'}
        </div>
      </div>

      {/* Privacy Guarantee Note */}
      <div className="flex items-start gap-2 bg-[#F0F5F2] p-3 rounded-xl border border-[#CBD5C7] text-xs text-[#526058]">
        <ShieldCheck className="w-4 h-4 text-[#164B35] shrink-0 mt-0.5" />
        <span>
          <strong>Farmer Privacy Protection:</strong> We display an approximate 700m radius zone on the map. The
          exact farm parcel address and pickup directions are revealed once your booking is accepted.
        </span>
      </div>
    </div>
  );
};
