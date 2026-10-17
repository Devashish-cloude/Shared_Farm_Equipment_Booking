import React, { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '../../lib/googleMaps';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { TelemetryData } from '../../types';
import { Layers } from 'lucide-react';

interface UnifiedLiveTrackingMapProps {
  currentLat: number;
  currentLng: number;
  equipmentName: string;
  telemetry?: TelemetryData | null;
  parcelDescription?: string;
}

const leafletTractorIcon = L.divIcon({
  className: 'live-tractor-marker',
  html: `
    <div style="
      background: #164B35;
      color: #B8D96B;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #B8D96B;
      box-shadow: 0 0 0 8px rgba(184, 217, 107, 0.35);
      font-size: 20px;
    ">
      🚜
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

export const UnifiedLiveTrackingMap: React.FC<UnifiedLiveTrackingMapProps> = ({
  currentLat,
  currentLng,
  equipmentName,
  telemetry,
  parcelDescription = 'Operating in Anand agricultural parcel',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const { isLoaded, authError, isConfigured } = useGoogleMaps(['places']);
  const [preferredEngine, setPreferredEngine] = useState<'google' | 'leaflet'>('google');

  // Google Map Initialization & Updates
  useEffect(() => {
    if (!isLoaded || authError || preferredEngine !== 'google' || !mapContainerRef.current) {
      return;
    }
    if (!window.google?.maps) return;

    try {
      const position = { lat: currentLat, lng: currentLng };

      if (!mapInstanceRef.current) {
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: position,
          zoom: 16,
          mapTypeId: 'hybrid', // Satellite + roads is best for agricultural fields
          mapTypeControl: true,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        // Farm boundary circle
        const circle = new window.google.maps.Circle({
          strokeColor: '#B8D96B',
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: '#347653',
          fillOpacity: 0.2,
          map,
          center: position,
          radius: 280,
        });
        circleRef.current = circle;

        // Custom styled tractor marker
        const marker = new window.google.maps.Marker({
          position,
          map,
          title: equipmentName,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="22" fill="#164B35" stroke="#B8D96B" stroke-width="3"/>
                <text x="24" y="30" font-size="20" text-anchor="middle">🚜</text>
              </svg>
            `)}`,
            anchor: new window.google.maps.Point(24, 24),
          },
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family: system-ui, sans-serif; padding: 4px; color: #25312A;">
              <h4 style="font-size: 13px; font-weight: 700; color: #164B35; margin: 0 0 2px 0;">${equipmentName}</h4>
              <p style="font-size: 11px; color: #526058; margin: 0 0 4px 0;">${parcelDescription}</p>
              <p style="font-size: 11px; font-weight: 700; color: #2e7d32; margin: 0;">
                Speed: ${telemetry?.speedKmph?.toFixed(1) || '7.2'} km/h &bull; Engine: ${telemetry?.engineStatus || 'running'}
              </p>

            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markerRef.current = marker;
        mapInstanceRef.current = map;
      } else {
        // Smoothly pan and update marker
        const map = mapInstanceRef.current;
        map.panTo(position);
        if (markerRef.current) {
          markerRef.current.setPosition(position);
        }
        if (circleRef.current) {
          circleRef.current.setCenter(position);
        }
      }
    } catch (err) {
      console.warn('[UnifiedLiveTrackingMap] Error updating Google Map:', err);
    }
  }, [isLoaded, authError, preferredEngine, currentLat, currentLng, equipmentName, telemetry, parcelDescription]);

  const shouldUseLeafletFallback =
    preferredEngine === 'leaflet' || !isConfigured || Boolean(authError);

  return (
    <div className="h-[460px] w-full rounded-2xl overflow-hidden relative border border-[#CBD5C7] shadow-inner bg-slate-900">
      {/* Top HUD Controls */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{!shouldUseLeafletFallback ? 'Google Satellite Telemetry' : 'OpenStreetMap Engine'}</span>
        </div>

        {isConfigured && !authError && (
          <button
            type="button"
            onClick={() => setPreferredEngine((curr) => (curr === 'google' ? 'leaflet' : 'google'))}
            className="pointer-events-auto flex items-center gap-1.5 bg-emerald-800/90 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md border border-emerald-600 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Switch to {preferredEngine === 'google' ? 'OpenStreetMap' : 'Google Satellite'}</span>
          </button>
        )}
      </div>

      {/* Map Body */}
      {shouldUseLeafletFallback ? (
        <MapContainer
          center={[currentLat, currentLng]}
          zoom={15}
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Circle
            center={[currentLat, currentLng]}
            radius={280}
            pathOptions={{ color: '#347653', fillColor: '#B8D96B', fillOpacity: 0.15 }}
          />

          <Marker position={[currentLat, currentLng]} icon={leafletTractorIcon}>
            <Popup>
              <div className="p-1 text-xs space-y-1">
                <h4 className="font-bold text-[#164B35]">{equipmentName}</h4>
                <p className="text-[11px] text-[#526058]">{parcelDescription}</p>
                <p className="text-[11px] font-semibold text-emerald-700">
                  Engine Running &bull; {telemetry?.speedKmph?.toFixed(1) || '7.2'} km/h
                </p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      ) : (
        <div ref={mapContainerRef} className="w-full h-full" />
      )}
    </div>
  );
};
